// [v1.5 업데이트] 앱 버전 — 지난주 리포트 자동 생성·보드
var APP_VERSION = 'Acad-atd-03_1.5 (Desktop)';   // 저장 키(STORAGE_KEY)는 1.4 그대로 — 기존 데이터 유지
var STORAGE_KEY = 'acad-atd-03_1.4';

var DEF_SETTINGS = { academyName:'삼성영어 셀레나', phone:'' };
var DB = {students:[], attendance:{}, stats:{}, holidays:[], settings: Object.assign({}, DEF_SETTINGS)};

try { 
  // 기존 1.3 버전 키 호환 가능성 열어두기 (1.3 데이터가 있으면 가져옴)
  var _s=localStorage.getItem(STORAGE_KEY) || localStorage.getItem('acad-atd-03_1.3'); 
  if(_s) DB=Object.assign({students:[],attendance:{},stats:{},holidays:[],settings:Object.assign({},DEF_SETTINGS)}, JSON.parse(_s)); 
} catch(e){}
if(!DB.holidays) DB.holidays = [];   // 기존 저장 데이터에는 holidays가 없으므로 보정
ensureWeekly();                        // 지난주 리포트 저장소도 같은 방식으로 보정
function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); return true; }catch(e){ console.error('저장 실패:', e); return false; } }

if(!DB.students.length){
  DB.students=[
    {id:1,no:'01',name:'김민준',level:'Lv.5'},
    {id:2,no:'02',name:'이서연',level:'Lv.5'},
    {id:3,no:'03',name:'박지훈',level:'Lv.2'},
  ];
  save();
}

// ===== 날짜/시간 유틸 =====
function today(){ var d=new Date(); return fmtDate(d); }
function fmtDate(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function nowT(){  var d=new Date(); return p2(d.getHours())+':'+p2(d.getMinutes()); }
function p2(n){ return ('0'+n).slice(-2); }
function curYM(){ var d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1); }
function fmtPhone(el){
  var v=el.value.replace(/\D/g,'');
  if(v.length<=3) el.value=v;
  else if(v.length<=7) el.value=v.slice(0,3)+'-'+v.slice(3);
  else el.value=v.slice(0,3)+'-'+v.slice(3,7)+'-'+v.slice(7,11);
}

// ===== 연속 출결 계산 (주말·휴원일 제외) =====
// 운영일 = 월~금 중 휴원일이 아닌 날. 연속은 "직전 운영일에도 출석했는가"로 판단한다.
// 금요일 다음 월요일, 휴원일 앞뒤 운영일은 연속으로 이어진다.
function isWeekend(dateStr){
  var d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}
function isOperatingDay(dateStr){
  return !isWeekend(dateStr) && !isHoliday(dateStr);
}
function prevOperatingDay(dateStr){
  var d = new Date(dateStr + 'T00:00:00');
  // 긴 연휴를 감안해도 60일이면 충분하다 (휴원일이 잘못 대량 등록된 경우의 무한 루프 방지)
  for(var i = 0; i < 60; i++){
    d.setDate(d.getDate() - 1);
    var ds = fmtDate(d);
    if(isOperatingDay(ds)) return ds;
  }
  return fmtDate(d);
}
function attendedOn(sid, dateStr){
  var rec = DB.attendance[dateStr] && DB.attendance[dateStr][sid];
  return !!(rec && rec.inTime);
}

function ensureStat(sid){
  if(!DB.stats[sid]) DB.stats[sid] = {currentStreak:0, longestStreak:0, lastAttendDate:null, monthly:{}, monthlyMinutes:{}};
  if(!DB.stats[sid].monthly) DB.stats[sid].monthly = {};
  if(!DB.stats[sid].monthlyMinutes) DB.stats[sid].monthlyMinutes = {};
  return DB.stats[sid];
}

function recordAttendanceStat(sid, td){
  var st = ensureStat(sid);
  if(st.lastAttendDate === td) return st;

  var ym = td.slice(0,7);
  st.monthly[ym] = (st.monthly[ym]||0) + 1;

  if(attendedOn(sid, prevOperatingDay(td))) st.currentStreak += 1;
  else st.currentStreak = 1;

  if(st.currentStreak > st.longestStreak) st.longestStreak = st.currentStreak;
  st.lastAttendDate = td;
  return st;
}

function addStayMinutes(sid, td, inTime, outTime){
  var st = ensureStat(sid);
  var mins = timeDiffMinutes(inTime, outTime);
  if(mins < 0) mins = 0;
  var ym = td.slice(0,7);
  st.monthlyMinutes[ym] = (st.monthlyMinutes[ym]||0) + mins;
  return mins;
}

function timeDiffMinutes(inTime, outTime){
  if(!inTime || !outTime) return 0;
  var a = inTime.split(':'), b = outTime.split(':');
  var aMin = Number(a[0])*60 + Number(a[1]);
  var bMin = Number(b[0])*60 + Number(b[1]);
  var diff = bMin - aMin;
  return diff < 0 ? 0 : diff;
}

function recalcStatsForStudent(sid){
  var dates = Object.keys(DB.attendance).filter(function(d){ return DB.attendance[d][sid] && DB.attendance[d][sid].inTime; }).sort();
  DB.stats[sid] = {currentStreak:0, longestStreak:0, lastAttendDate:null, monthly:{}, monthlyMinutes:{}};
  var st = DB.stats[sid];
  dates.forEach(function(td){
    var ym = td.slice(0,7);
    st.monthly[ym] = (st.monthly[ym]||0) + 1;
    if(attendedOn(sid, prevOperatingDay(td))) st.currentStreak += 1;
    else st.currentStreak = 1;
    if(st.currentStreak > st.longestStreak) st.longestStreak = st.currentStreak;
    st.lastAttendDate = td;

    var rec = DB.attendance[td][sid];
    if(rec.outTime){
      var mins = timeDiffMinutes(rec.inTime, rec.outTime);
      if(mins > 0) st.monthlyMinutes[ym] = (st.monthlyMinutes[ym]||0) + mins;
    }
  });
}

function liveStreak(sid){
  var st = DB.stats[sid];
  if(!st || !st.lastAttendDate) return 0;
  var td = today();
  if(st.lastAttendDate === td) return st.currentStreak;
  // 오늘 아직 안 왔어도 직전 운영일까지 이어졌다면 연속은 살아 있다
  if(st.lastAttendDate >= prevOperatingDay(td)) return st.currentStreak;
  return 0;
}

// 특정 날짜(보통 지난주 마지막 운영일) 기준의 연속 출석.
// 지난주 리포트는 "지난주가 끝났을 때"의 연속 기록을 써야 하므로 liveStreak와 따로 둔다.
function streakEndingAt(sid, dateStr){
  var d = isOperatingDay(dateStr) ? dateStr : prevOperatingDay(dateStr);
  var cnt = 0;
  for(var i = 0; i < 400 && attendedOn(sid, d); i++){
    cnt++;
    d = prevOperatingDay(d);
  }
  return cnt;
}

// 휴원일이 바뀌면 과거 연속 기록도 달라지므로 전원 다시 계산한다
function recalcAllStats(){
  DB.students.forEach(function(s){ recalcStatsForStudent(s.id); });
}

// ===== 랭킹 계산 =====
function getMonthlyRanking(){
  var ym = curYM();
  return DB.students.map(function(s){
    var st = DB.stats[s.id];
    var cnt = (st && st.monthly[ym]) || 0;
    return {s:s, value:cnt};
  }).sort(function(a,b){ return b.value - a.value; });
}
function getStreakRanking(){
  return DB.students.map(function(s){
    return {s:s, value: liveStreak(s.id), best: (DB.stats[s.id]&&DB.stats[s.id].longestStreak)||0};
  }).sort(function(a,b){ return b.value - a.value || b.best - a.best; });
}
function getMinutesRanking(){
  var ym = curYM();
  return DB.students.map(function(s){
    var st = DB.stats[s.id];
    var minutes = (st && st.monthlyMinutes && st.monthlyMinutes[ym]) || 0;
    return {s:s, value:minutes};
  }).sort(function(a,b){ return b.value - a.value; });
}
function medalEmoji(i){
  if(i===0) return '🥇'; if(i===1) return '🥈'; if(i===2) return '🥉'; return (i+1);
}

// ===== 탭 이동 (사이드바) =====
function goTab(n){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  document.querySelectorAll('.side-item').forEach(function(t){t.classList.remove('active');});
  document.getElementById('screen-'+n).classList.add('active');
  document.getElementById('tab-'+n).classList.add('active');
  
  if(n==='home'){
    renderRecent(); renderRank3Group(); renderBoard();
    setTimeout(function(){document.getElementById('numInput').focus();},100);
  }
  if(n==='students') renderStudents();
  if(n==='settings'){ loadSettings(); renderKeyStatus(); }
  if(n==='data'){ renderReportHistory('dataHistoryList', 50); renderBackupInfo(); }
  if(n==='report'){ fillStudentSelect(); renderReportHistory('reportHistoryList', 5); renderAutoStatus(); }
}

// ===== 출결 입력 처리 =====
function showResult(type, title, sub){
  var box=document.getElementById('resultBox');
  box.className='result-box show '+type;
  var icons={success:'✅', checkout:'🏠', error:'❌'};
  document.getElementById('resultIcon').textContent=icons[type]||'ℹ️';
  document.getElementById('resultText').textContent=title;
  document.getElementById('resultSub').textContent=sub||'';
  clearTimeout(box._t);
  box._t=setTimeout(function(){box.classList.remove('show');},3000);
}

document.addEventListener('DOMContentLoaded', function(){
  // 저장된 요약(stats)이 이전 규칙(주말만 제외)으로 계산돼 있을 수 있으므로 시작 시 원본에서 다시 만든다
  recalcAllStats(); save();

  var d=new Date();
  document.getElementById('dateChip').textContent = d.toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
  document.getElementById('rankMonthLabel').textContent = (d.getMonth()+1)+'월 기준';

  var input=document.getElementById('numInput');
  input.addEventListener('input', function(){
    this.value=this.value.replace(/\D/g,'').slice(0,2);
    if(this.value.length===2) setTimeout(function(){processAttend(input.value);},150);
  });
  input.addEventListener('keydown', function(e){
    if(e.key==='Enter' && this.value.length>0) processAttend(this.value.padStart(2,'0'));
  });
  
  // 최초 로드 시 포커스
  renderRecent();
  renderRank3Group();
  setTimeout(function(){input.focus();}, 100);
  
  // 화면 클릭 시 항상 입력창 포커스 복귀 (홈 화면일때만)
  document.addEventListener('click', function(e){
    var homeScreen = document.getElementById('screen-home');
    if(homeScreen && homeScreen.classList.contains('active') && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION' && !e.target.closest('.mov')) {
      input.focus();
    }
  });
});

