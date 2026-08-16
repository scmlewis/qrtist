export function initScanner() {
    const modeGenerate = document.getElementById('modeGenerate');
    const modeScan = document.getElementById('modeScan');
    const scanPanel = document.getElementById('scanPanel');
    const panelData = document.getElementById('panelData');
    const panelPreview = document.getElementById('panelPreview');
    const panelDesign = document.getElementById('panelDesign');
    const scanDropZone = document.getElementById('scanDropZone');
    const scanFileInput = document.getElementById('scanFileInput');
    const scanResult = document.getElementById('scanResult');
    const scanResultType = document.getElementById('scanResultType');
    const scanResultContent = document.getElementById('scanResultContent');
    const scanOpenBtn = document.getElementById('scanOpenBtn');
    const scanCopyBtn = document.getElementById('scanCopyBtn');
    const scanGenerateBtn = document.getElementById('scanGenerateBtn');
    const qrTypeSelect = document.getElementById('qrType');
    const qrTypeSection = document.getElementById('qrTypeSection');
    const batchModeBtn = document.getElementById('batchModeBtn');
    const sizeSection = document.getElementById('sizeSection');
    const qrCodeContainer = panelPreview.querySelector('#qrCodeContainer');

    if (!modeGenerate || !modeScan) return;

    function showGenerateMode() {
        modeGenerate.style.background = 'var(--md-primary)';
        modeGenerate.style.color = 'var(--md-on-primary)';
        modeScan.style.background = 'transparent';
        modeScan.style.color = 'var(--md-on-surface-variant)';
        scanPanel.classList.remove('panel-visible');
        scanPanel.classList.add('panel-hidden');
        scanPanel.classList.add('hidden');
        if (qrTypeSection) qrTypeSection.style.display = '';
        document.getElementById('inputFields').style.display = '';
        if (batchModeBtn) batchModeBtn.style.display = '';
        if (sizeSection) sizeSection.style.display = '';
        document.querySelector('.mobile-hidden').style.display = '';
        qrCodeContainer.classList.remove('hidden');
        qrCodeContainer.innerHTML = '';
        if (panelDesign) panelDesign.style.display = '';
        scanResult.classList.remove('result-visible');
        scanResult.classList.add('result-hidden');
        scanResult.classList.add('hidden');
    }

    function showScanMode() {
        modeScan.style.background = 'var(--md-primary)';
        modeScan.style.color = 'var(--md-on-primary)';
        modeGenerate.style.background = 'transparent';
        modeGenerate.style.color = 'var(--md-on-surface-variant)';
        scanPanel.classList.remove('hidden');
        scanPanel.classList.remove('panel-hidden');
        scanPanel.classList.add('panel-visible');
        if (qrTypeSection) qrTypeSection.style.display = 'none';
        document.getElementById('inputFields').style.display = 'none';
        if (batchModeBtn) batchModeBtn.style.display = 'none';
        if (sizeSection) sizeSection.style.display = 'none';
        document.querySelector('.mobile-hidden').style.display = 'none';
        qrCodeContainer.classList.add('hidden');
        if (panelDesign) panelDesign.style.display = 'none';
        scanResult.classList.remove('result-visible');
        scanResult.classList.add('result-hidden');
        scanResult.classList.add('hidden');
    }

    modeGenerate.addEventListener('click', showGenerateMode);
    modeScan.addEventListener('click', showScanMode);

    function detectContentType(text) {
        if (!text) return { type: 'Text', action: null };
        if (/^https?:\/\//i.test(text)) return { type: 'URL', action: 'url', value: text };
        if (/^WIFI:/i.test(text)) return { type: 'WiFi', action: null };
        if (/^BEGIN:VCARD/i.test(text)) return { type: 'vCard', action: null };
        if (/^BEGIN:VCALENDAR/i.test(text)) return { type: 'Calendar', action: null };
        if (/^smsto:/i.test(text)) return { type: 'SMS', action: null };
        if (/^(bitcoin|ethereum):/i.test(text)) return { type: 'Crypto', action: null };
        if (/^tel:/i.test(text)) return { type: 'Phone', action: null };
        if (/^mailto:/i.test(text)) return { type: 'Email', action: null };
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { type: 'Email', action: 'email', value: text };
        return { type: 'Text', action: null };
    }

    function showResult(decodedText) {
        const content = detectContentType(decodedText);
        scanResultType.textContent = content.type;
        scanResultContent.textContent = decodedText;
        scanResult.classList.remove('hidden');
        scanResult.classList.remove('result-hidden');
        scanResult.classList.add('result-visible');
        if (content.action === 'url') {
            scanOpenBtn.classList.remove('hidden');
            scanOpenBtn.textContent = 'Open';
            scanOpenBtn.onclick = () => window.open(content.value, '_blank');
        } else if (content.action === 'email') {
            scanOpenBtn.classList.remove('hidden');
            scanOpenBtn.textContent = 'Email';
            scanOpenBtn.onclick = () => window.location.href = `mailto:${content.value}`;
        } else {
            scanOpenBtn.classList.add('hidden');
        }
    }

    scanCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(scanResultContent.textContent).catch(() => {});
    });

    scanGenerateBtn.addEventListener('click', () => {
        showGenerateMode();
        const text = scanResultContent.textContent;
        const content = detectContentType(text);
        if (content.action === 'url') {
            qrTypeSelect.value = 'url';
        } else {
            qrTypeSelect.value = 'text';
        }
        qrTypeSelect.dispatchEvent(new Event('change'));
        setTimeout(() => {
            const inputField = document.querySelector('#inputFields input');
            if (inputField) {
                inputField.value = text;
                inputField.dispatchEvent(new Event('input'));
            }
        }, 100);
    });

    scanDropZone.addEventListener('click', () => scanFileInput.click());
    scanDropZone.addEventListener('dragover', (e) => { e.preventDefault(); scanDropZone.classList.add('drag-over'); });
    scanDropZone.addEventListener('dragleave', () => scanDropZone.classList.remove('drag-over'));
    scanDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        scanDropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) scanFile(e.dataTransfer.files[0]);
    });
    scanFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) scanFile(e.target.files[0]);
    });

    function scanFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    if (code) {
                        showResult(code.data);
                        showScanPreview(img, code.location);
                    } else {
                        showScanPreview(img, null);
                        scanResultType.textContent = 'Not Found';
                        scanResultContent.textContent = 'No QR code detected in this image.';
                        scanResult.classList.remove('hidden');
                        scanResult.classList.remove('result-hidden');
                        scanResult.classList.add('result-visible');
                    }
                } catch (e) {
                    scanResultType.textContent = 'Error';
                    scanResultContent.textContent = 'Could not decode image. Try a different file.';
                    scanResult.classList.remove('hidden');
                    scanResult.classList.remove('result-hidden');
                    scanResult.classList.add('result-visible');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showScanPreview(img, location) {
        const container = qrCodeContainer;
        container.innerHTML = '';
        container.classList.remove('hidden');

        const maxDim = Math.min(container.clientWidth || 320, 480);
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = w;
        previewCanvas.height = h;
        previewCanvas.style.width = w + 'px';
        previewCanvas.style.height = h + 'px';
        previewCanvas.style.borderRadius = '0.5rem';
        container.appendChild(previewCanvas);

        const pctx = previewCanvas.getContext('2d');
        pctx.drawImage(img, 0, 0, w, h);

        if (location) {
            const pts = ['topLeftCorner', 'topRightCorner', 'bottomRightCorner', 'bottomLeftCorner'];
            pctx.strokeStyle = '#4ade80';
            pctx.lineWidth = Math.max(2, Math.round(3 * scale));
            pctx.beginPath();
            pts.forEach((key, i) => {
                const x = location[key].x * scale;
                const y = location[key].y * scale;
                i === 0 ? pctx.moveTo(x, y) : pctx.lineTo(x, y);
            });
            pctx.closePath();
            pctx.stroke();
            pctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
            pctx.fill();
        }
    }
}
