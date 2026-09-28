/* ai.js — talking to Claude (Anthropic's API) with your own API key. Used by the Pantry (scan.js: photo scans and meal
   ideas) and the Coach (coach.js). Nothing here runs unless you add a key in Settings → Claude AI and then use one of
   those features; requests go straight from your phone to https://api.anthropic.com. */

const AI = (() => {
  const SDK = 'vendor/anthropic-sdk-0.128.0/anthropic.mjs';     // Anthropic's official TypeScript SDK, bundled
  const MODEL = 'claude-opus-5';
  // With fallbacks: 'default', a request Claude declines is answered by another Claude model instead of failing.
  const BETAS = ['server-side-fallback-2026-07-01'];
  const oops = (code, detail) => Object.assign(new Error(code), { code, detail });

  let sdk = null;
  async function client(key) {
    if (!sdk) {
      try { sdk = (await import(new URL(SDK, location.href).href)).default; } catch (e) { throw oops('offline'); }
    }
    return new sdk({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 180000 });
  }

  // SDK errors → a short code the screens explain: cancelled, badkey, credit, busy, offline, ai.
  function error(e) {
    const A = sdk;
    if (e && typeof e.code === 'string' && !(A && e instanceof A.APIError)) return e;      // already one of ours
    if (!A) return oops('ai', e && e.message);
    if (e instanceof A.APIUserAbortError) return oops('cancelled');
    if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) return oops('badkey');
    if (e instanceof A.RateLimitError || e instanceof A.InternalServerError) return oops('busy');
    if (e instanceof A.APIConnectionError) return oops('offline');
    if (e instanceof A.BadRequestError) return oops(/credit balance/i.test(e.message) ? 'credit' : 'ai', e.message);
    return oops('ai', e && e.message);
  }

  // A tool call whose input wasn't valid JSON (the SDK can't read it): worth asking once more.
  const isParseError = e => !!(sdk && e instanceof sdk.AnthropicError && !(e instanceof sdk.APIError));

  // The answer's text. If another model took over partway through (a "fallback"), it carries on from the text so far,
  // so every text block joins up in order.
  const text = msg => msg.content.filter(b => b.type === 'text').map(b => b.text).join('');

  // An answer as it has to be sent back in the next request: after a mid-answer fallback, the thinking and tool calls
  // from before the switch are left out (their text stays); the fallback marker itself isn't needed.
  function echo(content) {
    const cut = content.map(b => b.type).lastIndexOf('fallback');
    return content.filter((b, i) => b.type !== 'fallback' && (i > cut || b.type === 'text'));
  }

  // Settings → Claude AI: does Anthropic accept this key? (Listing models is free.)
  async function checkKey(key) {
    const c = await client(key);
    try { await c.models.list({ limit: 1 }); } catch (e) { throw error(e); }
  }

  return { MODEL, BETAS, oops, client, error, isParseError, text, echo, checkKey };
})();
