const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const bodyParser = express.json({ limit: '128kb' });
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'errors.log');

function appendLog(entry) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}

router.post('/', bodyParser, (req, res) => {
  try {
    const payload = req.body || {};
    payload._received = {
      ts: new Date().toISOString(),
      ip: req.ip,
      path: req.originalUrl,
    };
    appendLog(payload);
    res.status(202).json({ status: 'ok' });
  } catch (error) {
    appendLog({ type: 'client-log-failed', message: error && error.message });
    res.status(500).json({ error: 'failed to record client log' });
  }
});

router.get('/', (req, res) => {
  try {
    const lines = Math.min(1000, Math.max(10, parseInt(req.query.lines || '200', 10)));
    if (!fs.existsSync(LOG_FILE)) return res.json([]);
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const arr = data.split(/\r?\n/).filter(Boolean);
    const slice = arr.slice(-lines).map((line) => {
      try { return JSON.parse(line); }
      catch (e) { return { raw: line }; }
    }).reverse();
    res.json(slice);
  } catch (error) {
    res.status(500).json({ error: 'failed to read logs' });
  }
});

module.exports = router;
