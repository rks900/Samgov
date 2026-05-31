const express = require('express');
const app = express();
const SAM_KEY = process.env.SAM_API_KEY;
const SAM_BASE = process.env.SAM_BASE;
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.get('/sam', async (req, res) => {
  const enc = encodeURIComponent;
  let q = 'api_key=' + enc(SAM_KEY || '') +
          '&limit=' + enc(req.query.limit || '20') +
          '&postedFrom=' + (req.query.postedFrom || '') +
          '&postedTo=' + (req.query.postedTo || '');
  if (req.query.q) q += '&title=' + enc(req.query.q);
  if (req.query.naics) q += '&ncode=' + enc(req.query.naics);
  const target = SAM_BASE + '?' + q;
  const redacted = target.split(SAM_KEY || 'NOKEY').join('REDACTED');
  if (req.query.debug === '1') {
    return res.json({ samBaseRaw: SAM_BASE, keyLen: (SAM_KEY || '').length, redactedUrl: redacted });
  }
  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    const t = await r.text();
    const hdrs = {}; r.headers.forEach((v, k) => { hdrs[k] = v; });
    let data; try { data = JSON.parse(t); } catch { data = { raw: t.slice(0, 300) }; }
    res.status(200).json({ _live: r.ok, upstreamStatus: r.status, upstreamHeaders: hdrs, source: 'sam', ...data });
  } catch (e) {
    res.status(502).json({ _live: false, error: String(e) });
  }
});
app.listen(process.env.PORT || 3000);