function processAttend(no){
  var input=document.getElementById('numInput');
  var padded=no.padStart(2,'0');
  var s=DB.students.find(function(x){return x.no===padded;});

  if(!s){
    showResult('error','등록번호 '+padded+' 없음','등록되지 않은 번호입니다.');
    input.value=''; input.focus(); return;
  }

  var td=today();
  if(!DB.attendance[td]) DB.attendance[td]={};
  var rec=DB.attendance[td][s.id];

  var isOut = rec && rec.inTime && !rec.outTime;
  var time=nowT();
  var type, title, sub;
  var isNewBest = false;
  var undoAction = null;

  if(!rec){
    DB.attendance[td][s.id]={inTime:time, outTime:null};
    var prevBest = ensureStat(s.id).longestStreak;
    var st = recordAttendanceStat(s.id, td);
    isNewBest = st.currentStreak > prevBest && st.currentStreak > 1;
    type  = 'success'; title = s.name+' 등원 처리됨';
    sub = '🔥 연속 '+st.currentStreak+'일 출석 중' + (isNewBest ? ' (신기록!)' : '');
    undoAction = function(){ cancelAttend(s.id, 'all', true); };
  } else if(isOut){
    DB.attendance[td][s.id].outTime=time;
    var stayMin = addStayMinutes(s.id, td, rec.inTime, time);
    type  = 'checkout'; title = s.name+' 하원 처리됨'; sub = '오늘 학습 시간: '+stayMin+'분';
    undoAction = function(){ cancelAttend(s.id, 'outTime', true); };
  } else {
    showResult('error', s.name+' 학생', '오늘 등/하원이 모두 완료되었습니다.');
    input.value=''; input.focus(); return;
  }

  save();
  showResult(type, title, sub);
  renderRecent();
  renderRank3Group();
  showUndoToast(s.name+' 학생 '+(isOut?'하원':'등원')+' 완료', undoAction);

  if(!isOut) openRecordPopup(s.id, isNewBest);

  input.value='';
  setTimeout(function(){input.focus();},100);
}

// ===== 기록 팝업 =====
function openRecordPopup(sid, isNewBest){
  var s = DB.students.find(function(x){return x.id===sid;});
  if(!s) return;
  var st = ensureStat(sid);
  var ym = curYM();
  
  var monthRank = getMonthlyRanking().findIndex(function(r){return r.s.id===sid;}) + 1;
  var streakRank = getStreakRanking().findIndex(function(r){return r.s.id===sid;}) + 1;
  var streak = liveStreak(sid);

  document.getElementById('recEmoji').textContent = isNewBest ? '🏆' : (streak>=5 ? '🔥' : '🎉');
  document.getElementById('recName').textContent = s.name+' 학생';
  document.getElementById('recStatus').textContent = (s.level?('Lv: '+s.level):'') + ' · 등록번호 '+s.no;
  document.getElementById('recMonthCount').textContent = st.monthly[ym] || 0;
  document.getElementById('recStreak').innerHTML = streak + (isNewBest?'<span class="record-new">신기록</span>':'');
  document.getElementById('recBest').textContent = st.longestStreak;
  document.getElementById('recMinutes').textContent = st.monthlyMinutes[ym] || 0;
  document.getElementById('recMonthRank').textContent = monthRank ? (monthRank+'위 / '+DB.students.length+'명') : '-';
  document.getElementById('recStreakRank').textContent = streakRank ? (streakRank+'위 / '+DB.students.length+'명') : '-';
  document.getElementById('recLastWeek').innerHTML = lastWeekHtml(sid, true);

  document.getElementById('recordMov').classList.add('show');
}

// ===== 출결 취소 =====
function cancelAttend(sid, field, silent){
  if(!silent && !confirm('해당 기록을 취소하시겠습니까?')) return;
  var td=today();
  if(!DB.attendance[td] || !DB.attendance[td][sid]) return;
  if(field==='all'){
    delete DB.attendance[td][sid];
    recalcStatsForStudent(sid);
  } else if(field==='outTime'){
    var rec = DB.attendance[td][sid];
    if(rec.outTime && rec.inTime){
      var st = ensureStat(sid);
      var ym = td.slice(0,7);
      var mins = timeDiffMinutes(rec.inTime, rec.outTime);
      if(mins > 0) st.monthlyMinutes[ym] = Math.max(0, (st.monthlyMinutes[ym]||0) - mins);
    }
    rec.outTime=null;
  }
  save(); renderRecent(); renderRank3Group();
  hideUndoToast();
  if(!silent) showToast('✅ 출결 기록이 정상적으로 취소되었습니다.');
}

// ===== UI 렌더링 =====
function renderRecent(){
  var td=today(), att=DB.attendance[td]||{};
  var keys=Object.keys(att);
  var inCnt=0, outCnt=0;
  keys.forEach(function(k){ var r=att[k]; if(r.inTime) inCnt++; if(r.outTime) outCnt++; });

  document.getElementById('statPills').innerHTML=
    '<span class="spill spill-in">🟢 등원 '+inCnt+'명</span>'+
    '<span class="spill spill-out">🟠 하원 '+outCnt+'명</span>'+
    '<span class="spill spill-total">전체 '+DB.students.length+'명</span>';

  var list=document.getElementById('recentList');
  if(!keys.length){
    list.innerHTML='<div class="empty-recent">아직 출석한 학생이 없습니다</div>';
    return;
  }

  var items=keys.map(function(k){
    var s=DB.students.find(function(x){return x.id==k;});
    return {s:s, r:att[k], sid:k};
  }).filter(function(x){return x.s;});
  items.sort(function(a,b){
    var ta=a.r.outTime||a.r.inTime||'';
    var tb=b.r.outTime||b.r.inTime||'';
    return tb.localeCompare(ta);
  });

  list.innerHTML=items.map(function(x){
    var s=x.s, r=x.r, sid=x.sid;
    var hasOut=!!r.outTime;
    var numCls=hasOut?'num-out':'num-in';
    var timeCls=hasOut?'time-out':'time-in';
    var badge=hasOut?'<span class="status-badge badge-out">하원</span>':'<span class="status-badge badge-in">등원</span>';
    var timeStr=hasOut?(r.inTime+' → '+r.outTime):r.inTime;
    var cancelField=hasOut?'outTime':'all';

    return '<div class="recent-item">'
      +'<div class="recent-num '+numCls+'">'+s.no+'</div>'
      +'<div class="recent-info"><div class="recent-name">'+s.name+'</div>'
      +'<div class="recent-cls">'+(s.level?('Lv: '+s.level):'')+'</div></div>'
      +'<div class="recent-right"><span class="recent-time '+timeCls+'">'+timeStr+'</span>'+badge+'</div>'
      +'<button class="cancel-btn" onclick="cancelAttend('+sid+',\''+cancelField+'\')" title="기록 취소">✕</button>'
      +'</div>';
  }).join('');
}

var RANK3_DEFS = [
  { key:'month',   icon:'📅', title:'월간 출결일수',   unit:'일',  getter:getMonthlyRanking },
  { key:'streak',  icon:'🔥', title:'최장 연속출결',    unit:'일째', getter:getStreakRanking  },
  { key:'minutes', icon:'⏱️', title:'당월 체류시간',     unit:'분',  getter:getMinutesRanking }
];

function buildTop3Rows(def){
  var data = def.getter().filter(function(r){ return r.value > 0; }).slice(0, 3);
  if(!data.length) return '<div class="rank3-empty">아직 랭킹 기록이 없습니다</div>';
  return data.map(function(r, i){
    return '<div class="rank3-row">'
      +'<span class="rank3-medal '+(i===0?'r1':i===1?'r2':i===2?'r3':'')+'">'+medalEmoji(i)+'</span>'
      +'<span class="rank3-name">'+r.s.name+'</span>'
      +'<span class="rank3-val">'+r.value+def.unit+'</span>'
      +'</div>';
  }).join('');
}

function renderRank3Group(){
  var wrap = document.getElementById('rank3Group');
  if(!wrap) return;
  wrap.innerHTML = RANK3_DEFS.map(function(def){
    return '<div class="rank3-card">'
      +'<div class="rank3-card-head"><span class="rank3-card-icon">'+def.icon+'</span><span class="rank3-card-title">'+def.title+'</span></div>'
      +buildTop3Rows(def)
      +'</div>';
  }).join('');
}

// ===== 학생 관리 =====
function renderStudents(){
  var list=document.getElementById('stuList');
  document.getElementById('stuCount').textContent=DB.students.length+'명';
  if(!DB.students.length){list.innerHTML='<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text2);">등록된 학생이 없습니다.</div>';return;}
  var sorted=[].concat(DB.students).sort(function(a,b){return a.no.localeCompare(b.no);});
  list.innerHTML=sorted.map(function(s){
    var st = DB.stats[s.id];
    var monthCount = (st && st.monthly[curYM()]) || 0;
    return '<div class="stu-row">'
      +'<div class="stu-badge">'+s.no+'</div>'
      +'<div class="stu-info"><div class="stu-name">'+s.name+'</div>'
      +'<div class="stu-meta">'+(s.level?('Lv: '+s.level):'레벨 미지정')+' · 당월 '+monthCount+'일 출석 · 🔥'+liveStreak(s.id)+'일</div></div>'
      +'<div class="stu-actions">'
      +'<button class="stu-edit" onclick="openEdit('+s.id+')">✏️</button>'
      +'<button class="stu-del"  onclick="delStu('+s.id+')">✕</button>'
      +'</div></div>';
  }).join('');
}

function openAdd(){
  ['mNo','mName','mLevel'].forEach(function(i){document.getElementById(i).value='';});
  document.getElementById('addMov').classList.add('show');
}
function closeMov(id){document.getElementById(id).classList.remove('show');}

