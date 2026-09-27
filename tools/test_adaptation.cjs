// 적응형 계획 조정 검증. 모든 수행 기록은 예시 데이터다.
const assert=require('assert'),fs=require('fs');
const P=require('../app/prescribe.js');
const profile={goal:'diet',height_cm:165,weight_kg:64,rpe:5,pain_areas:['none'],running_experience:'at_least_6_months'};
const DAY_OFFSET={monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,sunday:6};
const START='2026-06-01';
const date=(week,offset)=>{const value=new Date(START+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+(week-1)*7+offset);return value.toISOString().slice(0,10)};
const r2=value=>Math.round(value*100)/100;
const minutesNonNegative=week=>week.sessions.every(session=>session.warmup_min>=0&&session.cooldown_min>=0&&session.blocks.every(block=>block.minutes>=0));
const runDays=week=>week.sessions.filter(session=>session.type==='run').map(session=>DAY_OFFSET[session.day]).sort((a,b)=>a-b);

// ── [B] 우선순위 단위 테스트 ─────────────────────────────
const base=P.generatePlan(profile)[1];
const log=(week,index,{status='done',rpe=5,pain=null}={})=>({date:date(week,[0,2,3,6][index]),sessionId:`example:priority:${week}:${index}`,status,rpe:status==='skipped'?null:rpe,pain});
const twoWeeks=fn=>[1,2].flatMap(week=>[0,1,2,3].map(index=>log(week,index,fn(week,index))));
const asOf=date(2,6);
const priority=[
  ['rule 1 + rule 5 → 1',twoWeeks((week,index)=>({rpe:3,pain:week===2&&index===0?{area:'shoulder',level:'severe'}:null})),1],
  ['rule 2 + rule 3 → 2',twoWeeks((week,index)=>({rpe:9,pain:week===2&&index<3?{area:'back',level:'moderate'}:null})),2],
  ['rule 3 + rule 4 → 3',twoWeeks((week,index)=>({rpe:9,status:week===2&&index<2?'skipped':'done'})),3],
  ['rule 1 + rule 2 + rule 4 → 1',twoWeeks((week,index)=>({rpe:5,status:week===2&&index<2?'skipped':'done',pain:week===1&&index<3?{area:'knee',level:'moderate'}:week===2&&index===2?{area:'knee',level:'severe'}:null})),1],
];
// 각 테스트의 기록이 실제로 두 규칙 이상의 조건을 동시에 만족하는지 먼저 확인한다.
const conditions=logs=>{const current=logs.filter(l=>l.date>date(1,6)),prior=logs.filter(l=>l.date<=date(1,6)),avg=ls=>{const v=ls.filter(l=>l.rpe!==null).map(l=>l.rpe);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null},pains=logs.flatMap(l=>l.pain?[].concat(l.pain):[]),counts={};pains.forEach(p=>counts[p.area]=(counts[p.area]||0)+1);return {1:pains.some(p=>p.level==='severe'),2:Object.values(counts).some(c=>c>=3),3:[avg(prior),avg(current)].every(v=>v!==null&&v>=8),4:current.filter(l=>l.status==='skipped').length>=current.length/2,5:[avg(prior),avg(current)].every(v=>v!==null&&v<=4)}};
const priorityResults=priority.map(([name,logs,expected])=>{const met=conditions(logs),result=P.adjustNextWeek(base,logs,asOf);const needed=name.match(/rule (\d)/g).map(s=>+s.slice(5));assert(needed.filter(r=>r!==5).every(r=>met[r]),`${name}: 경쟁 조건이 모두 성립해야 함`);if(needed.includes(5))assert(met[5],`${name}: 낮은 RPE 조건 성립`);assert.equal(result.rule,expected,name);return {test:name,expected,actual:result.rule,passed:true}});

