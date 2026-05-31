const express = require('express');
const app = express();
const SAM_KEY = process.env.SAM_API_KEY;
const SAM_BASE = process.env.SAM_BASE;

// Try the configured path first, then the legacy "/prod/" stage path.
// Both are derived from SAM_BASE so no full URLs live in this file.
function candidates() {
  const list = [SAM_BASE];
  if (SAM_BASE && SAM_BASE.indexOf('/prod/') === -1) {
    list.push(SAM_BASE.replace('/opportunities', '/prod/opportunities'));
  }
  return list;
}

// Open CORS — this proxy only relays PUBLIC government data, and the
// SAM key stays server-side. Works for every origin (preview + domain).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function buildQuery(req) {
  const enc = encodeURIComponent;
  let q = 'api_key=' + enc(SAM_KEY || '') +
          '&limit=' + enc(req.query.limit || '20') +
          '&postedFrom=' + (req.query.postedFrom || '') +
          '&postedTo=' + (req.query.postedTo || '');
  if (req.query.q) q += '&title=' + enc(req.query.q);
  if (req.query.naics) q += '&ncode=' + enc(req.query.naics);
  return q;
}

app.get('/sam', async (req, res) => {
  const q = buildQuery(req);
  if (req.query.debug === '1') {
    const redacted = candidates().map(b =>
      (b + '?' + q).split(SAM_KEY || 'NOKEY').join('REDACTED'));
    return res.json({ keyLen: (SAM_KEY || '').length, candidates: redacted });
  }
  const attempts = [];
  for (const base of candidates()) {
    const target = base + '?' + q;
    try {
      const r = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });
      const t = await r.text();
      attempts.push({ base, status: r.status });
      if (r.ok) {
        let data; try { data = JSON.parse(t); } catch { data = { raw: t.slice(0, 300) }; }
        return res.status(200).json({ _live: true, base, source: 'sam', ...data });
      }
    } catch (e) {
      attempts.push({ base, error: String(e).slice(0, 120) });