function addStu(){
  var no=document.getElementById('mNo').value.trim().padStart(2,'0');
  var name=document.getElementById('mName').value.trim();
  var level=document.getElementById('mLevel').value.trim();
  if(!no||!name){showToast('등록번호, 이름은 필수입니다.');return;}
  if(DB.students.find(function(s){return s.no===no;})){showToast('이미 사용 중인 번호입니다.');return;}
  DB.students.push({id:Date.now(),no:no,name:name,level:level});
  save();closeMov('addMov');renderStudents();showToast('✅ '+name+' 학생이 등록되었습니다.');
}
function openEdit(id){
  var s=DB.students.find(function(x){return x.id===id;});if(!s)return;
  document.getElementById('eId').value=s.id;
  document.getElementById('eNo').value=s.no;
  document.getElementById('eName').value=s.name;
  document.getElementById('eLevel').value=s.level||'';
  document.getElementById('editMov').classList.add('show');
}
function saveEdit(){
  var id=Number(document.getElementById('eId').value);
  var no=document.getElementById('eNo').value.trim().padStart(2,'0');
  var name=document.getElementById('eName').value.trim();
  var level=document.getElementById('eLevel').value.trim();
  if(!no||!name){showToast('등록번호, 이름은 필수입니다.');return;}
  if(DB.students.find(function(s){return s.no===no&&s.id!==id;})){showToast('이미 사용 중인 번호입니다.');return;}
  var s=DB.students.find(function(x){return x.id===id;});if(!s)return;
  s.no=no;s.name=name;s.level=level;
  save();closeMov('editMov');renderStudents();showToast('✅ 정보가 수정되었습니다.');
}
function delStu(id){
  if(!confirm('삭제하시겠습니까? 출결 및 랭킹 기록도 모두 삭제됩니다.'))return;
  DB.students=DB.students.filter(function(s){return s.id!==id;});
  delete DB.stats[id];
  Object.keys(DB.attendance).forEach(function(d){ delete DB.attendance[d][id]; });
  save();renderStudents();renderRank3Group();
}