// ── [C] 복수 통증 처리 ───────────────────────────────────
const both=level=>[{area:'knee',level},{area:'ankle',level}];
const multi=[];
{const logs=[0,1,2].map(index=>log(2,index,{pain:both('moderate')}));const result=P.adjustNextWeek(base,logs,asOf);assert.equal(result.rule,2);assert(result.reason.includes('무릎과 발목'));assert(Math.abs(P.weekMinutes(result.after)-r2(P.weekMinutes(base)*.8))<.02);multi.push({case:'무릎·발목 반복 통증',rule:result.rule,reason:result.reason,before:P.weekMinutes(base),after:P.weekMinutes(result.after)});}
{const logs=[log(2,0,{pain:both('severe')})];const result=P.adjustNextWeek(base,logs,asOf);assert.equal(result.rule,1);assert(result.reason.includes('무릎과 발목'));for(const session of result.after.sessions.filter(s=>s.type==='strength'))for(const block of session.blocks)assert(!(P.movementAreas[block.activity]||[]).some(area=>['knee','ankle'].includes(area)));multi.push({case:'무릎·발목 심한 통증',rule:result.rule,reason:result.reason,before:P.weekMinutes(base),after:P.weekMinutes(result.after)});}
{// 무릎 심한 통증(규칙 1) + 발목 반복 통증(규칙 2): 두 조정을 모두 적용하고 총 시간은 더 줄어드는 쪽
 const logs=[log(2,0,{pain:[{area:'knee',level:'severe'},{area:'ankle',level:'moderate'}]}),log(2,1,{pain:{area:'ankle',level:'moderate'}}),log(2,2,{pain:{area:'ankle',level:'moderate'}})];const result=P.adjustNextWeek(base,logs,asOf);const severeOnly=P.adjustNextWeek(base,[log(2,0,{pain:{area:'knee',level:'severe'}})],asOf);
 assert.equal(result.rule,1);assert(result.reason.includes('무릎')&&result.reason.includes('발목'));assert(P.weekMinutes(result.after)<=Math.min(P.weekMinutes(severeOnly.after),r2(P.weekMinutes(base)*.8))+.02,'more conservative total');assert(result.after.sessions.every(s=>s.blocks.every(b=>b.activity!=='run')));
 multi.push({case:'무릎 심한 통증 + 발목 반복 통증',rule:result.rule,reason:result.reason,before:P.weekMinutes(base),after:P.weekMinutes(result.after),severe_only_after:P.weekMinutes(severeOnly.after)});}
{// 3개 부위 이상: 전면 휴식, 다음 주는 휴식 직전 주 기준으로 다시 이어간다
 const logs=[log(2,0,{pain:[{area:'knee',level:'slight'},{area:'ankle',level:'slight'},{area:'back',level:'slight'}]})];const result=P.adjustNextWeek(base,logs,asOf);assert.equal(result.rule,'rest');assert.equal(result.reason,P.fullRestReason);assert.equal(result.after.sessions.length,0);assert(result.after.isRestWeek);
 const resumed=P.extendPlan([result.after],[])[0];assert(P.weekMinutes(resumed)<=P.weekMinutes(base)*1.1+.02);assert.equal(P.longestRun(resumed),0,'no running right after a rest week');assert(resumed.isRecoveryWeek?Math.abs(P.weekMinutes(resumed)/P.weekMinutes(base)-.8)<.01:Math.abs(P.weekMinutes(resumed)-P.weekMinutes(base))<.02,'pre-rest volume (80% on recovery weeks)');
 multi.push({case:'세 부위 동시 기록',rule:result.rule,reason:result.reason,before:P.weekMinutes(base),after:0,resumed_after_rest:P.weekMinutes(resumed)});}
{// 같은 통증 기록은 한 번만 감축한다
 const w1=[0,1,2].map(index=>log(1,index,{pain:{area:'knee',level:'moderate'}})),first=P.adjustNextWeek(base,w1,date(1,6));assert.equal(first.rule,2);
 const w2=[...w1,...[0,1,2,3].map(index=>log(2,index))],second=P.adjustNextWeek(first.after,w2,date(2,6));assert.notEqual(second.rule,2,'handled pain is not reduced twice');assert.equal(P.weekMinutes(second.after),P.weekMinutes(second.baseline),'no second reduction');
 const w2new=[...w1,log(2,0,{pain:{area:'knee',level:'moderate'}}),...[1,2,3].map(index=>log(2,index))],third=P.adjustNextWeek(first.after,w2new,date(2,6));assert.equal(third.rule,2,'new pain log can reduce again');
 multi.push({case:'같은 통증 기록 재감축 방지',first_rule:first.rule,next_week_rule_without_new_pain:second.rule,next_week_rule_with_new_pain:third.rule});}
