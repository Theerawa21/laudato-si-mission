const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "dist", "server");

function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

const indexHtml = readText("index.html");
const teacherHtml = readText("teacher-results.html");
const campusWebp = fs.readFileSync(path.join(ROOT, "assets", "campus.webp")).toString("base64");
const ogJpg = fs.readFileSync(path.join(ROOT, "assets", "og.jpg")).toString("base64");

const runtime = String.raw`const INDEX_HTML = __INDEX_HTML__;
const TEACHER_RESULTS_HTML = __TEACHER_RESULTS_HTML__;
const CAMPUS_WEBP = __CAMPUS_WEBP__;
const OG_JPG = __OG_JPG__;

const CSV_HEADERS = [
  "id",
  "receivedAt",
  "studentName",
  "room",
  "number",
  "alias",
  "score",
  "maxScore",
  "level",
  "completedMissions",
  "medals",
  "responsibility",
  "creativity",
  "Wake Up Call",
  "Eco Detective",
  "Mission Possible",
  "Create & Launch",
  "Pitch for the Planet",
  "Real Life Quest",
  "promise"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const createTableSql = [
  "CREATE TABLE IF NOT EXISTS submissions (",
  "id TEXT PRIMARY KEY,",
  "received_at TEXT NOT NULL,",
  "player_json TEXT NOT NULL DEFAULT '{}',",
  "score INTEGER NOT NULL DEFAULT 0,",
  "max_score INTEGER NOT NULL DEFAULT 250,",
  "level TEXT NOT NULL DEFAULT '',",
  "completed_json TEXT NOT NULL DEFAULT '[]',",
  "medals_json TEXT NOT NULL DEFAULT '[]',",
  "responsibility INTEGER NOT NULL DEFAULT 0,",
  "creativity INTEGER NOT NULL DEFAULT 0,",
  "mission_scores_json TEXT NOT NULL DEFAULT '{}',",
  "answers_json TEXT NOT NULL DEFAULT '{}',",
  "report_text TEXT NOT NULL DEFAULT ''",
  ")"
].join(" ");

const createIndexSql = "CREATE INDEX IF NOT EXISTS submissions_received_at_idx ON submissions (received_at DESC)";

function htmlResponse(body) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function imageResponse(base64, contentType) {
  const binary = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Response(binary, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400"
    }
  });
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePayload(payload) {
  return {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    player: payload.player || {},
    score: Number(payload.score || 0),
    maxScore: Number(payload.maxScore || 250),
    level: payload.level || "",
    completed: Array.isArray(payload.completed) ? payload.completed : [],
    medals: Array.isArray(payload.medals) ? payload.medals : [],
    responsibility: Number(payload.responsibility || 0),
    creativity: Number(payload.creativity || 0),
    missionScores: payload.missionScores || {},
    answers: payload.answers || {},
    reportText: payload.reportText || ""
  };
}

function rowFromRecord(record) {
  return {
    id: record.id,
    receivedAt: record.received_at,
    player: safeJsonParse(record.player_json, {}),
    score: Number(record.score || 0),
    maxScore: Number(record.max_score || 250),
    level: record.level || "",
    completed: safeJsonParse(record.completed_json, []),
    medals: safeJsonParse(record.medals_json, []),
    responsibility: Number(record.responsibility || 0),
    creativity: Number(record.creativity || 0),
    missionScores: safeJsonParse(record.mission_scores_json, {}),
    answers: safeJsonParse(record.answers_json, {}),
    reportText: record.report_text || ""
  };
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
    (row.completed || []).join(", "),
    (row.medals || []).join(", "),
    row.responsibility,
    row.creativity,
    scores.wake || 0,
    scores.detective || 0,
    scores.solution || 0,
    scores.create || 0,
    scores.pitch || 0,
    scores.real || 0,
    (answers.real && answers.real.promise) || ""
  ].map(csvCell).join(",");
}

async function ensureDatabase(env) {
  if (!env.DB) throw new Error("D1 database binding DB is not available");
  await env.DB.batch([
    env.DB.prepare(createTableSql),
    env.DB.prepare(createIndexSql)
  ]);
}

async function saveSubmission(env, payload) {
  await ensureDatabase(env);
  const row = normalizePayload(payload);
  await env.DB.prepare([
    "INSERT INTO submissions (",
    "id, received_at, player_json, score, max_score, level, completed_json, medals_json,",
    "responsibility, creativity, mission_scores_json, answers_json, report_text",
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ].join(" "))
    .bind(
      row.id,
      row.receivedAt,
      JSON.stringify(row.player),
      row.score,
      row.maxScore,
      row.level,
      JSON.stringify(row.completed),
      JSON.stringify(row.medals),
      row.responsibility,
      row.creativity,
      JSON.stringify(row.missionScores),
      JSON.stringify(row.answers),
      row.reportText
    )
    .run();
  return row;
}

async function listSubmissions(env) {
  await ensureDatabase(env);
  const result = await env.DB.prepare("SELECT * FROM submissions ORDER BY received_at DESC").all();
  return (result.results || []).map(rowFromRecord);
}

async function handleApi(request, env, url) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    await ensureDatabase(env);
    return jsonResponse({ ok: true, app: "Laudato Si' Mission", database: "D1" });
  }

  if (url.pathname === "/api/submissions" && request.method === "GET") {
    return jsonResponse({ ok: true, submissions: await listSubmissions(env) });
  }

  if (url.pathname === "/api/submissions" && request.method === "POST") {
    try {
      const text = await request.text();
      const payload = JSON.parse(text || "{}");
      const dryRun = url.searchParams.get("dryRun") === "1";
      const row = dryRun ? normalizePayload(payload) : await saveSubmission(env, payload);
      return jsonResponse({ ok: true, dryRun, submission: row }, dryRun ? 200 : 201);
    } catch (error) {
      return jsonResponse({ ok: false, message: String(error && error.message ? error.message : error) }, 400);
    }
  }

  if (url.pathname === "/api/export.csv" && request.method === "GET") {
    const rows = await listSubmissions(env);
    const csv = [
      CSV_HEADERS.map(csvCell).join(","),
      ...rows.map(submissionToCsvRow)
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"laudato-si-submissions.csv\"",
        "Cache-Control": "no-store"
      }
    });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiResponse = await handleApi(request, env, url);
    if (apiResponse) return apiResponse;

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return htmlResponse(INDEX_HTML);
    }

    if (url.pathname === "/teacher-results.html") {
      return htmlResponse(TEACHER_RESULTS_HTML);
    }

    if (url.pathname === "/assets/campus.webp") {
      return imageResponse(CAMPUS_WEBP, "image/webp");
    }

    if (url.pathname === "/assets/og.jpg") {
      return imageResponse(OG_JPG, "image/jpeg");
    }

    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};
`;

const worker = runtime
  .replace("__INDEX_HTML__", JSON.stringify(indexHtml))
  .replace("__TEACHER_RESULTS_HTML__", JSON.stringify(teacherHtml))
  .replace("__CAMPUS_WEBP__", JSON.stringify(campusWebp))
  .replace("__OG_JPG__", JSON.stringify(ogJpg));

writeText(path.join(OUT_DIR, "index.js"), worker);
console.log("Built dist/server/index.js");