// ===== 데이터 관리 (CSV 다운로드) =====
function csvDL(filename, rows){
  var csv=rows.map(function(r){
    return r.map(function(c){
      var v=c==null?'':String(c);
      if(v.indexOf(',')>-1||v.indexOf('"')>-1||v.indexOf('\n')>-1) v='"'+v.replace(/"/g,'""')+'"';
      return v;
    }).join(',');
  }).join('\n');
  var blob=new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function dlAttendance(){
  var ym=curYM();
  var rows=[['날짜','등록번호','이름','레벨','등원시간','하원시간']];
  var dates=Object.keys(DB.attendance).filter(function(d){return d.startsWith(ym);}).sort();
  dates.forEach(function(dt){
    var att=DB.attendance[dt];
    Object.keys(att).forEach(function(sid){
      var s=DB.students.find(function(x){return x.id==sid;});
      rows.push([dt, s?s.no:'', s?s.name:'(삭제됨)', s?s.level:'', att[sid].inTime||'', att[sid].outTime||'']);
    });
  });
  if(rows.length===1){showToast('이번 달 출결 기록이 없습니다.');return;}
  csvDL('출결기록_'+ym+'.csv', rows); showToast('📥 출결기록 다운로드 완료');
}

function dlStudents(){
  var rows=[['등록번호','이름','레벨']];
  var sorted=[].concat(DB.students).sort(function(a,b){return a.no.localeCompare(b.no);});
  sorted.forEach(function(s){ rows.push([s.no, s.name, s.level||'']); });
  if(rows.length===1){showToast('등록된 학생이 없습니다.');return;}
  csvDL('학생명단.csv', rows); showToast('📥 학생명단 다운로드 완료');
}

function dlRanking(){
  var ym=curYM();
  var rows=[['등록번호','이름','레벨','이번달 출결일수','이번달 체류시간(분)','현재 연속출석(주말·휴원일 제외)','최장 연속기록']];
  var sorted=[].concat(DB.students).sort(function(a,b){return a.no.localeCompare(b.no);});
  sorted.forEach(function(s){
    var st=DB.stats[s.id];
    var monthCount=(st&&st.monthly[ym])||0;
    var monthMinutes=(st&&st.monthlyMinutes&&st.monthlyMinutes[ym])||0;
    rows.push([s.no, s.name, s.level||'', monthCount, monthMinutes, liveStreak(s.id), (st&&st.longestStreak)||0]);
  });
  if(rows.length===1){showToast('데이터가 없습니다.');return;}
  csvDL('출결랭킹_'+ym+'.csv', rows); showToast('📥 출결랭킹 다운로드 완료');
}

// ===== 데이터 관리 (JSON 백업 / 복구) =====
function exportBackup() {
  // 백업 시각·버전을 함께 넣어 두면 복구할 때 "어느 시점 파일인지" 확인할 수 있다
  var out = Object.assign({}, DB, { backupAt: fmtDate(new Date()) + ' ' + nowT(), appVersion: APP_VERSION });
  var blob = new Blob([JSON.stringify(out)], {type: "application/json;charset=utf-8;"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  // 날짜를 파일명에 넣는다. 같은 이름이면 브라우저가 "(1)"을 붙여 옛 파일을 고르기 쉬웠다
  a.download = "acad_backup_" + today() + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch(e){}
  renderBackupInfo();
  showToast('💾 데이터 백업 파일이 다운로드되었습니다.');
}

// 복구 파일 검사. 문제가 있으면 원인을 한국어 문장으로, 없으면 null을 준다
function validateBackup(obj){
  if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return '백업 파일의 내용이 비어 있거나 형식이 다릅니다.';
  if(!Array.isArray(obj.students)) return '학생 명단(students)이 없습니다. 이 프로그램에서 만든 백업 파일이 맞는지 확인해 주세요.';
  if(!obj.attendance || typeof obj.attendance !== 'object' || Array.isArray(obj.attendance)) return '출결 기록(attendance)이 없습니다. 이 프로그램에서 만든 백업 파일이 맞는지 확인해 주세요.';
  for(var i = 0; i < obj.students.length; i++){
    var st = obj.students[i];
    if(!st || st.id == null || !st.no || !st.name) return (i+1) + '번째 학생 정보가 손상되었습니다 (번호·이름 누락).';
  }
  return null;
}

function importBackup(event) {
  var inputEl = event.target;
  var file = inputEl.files[0];
  // 어떤 경우든 선택을 비워 둔다. 비우지 않으면 실패 후 같은 파일을 다시 골라도 반응하지 않는다
  var done = function(){ inputEl.value = ''; };
  if(!file){ done(); return; }

  if(!/\.json$/i.test(file.name)){
    alert('❌ JSON 백업 파일(.json)만 불러올 수 있습니다.\n선택한 파일: ' + file.name
      + '\n\n※ CSV(엑셀) 파일은 열람용이라 복구에 쓸 수 없습니다.');
    done(); return;
  }

  var reader = new FileReader();
  reader.onerror = function(){
    alert('❌ 파일을 읽지 못했습니다. 파일을 바탕화면 등으로 옮긴 뒤 다시 시도해 주세요.');
    done();
  };
  reader.onload = function(e) {
    var newDB;
    try {
      // 메모장 등으로 열었다 저장하면 맨 앞에 BOM 문자가 붙을 수 있어 제거한다
      newDB = JSON.parse(String(e.target.result).replace(/^﻿/, ''));
    } catch(err) {
      alert('❌ 백업 파일 내용이 손상되었습니다 (JSON 형식 오류).\n\n'
        + '• 백업 파일을 메모장·엑셀로 열어 수정·저장하지 않았는지 확인해 주세요.\n'
        + '• 다운로드가 중간에 끊긴 파일일 수 있습니다. 다른 백업 파일로 시도해 주세요.');
      done(); return;
    }

    var problem = validateBackup(newDB);
    if(problem){ alert('❌ 올바른 백업 파일이 아닙니다.\n\n' + problem); done(); return; }

    // 무엇으로 덮어쓰는지 보여 주고 확인받는다
    var days = Object.keys(newDB.attendance).sort();
    var summary = '불러올 백업 파일: ' + file.name
      + (newDB.backupAt ? '\n백업 시각: ' + newDB.backupAt : '')
      + '\n학생: ' + newDB.students.length + '명'
      + '\n출결 기록: ' + days.length + '일' + (days.length ? ' (' + days[0] + ' ~ ' + days[days.length-1] + ')' : '')
      + '\n\n현재 데이터(학생 ' + DB.students.length + '명, 출결 ' + Object.keys(DB.attendance).length + '일)는 '
      + '이 파일의 내용으로 모두 바뀝니다. 진행하시겠습니까?';
    if(!confirm(summary)){ done(); return; }

    // 만일을 위해 덮어쓰기 직전 데이터를 따로 한 벌 남겨 둔다
    try { localStorage.setItem(STORAGE_KEY + '-before-restore', JSON.stringify(DB)); } catch(err){}

    delete newDB.backupAt; delete newDB.appVersion;
    var prev = DB;
    DB = newDB;
    if(!save()){
      DB = prev;
      alert('❌ 브라우저 저장 공간에 기록하지 못했습니다.\n\n'
        + '• 시크릿(비공개) 창에서는 복구가 유지되지 않습니다. 일반 창에서 다시 시도해 주세요.\n'
        + '• 브라우저 저장 공간이 부족할 수 있습니다.');
      done(); return;
    }
    done();
    alert('✅ 데이터 복구가 완료되었습니다. (학생 ' + DB.students.length + '명, 출결 ' + days.length + '일)\n새로고침을 진행합니다.');
    location.reload();
  };
  reader.readAsText(file, 'utf-8');
}

// ===== 설정 =====
function loadSettings(){
  var s=DB.settings;
  document.getElementById('cfgName').value=s.academyName||'';
  document.getElementById('cfgPhone').value=s.phone||'';
  var vText = document.getElementById('appVersionText');
  if(vText) vText.textContent = APP_VERSION;
  renderHolidays();
}
function saveSettings(){
  DB.settings.academyName=document.getElementById('cfgName').value.trim()||'학원';
  DB.settings.phone=document.getElementById('cfgPhone').value.trim();
  save();showToast('✅ 설정이 저장되었습니다.');
}

// ===== 화면 테마 (다크 모드) =====
// CSS 변수만 덮어쓰는 방식이라 JS는 body에 클래스를 붙였다 떼기만 한다.
// 선택은 localStorage에 저장해 다시 접속해도 유지된다.

var THEME_KEY = 'acad-theme';

function applyTheme(dark){
  document.body.classList.toggle('dark', dark);
  var btn = document.getElementById('themeBtn');
  if(btn) btn.textContent = dark ? '☀️ 라이트 모드로 전환' : '🌙 다크 모드로 전환';
}

function loadTheme(){
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch(e){}
  applyTheme(saved === 'dark');
}

function toggleTheme(){
  var dark = !document.body.classList.contains('dark');
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch(e){}
  applyTheme(dark);
  showToast(dark ? '🌙 다크 모드로 전환했습니다.' : '☀️ 라이트 모드로 전환했습니다.');
}

// 스크립트가 body 끝에서 실행되므로 여기서 바로 적용한다.
// DOMContentLoaded를 기다리면 밝은 화면이 잠깐 보였다가 어두워진다.
loadTheme();

document.addEventListener('DOMContentLoaded', function(){
  var tBtn = document.getElementById('themeBtn');
  if(tBtn) tBtn.addEventListener('click', toggleTheme);
});

// ===== 토스트 & Undo =====
var _tt;
function showToast(m){
  var el=document.getElementById('toast');
  el.textContent=m; el.classList.add('show');
  clearTimeout(_tt); _tt=setTimeout(function(){el.classList.remove('show');},3000);
}

var UNDO_WINDOW_MS = 6000;
var _undoTimer = null, _pendingUndoAction = null;

function showUndoToast(message, undoAction){
  _pendingUndoAction = undoAction;
  var el = document.getElementById('undoToast');
  var bar = document.getElementById('undoTimerBar');
  document.getElementById('undoText').innerHTML = '<b>'+message+'</b><br>잘못 입력했다면 지금 취소할 수 있습니다.';

  clearTimeout(_undoTimer);
  el.classList.add('show');

  bar.style.transition = 'none'; bar.style.width = '100%';
  requestAnimationFrame(function(){
    bar.style.transition = 'width '+UNDO_WINDOW_MS+'ms linear';
    bar.style.width = '0%';
  });

  _undoTimer = setTimeout(function(){ hideUndoToast(); }, UNDO_WINDOW_MS);
}
function hideUndoToast(){
  clearTimeout(_undoTimer);
  document.getElementById('undoToast').classList.remove('show');
  _pendingUndoAction = null;
}
function triggerUndo(){
  if(typeof _pendingUndoAction === 'function'){
    _pendingUndoAction();
  }
  hideUndoToast();
}

// ===== 대한민국 양력 공휴일 =====
// 매년 날짜가 고정된 공휴일만 자동 생성한다.
// 설날·추석·부처님오신날은 음력이라 계산이 복잡하고,
// 대체공휴일·임시공휴일은 정부 발표 전에는 알 수 없으므로
// 원장이 직접 추가하도록 한다.

var FIXED_HOLIDAYS = [
  {md:'01-01', name:'신정'},
  {md:'03-01', name:'삼일절'},
  {md:'05-05', name:'어린이날'},
  {md:'06-06', name:'현충일'},
  {md:'08-15', name:'광복절'},
  {md:'10-03', name:'개천절'},
  {md:'10-09', name:'한글날'},
  {md:'12-25', name:'성탄절'}
];

function addFixedHolidays(){
  var year = new Date().getFullYear();
  var added = 0;
  FIXED_HOLIDAYS.forEach(function(h){
    var d = year + '-' + h.md;
    if(!isHoliday(d)){
      DB.holidays.push(d);
      added++;
    }
  });
  if(added > 0) recalcAllStats();
  save();
  renderHolidays();
  if(added > 0) showToast('✅ ' + year + '년 공휴일 ' + added + '일이 추가되었습니다.');
  else showToast('이미 모두 등록되어 있습니다.');
}

// ===== 휴원일 관리 =====
// 휴원일은 출석률 계산의 분모에서 제외된다.
// 주말은 isWeekend()로 판별하고, 공휴일·자체휴강은 원장이 직접 등록한다.

function isHoliday(dateStr){
  return DB.holidays.indexOf(dateStr) > -1;
}

function renderHolidays(){
  var box = document.getElementById('holidayList');
  if(!box) return;
  if(!DB.holidays.length){
    box.innerHTML = '<div class="holiday-empty">등록된 휴원일이 없습니다.</div>';
    return;
  }
  var sorted = [].concat(DB.holidays).sort();
  box.innerHTML = sorted.map(function(d){
    return '<span class="holiday-chip">' + d
      + '<button data-date="' + d + '">✕</button></span>';
  }).join('');
}

function addHoliday(){
  var input = document.getElementById('holidayInput');
  var d = input.value;
  if(!d){ showToast('날짜를 선택해 주세요.'); return; }
  if(isHoliday(d)){ showToast('이미 등록된 날짜입니다.'); return; }
  DB.holidays.push(d);
  recalcAllStats();
  save();
  renderHolidays();
  input.value = '';
  showToast('✅ ' + d + ' 휴원일로 등록되었습니다.');
}

function removeHoliday(dateStr){
  DB.holidays = DB.holidays.filter(function(d){ return d !== dateStr; });
  recalcAllStats();
  save();
  renderHolidays();
  showToast('휴원일에서 제외되었습니다.');
}

// 이벤트 연결 (인라인 onclick 대신 addEventListener 사용)
document.addEventListener('DOMContentLoaded', function(){
  var addBtn = document.getElementById('holidayAddBtn');
  if(addBtn) addBtn.addEventListener('click', addHoliday);

  var fixedBtn = document.getElementById('holidayFixedBtn');
  if(fixedBtn) fixedBtn.addEventListener('click', addFixedHolidays);

  // 리포트 이력 버튼
  var histDl = document.getElementById('histDlBtn');
  if(histDl) histDl.addEventListener('click', dlReportHistory);

  var histClear = document.getElementById('histClearBtn');
  if(histClear) histClear.addEventListener('click', clearReportHistory);

  // 삭제 버튼은 목록이 다시 그려질 때마다 새로 생기므로
  // 부모 요소에 한 번만 걸고 클릭 대상을 확인하는 방식으로 처리한다
  var list = document.getElementById('holidayList');
  if(list){
    list.addEventListener('click', function(e){
      var d = e.target.getAttribute('data-date');
      if(d) removeHoliday(d);
    });
  }
});

// ===== 주간 출결 집계 =====
// S1 판정 기준 정의서(A~F)를 코드로 옮긴 부분.
// 여기서 계산한 결과를 AI에게 재료로 넘긴다. 판정은 AI가 하지 않는다.

// 기준일이 속한 주의 월요일을 구한다
function weekStart(baseDate){
  var d = new Date((baseDate || today()) + 'T00:00:00');
  var day = d.getDay();              // 0=일 1=월 ... 6=토
  var diff = (day === 0) ? -6 : 1 - day;   // 일요일이면 지난 월요일로
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
}

// 월~금 중 실제 운영하는 날짜만 배열로 반환 (주말·휴원일 제외)
function weekDays(monday){
  var days = [];
  var d = new Date(monday + 'T00:00:00');
  for(var i = 0; i < 5; i++){
    var ds = fmtDate(d);
    if(isOperatingDay(ds)) days.push(ds);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// 출석률로 등급을 판정한다 (S1 정의서 B·E)
function gradeOf(rate){
  if(rate >= 100) return '최고';
  if(rate >= 80)  return '양호';
  if(rate >= 60)  return '보통';
  return '주의';
}

// 한 학생의 주간 출결을 집계한다
function weeklyStats(sid, baseDate){
  var monday = weekStart(baseDate);
  var days = weekDays(monday);
  var s = DB.students.find(function(x){ return x.id === sid; });

  var present = 0;      // 출석 일수
  var minutes = [];     // 날짜별 체류 시간(분)
  var noCheckout = 0;   // 하원 미체크 횟수

  days.forEach(function(d){
    var rec = DB.attendance[d] && DB.attendance[d][sid];
    if(rec && rec.inTime){
      present++;
      if(rec.outTime){
        minutes.push(timeDiffMinutes(rec.inTime, rec.outTime));
      } else {
        minutes.push(0);   // 하원 미체크는 0분 (S1 결정 D-4)
        noCheckout++;
      }
    }
  });

  var total = days.length;
  var rate = total ? Math.round(present / total * 100) : 0;
  var avgMin = minutes.length
    ? Math.round(minutes.reduce(function(a,b){ return a+b; }, 0) / minutes.length)
    : 0;

  var st = DB.stats[sid] || {};

  return {
    student: s,
    monday: monday,
    lastDay: days.length ? days[days.length-1] : monday,
    totalDays: total,      // 운영일 (분모)
    present: present,      // 출석일
    rate: rate,            // 출석률 %
    grade: gradeOf(rate),  // 등급
    // 이번 주는 실시간 연속, 지난 주는 그 주가 끝났을 때의 연속
    streak: monday < weekStart() ? streakEndingAt(sid, days.length ? days[days.length-1] : monday) : liveStreak(sid),
    bestStreak: st.longestStreak || 0,
    avgMinutes: avgMin,
    noCheckout: noCheckout
  };
}

// ===== 주간 리포트 화면 =====
// 지침 9-2에 따라 역할을 나눈다.
//   collectReportInput  입력 수집·검증
//   renderReportStats   집계 결과 렌더링
//   (다음 단계에서 API 호출 함수 추가)

var reportTone = 'parent';   // 현재 선택된 톤

// ===== 리포트 캐시 (2단 구조) =====
// 같은 학생·같은 집계값·같은 톤이면 AI에게 물어볼 내용이 똑같다.
// 이미 받아 둔 문장을 재사용해 불필요한 API 호출을 막는다 (제약 C5).
//
//   1단 메모리       — 가장 빠름. 새로고침하면 사라짐
//   2단 localStorage — 브라우저를 껐다 켜도 남음
//
// 앱 시작 시 2단을 1단으로 올려 두므로, 조회할 때는 메모리만 보면 된다.

var REPORT_CACHE_KEY = 'acad-report-cache';   // localStorage에 쓰는 이름
var reportCache = {};                          // 1단 (메모리)

// 캐시를 찾을 때 쓰는 열쇠를 만든다.
// 집계값이 하나라도 바뀌면 열쇠가 달라져 새로 호출된다.
function reportCacheKey(st, tone){
  return [
    st.student.id, st.monday, st.present, st.totalDays,
    st.streak, st.avgMinutes, st.grade, tone
  ].join('|');
}

// 2단에서 꺼내온다. 저장된 것이 없거나 형식이 깨졌으면 빈 객체를 준다.
function loadReportCache(){
  try {
    var raw = localStorage.getItem(REPORT_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e){
    return {};   // 실패해도 서비스는 계속 돌아가야 한다. 캐시는 있으면 좋은 것일 뿐
  }
}

// 양쪽에 저장한다.
// 집계값이 바뀌면 이전 리포트는 더 이상 쓸모가 없으므로,
// 같은 학생·같은 톤의 헌 항목은 지우고 최신 1개만 남긴다.
function saveReportCache(key, text){
  // 열쇠는 "학생ID|월요일|출석|운영일|연속|평균체류|등급|톤" 형태다.
  // 맨 앞의 학생ID와 맨 뒤의 톤이 같으면 같은 조합으로 본다.
  var parts = key.split('|');
  var sid   = parts[0];
  var tone  = parts[parts.length - 1];
  var isSameCombo = function(k){
    var p = k.split('|');
    return p[0] === sid && p[p.length - 1] === tone;
  };

  // 1단 — 헌 항목을 지우고 새것을 넣는다
  Object.keys(reportCache).forEach(function(k){
    if(isSameCombo(k)) delete reportCache[k];
  });
  reportCache[key] = text;

  // 2단 — 같은 방식으로 정리 후 저장
  try {
    var stored = loadReportCache();
    Object.keys(stored).forEach(function(k){
      if(isSameCombo(k)) delete stored[k];
    });
    stored[key] = text;
    localStorage.setItem(REPORT_CACHE_KEY, JSON.stringify(stored));
  } catch(e){
    // 용량 초과 등으로 실패해도 무시한다. 1단 메모리는 이미 저장됐다
    console.warn('리포트 캐시 저장 실패:', e);
  }
}

// 앱이 켜질 때 2단 내용을 1단으로 미리 올려 둔다
reportCache = loadReportCache();

// ===== 리포트 발송 이력 =====
// 캐시와 목적이 다르므로 저장소를 분리한다.
//   캐시 — 같은 조건이면 재사용. 조합당 1건만 유지(덮어씀)
//   이력 — 언제 무엇을 만들었는지의 기록. 누적(지우지 않음)
// 캐시 기준으로 이력을 관리하면 기록이 사라지므로 함께 둘 수 없다.

var REPORT_HISTORY_KEY = 'acad-report-history';

// 보관 상한. 넘으면 오래된 것부터 자동으로 밀려난다.
// 학생 40명 기준 주당 약 40건이 쌓이므로 1000건이면 약 6개월치다.
// 항목당 700바이트 남짓이라 전체 0.7MB 수준이며, 출결 데이터와 함께 써도 여유가 있다.
var REPORT_HISTORY_MAX = 1000;

var TONE_LABEL = { parent:'학부모 발송용', student:'학생 열람용', peer:'지난주 보드(자동)' };

function loadReportHistory(){
  try {
    var raw = localStorage.getItem(REPORT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    return [];   // 읽기에 실패해도 서비스는 계속 동작해야 한다
  }
}

// 생성에 성공한 리포트만 이력에 남긴다
function addReportHistory(st, tone, text){
  var list = loadReportHistory();
  var d = new Date();

  list.unshift({                       // 최신이 위로 오도록 맨 앞에 넣는다
    at: fmtDate(d) + ' ' + nowT(),
    no: st.student.no,
    name: st.student.name,
    tone: tone,
    grade: st.grade,
    rate: st.rate,
    present: st.present,
    totalDays: st.totalDays,
    period: st.monday + ' ~ ' + st.lastDay,
    text: text
  });

  // 최신순으로 정렬돼 있으므로 앞에서 잘라내면 오래된 것이 빠진다
  var removed = 0;
  if(list.length > REPORT_HISTORY_MAX){
    removed = list.length - REPORT_HISTORY_MAX;
    list = list.slice(0, REPORT_HISTORY_MAX);
  }

  try {
    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(list));
  } catch(e){
    // 상한을 두었어도 용량 한도에 걸릴 수 있다.
    // 조용히 넘어가면 원장이 이유를 알 수 없으므로 알린다.
    console.warn('리포트 이력 저장 실패:', e);
    showToast('⚠️ 저장 공간이 부족해 이력을 남기지 못했습니다.');
    return;
  }

  if(removed > 0){
    showToast('오래된 리포트 ' + removed + '건이 목록에서 제외되었습니다.');
  }
  renderReportHistoryAll();
}

function clearReportHistory(){
  if(!confirm('리포트 발송 이력을 모두 삭제하시겠습니까?\n생성된 리포트 기록이 사라집니다.')) return;
  try { localStorage.removeItem(REPORT_HISTORY_KEY); } catch(e){}
  renderReportHistoryAll();
  showToast('리포트 이력이 삭제되었습니다.');
}

// limit이 0이면 전체를 그린다
function renderReportHistory(boxId, limit){
  var box = document.getElementById(boxId);
  if(!box) return;

  var list = loadReportHistory();
  if(!list.length){
    box.innerHTML = '<div class="hist-empty">아직 생성한 리포트가 없습니다.</div>';
    return;
  }

  var shown = limit ? list.slice(0, limit) : list;
  box.innerHTML = shown.map(function(h){
    return '<div class="hist-item">'
      + '<div class="hist-head">'
      +   '<div class="hist-meta">'
      +     '<span class="hist-name">' + h.no + ' ' + h.name + '</span>'
      +     '<span class="hist-badge grade-' + h.grade + '">' + h.grade + '</span>'
      +     '<span class="hist-tone">' + (TONE_LABEL[h.tone] || h.tone) + '</span>'
      +   '</div>'
      +   '<span class="hist-at">' + h.at + '</span>'
      + '</div>'
      + '<div class="hist-body">' + h.text + '</div>'
      + '</div>';
  }).join('');

  // 항목이 다시 그려질 때마다 새로 생기므로 부모에 한 번만 건다
  box.onclick = function(e){
    var head = e.target.closest('.hist-head');
    if(head) head.parentNode.classList.toggle('open');
  };
}

// 두 화면에 같은 이력이 표시되므로 함께 갱신한다
function renderReportHistoryAll(){
  renderReportHistory('reportHistoryList', 5);    // 리포트 화면 — 최근 5건
  renderReportHistory('dataHistoryList', 50);     // 데이터 관리 — 최근 50건
}

// 이력을 CSV로 내보낸다 (화면 표시 제한과 무관하게 전부 내보냄)
function dlReportHistory(){
  var list = loadReportHistory();
  if(!list.length){ showToast('내보낼 리포트 이력이 없습니다.'); return; }

  var rows = [['생성일시','등록번호','이름','톤','기간','출석','운영일','출석률(%)','등급','리포트']];
  list.forEach(function(h){
    rows.push([h.at, h.no, h.name, TONE_LABEL[h.tone] || h.tone,
               h.period, h.present, h.totalDays, h.rate, h.grade, h.text]);
  });
  csvDL('리포트이력.csv', rows);
  showToast('📥 리포트 이력 다운로드 완료');
}

// 리포트 화면 진입 시 입력칸 초기화
function fillStudentSelect(){
  var input = document.getElementById('reportCode');
  if(!input) return;
  input.value = '';
  updateReportName();
  refreshReportStats();   // 탭에 다시 들어왔을 때 이전 학생의 카드·리포트를 지운다
  setTimeout(function(){ input.focus(); }, 100);
}

// 입력된 번호로 학생을 찾는다 (없으면 null)
function findStudentByCode(){
  var input = document.getElementById('reportCode');
  var no = (input.value || '').trim();
  if(no.length !== 2) return null;
  return DB.students.find(function(s){ return s.no === no; }) || null;
}

// 입력에 따라 학생 이름을 실시간 표시
function updateReportName(){
  var el = document.getElementById('reportName');
  var input = document.getElementById('reportCode');
  var no = (input.value || '').trim();

  if(!no){
    el.textContent = '번호를 입력하세요';
    el.className = 'rc-name';
    return;
  }
  var s = findStudentByCode();
  if(s){
    el.textContent = s.name + (s.level ? ' (' + s.level + ')' : '');
    el.className = 'rc-name found';
  } else if(no.length === 2){
    el.textContent = '등록되지 않은 번호입니다';
    el.className = 'rc-name notfound';
  } else {
    el.textContent = '두 자리를 입력하세요';
    el.className = 'rc-name';
  }
}

// 입력 수집 + 검증 (S1 정의서 F-5)
function collectReportInput(){
  var input = document.getElementById('reportCode');
  var no = (input.value || '').trim();

  if(!no){
    showReportMessage('error', '학생 번호를 입력해 주세요.');
    return null;
  }
  var s = findStudentByCode();
  if(!s){
    showReportMessage('error', '등록되지 않은 번호입니다. 다시 한 번 확인해주세요.');
    return null;
  }
  return { sid: s.id, tone: reportTone };
}

// 집계 결과를 카드로 표시
function renderReportStats(st){
  var box = document.getElementById('reportStats');
  var period = st.monday + ' ~ ' + st.lastDay;

  box.innerHTML =
      '<div class="rs-card"><div class="rs-num">' + st.present + ' / ' + st.totalDays + '</div>'
    + '<div class="rs-label">출석 / 운영일</div></div>'
    + '<div class="rs-card"><div class="rs-num">' + st.rate + '%</div>'
    + '<div class="rs-label">출석률</div></div>'
    + '<div class="rs-card"><div class="rs-num">' + st.streak + '</div>'
    + '<div class="rs-label">연속 출석(일)</div></div>'
    + '<div class="rs-card"><div class="rs-num">' + st.avgMinutes + '</div>'
    + '<div class="rs-label">평균 체류(분)</div></div>'
    + '<div class="rs-grade grade-' + st.grade + '">'
    + '판정: ' + st.grade + ' <span style="font-weight:400;font-size:13px;">(' + period + ')</span>'
    + '</div>';
}

// 입력된 번호에 맞춰 카드를 다시 그린다.
// 규칙: 카드는 항상 "지금 입력창에 있는 번호"의 것이어야 한다.
// 유효하지 않은 번호면 카드도 리포트도 남기지 않는다.
function refreshReportStats(){
  var statsBox = document.getElementById('reportStats');
  var outBox   = document.getElementById('reportOutput');
  var btn      = document.getElementById('reportBtn');
  if(!statsBox || !outBox) return;

  // 번호가 바뀌는 순간 이전 학생의 결과는 무조건 지운다
  statsBox.innerHTML = '';
  outBox.innerHTML   = '';

  var s = findStudentByCode();
  if(!s){
    // 유효한 번호가 아니면 생성 버튼도 숨긴다.
    // 누를 수 없는 버튼을 보여 주는 것보다 안 보이는 편이 덜 헷갈린다.
    if(btn) btn.style.display = 'none';
    return;
  }

  if(btn) btn.style.display = '';   // 기본값으로 되돌려 다시 보이게 한다
  renderReportStats(weeklyStats(s.id));
}

// 출력 영역에 안내 메시지 표시
function showReportMessage(type, text){
  var box = document.getElementById('reportOutput');
  box.innerHTML = '<div class="ro-msg ' + type + '">' + text + '</div>';
}

// 집계 결과를 AI에게 넘길 텍스트로 변환한다.
// 판정(등급)은 이미 끝난 상태로 넘긴다. AI는 문장만 쓴다.
function buildReportData(st){
  var lines = [
    '학생 이름: ' + st.student.name,
    '레벨: ' + (st.student.level || '미지정'),
    '기간: ' + st.monday + ' ~ ' + st.lastDay + ' (운영 ' + st.totalDays + '일)',
    '출석: ' + st.present + '일 / ' + st.totalDays + '일 (' + st.rate + '%)',
    '연속 출석: ' + st.streak + '일 (최장 기록 ' + st.bestStreak + '일)',
    '평균 체류 시간: ' + st.avgMinutes + '분',
    '등급: ' + st.grade
  ];
  if(st.noCheckout > 0){
    lines.push('하원 체크 누락: ' + st.noCheckout + '회');
  }
  return lines.join('\n');
}

// ===== AI 호출 (Gemini 직접 호출) =====
// 서버 없이 이 HTML 파일에서 바로 Gemini를 부른다. (로컬 PC 전용 운영)
// Gemini는 로컬 파일(file://)에서 오는 요청도 허용한다.
//
// 키는 설정 화면에서 한 번 등록하며, 출결 DB와 분리된 저장소에 둔다.
// → JSON 백업 파일에 키가 섞여 나가지 않는다.

var GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/interactions';
var GEMINI_MODEL   = 'models/gemini-3-flash-preview';
var GEMINI_TIMEOUT = 25000;
var GEMINI_KEY_STORE = 'acad-gemini-key';

// 판정은 코드가 끝냈다. AI는 문장만 쓴다.
var REPORT_PROMPTS = {
  parent: [
    '너는 학원 원장을 돕는 주간 리포트 작성 조수다.',
    '주어진 출결 데이터를 3~5문장의 한국어 리포트로 작성한다.',
    '규칙:',
    '- 등급은 이미 정해져 있다. 절대 다시 판단하지 마라.',
    '- 숫자를 지어내지 마라. 주어진 값만 사용한다.',
    '- 학부모에게 보낼 글이므로 정중하고 따뜻한 톤으로 쓴다.',
    '- 질책하지 말고, 개선이 필요하면 격려로 마무리한다.',
    '- 주어진 정보에 없는 이름·사실을 지어내지 마라. 학생 이름은 입력된 값만 그대로 쓴다.'
  ].join('\n'),
  student: [
    '너는 학원 학생에게 이번 주 출결을 알려주는 조수다.',
    '주어진 출결 데이터를 3~5문장의 한국어 글로 작성한다.',
    '규칙:',
    '- 등급은 이미 정해져 있다. 절대 다시 판단하지 마라.',
    '- 숫자를 지어내지 마라. 주어진 값만 사용한다.',
    '- 학생 본인이 읽는 글이므로 친근한 말투로 쓴다.',
    '- 잘한 점을 먼저 말하고, 아쉬운 점은 짧게 덧붙인다.',
    '- 주어진 정보에 없는 이름·사실을 지어내지 마라. 학생 이름은 입력된 값만 그대로 쓴다.'
  ].join('\n'),
  peer: [
    "너는 학원 출결 게시판에 올라갈 '지난주 출결 한마디'를 쓰는 조수다.",
    '이 글은 학원 친구들이 서로 돌려 보는 공개 게시물이다.',
    '주어진 출결 데이터를 2~3문장의 한국어 글로 작성한다.',
    '규칙:',
    '- 등급은 이미 정해져 있다. 절대 다시 판단하지 마라.',
    '- 숫자를 지어내지 마라. 주어진 값만 사용한다.',
    '- 친구들이 함께 읽으므로 친근한 존댓말(~요)로 쓴다.',
    '- 잘한 점을 숫자로 구체적으로 칭찬하고, 이번 주 목표를 한 가지 응원으로 제시한다.',
    '- 다른 학생과 비교하거나 질책·망신을 주는 표현은 절대 쓰지 마라.',
    '- 주어진 정보에 없는 이름·사실을 지어내지 마라. 학생 이름은 입력된 값만 그대로 쓴다.'
  ].join('\n')
};

function getGeminiKey(){
  try { return (localStorage.getItem(GEMINI_KEY_STORE) || '').trim(); } catch(e){ return ''; }
}

// steps 배열에서 model_output 타입의 텍스트만 뽑는다 (순서가 아니라 type으로 찾는다)
function extractGeminiText(result){
  var text = '';
  (result && result.steps || []).forEach(function(step){
    if(step.type !== 'model_output') return;
    (step.content || []).forEach(function(c){ if(c.type === 'text') text += c.text || ''; });
  });
  return text.trim();
}

// 성공: {ok:true, text}  /  실패: {ok:false, error:'사용자용 문구'}
// 인터넷 자체가 끊긴 경우에만 예외를 던진다 (호출하는 쪽에서 "연결 실패"로 처리)
async function callReportApi(data, tone, keyOverride){
  var key = keyOverride || getGeminiKey();
  if(!key) return { ok:false, error:'AI 키가 등록되지 않았습니다. 설정 → AI 연결에서 Gemini API 키를 등록해 주세요.' };
  if(!data) return { ok:false, error:'출결 데이터가 없습니다.' };

  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, GEMINI_TIMEOUT);
  var res;
  try {
    res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        system_instruction: REPORT_PROMPTS[tone] || REPORT_PROMPTS.parent,
        input: data,
        generation_config: { thinking_level: 'low' }
      }),
      signal: ctrl.signal
    });
  } catch(e){
    if(e && e.name === 'AbortError') return { ok:false, error:'응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' };
    throw e;
  } finally {
    clearTimeout(timer);
  }

  // 외부 API의 원문 에러는 화면에 보이지 않는다 (키 일부가 섞여 나올 수 있음). 개발자용으로만 남긴다
  if(!res.ok){
    console.error('Gemini HTTP 오류:', res.status);
    if(res.status === 400 || res.status === 401 || res.status === 403)
      return { ok:false, error:'AI 키가 올바르지 않거나 사용할 수 없습니다. 설정 → AI 연결에서 키를 확인해 주세요.' };
    if(res.status === 429)
      return { ok:false, rateLimited:true, error:'AI 사용량이 많아 잠시 막혔습니다. 잠시 후 다시 시도해 주세요.' };
    return { ok:false, error:'AI 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.' };
  }

  var text = '';
  try { text = extractGeminiText(await res.json()); } catch(e){}
  if(!text) return { ok:false, error:'리포트를 생성하지 못했습니다.' };
  return { ok:true, text:text };
}

// AI 결과를 화면에 표시 (지침 9-2의 3분할 중 '렌더링' 담당)
function renderReportText(text){
  var box = document.getElementById('reportOutput');
  box.innerHTML = '<div class="ro-box">' + text + '</div>'
    + '<button class="ro-copy" id="reportCopyBtn">복사하기</button>';

  document.getElementById('reportCopyBtn').addEventListener('click', function(){
    navigator.clipboard.writeText(text).then(function(){
      showToast('✅ 리포트가 복사되었습니다.');
    });
  });
}

// 리포트 생성 버튼 클릭 시 실행
async function generateReport(){
  var input = collectReportInput();
  if(!input) return;                       // 검증 실패 시 여기서 중단

  var st = weeklyStats(input.sid);
  renderReportStats(st);                   // 카드는 항상 지금 입력된 번호의 것으로 맞춘다

  // 이번 주 출결 기록이 0건이면 API를 호출하지 않는다 (S1 정의서 F-1)
  // 카드(0/5, 0%)는 그대로 두고 안내 문구만 띄운다
  // 한 주 전체가 휴원이면 원인이 다르므로 안내도 따로 한다
  if(st.totalDays === 0){
    showReportMessage('info', '이번 주는 전체 휴원(운영일 0일)이라 리포트를 만들 출결이 없습니다.');
    return;
  }
  if(st.present === 0){
    showReportMessage('error', '이번 주 출결 기록이 없습니다. 출결 현황 기록을 확인해주세요.');
    return;
  }

    // 이미 같은 조건으로 받아 둔 리포트가 있으면 API를 부르지 않는다 (제약 C5)
  var cacheKey = reportCacheKey(st, input.tone);
  if(reportCache[cacheKey]){
    renderReportText(reportCache[cacheKey]);
    showToast('이전에 생성한 리포트입니다.');
    return;
  }

  // 요청 중에는 버튼과 입력칸을 함께 잠근다
  // (연타로 인한 중복 호출·과금 방지, 제약 C5 / 대기 중 번호 변경 방지)
  var btn  = document.getElementById('reportBtn');
  var code = document.getElementById('reportCode');
  btn.disabled  = true;
  code.disabled = true;
  btn.textContent = '작성 중...';
  showReportMessage('info', 'AI가 리포트를 작성하고 있습니다. 잠시만 기다려 주세요.');

  try {
    var result = await callReportApi(buildReportData(st), input.tone);
    if(result.ok){
      saveReportCache(cacheKey, result.text);            // 재사용용 (조합당 1건)
      addReportHistory(st, input.tone, result.text);     // 기록용 (누적)
      renderReportText(result.text);
    } else {
      // 백엔드가 보내준 사용자용 문구를 그대로 표시한다
      showReportMessage('error', result.error || '리포트를 생성하지 못했습니다.');
    }
  } catch (e) {
    // 네트워크 자체가 끊긴 경우 (오프라인 등)
    console.error('리포트 요청 실패:', e);
    showReportMessage('error', '연결에 실패했습니다. 네트워크 상태를 확인해 주세요.');
  } finally {
    // 성공하든 실패하든 버튼·입력칸은 반드시 원래대로 되돌린다
    btn.disabled  = false;
    code.disabled = false;
    btn.textContent = '리포트 생성';
  }
}

document.addEventListener('DOMContentLoaded', function(){
  // 톤 선택 버튼
  var toneBtns = document.querySelectorAll('.tone-btn');
  toneBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      toneBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      reportTone = btn.getAttribute('data-tone');
    });
  });

  // 생성 버튼
  var btn = document.getElementById('reportBtn');
  if(btn) btn.addEventListener('click', generateReport);

  // 번호 입력 — 숫자만 허용하고 이름·집계 카드를 실시간 갱신
  var codeInput = document.getElementById('reportCode');
  if(codeInput){
    codeInput.addEventListener('input', function(){
      this.value = this.value.replace(/\D/g, '').slice(0, 2);
      updateReportName();
      refreshReportStats();   // ← 카드도 이름과 같은 타이밍에 갱신
    });
    // Enter로도 생성 가능 (출결 데스크와 동일한 조작감)
    codeInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter') generateReport();
    });
  }
});

