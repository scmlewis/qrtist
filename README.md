# Artistic QR Code Generator

A beautiful, fully client-side QR code generator with customizable designs, logos, frames, and multiple QR types. **100% offline-capable** — no server required!

> **🚀 Ready for GitHub Pages?** See [DEPLOYMENT.md](DEPLOYMENT.md) for a complete deployment guide with step-by-step instructions!

## 🎯 Features

- **Multiple QR Types**: URL, Text, Email, Phone, WiFi, vCard
- **Customizable Design**: 
  - Foreground & background colors with contrast checking
  - 7 pattern styles (square, dots, rounded, classy, gradient-ready)
  - 6 frame overlays (rounded, gradient, corners, shadow, thick border)
- **Logo Support**: Drag-drop upload with adjustable size (10-30%) and margin
- **Scannability Checks**: Automatic contrast ratio and logo size validation (WCAG AA standard)
- **Size Control**: Resize QR from 200×200px to 600×600px
- **Download Options**: Export as PNG or SVG
- **Shareable Links**: 
  - Compact URL hash sharing (config without logo)
  - Full JSON export/import with embedded logo and settings
  - Deep-linking support: share URLs auto-load saved configs
- **Dark Mode**: Toggle with persistent localStorage preference
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Offline-Capable**: Installable as PWA; works without internet after first load
- **Accessibility**: WCAG contrast checking, keyboard navigation, ARIA labels

## 🚀 Getting Started

### Option 1: Direct Browser Access
Simply open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).

```bash
# No build step required!
# Just serve the single HTML file
python -m http.server 8000  # Python 3
# or
npx http-server          # Node.js
```

Then visit `http://localhost:8000`

### Option 2: GitHub Pages Deployment (Free & Automatic)

1. Fork or create a repository (e.g., `qr-generator`)
2. Place `index.html` and `manifest.json` in the repo root
3. Go to **Settings → Pages** and enable GitHub Pages from the `main` branch
4. Your app will be live at `https://yourusername.github.io/qr-generator`

### Option 3: Netlify Deployment (Drag & Drop)

