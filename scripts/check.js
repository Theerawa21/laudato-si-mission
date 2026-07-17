const fs = require('fs');
const { spawnSync } = require('child_process');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function checkInlineScripts(file) {
  const html = read(file);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert(scripts.length > 0, `${file}: no inline script blocks found`);
  scripts.forEach((script, index) => {
    try {
      new Function(script);
    } catch (error) {
      throw new Error(`${file}: script block ${index + 1} failed to parse: ${error.message}`);
    }
  });
  return scripts.length;
}

function checkNodeFile(file) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert(result.status === 0, `${file}: ${result.stderr || result.stdout}`);
}

function main() {
  const indexHtml = read('index.html');
  const teacherHtml = read('teacher-results.html');

  const indexScripts = checkInlineScripts('index.html');
  const teacherScripts = checkInlineScripts('teacher-results.html');
  checkNodeFile('server.js');
  new Function(read('Code.gs'));

  const requiredIndexText = [
    "Laudato Si' 3D Mission",
    'เกมตอบคำถาม',
    'ส่งคะแนนไปฐานข้อมูล',
    'teacher-results.html',
    'missionQuizzes',
    'LOCAL_DATABASE_URL'
  ];
  requiredIndexText.forEach((text) => {
    assert(indexHtml.includes(text), `index.html: missing ${text}`);
  });

  const quizIds = [...indexHtml.matchAll(/^\s*(wake|detective|solution|create|pitch|real): \[/gm)].map((match) => match[1]);
  assert(quizIds.length === 6, `index.html: expected quiz for 6 missions, found ${quizIds.length}`);
  assert(teacherHtml.includes('/api/submissions'), 'teacher-results.html: missing submissions API call');

  console.log(`OK: index scripts=${indexScripts}, teacher scripts=${teacherScripts}, quizzes=${quizIds.length}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