// ===== 지난주 리포트 (자동 생성 + 친구 보드) =====
// 이번 주에 등원하는 학생이 "지난주 나의 리포트"를 보고,
// 출결 데스크의 보드에서 친구들의 지난주 리포트를 돌려 보며 서로 자극을 받게 한다.
//
//   자동 생성 — 원장이 버튼을 누르지 않는다. 데스크 PC가 켜져 있으면
//              평일 13:30에 1차 시도, 14:00에 실패·누락분만 다시 시도한다.
//              PC를 늦게 켰다면 켜진 직후 1차, 끝나는 대로 2차가 이어서 돈다.
//   노출 규칙 — 생성 전에 등원한 학생은 그날 팝업에서 통계만 본다.
//              AI 한마디는 생성이 끝난 뒤(보통 다음 날 등원 때)부터 보인다.
//   보드     — 4초마다 한 명씩 순환. 드롭다운으로 특정 친구를 고정해 볼 수 있고,
//              20초간 조작이 없으면 다시 순환으로 돌아간다(공용 PC라 고정된 채 방치되지 않도록).

var AUTO_SLOTS        = ['13:30', '14:00'];  // 1차 시도, 2차(미생성분 재시도)
var BOARD_INTERVAL_MS = 4000;
var BOARD_RESUME_MS   = 20000;
var WEEKLY_KEEP_WEEKS = 8;                   // 오래된 주차는 자동 정리
// 무료 키는 분당 호출 수 제한이 있어, 40명을 연달아 부르면 429(사용량 제한)가 난다.
// 학생 사이에 간격을 두고, 429가 나면 1분 쉬었다가 그 학생을 한 번 더 시도한다.
var GEN_GAP_MS         = 7000;               // 호출 간격 (분당 최대 약 8회)
var RATE_LIMIT_WAIT_MS = 60000;
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