1. Visit [netlify.com](https://netlify.com)
2. Drag & drop the `index.html` and `manifest.json` files
3. Deploy instantly — live in seconds!

### Option 4: Self-Hosted

Deploy to any static hosting (AWS S3, Vercel, Surge.sh, etc.):

```bash
# Just upload index.html and manifest.json
# No build process needed
```

## 📱 Install as PWA

### Desktop (Chrome/Edge)
1. Click the "Install" button in the browser bar (or open the menu → "Install app")
2. App appears on your desktop with offline access

### Mobile (iOS/Android)
1. Open in mobile browser (Chrome/Firefox)
2. Tap **Share → Add to Home Screen**
3. Tap the app icon to launch fullscreen

## 🎨 Usage Guide

### Basic Workflow
1. **Select QR Type**: URL, Text, Email, Phone, WiFi, or vCard
2. **Enter Data**: Fill in the input fields (e.g., URL, email address)
3. **Customize Design**:
   - Pick foreground & background colors
   - Choose a pattern style
   - (Optional) Upload a logo via drag-drop
   - (Optional) Select a frame overlay
4. **Adjust Size**: Use the QR size slider (200–600px)
5. **Download or Share**:
   - **Download PNG/SVG**: Click the download buttons
   - **Share Link**: Click "Copy Share Link" to get a compact shareable URL
   - **Export Config**: Click "Export Config" to save full settings (including logo) as JSON

### Advanced Features

#### QR Types

- **URL** (default): Standard web links
- **Text**: Plain text (up to ~2953 characters)
- **Email**: Auto-formats `mailto:` links with optional subject
- **Phone**: Auto-formats `tel:` links
- **WiFi**: Network SSID, password, and security type (WPA, WEP, open)
- **vCard**: Contact card with name, email, phone

#### Logo Best Practices
- Recommended size: **20% or less** (automatically enforced warnings at >20%)
- Formats: PNG with transparency recommended
- Size: 200×200px or larger recommended
- The generator uses error-correction level M/H to maintain scannability

#### Frames
- **None**: No overlay
- **Rounded**: Soft rounded rectangle border
- **Gradient**: Colorful gradient border (red to teal)
- **Corners**: Decorative corner accents
- **Shadow**: Drop shadow effect
- **Thick**: Bold border frame

#### Contrast Checking
The app enforces WCAG AA contrast standards (4.5:1 ratio). If you pick a color combination that's too similar, a warning appears — you can still use it, but scannability may be affected.

### Sharing & Config Management

#### Share Link (Compact)
- Does NOT include the logo (to keep URL short)
- Includes: QR type, data, colors, pattern, frame, size
- Others can open the link and see your exact config
- Example: `https://yourdomain.com/#eyJ0eXBlIjoicmwiLCJ2YWx1...`

#### Export Config (Full)
- Includes everything: data, colors, pattern, frame, logo (as base64)
- Exported as `qr-config-TIMESTAMP.json`
- Share via email, Discord, etc.
- Import it later to restore full state

#### Import Config
- Upload a previously exported JSON config file
- All settings (including logo) are restored instantly

## 📋 Technical Details

### Technology Stack
- **QR Generation**: [QRCodeStyling](https://github.com/kozaksylwester/qrcode-styling) (CDN)
- **Styling**: Tailwind CSS (CDN)
- **No Dependencies**: Vanilla JavaScript (no build tools required)
- **Offline**: Service worker for offline-first caching

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

### File Size
- `index.html`: ~20KB (compressed)
- `manifest.json`: ~2KB
- CDN dependencies cached after first load
- **Total offline size**: ~100KB (includes cached libraries)

### Performance
- First load: ~500ms (CDN fetch + render)
- Subsequent loads: Instant (from cache)
- QR generation: <100ms for typical data

## 🔐 Privacy & Security

✅ **100% Client-Side** — No data sent to any server
✅ **No Tracking** — No analytics or cookies (optional localStorage only for dark mode)
✅ **No Ads** — Pure, open-source functionality
✅ **Offline-First** — Works without internet after installation

All processing happens in your browser. QR codes are generated locally and never uploaded anywhere.

## 🛠️ Deployment Checklist

- [ ] Files uploaded: `index.html`, `manifest.json`
- [ ] Web server configured to serve static files
- [ ] HTTPS enabled (recommended for PWA)
- [ ] Manifest linked in HTML `<head>`
- [ ] CORS headers not required (single-origin app)
- [ ] Test on mobile: Install PWA and verify offline access

## 🚀 Performance Tips

1. **Pre-cache assets**: Service worker caches CDN libraries on first visit
2. **Lazy rendering**: QR codes render only on input change
3. **Minimal bundle**: No build step = no bloat, just HTML + CDN calls
4. **Mobile-optimized**: Responsive grid, touch-friendly controls

## 📸 Screenshots & Demo

### Desktop View
- **Left panel**: QR type selector + input fields + download & share buttons
- **Center**: Live QR preview with shadow and border styling
- **Right panel**: Color pickers, pattern selector, logo uploader, frames, dark mode toggle

### Mobile View
- Responsive single-column layout
- Touch-friendly buttons and sliders
- Fullscreen QR preview on tap

## 🤝 Contributing

Found a bug or have a feature request? Feel free to submit an issue or pull request!

## 📄 License

This project is open-source and available for personal and commercial use. Attribution to QRCodeStyling is appreciated.

## 🔗 Links

- **QRCodeStyling**: https://github.com/kozaksylwester/qrcode-styling
- **Tailwind CSS**: https://tailwindcss.com
- **MDN Web Docs**: https://developer.mozilla.org

---

**Made with ❤️ for QR code lovers everywhere.**
