This plan is structured as a **"spec + milestones + prompts"** so the AI can execute sequentially without hallucinating or overcomplicating.

***

## 🚀 **PROJECT SPEC: Client-Side Artistic QR Code Generator**

### 🎯 **Goal**
Single‑page web app (HTML/JS + optional React) hosted on GitHub Pages/Netlify. Matches the attached screenshot's UX:  
- Input QR data (URL/text/email/WiFi/vCard)  
- Live preview with design options: colors, logo upload, frames, patterns/templates  
- Download PNG/SVG  
- **Purely client‑side** (no server, no auth, no analytics)  

### 📱 **Target UX Flow** (exactly like screenshot)
1. **Left panel**: QR type dropdown + input field  
2. **Right panel**:  
   - Color pickers (fg/bg)  
   - Logo upload (drag‑drop + preview)  
   - Frame picker (5‑10 presets: rounded rect, decorative)  
   - Pattern/template picker (dots, circles, rounded, waves; 8 presets)  
3. **Center**: Live QR preview (300x300px default, resizable)  
4. **Bottom**: Download PNG/SVG buttons + "Copy link" (shares the config URL)  

### 🛠 **Tech Stack (Minimal)**
- **Core**: `QRCodeStyling` library (handles 90% of artistic features)  
- **UI**: Vanilla HTML/CSS/JS OR React (your choice) + Tailwind CSS  
- **Canvas**: Native HTML5 for logo/frame overlays  
- **Deploy**: Single `index.html` + assets → GitHub Pages  

### 📦 **Dependencies** (CDN for simplicity)
```
<script src="https://cdn.jsdelivr.net/npm/qrcode-styling@1.6.0-rc.1/lib/qrcode-styling.js"></script>
<link href="https://cdn.tailwindcss.com" rel="stylesheet">
```
(Or npm if React)

***

## 🗺️ **BUILD MILESTONES (Sequential Prompts)**