function ensureWeekly(){
  if(!DB.weekly || typeof DB.weekly !== 'object') DB.weekly = {};
  if(!DB.weekly.reports) DB.weekly.reports = {};   // { 지난주월요일: { 학생ID: {text, at} } }
  if(!DB.weekly.tries)   DB.weekly.tries   = {};   // { 이번주월요일: { '13:30': '시도시각', ... } }
  return DB.weekly;
}

function lastWeekMonday(){
  var d = new Date(weekStart() + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  return fmtDate(d);
}

function lastWeekStats(sid){ return weeklyStats(sid, lastWeekMonday()); }

function lastWeekReport(sid){
  var bucket = ensureWeekly().reports[lastWeekMonday()];
  return (bucket && bucket[sid]) || null;
}

function mmdd(ds){ return Number(ds.slice(5,7)) + '/' + Number(ds.slice(8,10)); }

// 오래된 주차 정리 (저장 공간 보호)
function pruneWeekly(){
  var w = ensureWeekly();
  ['reports','tries'].forEach(function(k){
    var weeks = Object.keys(w[k]).sort();
    while(weeks.length > WEEKLY_KEEP_WEEKS) delete w[k][weeks.shift()];
  });
}

// ----- 자동 생성 -----
var _weeklyRunning = false;

// 대상: 지난주 운영일이 있고, 한 번이라도 출석했고, 아직 리포트가 없는 학생
function weeklyTargets(){
  var mon = lastWeekMonday();
  return DB.students.filter(function(s){
    if(lastWeekReport(s.id)) return false;
    var st = weeklyStats(s.id, mon);
    return st.totalDays > 0 && st.present > 0;
  });
}

async function runWeeklyGeneration(){
  if(_weeklyRunning) return;
  _weeklyRunning = true;
  renderAutoStatus();

  var mon = lastWeekMonday();
  var w = ensureWeekly();
  var targets = weeklyTargets();
  var failed = 0;

  // 한 명씩 차례로 호출한다 (동시 호출 시 API 제한·과금 폭주 방지)
  for(var i = 0; i < targets.length; i++){
    var s = targets[i];
    var st = weeklyStats(s.id, mon);
    try {
      if(i > 0) await sleep(GEN_GAP_MS);
      var r = await callReportApi(buildReportData(st), 'peer');
      if(r && r.rateLimited){
        await sleep(RATE_LIMIT_WAIT_MS);
        r = await callReportApi(buildReportData(st), 'peer');
      }
      if(r && r.ok){
        if(!w.reports[mon]) w.reports[mon] = {};
        w.reports[mon][s.id] = { text: r.text, at: fmtDate(new Date()) + ' ' + nowT() };
        save();
        addReportHistory(st, 'peer', r.text);
      } else {
        failed++;
        console.warn('지난주 리포트 생성 실패:', s.name, r && r.error);
      }
    } catch(e){
      // 네트워크 자체가 안 되면 나머지도 실패하므로 여기서 멈추고 다음 시도에 맡긴다
      failed += targets.length - i;
      console.error('지난주 리포트 요청 실패:', e);
      break;
    }
    renderAutoStatus();
  }

  pruneWeekly(); save();
  _weeklyRunning = false;
  renderAutoStatus();
  renderBoard();
  return failed;
}

// 30초마다 확인. 지난 시각의 슬롯 중 아직 시도하지 않은 것을 하나씩 실행한다
function autoTick(){
  if(_weeklyRunning) return;
  var td = today();
  if(isWeekend(td)) return;                 // 주말에는 돌리지 않는다

  if(!getGeminiKey()) return;               // 키 등록 전에는 시도하지 않는다 (등록 후 바로 돌 수 있게)

  var w = ensureWeekly();
  var thisMon = weekStart();
  var tries = w.tries[thisMon] || (w.tries[thisMon] = {});
  var now = nowT();

  for(var i = 0; i < AUTO_SLOTS.length; i++){
    var slot = AUTO_SLOTS[i];
    if(now >= slot && !tries[slot]){
      tries[slot] = td + ' ' + now;         // 먼저 표시해 두어 중복 실행을 막는다
      save();
      runWeeklyGeneration();
      return;
    }
  }
}

// 원장 화면 — 자동 생성 현황 (수동 버튼은 비상용)
function renderAutoStatus(){
  var box = document.getElementById('autoStatus');
  if(!box) return;
  var mon = lastWeekMonday();
  var days = weekDays(mon);
  var lastDay = days.length ? days[days.length-1] : mon;
  var w = ensureWeekly();
  var tries = w.tries[weekStart()] || {};
  var made = Object.keys(w.reports[mon] || {}).length;
  var remain = weeklyTargets().length;

  var slotHtml = AUTO_SLOTS.map(function(sl){
    return '<span class="auto-slot' + (tries[sl] ? ' done' : '') + '">' + sl + ' '
      + (tries[sl] ? '시도함' : '대기') + '</span>';
  }).join('');

  var stateText;
  if(!days.length)          stateText = '지난주는 전체 휴원이라 생성할 리포트가 없습니다.';
  else if(!getGeminiKey())  stateText = '⚠️ AI 키가 등록되지 않아 자동 생성이 멈춰 있습니다. 설정 → AI 연결에서 등록해 주세요.';
  else if(_weeklyRunning)   stateText = '생성 중... (' + made + '건 완료, ' + remain + '건 남음)';
  else if(remain === 0)     stateText = '대상 학생 리포트가 모두 준비되었습니다. (' + made + '건)';
  else                      stateText = made + '건 생성 · ' + remain + '건 미생성';

  box.innerHTML =
      '<div class="auto-head">'
    +   '<div><b>지난주 리포트 자동 생성</b> <span class="auto-period">'
    +     mmdd(mon) + ' ~ ' + mmdd(lastDay) + '</span></div>'
    +   '<div class="auto-slots">' + slotHtml + '</div>'
    + '</div>'
    + '<div class="auto-state">' + stateText + '</div>'
    + ((remain > 0 && !_weeklyRunning && getGeminiKey())
        ? '<button class="auto-now" id="autoNowBtn">미생성분 지금 생성</button>' : '');

  var btn = document.getElementById('autoNowBtn');
  if(btn) btn.addEventListener('click', function(){ runWeeklyGeneration(); });
}

// ----- 화면 조각: 지난주 리포트 카드 -----
// inPopup=true면 본인용(기록 팝업), false면 보드용
function lastWeekHtml(sid, inPopup){
  var s = DB.students.find(function(x){ return x.id === sid; });
  if(!s) return '';
  var st = lastWeekStats(sid);
  var rep = lastWeekReport(sid);
  var period = mmdd(st.monday) + ' ~ ' + mmdd(st.lastDay);

  var head = inPopup
    ? '<div class="lw-title">📋 지난주 나의 리포트 <span class="lw-period">' + period + '</span></div>'
    : '<div class="lw-who"><span class="lw-name">' + s.name + '</span>'
      + '<span class="lw-level">' + (s.level || '') + '</span>'
      + '<span class="lw-period">' + period + '</span></div>';

  // 한 주 전체 휴원 (운영일 0일)
  if(st.totalDays === 0){
    return head + '<div class="lw-msg">지난주는 전체 휴원이었어요. 이번 주도 함께 힘내요! 💪</div>';
  }
  // 지난주 출석 0일 — 등급(주의)을 드러내지 않고 응원만 한다
  if(st.present === 0){
    return head + '<div class="lw-msg">지난주에는 출석 기록이 없어요. 이번 주에 새로 시작해 봐요! 🌱</div>';
  }

  var stats =
      '<div class="lw-stats">'
    +   '<span class="lw-grade grade-' + st.grade + '">' + st.grade + '</span>'
    +   '<span class="lw-stat"><b>' + st.present + '/' + st.totalDays + '</b>일 출석</span>'
    +   (st.streak > 0 ? '<span class="lw-stat">🔥 <b>' + st.streak + '</b>일 연속</span>' : '')   // 0일 연속은 굳이 드러내지 않는다
    +   '<span class="lw-stat">⏱️ 평균 <b>' + st.avgMinutes + '</b>분</span>'
    + '</div>';

  var text = rep
    ? '<div class="lw-text">' + rep.text + '</div>'
    : '<div class="lw-pending">AI 한마디는 준비 중이에요. '
      + (inPopup ? '다음 등원 때 확인할 수 있어요!' : '오후 1시 30분 이후 공개됩니다.') + '</div>';

  return head + stats + text;
}

// ----- 친구 보드 (4초 순환 + 드롭다운 고정) -----
var _boardIdx = 0, _boardPinned = null, _boardTimer = null, _boardResumeTimer = null;

// 순환 대상: 지난주 한 번이라도 출석한 학생 (0일인 친구를 공개적으로 돌리지 않는다)
function boardRotation(){
  var mon = lastWeekMonday();
  return [].concat(DB.students)
    .sort(function(a,b){ return a.no.localeCompare(b.no); })
    .filter(function(s){ return weeklyStats(s.id, mon).present > 0; });
}

function fillBoardSelect(){
  var sel = document.getElementById('boardSelect');
  if(!sel) return;
  var sorted = [].concat(DB.students).sort(function(a,b){ return a.no.localeCompare(b.no); });
  // 4초마다 불리므로 명단이 바뀌었을 때만 다시 그린다 (열려 있는 드롭다운이 닫히지 않도록)
  var sig = sorted.map(function(s){ return s.id + ':' + s.no + ':' + s.name; }).join('|');
  if(sel._sig === sig) return;
  sel._sig = sig;
  var cur = sel.value;
  sel.innerHTML = '<option value="">🔄 전체 순환</option>'
    + sorted.map(function(s){
        return '<option value="' + s.id + '">' + s.no + ' ' + s.name + '</option>';
      }).join('');
  sel.value = cur;
  if(sel.value !== cur) sel.value = '';
}

function renderBoard(){
  var card = document.getElementById('boardCard');
  var dots = document.getElementById('boardDots');
  if(!card) return;
  fillBoardSelect();

  if(_boardPinned){
    card.innerHTML = lastWeekHtml(_boardPinned, false);
    if(dots) dots.innerHTML = '<span class="board-pin">📌 선택한 친구 보기 · 잠시 후 순환으로 돌아갑니다</span>';
    return;
  }

  var list = boardRotation();
  if(!list.length){
    var noDays = weekDays(lastWeekMonday()).length === 0;
    card.innerHTML = '<div class="lw-msg">' + (noDays
      ? '지난주는 전체 휴원이었어요. 이번 주 기록이 다음 주 보드에 올라옵니다!'
      : '아직 보드에 올릴 지난주 기록이 없어요.') + '</div>';
    if(dots) dots.innerHTML = '';
    return;
  }

  _boardIdx = _boardIdx % list.length;
  card.innerHTML = lastWeekHtml(list[_boardIdx].id, false);
  card.classList.remove('fade'); void card.offsetWidth; card.classList.add('fade');
  if(dots){
    dots.innerHTML = list.length > 12
      ? '<span class="board-count">' + (_boardIdx + 1) + ' / ' + list.length + '</span>'
      : list.map(function(_, i){ return '<i class="' + (i === _boardIdx ? 'on' : '') + '"></i>'; }).join('');
  }
}

function boardNext(){
  if(_boardPinned) return;
  var home = document.getElementById('screen-home');
  if(home && !home.classList.contains('active')) return;   // 다른 화면에서는 돌리지 않는다
  _boardIdx++;
  renderBoard();
}

function pinBoard(sidStr){
  clearTimeout(_boardResumeTimer);
  _boardPinned = sidStr ? Number(sidStr) : null;
  if(_boardPinned){
    _boardResumeTimer = setTimeout(function(){
      _boardPinned = null;
      var sel = document.getElementById('boardSelect');
      if(sel) sel.value = '';
      renderBoard();
    }, BOARD_RESUME_MS);
  }
  renderBoard();
}

document.addEventListener('DOMContentLoaded', function(){
  var sel = document.getElementById('boardSelect');
  if(sel){
    sel.addEventListener('change', function(){
      pinBoard(this.value);
      // 드롭다운을 쓴 뒤에도 다음 학생이 바로 번호를 입력할 수 있게 입력칸으로 돌려 둔다
      var input = document.getElementById('numInput');
      if(input) setTimeout(function(){ input.focus(); }, 50);
    });
  }
  renderBoard();
  _boardTimer = setInterval(boardNext, BOARD_INTERVAL_MS);

  setTimeout(autoTick, 2000);
  setInterval(autoTick, 30000);
});


// ===== 설정: AI 연결 (Gemini API 키) =====
function maskKey(k){ return k ? ('••••••••' + k.slice(-4)) : ''; }

function renderKeyStatus(){
  var el = document.getElementById('keyStatus');
  if(!el) return;
  var k = getGeminiKey();
  el.className = 'key-status ' + (k ? 'on' : 'off');
  el.textContent = k ? ('✅ 등록됨 (' + maskKey(k) + ')') : '⚠️ 등록된 키가 없습니다. AI 문장 없이 통계만 표시됩니다.';
}

function saveGeminiKey(){
  var input = document.getElementById('keyInput');
  var k = (input.value || '').trim().replace(/^["']|["']$/g, '');
  if(!k){ showToast('키를 붙여 넣어 주세요.'); return; }
  try { localStorage.setItem(GEMINI_KEY_STORE, k); } catch(e){ showToast('⚠️ 키를 저장하지 못했습니다.'); return; }
  input.value = '';
  renderKeyStatus(); renderAutoStatus();
  showToast('✅ AI 키가 저장되었습니다. [연결 테스트]로 확인해 보세요.');
  setTimeout(autoTick, 500);   // 오늘 자동 생성 시각이 지났다면 바로 시작
}

function deleteGeminiKey(){
  if(!getGeminiKey()) return;
  if(!confirm('등록된 AI 키를 삭제할까요?')) return;
  try { localStorage.removeItem(GEMINI_KEY_STORE); } catch(e){}
  renderKeyStatus(); renderAutoStatus();
  showToast('AI 키를 삭제했습니다.');
}

async function testGeminiKey(){
  var btn = document.getElementById('keyTestBtn');
  var typed = (document.getElementById('keyInput').value || '').trim();
  if(!typed && !getGeminiKey()){ showToast('먼저 키를 붙여 넣어 주세요.'); return; }
  btn.disabled = true; btn.textContent = '확인 중...';
  try {
    var r = await callReportApi('학생 이름: 테스트\n출석: 1일 / 1일 (100%)\n등급: 최고', 'student', typed || null);
    if(r.ok) alert('✅ AI 연결 성공!\n\n받은 문장 예시:\n' + r.text);
    else alert('❌ AI 연결 실패\n\n' + r.error);
  } catch(e){
    alert('❌ 인터넷에 연결되어 있지 않습니다.\n인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  } finally {
    btn.disabled = false; btn.textContent = '연결 테스트';
  }
}

// ===== 백업 알림 =====
// 모든 데이터가 이 PC의 브라우저 안에만 있으므로, 백업 파일이 유일한 안전장치다.
var LAST_BACKUP_KEY = 'acad-last-backup';
var BACKUP_REMIND_DAYS = 7;

function daysSinceBackup(){
  var t = 0;
  try { t = Number(localStorage.getItem(LAST_BACKUP_KEY)) || 0; } catch(e){}
  return t ? Math.floor((Date.now() - t) / 86400000) : null;   // null = 한 번도 안 함
}

function renderBackupInfo(){
  var el = document.getElementById('backupInfo');
  if(!el) return;
  var d = daysSinceBackup();
  var late = d === null || d >= BACKUP_REMIND_DAYS;
  el.className = 'backup-info' + (late ? ' late' : '');
  el.textContent = d === null ? '⚠️ 아직 백업한 적이 없습니다. 지금 한 번 백업해 두세요.'
    : d === 0 ? '✅ 마지막 백업: 오늘'
    : (late ? '⚠️ ' : '✅ ') + '마지막 백업: ' + d + '일 전' + (late ? ' — 백업을 권장합니다.' : '');
}

document.addEventListener('DOMContentLoaded', function(){
  var kSave = document.getElementById('keySaveBtn');   if(kSave) kSave.addEventListener('click', saveGeminiKey);
  var kTest = document.getElementById('keyTestBtn');   if(kTest) kTest.addEventListener('click', testGeminiKey);
  var kDel  = document.getElementById('keyDelBtn');    if(kDel)  kDel.addEventListener('click', deleteGeminiKey);
  renderKeyStatus();
  renderBackupInfo();

  // 출결 기록이 있는데 백업이 오래됐으면 켤 때 한 번 알려 준다
  var d = daysSinceBackup();
  if(Object.keys(DB.attendance).length && (d === null || d >= BACKUP_REMIND_DAYS)){
    setTimeout(function(){
      showToast('💾 ' + (d === null ? '아직 백업한 적이 없습니다.' : '마지막 백업이 ' + d + '일 전입니다.') + ' 데이터 관리에서 백업해 주세요.');
    }, 1500);
  }
});
