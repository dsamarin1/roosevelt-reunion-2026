const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const PUBLIC_BASE = 'https://pub-2074dbafae3d4a378c6bc12523b2ba96.r2.dev';

const EXT_FOR_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method === 'POST' && url.pathname === '/upload') {
      return handleUpload(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/photos') {
      return handleList(env);
    }

    return json({ error: 'not found' }, 404);
  },
};

async function handleUpload(request, env) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return json({ error: 'expected multipart/form-data' }, 400);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'malformed form data' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return json({ error: 'missing file field' }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: `unsupported type: ${file.type || 'unknown'}` }, 415);
  }

  if (file.size > MAX_SIZE) {
    return json({ error: 'file too large (15 MB max)' }, 413);
  }

  // Optional client-provided dimensions, stored as custom metadata so the
  // gallery can render without re-probing every image.
  const width = form.get('width');
  const height = form.get('height');

  const ext = EXT_FOR_MIME[file.type] || '';
  const key = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  const customMetadata = {};
  if (width) customMetadata.width = String(width);
  if (height) customMetadata.height = String(height);

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata,
  });

  return json({ url: `${PUBLIC_BASE}/${key}`, key });
}

async function handleList(env) {
  const list = await env.BUCKET.list({ limit: 1000, include: ['customMetadata'] });

  const photos = list.objects
    .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded))
    .map((o) => ({
      url: `${PUBLIC_BASE}/${o.key}`,
      key: o.key,
      uploadedAt: o.uploaded,
      width: o.customMetadata?.width ? Number(o.customMetadata.width) : null,
      height: o.customMetadata?.height ? Number(o.customMetadata.height) : null,
    }));

  return json({ photos });
}
