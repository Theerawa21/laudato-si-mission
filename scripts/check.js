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
    '/assets/campus.webp',
    '/assets/classroom.webp',
    'Mission 1: Wake Up Call',
    'พฤติกรรมใดของมนุษย์ทำให้เกิดปัญหานี้?',
    '/assets/cafeteria.jpg',
    'Mission 2: Eco Detective',
    'อะไรคือสาเหตุหลักของปัญหานี้?',
    'Eco Detective',
    '/assets/garden.jpg',
    'Mission 3: Mission Possible - ทางออกของฉัน',
    'ความเหมาะสม',
    'ความเป็นไปได้',
    'ความคิดสร้างสรรค์',
    "ความเชื่อมโยงกับ Laudato Si'",
    'นักออกแบบโลกใหม่',
    '/assets/creative-space.jpg',
    'Mission 4: Create &amp; Launch - ผลงานรักษ์โลกของฉัน',
    'ชื่อผลงาน',
    'ปัญหาที่ต้องการแก้ไข',
    'แนวทางแก้ไข',
    'ข้อความรณรงค์',
    "แนวคิด Laudato Si'",
    'Creator',
    '/assets/pitch-stage.jpg',
    'Mission 5: Pitch for the Planet',
    'ปัญหาที่เลือก',
    'สาเหตุ',
    'แนวทางแก้ไข',
    'ผลลัพธ์ของผลงาน',
    'การนำไปใช้จริง',
    'Voice of Our Common Home',
    '/assets/community-gate.jpg',
    'Mission 6: Real Life Quest',
    'ฉันจะดูแลบ้านส่วนรวมโดย...',
    'ลดการใช้พลาสติก',
    'แยกขยะ',
    'ปิดไฟ',
    'ประหยัดน้ำ',
    "ผู้พิทักษ์ Laudato Si'",
    '/assets/main-menu-school.jpg',
    'START GAME',
    'ลงทะเบียนนักเรียน',
    'ชื่อ',
    'ชั้น',
    'เลขที่',
    'ยืนยัน',
    '/assets/female-student.png',
    '/assets/healed-world.jpg',
    'ภารกิจสำเร็จ',
    'คะแนนรวม: <strong>250</strong>',
    'Guardian of Our Common Home',
    '(ผู้พิทักษ์บ้านส่วนรวม)',
    'บันทึกผลให้ครู',
    'fetch("/api/submissions"',
    'ดูเกียรติบัตร',
    'เล่นอีกครั้ง',
    'Score:'
  ];
  requiredIndexText.forEach((text) => {
    assert(indexHtml.includes(text), `index.html: missing ${text}`);
  });

  const zoneIds = [...indexHtml.matchAll(/^\s*(school|canteen|garden|court|community|quest): \{/gm)].map((match) => match[1]);
  assert(zoneIds.length === 6, `index.html: expected 6 learning zones, found ${zoneIds.length}`);
  assert(teacherHtml.includes('/api/submissions'), 'teacher-results.html: missing submissions API call');
  assert(fs.existsSync('assets/campus.webp'), 'assets/campus.webp: missing');
  assert(fs.existsSync('assets/og.jpg'), 'assets/og.jpg: missing');
  assert(fs.existsSync('assets/classroom.webp'), 'assets/classroom.webp: missing');
  assert(fs.existsSync('assets/og-classroom.jpg'), 'assets/og-classroom.jpg: missing');
  assert(fs.existsSync('assets/cafeteria.jpg'), 'assets/cafeteria.jpg: missing');
  assert(fs.existsSync('assets/og-cafeteria.jpg'), 'assets/og-cafeteria.jpg: missing');
  assert(fs.existsSync('assets/garden.jpg'), 'assets/garden.jpg: missing');
  assert(fs.existsSync('assets/og-garden.jpg'), 'assets/og-garden.jpg: missing');
  assert(fs.existsSync('assets/creative-space.jpg'), 'assets/creative-space.jpg: missing');
  assert(fs.existsSync('assets/og-creative-space.jpg'), 'assets/og-creative-space.jpg: missing');
  assert(fs.existsSync('assets/pitch-stage.jpg'), 'assets/pitch-stage.jpg: missing');
  assert(fs.existsSync('assets/og-pitch-stage.jpg'), 'assets/og-pitch-stage.jpg: missing');
  assert(fs.existsSync('assets/community-gate.jpg'), 'assets/community-gate.jpg: missing');
  assert(fs.existsSync('assets/og-community-gate.jpg'), 'assets/og-community-gate.jpg: missing');
  assert(fs.existsSync('assets/main-menu-school.jpg'), 'assets/main-menu-school.jpg: missing');
  assert(fs.existsSync('assets/female-student.png'), 'assets/female-student.png: missing');
  assert(fs.existsSync('assets/healed-world.jpg'), 'assets/healed-world.jpg: missing');
  assert(fs.existsSync('assets/og-main-menu.jpg'), 'assets/og-main-menu.jpg: missing');

  console.log(`OK: index scripts=${indexScripts}, teacher scripts=${teacherScripts}, zones=${zoneIds.length}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
