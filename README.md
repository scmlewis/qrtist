# QRtist — Create Beautiful, Scannable QR Codes

QRtist helps you make attractive, reliable QR codes quickly — no signups, no servers, and no tracking. Everything runs in your browser so your data stays private. Use it for posters, business cards, event signs, and more.

---

## Highlights

- Quick: Generate a QR in moments — choose type, add content, style, and download.
- Private: All generation happens locally; nothing is uploaded.
- Offline-capable: Install as a PWA and use without an internet connection.
- Flexible: Export PNG for web or SVG for high-quality print.

---

## Quick Start (30 seconds)

1. Open [index.html](index.html) in your browser.
2. Choose a QR type: URL, Text, Email, Phone, WiFi, or vCard.
3. Enter your content and watch the live preview update.
4. Style: pick colors, a pattern, a frame, and optionally add a logo.
5. Click Download (PNG or SVG) or Copy Share Link to share your design.

---

## Features

- Multiple QR types (URL, text, email, phone, WiFi, vCard).
- Design controls: color pickers, pattern styles, frames, and gradients.
- Logo support: drag & drop a logo, then resize and center it.
- Export: PNG and SVG; full JSON export/import for saving designs.
- Accessibility helpers: contrast warnings to help keep codes scannable.

---

## Use Cases

- Marketing: branded QR on flyers and posters that matches your colors.
- Business cards: vCard QR with your logo for instant contact sharing.
- Events: a WiFi QR so guests can join the network with one scan.

---

## Best Practices

- Keep logos small (about 20% of the QR) to avoid breaking scans.
- Use strong contrast between foreground and background.
- Prefer SVG for print; PNG works well for screens and quick sharing.

---

## Tips

- If a scanner has trouble, reduce logo size, increase contrast, or add margin.
- For print, test at the final physical size to confirm scannability.

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

---

## Privacy & Security

- 100% client-side generation — nothing leaves your device.
- No tracking or analytics included by default.

---

## Credits & Links

- qrcode-styling (used for rendering & exports): https://github.com/kozaksylwester/qrcode-styling
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Tech Stack

- `qrcode-styling` — renders QR codes to Canvas/SVG and supports styling and exports (CDN): https://github.com/kozaksylwester/qrcode-styling
- Tailwind CSS (via CDN) — utility-first styles used in the UI
- Vanilla JavaScript, HTML, and CSS — no build step required
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