assert.throws(()=>P.validateSessionLogs([{...log(2,0),pain:[{area:'knee',level:'slight'}]}]),'single-item pain list is rejected');
assert.throws(()=>P.validateSessionLogs([{...log(2,0),pain:[{area:'knee',level:'slight'},{area:'knee',level:'severe'}]}]),'duplicate area is rejected');
const holdSources=['app/prescribe.js','app/adaptive-plan.js'].filter(file=>/보류|임의로 고르지/.test(fs.readFileSync(file,'utf8')));assert.deepEqual(holdSources,[],'복수 통증 보류 처리 0건');

// ── 달리기 재개 제안 (결정 1) ──────────────────────────────
{const startRun=P.firstRunMinutes(profile);
 const walked=P.adjustNextWeek(base,[log(2,0,{pain:{area:'knee',level:'severe'}})],asOf).after;assert.equal(P.longestRun(walked),0);
 const noPain=[3,4].flatMap(week=>[0,1,2,3].map(index=>({...log(week,index),sessionId:`example:reentry:${week}:${index}`}))),reentry=P.adjustNextWeek(walked,noPain,date(4,6),{startRun});
 assert.equal(reentry.rule,'reentry');assert.equal(reentry.reason,P.reentryReason);assert(P.longestRun(reentry.after)>0&&P.longestRun(reentry.after)<=startRun+1e-9,'runs restart at first-week length');
 const withPain=[...noPain.slice(0,7),{...noPain[7],pain:{area:'back',level:'slight'}}];assert.notEqual(P.adjustNextWeek(walked,withPain,date(4,6),{startRun}).rule,'reentry','pain in the last 2 weeks blocks re-entry');
 assert.notEqual(P.adjustNextWeek(walked,noPain,date(4,6)).rule,'reentry','no re-entry without a starting run length');
 multi.push({case:'통증 2주 없음 → 달리기 재개 제안',rule:reentry.rule,start_run:startRun,longest_run_after:P.longestRun(reentry.after)});}
// ── 계획 설정 (천천히 5% / 걷기 최소 2분) ──────────────────
{const walk2=P.generatePlan(profile,{growth:'standard',minWalk:2});assert.throws(()=>P.generatePlan(profile,{growth:'gentle',minWalk:1}),'gentle growth removed');assert(walk2.every(week=>week.sessions.every(session=>session.blocks.every((block,index)=>!(block.activity==='walk'&&session.blocks[index-1]?.activity==='run')||block.minutes>=2-1e-9))),'walk intervals at least 2 minutes');
 assert.throws(()=>P.generatePlan(profile,{growth:'fast',minWalk:1}),'no setting faster than the safety cap');assert.throws(()=>P.generatePlan(profile,{growth:'standard',minWalk:.5}),'no walk shorter than 1 minute');}

