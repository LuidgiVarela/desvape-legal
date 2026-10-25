const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleWaitlistRequest } = require('../supabase/functions/_shared/waitlist.mjs');

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-secret',
  WAITLIST_RATE_LIMIT_SECRET: 'secret-with-more-than-thirty-two-random-characters',
  WAITLIST_ALLOWED_ORIGINS: 'https://luidgivarela.github.io, https://www.example.test',
};
const ip = '203.0.113.24';
function request(body = {}, options = {}) {
  const headers = {
    origin: options.origin || 'https://luidgivarela.github.io',
    'content-type': options.contentType || 'application/json',
    'x-forwarded-for': ip,
    referer: 'https://luidgivarela.github.io/desvape-legal/?utm_source=tiktok',
    ...options.headers,
  };
  return new Request('https://project.supabase.co/functions/v1/waitlist', {
    method: options.method || 'POST', headers,
    body: ['OPTIONS', 'GET', 'HEAD'].includes(options.method || 'POST') ? undefined : options.raw || JSON.stringify({
      email: '  Person+News@Example.com  ', platform: 'iOS',
      consent: true, company: '', elapsed_ms: 4000,
      utm: { utm_source: 'tiktok', utm_campaign: 'launch', arbitrary: 'drop-me' },
      ...body,
    }),
  });
}
function mockFetch({ allowed = true, rateStatus = 200, saveStatus = 201, reject = false } = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (reject) throw new Error('Database unavailable');
    if (url.includes('check_desvape_waitlist_rate_limit')) {
      return Response.json([{ allowed, retry_after: 600 }], { status: rateStatus });
    }
    return new Response(null, { status: saveStatus });
  };
  return { calls, fetcher };
}
const options = { now: () => Date.UTC(2026, 9, 24, 12) };

test('valid signup is normalized, persisted with consent/platform/UTM, and server key stays server-side', async () => {
  const db = mockFetch();
  const response = await handleWaitlistRequest(request(), env, { ...options, fetcher: db.fetcher });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(db.calls.length, 2);
  const [limit, save] = db.calls;
  assert.match(limit.url, /rpc\/check_desvape_waitlist_rate_limit/);
  const rateBody = JSON.parse(limit.init.body);
  assert.match(rateBody.p_scope_hash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(rateBody), /203\.0\.113\.24/);
  const saved = JSON.parse(save.init.body);
  assert.equal(saved.email, 'person+news@example.com');
  assert.equal(saved.platform, 'iOS');
  assert.equal(saved.utm.utm_source, 'tiktok');
  assert.equal(saved.utm.arbitrary, undefined);
  assert.equal(saved.referrer_host, 'luidgivarela.github.io');
  assert.match(saved.consented_at, /^2026-10-24T12:00:00/);
  assert.equal(save.init.headers.authorization, 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY);
  assert.match(save.init.headers.prefer, /resolution=merge-duplicates/);
});

test('a repeated email uses the same generic success without creating a duplicate row', async () => {
  const db = mockFetch({ saveStatus: 201 });
  const response = await handleWaitlistRequest(request(), env, { ...options, fetcher: db.fetcher });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(db.calls[1].init.headers.prefer, 'resolution=merge-duplicates,return=minimal');
});

test('invalid email, consent, platform and too-fast submissions never reach the database', async () => {
  for (const body of [
    { email: 'invalid' }, { email: 'person@example.com', consent: false },
    { email: 'person@example.com', platform: 'Other' },
    { email: 'person@example.com', elapsed_ms: 99 },
  ]) {
    const db = mockFetch();
    const response = await handleWaitlistRequest(request(body), env, { ...options, fetcher: db.fetcher });
    assert.ok([400, 422].includes(response.status));
    assert.equal(db.calls.length, 0);
  }
});

test('honeypot and disallowed origin are rejected without storage', async () => {
  const db = mockFetch();
  const bot = await handleWaitlistRequest(request({ company: 'bot' }), env, { ...options, fetcher: db.fetcher });
  assert.equal(bot.status, 422);
  const foreign = await handleWaitlistRequest(request({}, { origin: 'https://attacker.test' }), env, { ...options, fetcher: db.fetcher });
  assert.equal(foreign.status, 403);
  assert.equal(db.calls.length, 0);
});

test('rate limit returns 429 and a retry-after header', async () => {
  const db = mockFetch({ allowed: false });
  const response = await handleWaitlistRequest(request(), env, { ...options, fetcher: db.fetcher });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '600');
  assert.equal(db.calls.length, 1);
});

test('unconfigured service and database failures never claim the signup succeeded', async () => {
  const missing = await handleWaitlistRequest(request(), {}, options);
  assert.equal(missing.status, 503);
  const db = mockFetch({ reject: true });
  const unavailable = await handleWaitlistRequest(request(), env, { ...options, fetcher: db.fetcher });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: 'temporarily_unavailable' });
});

test('CORS preflight is origin-scoped and other methods are rejected', async () => {
  const preflight = await handleWaitlistRequest(request({}, { method: 'OPTIONS' }), env, options);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://luidgivarela.github.io');
  const get = await handleWaitlistRequest(request({}, { method: 'GET' }), env, options);
  assert.equal(get.status, 405);
});
