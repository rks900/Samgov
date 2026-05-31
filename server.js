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
  try {
    const params = new URLSearchParams({
      api_key: SAM_KEY,
      limit: req.query.limit || '20',
      postedFrom: req.query.postedFrom,
      postedTo: req.query.postedTo,
      ...(req.query.q ? { title: req.query.q } : {}),
      ...(req.query.naics ? { ncode: req.query.naics } : {}),
    });
    const r = await fetch(SAM_BASE + '?' + params.toString());
    const data = await r.json();
    res.status(r.status).json({ _live: r.ok, source: 'sam', ...data });
  } catch (e) {
    res.status(502).json({ _live: false, error: String(e) });
  }
});
app.listen(process.env.PORT || 3000);
