const SPREADSHEET_ID = '1QhY6qeVED7hSs99vVfg-ABin3Az9RWDW6ua3EJbcj58';
const SHEET_NAME = 'LaudatoSi3DMission';

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle("Laudato Si' 3D Mission")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    const sheet = getSheet_();
    sheet.appendRow(toRow_(payload));
    return json_({ ok: true, message: 'saved' });
  } catch (error) {
    return json_({ ok: false, message: String(error) });
  }
}

function setupSheet() {
  const sheet = getSheet_();
  sheet.clear();
  sheet.appendRow(headers_());
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers_().length);
}

function getSheet_() {
  const book = SpreadsheetApp.openById(SPREADSHEET_ID);
  return book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
}

function headers_() {
  return [
    'Timestamp',
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
    'คำมั่นสัญญา',
    'คำตอบทั้งหมด JSON',
    'รายงานข้อความ'
  ];
}

function toRow_(payload) {
  const player = payload.player || {};
  const missionScores = payload.missionScores || {};
  const answers = payload.answers || {};
  return [
    new Date(),
    player.name || '',
    player.room || '',
    player.number || '',
    player.alias || '',
    Number(payload.score || 0),
    Number(payload.maxScore || 250),
    payload.level || '',
    (payload.completed || []).join(', '),
    (payload.medals || []).join(', '),
    Number(payload.responsibility || 0),
    Number(payload.creativity || 0),
    Number(missionScores.wake || 0),
    Number(missionScores.detective || 0),
    Number(missionScores.solution || 0),
    Number(missionScores.create || 0),
    Number(missionScores.pitch || 0),
    Number(missionScores.real || 0),
    (answers.real && answers.real.promise) || '',
    JSON.stringify(answers),
    payload.reportText || ''
  ];
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
