// 학생명단포스터 생성 (A4 PDF) — docs/인수인계서.md 8절 참고
//   node tools/poster/make_poster.js data/roster.json data/학생_코드_리스트-포스터형.pdf
//   (실제 명단·결과물은 반드시 data/ 아래에 둔다 — .gitignore 대상, 공개 저장소에 학생 이름을 올리지 않는다)
// 명단 JSON: { "students": [ {"no":"01","name":"김하늘"}, ... ] }  (출결 앱 백업 파일도 그대로 사용 가능)
// 디자인: 인수인계 문서 4절 스펙 + 예시 PDF 측정값
const fs = require('fs');
const path = require('path');
// playwright: 프로젝트에 설치돼 있으면 그것을, 없으면 전역 설치본을 쓴다
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const [, , src = 'tools/poster/roster.example.json', out = 'data/poster.pdf'] = process.argv;
const ROWS = 12;   // 한 열에 들어가는 카드 수 (4열)

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const data = JSON.parse(fs.readFileSync(src, 'utf8').replace(/^﻿/, ''));
const list = (Array.isArray(data) ? data : data.students || [])
  .filter(s => s && s.no && s.name)
  .map(s => ({ no: String(s.no).padStart(2, '0'), name: String(s.name).trim() }))
  .sort((a, b) => parseInt(a.no, 10) - parseInt(b.no, 10));   // 결번은 채우지 않고 그대로 이어 붙임

// 두 글자 이름은 예시 PDF처럼 가운데를 띄워 세 글자 이름과 폭을 맞춘다 (예: 우건 → 우 건)
const shown = n => (n.length === 2 ? n[0] + ' ' + n[1] : n);

const cols = [];
for (let i = 0; i < list.length; i += ROWS) cols.push(list.slice(i, i + ROWS));
const grid = cols.map(c => '<div class="col">' + c.map(s =>
  `<div class="card"><span class="badge">${esc(s.no)}</span><span class="name">${esc(shown(s.name))}</span></div>`
).join('') + '</div>').join('');

const page = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fafbfe; }
body { font-family: 'Noto Sans CJK KR', 'Noto Sans', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 794px; padding: 46px 45px 0; }
.header { background: linear-gradient(90deg, #06065f, #10108a); border-radius: 14px; height: 118px; text-align: center; padding-top: 18px; }
.eyebrow { color: #5ac5bf; font-size: 13px; font-weight: 700; letter-spacing: 3.2px; }
.title { color: #fff; font-size: 27px; font-weight: 900; margin-top: 5px; letter-spacing: -0.5px; }
.title .hl { color: #eb3192; }
.title .emoji { font-family: 'Noto Color Emoji'; font-weight: 400; font-size: 25px; }
.sub { color: rgba(255,255,255,.72); font-size: 13px; font-weight: 300; margin-top: 4px; }
.guide { margin-top: 15px; background: #fff; border: 1px solid #e3e5ee; border-radius: 10px; height: 39px; display: flex; align-items: center; justify-content: center; font-size: 12.5px; color: #333; font-weight: 400; }
.guide b { color: #eb3192; font-weight: 700; }
.grid { margin-top: 15px; padding: 0 8px; display: flex; gap: 8.6px; }
.col { flex: 1; display: flex; flex-direction: column; gap: 6.6px; }
.card { height: 40px; background: #fff; border: 1px solid #e3e5ee; border-radius: 8px; display: flex; align-items: center; padding-left: 18px; }
.badge { width: 33px; height: 25px; border-radius: 6px; background: #eb3192; color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; font-family: 'Noto Sans', 'Noto Sans CJK KR', sans-serif; }
.name { margin-left: 16px; color: #000060; font-weight: 900; font-size: 14.5px; white-space: pre; }
.note { margin-top: 18px; background: #f3f4f8; border-left: 4px solid #5ac5bf; border-radius: 8px; padding: 9px 14px 10px; font-size: 11px; line-height: 1.55; color: #444; font-weight: 300; }
.note b { color: #000060; font-weight: 700; }
.note .emoji { font-family: 'Noto Color Emoji'; }
</style></head><body><div class="page">
  <div class="header">
    <div class="eyebrow">SAMSUNG ENGLISH SELENA</div>
    <div class="title">내 번호를 찾아서 <span class="hl">입력해요!</span> <span class="emoji">📱</span></div>
    <div class="sub">우리 학원 전용 스마트 출결 고유번호 명부</div>
  </div>
  <div class="guide">키오스크 화면을 터치한 후, 내 이름 옆에 있는&nbsp;<b>[2자리 고유 번호]</b>를 누르면 등·하원이 자동으로 완료됩니다!</div>
  <div class="grid">${grid}</div>
  <div class="note"><span class="emoji">💡</span> <b>원장님 안내 사항:</b> 이름이나 고유 번호가 누락되었거나 변경이 필요한 학생은 등원 시 선생님께 즉시 말씀해 주세요. 다른 친구의 번호를 잘못 누르지 않도록 한 번 더 내 번호를 확인하고 입력하는 정직한 어린이가 됩시다!</div>
</div></body></html>`;

(async () => {
  if (list.length > ROWS * 4) console.warn(`⚠️ ${list.length}명: 4열(${ROWS * 4}명)을 넘어 5열 이상이 됩니다. 레이아웃 확인 필요`);
  const browser = await chromium.launch();
  const p = await browser.newPage();
  await p.setContent(page, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
  await p.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();
  console.log(`${path.basename(out)} 생성: ${list.length}명, ${cols.length}열`);
})();
