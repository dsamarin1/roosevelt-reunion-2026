# Roosevelt High Class of 2006 — 20 Year Reunion

Static one-page site for the Roosevelt High School (Fresno, CA) Class of 2006 reunion on **Saturday, September 26, 2026**.

## Structure
- `index.html` — page markup
- `styles.css` — theme (green `#2d6a2d` / gold `#c9a84c`)
- `script.js` — countdown timer + RSVP form submit
- `assets/logo.png` — Rough Riders crest (drop the file here)

## Editing copy
All text lives in `index.html`. The committee can edit headlines, paragraphs, and committee names there directly — no build step.

## Deploy (GitHub Pages)
1. Push to `main`.
2. Repo Settings → Pages → Source: `Deploy from a branch` → `main` / `/ (root)`.
3. Site goes live at `https://<user>.github.io/roosevelt-reunion-2026/`.

## Integrations
- **RSVPs**: Formspree → `https://formspree.io/f/mnjrgdqk`. Free tier = 50 submissions/month.
- **Photos**: Google Drive folder embedded via `embeddedfolderview`. The folder must be set to **"Anyone with the link — Viewer"** in Drive sharing settings or visitors will hit a login wall.
- **Donations**: GoFundMe link → `https://gofund.me/b74fce5bf`.
