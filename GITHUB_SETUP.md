# GitHub setup

## ใช้งานหลัง clone

```powershell
npm start
```

เปิดหน้าเกมที่ `http://localhost:3000` และหน้าครูที่ `http://localhost:3000/teacher-results.html`

## ตรวจโปรเจกต์ก่อน push

```powershell
npm test
```

คำสั่งนี้ตรวจว่า JavaScript ใน `index.html`, `teacher-results.html`, `server.js` และ `Code.gs` parse ได้ รวมถึงตรวจว่ามีเกมตอบคำถามครบ 6 ภารกิจ

## ไฟล์ฐานข้อมูล

ระบบบันทึกข้อมูลจริงไว้ใน `data/submissions.jsonl` และ `data/submissions.csv` ซึ่งถูก ignore ไม่ให้ push ขึ้น GitHub เพื่อป้องกันข้อมูลนักเรียนติด repo

## GitHub Actions

ไฟล์ `.github/workflows/ci.yml` จะรัน `npm test` ทุกครั้งเมื่อ push หรือเปิด pull request เข้า `main` หรือ `master`

## คำสั่ง push ตัวอย่าง

```powershell
git add .
git commit -m "Prepare Laudato Si 3D Mission web app"
git branch -M main
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
```

เปลี่ยน `<OWNER>` และ `<REPO>` เป็นบัญชีและชื่อ repository ของคุณ
