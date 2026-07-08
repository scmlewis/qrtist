# Logo Color Tint — Design Spec

## Summary

Add a "Logo Color" picker to the logo controls, letting users tint both preset and custom logos to match their QR code's color scheme.

## Current State

- 3 preset logos (globe, scan-brackets, scan-text) — SVGs using `currentColor`, always render as black
- Custom uploaded logos — raster images drawn as-is to canvas
- Controls: only size (10-30%) and margin (0-50px)

## Design

### State

- New global: `let logoColor = '#000000';`
- Added to `getConfig()`: `logoColor: logoColor`
- Added to `applyConfig()`: restores `logoColor`
- Added to `getConfigHash()` for share links
- Added to `exportConfig()` / `importConfig()`

### Preset Logo Rendering

`getLogoPresetDataUrl(preset)` becomes `getLogoPresetDataUrl(preset, color)`. Replaces `currentColor` in SVG string with selected color:

```js
function getLogoPresetDataUrl(preset, color) {
    const svg = LOGO_PRESETS[preset];
    if (!svg) return null;
    const colored = svg.replace(/currentColor/g, color || '#000000');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(colored);
}
```

### Custom Logo Tint

In `processFrameAndLogo`, after `ctx.drawImage(logoImg, ...)`, if `logoColor !== '#000000'`:

1. Save context state
2. Set `ctx.globalCompositeOperation = 'source-atop'`
3. Fill logo bounding rect with `logoColor`
4. Restore context state

This tints the image while preserving its alpha channel.

### UI

Color picker row in logo controls section (below size/margin), visible when any logo is active. Same pattern as `fgColor`/`bgColor` — `<input type="color">` + `<input type="text">` pair. Label: "Logo Color".

### SVG Export

In `generateStyledSVG`, when `logoColor !== '#000000'`, add a semi-transparent color overlay `<rect>` over the logo with `style="mix-blend-mode:multiply"`.

### Reset

`doReset()` resets `logoColor` to `'#000000'`.

### Undo/Redo

Logo color is included in the config snapshot, so undo/redo preserves it.

## Files Modified

- `app.js` — state, config, rendering, UI event handlers, SVG export, reset
- `index.html` — logo color picker UI elements in logo controls section

## Testing

- Select each preset logo, change color, verify tint applies
- Upload custom image, change color, verify tint applies
- Reset design, verify logo color resets to black
- Undo/redo with logo color changes
- Export/import config with custom logo color
- Share link preserves logo color
- SVG export includes logo color overlay
