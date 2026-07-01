import { Uppy, Dashboard, XHRUpload } from 'https://releases.transloadit.com/uppy/v4.4.0/uppy.min.mjs';
import PhotoSwipeLightbox from 'https://unpkg.com/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js';

// ---------------------------------------------------------------------------
// Countdown — Sept 26, 2026 at 5:00 PM Pacific (PDT, UTC-7).
// ---------------------------------------------------------------------------
const EVENT_TIME = new Date('2026-09-26T17:00:00-07:00').getTime();
const cd = {
  days: document.getElementById('cd-days'),
  hours: document.getElementById('cd-hours'),
  minutes: document.getElementById('cd-minutes'),
  seconds: document.getElementById('cd-seconds'),
};

const pad = (n) => (n < 10 ? '0' + n : String(n));

function tickCountdown() {
  const diff = EVENT_TIME - Date.now();
  if (diff <= 0) {
    cd.days.textContent = '0';
    cd.hours.textContent = cd.minutes.textContent = cd.seconds.textContent = '00';
    return false;
  }
  let s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  cd.days.textContent = String(d);
  cd.hours.textContent = pad(h);
  cd.minutes.textContent = pad(m);
  cd.seconds.textContent = pad(s);
  return true;
}

if (cd.days) {
  tickCountdown();
  const iv = setInterval(() => { if (!tickCountdown()) clearInterval(iv); }, 1000);
}

// ---------------------------------------------------------------------------
// RSVP form — submit via fetch so visitors stay on the page.
// ---------------------------------------------------------------------------
const form = document.getElementById('rsvp-form');
const formStatus = document.getElementById('form-status');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    formStatus.className = 'form-status';
    formStatus.textContent = 'Sending…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        form.reset();
        formStatus.className = 'form-status success';
        formStatus.textContent = 'Thank you! Your RSVP has been received. See you September 26th!';
      } else {
        const body = await res.json().catch(() => ({}));
        const msg = body?.errors?.map((x) => x.message).join(', ') ||
          'Something went wrong. Please try again or email rhsfresno06@gmail.com.';
        formStatus.className = 'form-status error';
        formStatus.textContent = msg;
      }
    } catch {
      formStatus.className = 'form-status error';
      formStatus.textContent = 'Network error. Please try again or email rhsfresno06@gmail.com.';
    }
  });
}

// ---------------------------------------------------------------------------
// Photo gallery — Uppy uploader + PhotoSwipe lightbox.
// ---------------------------------------------------------------------------
const WORKER_URL = window.REUNION_WORKER_URL;

async function readImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null }); };
    img.src = url;
  });
}

function isHeic(file) {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
}

// Lazy-load the HEIC decoder only when an HEIC actually shows up so the
// ~500 KB wasm bundle never touches the page for non-iPhone users.
let heic2anyPromise;
function loadHeic2any() {
  if (!heic2anyPromise) {
    heic2anyPromise = import('https://esm.sh/heic2any@0.0.4').then((m) => m.default || m);
  }
  return heic2anyPromise;
}

async function convertHeicToJpeg(blob, originalName) {
  const heic2any = await loadHeic2any();
  const out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
  const jpegBlob = Array.isArray(out) ? out[0] : out;
  const newName = (originalName || 'photo').replace(/\.(heic|heif)$/i, '') + '.jpg';
  return new File([jpegBlob], newName, { type: 'image/jpeg' });
}

function initUploader() {
  const target = document.getElementById('uppy-uploader');
  if (!target) return null;

  const uppy = new Uppy({
    debug: false,
    autoProceed: false,
    restrictions: {
      maxFileSize: 15 * 1024 * 1024,
      allowedFileTypes: ['image/*', '.heic', '.heif'],
    },
  })
    .use(Dashboard, {
      inline: true,
      target,
      height: 360,
      proudlyDisplayPoweredByUppy: false,
      note: 'Up to 15 MB per photo. JPG, PNG, HEIC (auto-converted), WebP.',
    })
    .use(XHRUpload, {
      endpoint: `${WORKER_URL}/upload`,
      fieldName: 'file',
      formData: true,
    });

  uppy.addPreProcessor(async (fileIDs) => {
    for (const id of fileIDs) {
      const file = uppy.getFile(id);
      if (!file?.data) continue;

      let data = file.data;

      if (isHeic(file)) {
        uppy.emit('preprocess-progress', file, { mode: 'indeterminate', message: 'Converting HEIC…' });
        try {
          const jpeg = await convertHeicToJpeg(file.data, file.name);
          uppy.setFileState(id, {
            data: jpeg,
            size: jpeg.size,
            type: jpeg.type,
            extension: 'jpg',
            name: jpeg.name,
          });
          data = jpeg;
        } catch (err) {
          console.error('HEIC conversion failed', err);
          uppy.info(`Couldn't convert ${file.name}. Try saving it as JPEG first.`, 'error', 5000);
          uppy.removeFile(id);
          continue;
        }
      }

      const { width, height } = await readImageDimensions(data);
      if (width && height) {
        uppy.setFileMeta(id, { width, height });
      }
    }
  });

  uppy.on('complete', (result) => {
    if (result.successful.length > 0) refreshGallery();
  });

  return uppy;
}

const grid = document.getElementById('gallery-grid');

async function refreshGallery() {
  if (!grid) return;
  try {
    const res = await fetch(`${WORKER_URL}/photos`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { photos } = await res.json();
    renderGallery(photos);
  } catch (err) {
    grid.innerHTML = '<p class="muted center gallery-empty">Couldn\'t load photos. Try refreshing.</p>';
    console.error('gallery fetch failed', err);
  }
}

function renderGallery(photos) {
  if (!photos || photos.length === 0) {
    grid.innerHTML = '<p class="muted center gallery-empty">No photos yet — be the first to upload!</p>';
    return;
  }

  grid.innerHTML = '';
  for (const photo of photos) {
    const a = document.createElement('a');
    a.href = photo.url;
    a.className = 'gallery-item';
    a.target = '_blank';
    a.rel = 'noopener';
    if (photo.width && photo.height) {
      a.setAttribute('data-pswp-width', photo.width);
      a.setAttribute('data-pswp-height', photo.height);
    }

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = 'Reunion photo';
    img.loading = 'lazy';
    a.appendChild(img);

    // For images uploaded before dimension-probing existed, fill in on load
    // so PhotoSwipe can size them when opened.
    if (!photo.width || !photo.height) {
      img.addEventListener('load', () => {
        a.setAttribute('data-pswp-width', img.naturalWidth);
        a.setAttribute('data-pswp-height', img.naturalHeight);
      });
    }

    grid.appendChild(a);
  }
}

function initLightbox() {
  if (!grid) return;
  const lightbox = new PhotoSwipeLightbox({
    gallery: '#gallery-grid',
    children: 'a.gallery-item',
    pswpModule: () => import('https://unpkg.com/photoswipe@5.4.4/dist/photoswipe.esm.min.js'),
  });
  lightbox.init();
}

if (WORKER_URL && !WORKER_URL.includes('PLACEHOLDER')) {
  initUploader();
  initLightbox();
  refreshGallery();
} else if (grid) {
  grid.innerHTML = '<p class="muted center gallery-empty">Photo gallery not yet configured.</p>';
}
