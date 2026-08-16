export function drawFinderOuter(ctx, inset, type, fullSize) {
    const s = fullSize - inset * 2;
    const x0 = inset, y0 = inset;
    const lx = x0 + s / 2, ly = y0 + s / 2;
    switch (type) {
        case 'circle':
            ctx.beginPath(); ctx.arc(lx, ly, s / 2, 0, Math.PI * 2); ctx.fill(); break;
        case 'rounded':
            ctx.beginPath(); ctx.roundRect(x0, y0, s, s, s * 0.22); ctx.fill(); break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(lx, y0); ctx.lineTo(x0 + s, ly); ctx.lineTo(lx, y0 + s); ctx.lineTo(x0, ly);
            ctx.closePath(); ctx.fill(); break;
        case 'octagon': {
            const cut = s * 0.22;
            ctx.beginPath();
            ctx.moveTo(x0 + cut, y0); ctx.lineTo(x0 + s - cut, y0);
            ctx.lineTo(x0 + s, y0 + cut); ctx.lineTo(x0 + s, y0 + s - cut);
            ctx.lineTo(x0 + s - cut, y0 + s); ctx.lineTo(x0 + cut, y0 + s);
            ctx.lineTo(x0, y0 + s - cut); ctx.lineTo(x0, y0 + cut);
            ctx.closePath(); ctx.fill(); break;
        }
        case 'squircle':
            ctx.beginPath(); ctx.roundRect(x0, y0, s, s, s * 0.38); ctx.fill(); break;
        default:
            ctx.fillRect(x0, y0, s, s);
    }
}

function drawStarPath(ctx, cx, cy, outerR, innerR, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
}

export function drawFinderInner(ctx, type, cx, cy, innerSize) {
    switch (type) {
        case 'dot':
            ctx.beginPath(); ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2); ctx.fill(); break;
        case 'rounded':
            ctx.beginPath(); ctx.roundRect(cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize, innerSize * 0.28); ctx.fill(); break;
        case 'star':
            drawStarPath(ctx, cx, cy, innerSize * 0.56, innerSize * 0.22, 5); ctx.fill(); break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(cx, cy - innerSize / 2); ctx.lineTo(cx + innerSize / 2, cy);
            ctx.lineTo(cx, cy + innerSize / 2); ctx.lineTo(cx - innerSize / 2, cy);
            ctx.closePath(); ctx.fill(); break;
        case 'cross':
            ctx.fillRect(cx - innerSize / 6, cy - innerSize / 2, innerSize / 3, innerSize);
            ctx.fillRect(cx - innerSize / 2, cy - innerSize / 6, innerSize, innerSize / 3); break;
        default:
            ctx.fillRect(cx - innerSize / 2, cy - innerSize / 2, innerSize, innerSize);
    }
}

export function isFinderModule(row, col, n) {
    if (row < 7 && col < 7) return true;
    if (row < 7 && col >= n - 7) return true;
    if (row >= n - 7 && col < 7) return true;
    return false;
}
