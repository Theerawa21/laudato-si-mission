export const createSubmissionsTable = `
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL,
  player_json TEXT NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 250,
  level TEXT NOT NULL DEFAULT '',
  completed_json TEXT NOT NULL DEFAULT '[]',
  medals_json TEXT NOT NULL DEFAULT '[]',
  responsibility INTEGER NOT NULL DEFAULT 0,
  creativity INTEGER NOT NULL DEFAULT 0,
  mission_scores_json TEXT NOT NULL DEFAULT '{}',
  answers_json TEXT NOT NULL DEFAULT '{}',
  report_text TEXT NOT NULL DEFAULT ''
);
`;

export const createSubmissionsReceivedAtIndex = `
CREATE INDEX IF NOT EXISTS submissions_received_at_idx
ON submissions (received_at DESC);
`;
