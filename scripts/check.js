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
  checkNodeFile('scripts/build-sites-worker.js');
  new Function(read('Code.gs'));

  const requiredIndexText = [
    "Laudato Si' Mission",
    "Laudato Si' points",
    'แผนที่',
    'สมุดภารกิจ',
    'ดาวคะแนน',
    'เหรียญรางวัล',
    '/assets/campus.webp'
  ];
  requiredIndexText.forEach((text) => {
    assert(indexHtml.includes(text), `index.html: missing ${text}`);
  });

  const zoneIds = [...indexHtml.matchAll(/^\s*(school|canteen|garden|court|community): \{/gm)].map((match) => match[1]);
  assert(zoneIds.length === 5, `index.html: expected 5 learning zones, found ${zoneIds.length}`);
  assert(teacherHtml.includes('/api/submissions'), 'teacher-results.html: missing submissions API call');
  assert(fs.existsSync('assets/campus.webp'), 'assets/campus.webp: missing');
  assert(fs.existsSync('assets/og.jpg'), 'assets/og.jpg: missing');

  console.log(`OK: index scripts=${indexScripts}, teacher scripts=${teacherScripts}, zones=${zoneIds.length}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