### **Milestone 1: Basic QR Generator (30min)**
```
Build a single index.html with:
- QRCodeStyling lib via CDN
- Input field for URL
- Button to generate basic black QR in 300x300 div
- Live preview updates on input change
````markdown
This plan is structured as a **"spec + milestones + prompts"** so the AI can execute sequentially without hallucinating or overcomplicating.

***

## 🚀 **PROJECT SPEC: Client-Side Artistic QR Code Generator**

### 🎯 **Goal**
Single‑page web app (HTML/JS + optional React) hosted on GitHub Pages/Netlify. Matches the attached screenshot's UX:  
- Input QR data (URL/text/email/WiFi/vCard)  
- Live preview with design options: colors, logo upload, frames, patterns/templates  
- Download PNG/SVG  
- **Purely client‑side** (no server, no auth, no analytics)

### 📱 **Target UX Flow** (exactly like screenshot)
1. **Left panel**: QR type dropdown + input field  
2. **Right panel**:  
   - Color pickers (fg/bg)  
   - Logo upload (drag‑drop + preview)  
   - Frame picker (5‑10 presets: rounded rect, decorative)  
   - Pattern/template picker (dots, circles, rounded, waves; 8 presets)  
3. **Center**: Live QR preview (300x300px default, resizable)  
4. **Bottom**: Download PNG/SVG buttons + "Copy link" (shares the config URL)

### 🛠 **Tech Stack (Minimal)**
- **Core**: `QRCodeStyling` library (handles 90% of artistic features)  
- **UI**: Vanilla HTML/CSS/JS OR React (your choice) + Tailwind CSS  
- **Canvas**: Native HTML5 for logo/frame overlays  
- **Deploy**: Single `index.html` + assets → GitHub Pages

Note: Verify the exact CDN path/version and license for `QRCodeStyling` before production. If you need a stable build pipeline, prefer an npm dependency with a lockfile.

### 📦 **Dependencies** (CDN for simplicity)
```
<script src="https://cdn.jsdelivr.net/npm/qrcode-styling@1.6.0-rc.1/lib/qrcode-styling.js"></script>
<link href="https://cdn.tailwindcss.com" rel="stylesheet">
```
(Or npm if React)

Optional scanner lib (for local scannability testing):
```
<script src="https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js"></script>
```
or `html5-qrcode` if you want camera-backed scans.

***

## 🗺️ **BUILD MILESTONES (Sequential Prompts)**

### **Milestone 1: Basic QR Generator (30min)**
```
Build a single index.html with:
- QRCodeStyling lib via CDN
- Input field for URL
- Button to generate basic black QR in 300x300 div
- Live preview updates on input change
Test: Enter "https://google.com" → see scannable QR
```

### **Milestone 2: Design Controls (1hr)**
```
Extend the basic generator to add:
- Foreground color picker (#000000 default)
- Background color picker (#FFFFFF default)
- Pattern selector: ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded", "classy-dots"]
Pass these to QRCodeStyling options
Live preview updates instantly
Match screenshot layout (right panel with color swatches + pattern thumbnails)
```

Add: basic contrast enforcement (warn or clamp foreground/background to meet contrast threshold)

### **Milestone 3: Logo + Frames (1.5hr)**
```
Add:
- Logo upload (drag-drop + file input, preview thumbnail)
- Logo options: size slider (10-30% of QR), margin slider (0-50px)
- Frame picker: 6 presets (simple rounded rect, gradient border, decorative corners, etc.) as SVG/PNG overlays
Composite logo + frame on top of QR canvas → final preview
```

Scannability controls & checks to add in this milestone:
- Enforce/advise minimum contrast between foreground and background
- Reserve quiet zone around finder patterns and prevent frames from occluding them
- Limit max logo size (recommend <=20%) and expose error-correction level (M/H)
- Add an automatic heuristic scannability check (contrast + finder pattern visibility). For a real scan test, integrate `jsQR` or `html5-qrcode` in Milestone 4.

### **Milestone 4: QR Types + Polish (1hr)**
```
Add QR type presets:
- URL (default)
- Text
- Email (mailto:)
- Phone (tel:)
- WiFi (WIFI:S:network;T:WPA;P:pass;;)
- vCard (simple name/phone/email)
Auto-populate input based on type

Plus:
- Size slider (200-600px)
- Download PNG + SVG buttons
- Tailwind for clean, responsive design (mobile-friendly)
- Dark mode toggle
```

Also:
- Integrate an optional client-side scan test using `jsQR` or `html5-qrcode` so users can verify scannability with a camera or uploaded image
- Add an "Export config (JSON)" and "Import config" flow to include logos and full presets when sharing full projects (see Milestone 5 notes)

### **Milestone 5: Shareable Config (30min)**
```
- Serialize all settings (data, colors, logo base64?, pattern) to URL hash
- Page loads → parse hash → auto-generate matching QR
- "Copy share link" button
```

Feasibility note (important): Embedding logo images as base64 in the URL hash is impractical because URLs have length limits and many browsers/clients truncate long URLs. Recommended alternatives:
- Serialize everything except logo into the hash (data, colors, patterns, sizes, selected frame). This keeps share links compact.
- Provide `Export config` (JSON) which includes base64-embedded logo and full state for import by another user.
- Optionally persist the last-used logo in `IndexedDB` or `localStorage` (user opt-in) and provide a short share link that references an ID stored locally (not suitable for cross-device sharing without server sync).

### **Milestone 6: Deploy‑Ready Polish (30min)**n+```
Final touches:
- PWA manifest (add to home screen)
- Scannability test button (fake scan simulation)
- Error handling (invalid data, too much logo → unscannable warning)
- README.md with screenshots + deploy instructions
Package as single index.html (inline CSS/JS where possible)
```

Size target note: the hard constraint "< 200KB total size (single HTML)" is optimistic if you inline Tailwind utilities, multiple frame assets, and heavy JS. Using CDN-hosted libraries (Tailwind, QRCodeStyling) keeps the single-file payload small; if you must inline everything for offline use, expect >200KB. Consider relaxing to a CDN-backed single `index.html` plus small assets for the prototype.

***

## 🎨 **Design System (Match Screenshot)**
```
Layout: Flexbox 3-col (input | preview | controls)
Colors: Neutral (#f8fafc bg, #1e293b text) + accent (#3b82f6)
Controls: Grouped sections with icons
- "Design options" → Color pickers
- "Logo" → Upload + presets (camera/user icons)
- "Frames" → 4x2 grid thumbnails
- "Pattern" → 4x2 styled QR thumbnails
Preview: Shadowed card, centered
```

Accessibility note: Add keyboard access to controls, ARIA labels for inputs, and ensure color pickers provide accessible contrast presets.

## 🚀 **Success Criteria**
- Generates scannable artistic QRs matching screenshot
- All features work offline (after first load)
- < 200KB total size (single HTML)
- Mobile responsive
- Deployable to GitHub Pages in <5min

Updated success criteria (practical):
- Generates scannable artistic QRs matching screenshot
- All interactive features work offline after initial CDN cache (or use a small service worker)
- Share links compact (no embedded logo) + `Export/Import JSON` for full-state transfer
- Mobile responsive
- Deployable to GitHub Pages in <5min

***

## 💬 **PROMPT TEMPLATE** (Copy‑paste to AI agent)
```
[PASTE MILESTONE X HERE]

Constraints:
- Pure client-side only (no server, no npm build if possible)
- Use QRCodeStyling CDN
- Tailwind CDN for styling
- Output COMPLETE working index.html (no external deps beyond CDNs)
- Mobile responsive
- Test it works by describing what you see when you open in browser
```

Additional constraints/notes for implementer:
- Don't embed large binary assets into URL hashes. Use `Export/Import JSON` for full configs with logos.
- Add scannability heuristic checks and expose error-correction level to users.
- If you need to test scanning in-browser, include `jsQR` or `html5-qrcode` as an optional dev-time CDN.

````

