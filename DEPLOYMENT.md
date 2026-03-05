# GitHub Pages Deployment Guide

QRtist is fully optimized for **zero-config deployment** on GitHub Pages.

## Quick Start (3 Steps)

### 1. Create a GitHub Repository
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: QRtist app"

# Create a new repository on GitHub (don't add README/gitignore)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/qr-generator.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: Select **Deploy from a branch**
   - Branch: Select **main** (or your default branch)
   - Folder: Select **/ (root)**
4. Click **Save**

### 3. Done! ✅
Your app will be live at: `https://YOUR_USERNAME.github.io/qr-generator`

---

## How We're Optimized for GitHub Pages

✅ **100% Static Files** — No build process, no server required  
✅ **Service Worker Ready** — Works offline with caching  
✅ **PWA Support** — Installable on mobile & desktop  
✅ **.nojekyll** — Prevents Jekyll processing  
✅ **404.html** — Handles client-side routing  
✅ **Relative Paths** — Works in any subdirectory  
✅ **CDN Fallback** — Tailwind CSS loads from CDN  

---

## Alternative Deployments

### Deploy to Custom Domain
Add a `CNAME` file with your domain:
```
yourdomain.com
```
Then configure your domain's DNS to point to GitHub Pages.

### Deploy with Custom Repo Name
If your repo is named differently (e.g., `my-qr-tool`), the app will be at:
```
https://YOUR_USERNAME.github.io/my-qr-tool
```
No configuration needed—relative paths handle this automatically!

### Organization Pages
For a repository named `qr-generator` under an organization `my-org`:
```
https://my-org.github.io/qr-generator
```

---

## Performance Tips

- **Gzip enabled** on GitHub Pages (automatic)
- **Service Worker caches** assets for offline use
- **Manifest.json** enables PWA installation
- **Tailwind CSS** loads from trusted CDN with fallback

---

## Troubleshooting

### App not showing at the right URL?
- Check Settings → Pages to confirm source branch
- Clear your browser cache (Ctrl+Shift+Del)
- Wait 30-60 seconds for GitHub to rebuild

### Service Worker not working?
- Open DevTools (F12) → Application → Service Workers
- Check that status shows "activated and running"
- Files must be served over HTTPS (GitHub Pages default ✓)

### Logo not uploading after deep link?
- This is normal—logos are client-side only
- Shareable links use URL hash encoding (features work!)
- For persistent storage, use browser's local storage

---

## Local Testing

Before pushing to GitHub, test locally:

```bash
# Start local server
npm run start

# Or use Python
python -m http.server 8000
```

Then visit: `http://localhost:8000`

---

## Version Updates

When updating the app, GitHub Pages will automatically rebuild.  
Service Worker uses cache busting, so new versions load immediately.

---

Need help? Check the [main README.md](README.md) for features and usage!
