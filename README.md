# QRtist — Create Beautiful, Scannable QR Codes

QRtist is a free, fully client-side QR code generator for creating custom, scannable QR codes with colors, patterns, frames, frames text, gradients, and logos. Export as PNG or SVG. No signups, no servers, and no tracking — everything runs in your browser so your data stays private.

---

---

## Why this exists

Most QR generators are either bare or bloated. QRtist is a small, customizable generator with a built-in scanner and batch export — the tool I wanted and couldn't find.

## Highlights

- Quick: Generate a QR in moments — choose type, add content, style, and download.
- Private: All generation happens locally; nothing is uploaded.
- Offline-capable: Install as a PWA and use without an internet connection.
- Flexible: Export PNG for web or SVG for high-quality print.
- Feature-rich: 11 QR types, 13 design templates, logo presets, gradients, batch generation, and a built-in scanner.

---

## Quick Start (30 seconds)

1. Open [index.html](index.html) in your browser.
2. Choose a QR type: URL, Text, Email, Phone, WiFi, vCard, Google Maps, Calendar Event, SMS, Crypto, or Social Profile.
3. Enter your content and watch the live preview update.
4. Style: pick a template or customize colors, pattern, corners, frame, frame text, and optionally add a logo.
5. Click Download (PNG or SVG) or Copy Share Link to share your design.

---

## Features

- **11 QR types** — URL, text, email, phone, WiFi, vCard, Google Maps, calendar event, SMS, crypto (BTC/ETH), and social profiles (Instagram, X/Twitter, TikTok, LinkedIn, YouTube, GitHub).
- **Design controls** — foreground/background color pickers, gradients, dot/pattern styles, outer & inner corner styles, and frame styles (none, simple, rounded-rect, thick-border, double) with an optional frame text bar.
- **13 ready-made templates** — Classic, Corporate, Facebook, X, Instagram, YouTube, Spotify, TikTok, WhatsApp, Discord, LinkedIn, Ocean, and Minimal.
- **Logo support** — upload your own logo (or drag & drop), pick from built-in brand/icon presets, then resize, recolor, and adjust margin.
- **Scanner** — scan QR codes from an uploaded image (or drop one in), then copy, open, or regenerate the result.
- **Batch generation** — paste a list or upload a CSV, preview the grid, and download as a ZIP or a spreadsheet.
- **Export & share** — PNG and SVG download, full JSON export/import for saving designs, and a Copy Share Link (URL hash) for sharing.
- **Undo/redo & reset** — step backward/forward through changes, or reset the design.
- **Accessibility helpers** — contrast warnings and scannability feedback to help keep codes scannable.

---

## Use Cases

- Marketing: branded QR on flyers and posters that matches your colors.
- Business cards: vCard QR with your logo for instant contact sharing.
- Events: a WiFi QR so guests can join the network with one scan.
- E-commerce: crypto address QR for accepting payments.
- Menus & signage: maps QR to point customers to your location.

---

## Best Practices

- Keep logos small (about 20% of the QR) to avoid breaking scans.
- Use strong contrast between foreground and background.
- Prefer SVG for print; PNG works well for screens and quick sharing.

---

## Tips

- If a scanner has trouble, reduce logo size, increase contrast, or add margin.
- For print, test at the final physical size to confirm scannability.
- Use the contrast warning to catch low-contrast combinations before downloading.

---

## Install (optional)

- Desktop: Chrome/Edge show an install option in the address bar.
- Mobile: use "Add to Home Screen" in your browser menu.

---

## FAQ

- Will my data be uploaded? No. All QR creation happens in your browser.
- What file should I use for print? Use SVG for the best quality.
- Why won't my QR scan sometimes? Check contrast, reduce logo size, and ensure enough quiet margin.

---

## Troubleshooting

- Blurry or pixelated preview: export SVG for a crisp result.
- Scanner fails: try a different phone app, increase quiet zone, or simplify design.
- Stale version after an update: do a hard refresh (Ctrl+Shift+R) or unregister the service worker (DevTools → Application → Service Workers → Unregister).

---

## Privacy & Security

- 100% client-side generation — nothing leaves your device.
- No tracking or analytics included by default.

---

## Credits & Links

- QR generation library (`QRCodeLib`, bundled in `qr-bundle.js`) and QR styling renderer (bundled in `js/design/renderer.js`).
- jsQR — QR decoding for the built-in scanner: https://github.com/cozmo/jsQR
- JSZip — ZIP generation for batch downloads: https://stuk.github.io/jszip/
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Tech Stack

- Vanilla JavaScript (ES modules, no build step), HTML, and CSS
- `QRCodeLib` — QR code data generation (bundled locally)
- Custom canvas/SVG renderer — styling, frames, logos, and exports (bundled locally)
- Tailwind CSS (via CDN) — utility-first styles used in the UI
- lucide (via CDN) — UI icons
- jsQR (via CDN) — QR scanning
- JSZip (via CDN) — ZIP downloads for batch mode
- Service worker — offline caching and PWA support
- Exports: SVG (vector) and PNG (raster) via browser APIs

---

## Contributing

- Found a bug or have an idea? Open an issue or submit a pull request.

---

## License

- Open source — attribution appreciated.

---

Made with ❤️ — enjoy creating QR codes!
---

If this saved you time or gave you an idea, a ⭐ on the repo is appreciated — it helps others find it.