// ── [A] 페르소나 6종 × 24주 연속 시뮬레이션 (예시) ─────────
const moderate=area=>({area,level:'moderate'});
const PERSONAS=[
  {id:'P1',name:'순조로운 시니어',profile:{...profile,goal:'senior_health',running_experience:'none'},session:(w,i)=>({status:w===15&&i===1?'skipped':'done',rpe:i%2?6:5,pain:null})},
  {id:'P2',name:'무릎 재발형',session:(w,i)=>({status:'done',rpe:5,pain:(w===3||w===9)&&i<3?moderate('knee'):null})},
  {id:'P3',name:'의욕 과다형',session:(w,i)=>({status:'done',rpe:w<=6?(i%2?9:8):(i%2?6:5),pain:null})},
  {id:'P4',name:'간헐 이탈형',session:(w,i)=>({status:(w===4||w===10)&&i<3?'skipped':'done',rpe:5,pain:null})},
  {id:'P5',name:'저강도 정체형',session:(w,i)=>({status:'done',rpe:i%2?4:3,pain:null})},
  {id:'P6',name:'복합 통증형',session:(w,i)=>({status:'done',rpe:5,pain:(w===5||w===18)&&i<3?[moderate('knee'),moderate('ankle')]:w===12?(i===0?[{area:'knee',level:'severe'},moderate('ankle')]:i<3?moderate('ankle'):null):null})},
];
function simulate(persona,settings=P.defaultSettings){
  const personaProfile=persona.profile||profile,startRun=P.firstRunMinutes(personaProfile,settings);
  let current=P.generatePlan(personaProfile,settings)[0];const logs=[],timeline=[],violations=[];
  for(let week=1;week<=24;week++){
    current.sessions.forEach((session,index)=>{const entry=persona.session(week,index);logs.push({date:date(week,DAY_OFFSET[session.day]),sessionId:`example:${persona.id}:${week}:${index}`,status:entry.status,rpe:entry.status==='skipped'?null:entry.rpe,pain:entry.pain})});
    const result=P.adjustNextWeek(current,logs,date(week,6),{settings,startRun}),next=result.after,reference=P.activeWeek(current);
    const row={week,next_week:next.week,rule:result.rule,reason:result.reason||null,before_total:P.weekMinutes(current),after_total:P.weekMinutes(next),before_longest_run:P.longestRun(current),after_longest_run:P.longestRun(next),recovery_week:next.isRecoveryWeek,rest_week:Boolean(next.isRestWeek)};
    if(!next.isRestWeek){
      const refTotal=P.weekMinutes(reference),refRun=P.longestRun(reference),days=runDays(next);
      if(row.after_total>refTotal*1.1+.02)violations.push({week,rule:'주간 총 시간 증가 10% 초과',before:refTotal,after:row.after_total});
      // 달리기 재개(결정 1)는 직전 최장 달리기가 0분이라 1.5배 대신 1주차 달리기 시간 이하인지 본다.
      if(result.rule==='reentry'?row.after_longest_run>Math.max(refRun*1.5,startRun)+1e-9:row.after_longest_run>refRun*1.5+1e-9)violations.push({week,rule:'최장 연속 달리기 1.5배 초과',before:refRun,after:row.after_longest_run});
      if(days.length>3)violations.push({week,rule:'러닝 주 3회 초과',count:days.length});
      if(days.some((day,index)=>index&&day-days[index-1]===1))violations.push({week,rule:'러닝 연속일 배치',days});
      if(next.isRecoveryWeek){const ratio=row.after_total/refTotal;if(ratio<.7-.001||ratio>.8+.001)violations.push({week,rule:'회복 주간 70~80% 벗어남',ratio:r2(ratio)})}
      if(!minutesNonNegative(next))violations.push({week,rule:'음수 운동 시간'});
      if(next.sessions.some(session=>session.blocks.some((block,index)=>block.activity==='walk'&&session.blocks[index-1]?.activity==='run'&&block.minutes<settings.minWalk-1e-9&&block.minutes+session.blocks[index-1].minutes>=settings.minWalk)))violations.push({week,rule:`달리기 사이 걷기 ${settings.minWalk}분 미만`});
    }
    if(result.rule){assert(result.reason.trim());assert.deepEqual(Object.keys(result.change).sort(),['after','before','date','reason'])}
    timeline.push(row);current=next;
  }
  const counts={};for(const row of timeline)if(row.rule)counts[row.rule]=(counts[row.rule]||0)+1;
  return {id:persona.id,name:persona.name,settings,profile:{goal:(persona.profile||profile).goal,running_experience:(persona.profile||profile).running_experience},data:'예시 수행 기록',weeks:24,trigger_total:timeline.filter(r=>r.rule).length,trigger_counts:counts,triggered_weeks:timeline.filter(r=>r.rule).map(r=>({week:r.week,rule:r.rule,before_total:r.before_total,after_total:r.after_total,before_longest_run:r.before_longest_run,after_longest_run:r.after_longest_run})),safety_violations:violations,timeline};
}
const personas=PERSONAS.map(persona=>simulate(persona));
// 설정 4가지 조합 모두에서 같은 안전 검사를 돌린다(타임라인은 기본 설정만 저장).
const SETTINGS=[{growth:'standard',minWalk:1},{growth:'standard',minWalk:2}];
const settingsSweep=SETTINGS.map(settings=>{const runs=PERSONAS.map(persona=>simulate(persona,settings));return {settings,violations:runs.flatMap(p=>p.safety_violations.map(v=>({persona:p.id,...v}))),trigger_totals:Object.fromEntries(runs.map(p=>[p.id,p.trigger_total])),week25_totals:Object.fromEntries(runs.map(p=>[p.id,p.timeline.at(-1).after_total])),end_longest_run:Object.fromEntries(runs.map(p=>[p.id,p.timeline.at(-1).after_longest_run]))}});
const allViolations=settingsSweep.flatMap(sweep=>sweep.violations.map(v=>({settings:sweep.settings,...v})));
if(allViolations.length){fs.writeFileSync('qa/adaptation-violations.json',JSON.stringify(allViolations,null,2));console.error('안전 규칙 위반 발견 — 중단:',JSON.stringify(allViolations,null,2));process.exit(1)}
fs.rmSync('qa/adaptation-violations.json',{force:true});
const totals=personas.map(p=>p.trigger_total);
for(const id of ['P2','P6']){const p=personas.find(item=>item.id===id);assert(p.trigger_counts.reentry>=1,`${id}: 달리기 재개 제안 발생`);assert(p.timeline.at(-1).after_longest_run>0,`${id}: 24주 끝에 달리기가 돌아옴`);}
for(const p of personas)assert(p.timeline.at(-1).after_total>=p.timeline[0].before_total*.95||Object.keys(p.trigger_counts).some(rule=>[1,2,'rest'].includes(isNaN(rule)?rule:+rule)),`${p.id}: 통증 조정이 없는데 24주 뒤 운동량이 줄면 안 됨`);assert(new Set(totals).size>1,'페르소나별 발동 횟수가 모두 같으면 시뮬레이션 오류');

