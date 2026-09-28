/* Auto-fill for jakarta.html — a Cloudflare Worker (free plan).
 *
 * The page sends a place name and/or a link. The worker expands Google Maps
 * short links, asks Gemini (free tier, with Google Search grounding) to look
 * the place up, and returns the details as JSON plus the pages it used.
 *
 * Secrets / variables (Cloudflare → your worker → Settings → Variables and Secrets):
 *   GEMINI_API_KEY   secret, from aistudio.google.com
 *   PASSCODE         secret, anything you like; the page asks for it once
 *   ALLOWED_ORIGIN   optional, defaults to https://salsabillayudha.github.io
 *   GEMINI_MODEL     optional, defaults to gemini-2.5-flash
 */

const DEFAULT_ORIGIN = 'https://salsabillayudha.github.io';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const TYPES = ['food', 'coffee', 'shop', 'activity', 'night', 'stay', 'other'];
const FIELDS = ['name', 'type', 'what', 'musttry', 'menu', 'price', 'hours', 'addr', 'tips'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || DEFAULT_ORIGIN).split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return reply({ error: 'POST only' }, 405);
    if (!env.GEMINI_API_KEY || !env.PASSCODE) return reply({ error: 'Worker is missing GEMINI_API_KEY or PASSCODE.' }, 500);

    let input;
    try { input = await request.json(); } catch { return reply({ error: 'Bad JSON' }, 400); }
    if (String(input.passcode || '') !== env.PASSCODE) return reply({ error: 'Wrong passcode' }, 401);

    let name = String(input.name || '').trim().slice(0, 200);
    const link = String(input.link || '').trim().slice(0, 500);
    const city = String(input.city || 'Jakarta or Bandung, Indonesia').slice(0, 100);

    // Expand a Google Maps link to get the place name out of it.
    let mapsUrl = '';
    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps)/i.test(link)) {
      mapsUrl = await expand(link);
      const fromUrl = placeFromMapsUrl(mapsUrl);
      if (!name && fromUrl) name = fromUrl;
    }
    if (!name && !link) return reply({ error: 'Give me a place name or a link.' }, 400);

    const prompt = `Look up this place with Google Search and describe it for a couple planning a trip.

Place: ${name || '(unknown name)'}
Link they have: ${link || '(none)'}${mapsUrl && mapsUrl !== link ? `\nExpanded Maps link: ${mapsUrl}` : ''}
Area: ${city}

Reply with ONLY one JSON object, no markdown fences, with exactly these string keys:
"name": the place's proper name
"type": one of ${TYPES.join(', ')}
"what": one short line on what it is / what they sell
"musttry": the dishes, drinks or products people recommend most, comma-separated
"menu": menu items with prices, one per line as "Item — 45k" (max 8 lines)
"price": typical spend, e.g. "Rp100–150k / person"
"hours": opening hours, e.g. "10.00–22.00, closed Mon"
"addr": street address and area
"tips": practical tips (booking, busy times, halal or not, dress code), 1–2 short sentences

Rules: English only. Use only what the search results support; if you can't find something, use "" for it. Never invent prices, hours or menu items. Prices in Indonesian rupiah written like 45k.`;

    const model = env.GEMINI_MODEL || DEFAULT_MODEL;
    let data;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2 },
        }),
      });
      data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || `Gemini error ${res.status}`;
        return reply({ error: res.status === 429 ? 'Free quota used up for now. Try again later.' : msg }, 502);
      }
    } catch (e) {
      return reply({ error: 'Could not reach Gemini: ' + e.message }, 502);
    }

    const cand = data?.candidates?.[0];
    const text = (cand?.content?.parts || []).map(p => p.text || '').join('');
    const place = parsePlace(text);
    if (!place) return reply({ error: 'Couldn’t read the result. Try adding the city to the name.' }, 502);
    if (mapsUrl && !place.url) place.url = link;

    const sources = (cand?.groundingMetadata?.groundingChunks || [])
      .map(c => c.web).filter(Boolean)
      .map(w => ({ title: String(w.title || '').slice(0, 120), uri: String(w.uri || '') }))
      .filter(s => /^https?:\/\//.test(s.uri))
      .slice(0, 5);

    return reply({ place, sources });
  },
};

/* Follow redirects by hand (max 5) and return the final URL. */
async function expand(url) {
  let current = url;
  for (let i = 0; i < 5; i++) {
    let res;
    try { res = await fetch(current, { method: 'GET', redirect: 'manual' }); } catch { break; }
    const next = res.headers.get('Location');
    if (!(res.status >= 300 && res.status < 400) || !next) break;
    current = new URL(next, current).href;
  }
  return current;
}

/* ".../maps/place/Txture+Boots/@-6.9,107.6,..." → "Txture Boots" */
export function placeFromMapsUrl(url) {
  const m = String(url).match(/\/maps\/place\/([^/@?]+)/);
  if (m) {
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); } catch { return m[1].replace(/\+/g, ' '); }
  }
  try {
    const q = new URL(url).searchParams.get('q');
    if (q && !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(q)) return q.trim();
  } catch {}
  return '';
}

/* Pull the first JSON object out of the model's reply and keep only known string fields. */
export function parsePlace(text) {
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let obj;
  try { obj = JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const k of FIELDS) out[k] = typeof obj[k] === 'string' ? obj[k].trim().slice(0, 2000) : '';
  if (!TYPES.includes(out.type)) out.type = '';
  return out;
}
