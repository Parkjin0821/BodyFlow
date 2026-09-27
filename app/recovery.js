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
const WEEKDAY_OFFSET={monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,sunday:6};
let recoveryPlan=null;
// 프로필이 있으면 내 계획(적응형 계획)의 완료 주차를 쓰고, 예시 계획의 진행도는 섞지 않는다.
function completedOwnWeek(){
  const state=typeof profile!=='undefined'&&profile&&window.BodyFlowAdaptive?.state();if(!state?.startDate||!state.weeks.length)return null;
  const completedDates=new Set(own.filter(row=>row.session_status==='completed').map(row=>row.date));let last=0;
  state.weeks.forEach((week,index)=>{if(week.sessions.length&&week.sessions.every(session=>completedDates.has(addDays(state.startDate,index*7+WEEKDAY_OFFSET[session.day]))))last=index+1});
  return last;
}
function renderRecovery(plan){recoveryPlan=plan;
  const banner=document.getElementById('recovery-banner');if(!banner)return;banner.replaceChildren();banner.hidden=true;
  const longReturn=previousAccess&&dayGap(previousAccess,today())>=7;
  const yesterday=addDays(today(),-1),missedYesterday=own.length>0&&!own.some(row=>row.date===yesterday);
  if(!longReturn&&!missedYesterday)return;
  const copy=document.createElement('div'),text=document.createElement('p'),detail=document.createElement('small'),button=document.createElement('button');
  if(longReturn){const ownWeek=completedOwnWeek(),last=ownWeek??completedPlanWeek(plan),recommended=Math.max(1,last-1);text.textContent=`다시 시작해요. ${recommended}주차부터 하시는 걸 권해요`;detail.textContent=ownWeek===null?'예시 계획과 저장된 세션 완료 기록을 기준으로 한 복귀 제안입니다.':'내 계획과 저장된 세션 완료 기록을 기준으로 한 복귀 제안입니다.';button.textContent=`${recommended}주차 계획 보기`;button.onclick=()=>setTab('plan');}
  else{text.textContent='어제 것도 기록할까요?';detail.textContent='원할 때만 추가할 수 있어요.';button.textContent='어제 기록하기';button.onclick=()=>openLogForDate(yesterday);}
  copy.append(text,detail);banner.append(copy,button);banner.hidden=false;
}
window.renderRecovery=renderRecovery;window.rerenderRecovery=()=>{if(recoveryPlan)renderRecovery(recoveryPlan)};
