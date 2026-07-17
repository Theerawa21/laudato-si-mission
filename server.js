const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const JSONL_DB = path.join(DATA_DIR, 'submissions.jsonl');
const CSV_DB = path.join(DATA_DIR, 'submissions.csv');
const START_PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const CSV_HEADERS = [
  'id',
  'receivedAt',
  'ชื่อนักเรียน',
  'ห้อง',
  'เลขที่',
  'ฉายาผู้พิทักษ์',
  'คะแนนรวม',
  'คะแนนเต็ม',
  'ระดับ',
  'ภารกิจที่สำเร็จ',
  'เหรียญ',
  'ความรับผิดชอบ',
  'ความคิดสร้างสรรค์พิเศษ',
  'Wake Up Call',
  'Eco Detective',
  'Mission Possible',
  'Create & Launch',
  'Pitch for the Planet',
  'Real Life Quest',
  'คำมั่นสัญญา'
];

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function submissionToCsvRow(row) {
  const player = row.player || {};
  const scores = row.missionScores || {};
  const answers = row.answers || {};
  return [
    row.id,
    row.receivedAt,
    player.name,
    player.room,
    player.number,
    player.alias,
    row.score,
    row.maxScore,
    row.level,
    (row.completed || []).join(', '),
    (row.medals || []).join(', '),
    row.responsibility,
    row.creativity,
    scores.wake || 0,
    scores.detective || 0,
    scores.solution || 0,
    scores.create || 0,
    scores.pitch || 0,
    scores.real || 0,
    (answers.real && answers.real.promise) || ''
  ].map(csvCell).join(',');
}

async function ensureDatabase() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(JSONL_DB)) await fsp.writeFile(JSONL_DB, '', 'utf8');
  if (!fs.existsSync(CSV_DB)) {
    await fsp.writeFile(CSV_DB, `${CSV_HEADERS.map(csvCell).join(',')}\n`, 'utf8');
  }
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1024 * 1024) throw new Error('Payload too large');
  }
  return body;
}

function normalizePayload(payload) {
  const score = Number(payload.score || 0);
  return {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    player: payload.player || {},
    score,
    maxScore: Number(payload.maxScore || 250),
    level: payload.level || '',
    completed: Array.isArray(payload.completed) ? payload.completed : [],
    medals: Array.isArray(payload.medals) ? payload.medals : [],
    responsibility: Number(payload.responsibility || 0),
    creativity: Number(payload.creativity || 0),
    missionScores: payload.missionScores || {},
    answers: payload.answers || {},
    reportText: payload.reportText || ''
  };
}

async function saveSubmission(payload) {
  await ensureDatabase();
  const row = normalizePayload(payload);
  await fsp.appendFile(JSONL_DB, `${JSON.stringify(row)}\n`, 'utf8');
  await fsp.appendFile(CSV_DB, `${submissionToCsvRow(row)}\n`, 'utf8');
  return row;
}

async function listSubmissions() {
  await ensureDatabase();
  const content = await fsp.readFile(JSONL_DB, 'utf8');
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .reverse();
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return true;
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    await ensureDatabase();
    sendJson(res, 200, {
      ok: true,
      app: "Laudato Si' 3D Mission",
      database: {
        jsonl: JSONL_DB,
        csv: CSV_DB
      }
    });
    return true;
  }

  if (url.pathname === '/api/submissions' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, submissions: await listSubmissions() });
    return true;
  }

  if (url.pathname === '/api/submissions' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const dryRun = url.searchParams.get('dryRun') === '1';
      const row = dryRun ? normalizePayload(payload) : await saveSubmission(payload);
      sendJson(res, dryRun ? 200 : 201, { ok: true, dryRun, submission: row });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: String(error.message || error) });
    }
    return true;
  }

  if (url.pathname === '/api/export.csv' && req.method === 'GET') {
    await ensureDatabase();
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="laudato-si-submissions.csv"',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(CSV_DB).pipe(res);
    return true;
  }

  return false;
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const relative = decoded === '/' ? '/index.html' : decoded;
  const filePath = path.normalize(path.join(ROOT, relative));
  if (!filePath.startsWith(ROOT)) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (!MIME[ext]) return null;
  return filePath;
}

async function serveStatic(req, res, url) {
  const filePath = safeStaticPath(url.pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext],
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (await handleApi(req, res, url)) return;
  await serveStatic(req, res, url);
});

function listen(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    const address = server.address();
    console.log(`Laudato Si' 3D Mission is running at http://localhost:${address.port}`);
    console.log(`Teacher results: http://localhost:${address.port}/teacher-results.html`);
    console.log(`Database files: ${JSONL_DB} and ${CSV_DB}`);
  });
}

ensureDatabase()
  .then(() => listen(START_PORT))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
