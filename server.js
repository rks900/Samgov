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
  if (req.query.debug === '1') {
    return res.json({
      samBaseRaw: SAM_BASE,
      samBaseLen: (SAM_BASE || '').length,
      keyPresent: !!SAM_KEY,
      keyLen: (SAM_KEY || '').length,
    });
  }
  try {
    const params = new URLSearchParams({
      api_key: SAM_KEY,
      limit: req.query.limit || '20',
      postedFrom: req.query.postedFrom,
      postedTo: req.query.postedTo,
      ...(req.query.q ? { title: req.query.q } : {}),
      ...(req.query.naics ? { ncode: req.query.naics } : {}),
    });
    const r = await fetch(SAM_BASE + '?' + params.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    const t = await r.text();
    let data; try { data = JSON.parse(t); } catch { data = { raw: t.slice(0, 300) }; }
    res.status(200).json({ _live: r.ok, upstreamStatus: r.status, upstreamServer: r.headers.get('server'), source: 'sam', ...data });
  } catch (e) {
    res.status(502).json({ _live: false, error: String(e) });
  }
});
app.listen(process.env.PORT || 3000);
