const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const PLATFORM_VALUES = new Set(['iOS', 'Android']);
const WINDOW_SECONDS = 900;
const WINDOW_LIMIT = 5;
const MAX_BODY_BYTES = 8192;

function jsonResponse(status, value, origin, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
      vary: 'origin',
      ...headers,
    },
  });
}

function safeText(value, maxLength = 160) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function validEmail(input) {
  if (typeof input !== 'string' || input.length > 254) return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || email.includes('..') || !EMAIL_PATTERN.test(email)) return null;
  const [local, domain] = email.split('@');
  if (!local || local.length > 64 || domain.length > 253 || domain.split('.').some(label => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null;
  return email;
}

function parseAllowlist(value) {
  return (value || '').split(',').map(item => item.trim().replace(/\/$/, '')).filter(Boolean);
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

function requestIP(request) {
  const forwarded = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded && forwarded.length <= 64 ? forwarded : null;
}

async function databaseRequest({ fetcher, url, key, path, method = 'POST', body, prefer }) {
  const response = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { response, data };
}

export async function handleWaitlistRequest(request, env, options = {}) {
  const fetcher = options.fetcher || fetch;
  const now = options.now || (() => Date.now());
  const allowedOrigins = parseAllowlist(env.WAITLIST_ALLOWED_ORIGINS);
  const databaseKey = env.WAITLIST_DB_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = request.headers.get('origin');

  if (!allowedOrigins.length || !env.SUPABASE_URL || !databaseKey || !env.WAITLIST_RATE_LIMIT_SECRET) {
    return jsonResponse(503, { error: 'waitlist_unavailable' }, allowedOrigins.includes(origin) ? origin : 'null');
  }
  if (!origin || !allowedOrigins.includes(origin)) return jsonResponse(403, { error: 'origin_not_allowed' }, 'null');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400', vary: 'origin',
  } });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' }, origin, { allow: 'POST, OPTIONS' });
  if (request.headers.get('content-type')?.toLowerCase().split(';')[0].trim() !== 'application/json') {
    return jsonResponse(415, { error: 'unsupported_media_type' }, origin);
  }
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_BODY_BYTES) return jsonResponse(413, { error: 'payload_too_large' }, origin);

  let payload;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return jsonResponse(413, { error: 'payload_too_large' }, origin);
    payload = JSON.parse(text);
  } catch { return jsonResponse(400, { error: 'invalid_request' }, origin); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return jsonResponse(400, { error: 'invalid_request' }, origin);

  // A decoy field catches basic bots; a minimum human fill time catches instant scripts.
  if (payload.company) return jsonResponse(422, { error: 'invalid_request' }, origin);
  const elapsed = Number(payload.elapsed_ms);
  if (!Number.isFinite(elapsed) || elapsed < 1800) {
    return jsonResponse(422, { error: 'invalid_request' }, origin);
  }
  const email = validEmail(payload.email);
  if (!email) return jsonResponse(400, { error: 'invalid_email' }, origin);
  if (payload.platform != null && payload.platform !== '' && !PLATFORM_VALUES.has(payload.platform)) {
    return jsonResponse(400, { error: 'invalid_platform' }, origin);
  }
  if (payload.consent !== true) return jsonResponse(400, { error: 'consent_required' }, origin);

  const ip = requestIP(request);
  if (!ip) return jsonResponse(403, { error: 'request_rejected' }, origin);
  const day = new Date(now()).toISOString().slice(0, 10);
  let scopeHash;
  try { scopeHash = await hmacHex(env.WAITLIST_RATE_LIMIT_SECRET, `${day}:${ip}`); }
  catch { return jsonResponse(503, { error: 'temporarily_unavailable' }, origin); }

  try {
    const rate = await databaseRequest({
      fetcher, url: env.SUPABASE_URL, key: databaseKey,
      path: 'rpc/check_desvape_waitlist_rate_limit', body: { p_scope_hash: scopeHash, p_limit: WINDOW_LIMIT, p_window_seconds: WINDOW_SECONDS },
    });
    if (!rate.response.ok) return jsonResponse(503, { error: 'temporarily_unavailable' }, origin);
    const result = Array.isArray(rate.data) ? rate.data[0] : rate.data;
    if (!result?.allowed) return jsonResponse(429, { error: 'rate_limited', retry_after: result?.retry_after || WINDOW_SECONDS }, origin, { 'retry-after': String(result?.retry_after || WINDOW_SECONDS) });

    const metadata = payload.utm && typeof payload.utm === 'object' && !Array.isArray(payload.utm) ? payload.utm : {};
    const utm = Object.fromEntries(UTM_FIELDS.map(key => [key, safeText(metadata[key])]).filter(([, value]) => value));
    const referrerHost = (() => {
      const referer = request.headers.get('referer');
      if (!referer) return null;
      try { return new URL(referer).hostname.slice(0, 253) || null; }
      catch { return null; }
    })();
    const timestamp = new Date(now()).toISOString();
    const saved = await databaseRequest({
      fetcher, url: env.SUPABASE_URL, key: databaseKey,
      path: 'desvape_launch_waitlist?on_conflict=email',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        email,
        platform: payload.platform || null,
        utm: Object.keys(utm).length ? utm : null,
        referrer_host: referrerHost,
        consented_at: timestamp,
      },
    });
    if (!saved.response.ok) return jsonResponse(503, { error: 'temporarily_unavailable' }, origin);

    // The same response covers new entries and prior, persisted entries. No address enumeration.
    return jsonResponse(200, { ok: true }, origin);
  } catch {
    return jsonResponse(503, { error: 'temporarily_unavailable' }, origin);
  }
}
