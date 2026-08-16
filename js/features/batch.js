import { showToast } from '../core/toast.js';

export function initBatch() {
    const batchBtn = document.getElementById('batchModeBtn');
    const overlay = document.getElementById('batchOverlay');
    const closeBtn = document.getElementById('batchCloseBtn');
    const backBtn = document.getElementById('batchBackBtn');
    const pasteTab = document.getElementById('batchPasteTab');
    const csvTab = document.getElementById('batchCsvTab');
    const pastePanel = document.getElementById('batchPastePanel');
    const csvPanel = document.getElementById('batchCsvPanel');
    const pasteInput = document.getElementById('batchPasteInput');
    const dropZone = document.getElementById('batchDropZone');
    const csvInput = document.getElementById('batchCsvInput');
    const preview = document.getElementById('batchPreview');
    const grid = document.getElementById('batchGrid');
    const countEl = document.getElementById('batchCount');
    const downloadZip = document.getElementById('batchDownloadZip');
    const downloadSheet = document.getElementById('batchDownloadSheet');

    if (!batchBtn || !overlay) return;

    let batchItems = [];

    function openOverlay() { overlay.classList.remove('hidden'); }
    function closeOverlay() { overlay.classList.add('hidden'); }

    batchBtn.addEventListener('click', openOverlay);
    closeBtn.addEventListener('click', closeOverlay);
    backBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

    pasteTab.addEventListener('click', () => {
        pasteTab.style.background = 'var(--md-primary)';
        pasteTab.style.color = 'var(--md-on-primary)';
        csvTab.style.background = 'transparent';
        csvTab.style.color = 'var(--md-on-surface-variant)';
        pastePanel.classList.remove('hidden');
        csvPanel.classList.add('hidden');
    });
    csvTab.addEventListener('click', () => {
        csvTab.style.background = 'var(--md-primary)';
        csvTab.style.color = 'var(--md-on-primary)';
        pasteTab.style.background = 'transparent';
        pasteTab.style.color = 'var(--md-on-surface-variant)';
        csvPanel.classList.remove('hidden');
        pastePanel.classList.add('hidden');
    });

    pasteInput.addEventListener('input', () => {
        const lines = pasteInput.value.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 100);
        batchItems = lines.map((line, i) => ({ data: line, label: `qr-${String(i + 1).padStart(3, '0')}`, color: null }));
        renderPreview();
    });

    dropZone.addEventListener('click', () => csvInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) parseCsv(e.dataTransfer.files[0]);
    });
    csvInput.addEventListener('change', (e) => {
        if (e.target.files.length) parseCsv(e.target.files[0]);
    });

    function parseCsv(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
            if (rows.length < 2) return;
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            const dataIdx = headers.indexOf('data');
            const labelIdx = headers.indexOf('label');
            const colorIdx = headers.indexOf('color');
            batchItems = [];
            for (let i = 1; i < Math.min(rows.length, 101); i++) {
                const cols = rows[i].split(',').map(c => c.trim());
                batchItems.push({
                    data: dataIdx >= 0 ? cols[dataIdx] : cols[0],
                    label: labelIdx >= 0 ? cols[labelIdx] : `qr-${String(i).padStart(3, '0')}`,
                    color: colorIdx >= 0 ? cols[colorIdx] : null
                });
            }
            renderPreview();
        };
        reader.readAsText(file);
    }

    function renderPreview() {
        grid.innerHTML = '';
        countEl.textContent = batchItems.length;
        if (batchItems.length === 0) {
            preview.classList.add('hidden');
            downloadZip.classList.add('hidden');
            downloadSheet.classList.add('hidden');
            return;
        }
        preview.classList.remove('hidden');
        downloadZip.classList.remove('hidden');
        downloadSheet.classList.remove('hidden');

        const fgColor = document.getElementById('fgColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const currentPattern = document.querySelector('.shape-btn.selected')?.dataset.pattern || 'square';
        const currentOuterCorner = document.querySelector('#outerCornerGrid .corner-btn.selected')?.dataset.outer || 'square';
        const currentInnerCorner = document.querySelector('#innerCornerGrid .corner-btn.selected')?.dataset.inner || 'square';

        batchItems.forEach((item, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'flex flex-col items-center gap-1';
            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'batch-thumb';
            canvasWrap.style.width = '80px';
            canvasWrap.style.height = '80px';
            canvasWrap.style.borderRadius = '0.5rem';
            canvasWrap.style.background = 'var(--md-surface-container-highest)';
            canvasWrap.style.border = '1px solid var(--md-outline-variant)';
            canvasWrap.style.overflow = 'hidden';
            const label = document.createElement('span');
            label.className = 'text-[10px] truncate w-full text-center';
            label.style.color = 'var(--md-on-surface-variant)';
            label.textContent = item.label;
            thumb.appendChild(canvasWrap);
            thumb.appendChild(label);
            grid.appendChild(thumb);

            const miniQr = new QRCodeStyling({
                width: 80,
                height: 80,
                data: item.data.substring(0, 200),
                dotsOptions: { color: item.color || fgColor, type: currentPattern },
                backgroundOptions: { color: bgColor },
                cornersSquareOptions: { type: currentOuterCorner },
                cornersDotOptions: { type: currentInnerCorner },
                margin: 2,
                errorCorrectionLevel: 'M'
            });
            miniQr.append(canvasWrap);
        });
    }

    downloadZip.addEventListener('click', async () => {
        if (!batchItems.length || typeof JSZip === 'undefined') return;
        const zip = new JSZip();
        const fgColor = document.getElementById('fgColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const currentPattern = document.querySelector('.shape-btn.selected')?.dataset.pattern || 'square';
        const currentOuterCorner = document.querySelector('#outerCornerGrid .corner-btn.selected')?.dataset.outer || 'square';
        const currentInnerCorner = document.querySelector('#innerCornerGrid .corner-btn.selected')?.dataset.inner || 'square';
        const size = parseInt(document.getElementById('qrSize').value) || 300;

        downloadZip.textContent = 'Generating...';
        downloadZip.disabled = true;

        let skipped = 0;
        for (const item of batchItems) {
            try {
                const qr = new QRCodeStyling({
                    width: size,
                    height: size,
                    data: item.data.substring(0, 200),
                    dotsOptions: { color: item.color || fgColor, type: currentPattern },
                    backgroundOptions: { color: bgColor },
                    cornersSquareOptions: { type: currentOuterCorner },
                    cornersDotOptions: { type: currentInnerCorner },
                    margin: 10,
                    errorCorrectionLevel: 'M'
                });
                const wrap = document.createElement('div');
                wrap.style.width = size + 'px';
                wrap.style.height = size + 'px';
                qr.append(wrap);
                const canvas = qr.canvas;
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                zip.file(`${item.label}.png`, blob);
            } catch (e) {
                skipped++;
                console.warn('Skipping batch item ' + item.label + ': ' + e.message);
            }
        }

        if (skipped > 0) showToast(skipped + ' item(s) skipped due to invalid data', 'warn');

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrtist-batch.zip';
        a.click();
        URL.revokeObjectURL(url);

        downloadZip.textContent = 'Download ZIP';
        downloadZip.disabled = false;
    });

    downloadSheet.addEventListener('click', () => {
        if (!batchItems.length) return;
        const fgColor = document.getElementById('fgColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const cols = 4;
        const cellSize = 200;
        const padding = 20;
        const rows = Math.ceil(batchItems.length / cols);
        const svgW = cols * (cellSize + padding) + padding;
        const svgH = rows * (cellSize + padding + 30) + padding;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
        svgContent += `<rect width="${svgW}" height="${svgH}" fill="${bgColor}"/>`;

        batchItems.forEach((item, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = padding + col * (cellSize + padding);
            const y = padding + row * (cellSize + padding + 30);
            svgContent += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="white" stroke="#ccc" stroke-width="2" rx="8"/>`;
            svgContent += `<text x="${x + cellSize / 2}" y="${y + cellSize / 2}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#666">QR: ${item.label}</text>`;
            svgContent += `<text x="${x + cellSize / 2}" y="${y + cellSize + 16}" text-anchor="middle" font-size="11" fill="#333" font-weight="600">${item.label}</text>`;
        });

        svgContent += '</svg>';

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrtist-sheet.svg';
        a.click();
        URL.revokeObjectURL(url);
    });
}
