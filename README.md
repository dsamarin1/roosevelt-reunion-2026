# Roosevelt High Class of 2006 — 20 Year Reunion

Static one-page site for the Roosevelt High School (Fresno, CA) Class of 2006 reunion on **Saturday, October 10, 2026** at the Simonian Farms Event Center (2629 S. Clovis Avenue, Fresno, CA 93725).

## Structure
- `index.html` — page markup
- `styles.css` — theme (green `#2d6a2d` / gold `#c9a84c`)
- `script.js` — countdown, RSVP submit, photo uploader + gallery
- `assets/logo.png` — Rough Riders crest
- `worker/` — Cloudflare Worker that accepts photo uploads to R2 and lists them

## Editing copy
All text lives in `index.html`. The committee can edit headlines, paragraphs, and committee names there directly — no build step.

## Deploy (GitHub Pages)
1. Push to `main`.
2. Repo Settings → Pages → Source: `Deploy from a branch` → `main` / `/ (root)`.
3. Site goes live at `https://dsamarin1.github.io/roosevelt-reunion-2026/`.

## Photo uploads — Cloudflare Worker + R2

The photo gallery uses a Cloudflare Worker as the upload endpoint and Cloudflare R2 as object storage. The browser uploads via Uppy → Worker → R2; images are served back over the R2 public dev URL and rendered with PhotoSwipe.

### One-time setup
1. Cloudflare dashboard → R2 → bucket `reunion-photos` exists and **Public Development URL** is enabled.
   Public URL: `https://pub-2074dbafae3d4a378c6bc12523b2ba96.r2.dev` (already wired into `worker/src/index.js`).
2. Install Wrangler locally:
   ```
   cd worker
   npm install
   npx wrangler login
   ```

### Deploy the Worker
```
cd worker
npx wrangler deploy
```
First deploy will print the Worker URL, e.g. `https://reunion-uploads.<your-subdomain>.workers.dev`.

### Wire the Worker URL into the site
Edit `index.html` and replace `PLACEHOLDER` in this line with your Cloudflare subdomain:
```html
window.REUNION_WORKER_URL = 'https://reunion-uploads.PLACEHOLDER.workers.dev';
```
Commit + push. Done.

### Worker endpoints
- `POST /upload` — multipart form with field `file` (image, ≤15 MB). Optional `width` / `height` form fields are stored as object metadata so the gallery can size lightbox images without re-probing.
- `GET /photos` — returns `{ photos: [{ url, key, uploadedAt, width, height }] }`, newest first.

### Local dev
```
cd worker
npx wrangler dev
```
Then in `index.html`, point `REUNION_WORKER_URL` at `http://localhost:8787` while testing.

## Integrations
- **RSVPs**: Formspree → `https://formspree.io/f/mnjrgdqk`. Free tier = 50 submissions/month.
- **Donations**: GoFundMe link → `https://gofund.me/b74fce5bf`.
- **Photo storage**: Cloudflare R2 (bucket `reunion-photos`). Free tier: 10 GB storage, 1M writes/mo, 10M reads/mo.