// ── 기존 검증 유지 ────────────────────────────────────────
const repeatLogs=[];const durations={};let prior=0;for(let week=1;week<=12;week++){const entry={date:date(week,1),sessionId:`example:repeat:${week}`,status:'done',rpe:4,pain:null};repeatLogs.push(entry);durations[entry.sessionId]=20;const cumulative=P.cumulativeMinutes(repeatLogs,durations);assert(cumulative>prior,'repeating exercise adds cumulative minutes');prior=cumulative;}assert.equal(prior,240);
assert.throws(()=>P.adjustNextWeek(base,[{date:'2026-02-30',sessionId:'bad',status:'done',rpe:3,pain:null}]));
const extended=P.extendPlan([base],priority[0][1]);assert.equal(P.longestRun(extended[0]),0,'extendPlan applies received logs');

fs.writeFileSync('qa/adaptation-results.json',JSON.stringify({passed:true,data:'예시 수행 기록',method:'페르소나 6종이 각각 하나의 연속된 24주 기록 흐름을 가진다. 매주 그 주 계획의 세션마다 예시 기록을 만들고, 누적 기록으로 다음 주 조정을 계산한 뒤 조정안(달리기 재개 제안 포함)을 수락한 것으로 이어간다. 타임라인은 기본 설정(주 10%, 걷기 최소 1분), 안전 검사는 걷기 최소 1분·2분 두 설정 모두.',engine:{growth:{standard:1.1},recovery:.8,min_walk_options:[1,2]},start_date:START,personas,settings_sweep:settingsSweep,priority_tests:priorityResults,multi_pain_tests:multi,safety_violations:0,checks:['six continuous 24-week persona flows','trigger totals differ across personas','weekly 10% and continuous-run 1.5x caps','max 3 non-consecutive runs','recovery weeks 70-80%','no negative minutes','walk between runs at least the chosen minimum (recovery weeks included)','run re-entry after 2 pain-free weeks at first-week length','no running right after a rest week','settings sweep: walk minimum 1 and 2 minutes, 0 violations','same pain logs reduce once','priority 1>5, 2>3, 3>4, 1>2>4','multi-area pain applies every area, conservative total','3+ areas becomes a full rest week','no multi-area hold','repeated sessions add cumulative minutes','extendPlan uses logs']},null,2));
console.log('Persona trigger totals:',personas.map(p=>`${p.id}=${p.trigger_total} ${JSON.stringify(p.trigger_counts)}`).join(' | '));
console.log('Adaptation checks passed: 6 personas × 24 weeks, 4 priority tests, multi-area pain, 0 safety violations.');
