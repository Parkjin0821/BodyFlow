'use strict';
const LAST_ACCESS_KEY='bodyflow.lastAccess.v1';
let previousAccess=null;
try{previousAccess=localStorage.getItem(LAST_ACCESS_KEY);localStorage.setItem(LAST_ACCESS_KEY,today())}catch{}
function dayGap(from,to){if(!validDate(from)||!validDate(to))return 0;return Math.floor((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000)}
function completedPlanWeek(plan){
  const completedDates=new Set(own.filter(row=>row.session_status==='completed').map(row=>row.date));
  const recorded=plan.weeks.filter(week=>week.sessions.every(session=>completedDates.has(session.day))).map(week=>week.week);
  const progressCompleted=plan.current_progress.completed_sessions===plan.current_progress.total_sessions?plan.current_progress.week:plan.current_progress.week-1;
  return Math.max(0,progressCompleted,...recorded);
}
function renderRecovery(plan){
  const banner=document.getElementById('recovery-banner');if(!banner)return;banner.replaceChildren();banner.hidden=true;
  const longReturn=previousAccess&&dayGap(previousAccess,today())>=7;
  const yesterday=addDays(today(),-1),missedYesterday=own.length>0&&!own.some(row=>row.date===yesterday);
  if(!longReturn&&!missedYesterday)return;
  const copy=document.createElement('div'),text=document.createElement('p'),detail=document.createElement('small'),button=document.createElement('button');
  if(longReturn){const last=completedPlanWeek(plan),recommended=Math.max(1,last-1);text.textContent=`다시 시작해요. ${recommended}주차부터 하시는 걸 권해요`;detail.textContent='예시 계획과 저장된 세션 완료 기록을 기준으로 한 복귀 제안입니다.';button.textContent=`${recommended}주차 계획 보기`;button.onclick=()=>setTab('plan');}
  else{text.textContent='어제 것도 기록할까요?';detail.textContent='원할 때만 추가할 수 있어요.';button.textContent='어제 기록하기';button.onclick=()=>openLogForDate(yesterday);}
  copy.append(text,detail);banner.append(copy,button);banner.hidden=false;
}
window.renderRecovery=renderRecovery;
