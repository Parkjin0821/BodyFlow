'use strict';
(() => {
  const DAY=['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  function validateSession(s){
    const keys=['day','warmup_min','intervals','cooldown_min','target_cadence','target_rpe','note'];
    if(!exact(s,keys)||!date(s.day)||!Number.isInteger(s.warmup_min)||s.warmup_min<0||!Number.isInteger(s.cooldown_min)||s.cooldown_min<0||s.target_cadence!=='170–180 spm'||!Number.isInteger(s.target_rpe)||s.target_rpe<1||s.target_rpe>10||typeof s.note!=='string'||!s.note.startsWith('예시:'))throw Error('세션 데이터 형식을 확인하세요.');
    if(!Array.isArray(s.intervals)||!s.intervals.length||s.intervals.some(i=>!exact(i,['activity','minutes'])||!['walk','run'].includes(i.activity)||!Number.isInteger(i.minutes)||i.minutes<1))throw Error('인터벌 데이터 형식을 확인하세요.');return s;
  }
  function validatePlan(p){
    const keys=['kind','label','start_date','meal_check','current_progress','weeks','change_history'];
    if(!exact(p,keys)||p.kind!=='sample-plan'||p.label!=='예시 데이터'||!date(p.start_date)||!Array.isArray(p.weeks)||p.weeks.length!==4)throw Error('4주 예시 계획 형식을 확인하세요.');
    p.weeks.forEach((w,i)=>{if(!exact(w,['week','sessions'])||w.week!==i+1||!Array.isArray(w.sessions)||!w.sessions.length)throw Error('주차 데이터를 확인하세요.');w.sessions.forEach(validateSession);});
    const m=p.meal_check;if(!exact(m,['date','completed','total'])||!date(m.date)||!Number.isInteger(m.completed)||!Number.isInteger(m.total)||m.total!==3||m.completed<0||m.completed>m.total)throw Error('식사 체크를 확인하세요.');
    const c=p.current_progress;if(!exact(c,['week','completed_sessions','total_sessions'])||!Number.isInteger(c.week)||c.week<1||c.week>4||c.total_sessions!==p.weeks[c.week-1].sessions.length||c.completed_sessions<0||c.completed_sessions>c.total_sessions)throw Error('진행도를 확인하세요.');
    if(!Array.isArray(p.change_history)||p.change_history.some(h=>!exact(h,['date','week','reason'])||!date(h.date)||!Number.isInteger(h.week)||h.week<1||h.week>4||typeof h.reason!=='string'||!h.reason.startsWith('예시:')))throw Error('변경 이력을 확인하세요.');return p;
  }
  const total=s=>s.warmup_min+s.cooldown_min+s.intervals.reduce((n,i)=>n+i.minutes,0);
  const summary=s=>{const run=s.intervals.filter(i=>i.activity==='run').reduce((n,i)=>n+i.minutes,0),walk=s.intervals.filter(i=>i.activity==='walk').reduce((n,i)=>n+i.minutes,0);return `걷기 ${walk}분 · 달리기 ${run}분`;};
  function display(plan){
    const current=plan.current_progress,week=plan.weeks[current.week-1],todayIso=new Date().toLocaleDateString('sv-SE'),today=week.sessions.find(s=>s.day===todayIso)||week.sessions.find(s=>s.day>=todayIso)||week.sessions.at(-1);
    
    document.getElementById('today-session-title').textContent=summary(today);document.getElementById('today-session-total').textContent=`총 ${total(today)}분 · 준비 ${today.warmup_min}분 / 본운동 ${today.intervals.reduce((n,i)=>n+i.minutes,0)}분 / 정리 ${today.cooldown_min}분`;
    const start=document.getElementById('start-session');start.disabled=false;const dialog=document.getElementById('session-dialog'),content=document.getElementById('session-dialog-content');start.onclick=()=>{content.replaceChildren();for(const text of [`준비운동 ${today.warmup_min}분`,`${summary(today)} · 본운동 ${today.intervals.reduce((n,i)=>n+i.minutes,0)}분`,`정리운동 ${today.cooldown_min}분`,`목표 ${today.target_cadence} · RPE ${today.target_rpe}`,today.note]){const p=document.createElement('p');p.textContent=text;content.append(p);}dialog.showModal();};document.getElementById('close-session').onclick=()=>dialog.close();
    const priorMinutes=plan.weeks.slice(0,current.week-1).flatMap(item=>item.sessions).reduce((sum,session)=>sum+total(session),0),currentMinutes=week.sessions.slice(0,current.completed_sessions).reduce((sum,session)=>sum+total(session),0);document.getElementById('plan-progress').textContent=`예시 누적 운동 시간 ${priorMinutes+currentMinutes}분`;const d=new Date(todayIso+'T12:00:00');document.getElementById('today-date-week').textContent=`${d.toLocaleDateString('ko-KR',{month:'long',day:'numeric'})} · ${DAY[d.getDay()]} · 예시 누적 운동 시간 ${priorMinutes+currentMinutes}분`;
    const list=document.getElementById('plan-week-list');list.replaceChildren();for(const w of plan.weeks){const card=document.createElement('article');card.className='chart-card plan-week';const h=document.createElement('h2');h.textContent=`${w.sessions[0].day.slice(5).replace('-','.')}부터 · ${w.sessions.length}회`;card.append(h);for(const s of w.sessions){const p=document.createElement('p');p.textContent=`${s.day.slice(5).replace('-','.')} · ${summary(s)} · 총 ${total(s)}분 · RPE ${s.target_rpe}`;card.append(p);}list.append(card);}
    const history=document.getElementById('plan-history');history.replaceChildren();for(const h of plan.change_history){const li=document.createElement('li');li.textContent=`${h.date} — ${h.reason}`;history.append(li);}if(typeof renderAdaptivePlan==='function')renderAdaptivePlan();
  }
  async function load(){try{const raw=window.BODYFLOW_SAMPLE_PLAN??await fetch('../fixtures/sample-plan.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()});const plan=validatePlan(raw);display(plan);if(typeof renderRecovery==='function')renderRecovery(plan);document.getElementById('plan-load-message').textContent='';}catch{document.getElementById('today-session-title').textContent='예시 계획을 불러오지 못했습니다.';document.getElementById('plan-load-message').textContent='fixtures/sample-plan.json 파일과 형식을 확인해 주세요.';}}
  load();
})();
