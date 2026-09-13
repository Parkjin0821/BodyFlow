const assert=require('assert');
const {generatePlan,extendPlan,repeatWeek,weekMinutes,longestRun}=require('../app/prescribe.js');

const base={age_band:'30s',sex:'female',height_cm:165,weight_kg:62,exercise_sessions_per_week:2,continuous_walk_minutes:30,pain_areas:['none'],running_experience:'none',rpe:4};
const profiles=[
  ['시니어 초보',{...base,goal:'senior_health',age_band:'70s'}],
  ['무릎 통증',{...base,goal:'diet',pain_areas:['knee']}],
  ['다이어트 경험자',{...base,goal:'diet',running_experience:'at_least_6_months',rpe:5}],
  ['고BMI 초보',{...base,goal:'diet',height_cm:155,weight_kg:82}],
  ['근력 목표 초보',{...base,goal:'strength'}],
  ['근력 목표 경험자',{...base,goal:'strength',running_experience:'under_6_months',rpe:6}],
  ['시니어 경험자',{...base,goal:'senior_health',age_band:'60s',running_experience:'at_least_6_months'}],
  ['다이어트 초보 저강도',{...base,goal:'diet',continuous_walk_minutes:15,rpe:2}],
];
const dayNumber={monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:7};
function twentyFour(profile){const weeks=generatePlan(profile);while(weeks.length<24)weeks.push(...extendPlan(weeks,[]));return weeks.slice(0,24)}
function assertSafety(weeks,label){
  weeks.forEach((week,index)=>{
    assert.equal(week.week,index+1,`${label}: 주차 연속성`);
    const runs=week.sessions.filter(session=>session.type==='run'),strength=week.sessions.filter(session=>session.type==='strength');
    assert(runs.length<=3,`${label}: 주 3회 이하`);assert.equal(strength.length,2,`${label}: 근력 2회`);assert(runs.length>0,`${label}: 혼합 계획`);
    const runDays=runs.map(session=>dayNumber[session.day]).sort((a,b)=>a-b);assert(!runDays.some((day,i)=>i&&day-runDays[i-1]===1),`${label}: 연속 러닝 없음`);
    const nextDays=new Set(runDays.map(day=>day+1));assert(strength.every(session=>!nextDays.has(dayNumber[session.day])),`${label}: 러닝 다음 날 근력 없음`);
    runs.forEach(session=>{assert.equal(session.target_cadence,'170-180 spm');assert(/^[3-6]-[3-6]$/.test(session.target_rpe));assert(session.warmup_min>0&&session.cooldown_min>0&&session.blocks.length>0)});
    strength.forEach(session=>assert(session.blocks.every(block=>['chair_squat','wall_push_up','glute_bridge'].includes(block.activity))));
    if(index){const growth=weekMinutes(week)/weekMinutes(weeks[index-1]);assert(growth<=1.1+1e-9,`${label} ${week.week}주 증가율 ${growth}`);assert(longestRun(week)<=longestRun(weeks[index-1])*1.5+1e-9,`${label} ${week.week}주 연속 달리기`);}
    if(week.week%4===0){assert(week.isRecoveryWeek,`${label}: ${week.week}주 회복 표시`);const ratio=weekMinutes(week)/weekMinutes(weeks[index-1]);assert(ratio>=.7&&ratio<=.8,`${label}: 회복 비율 ${ratio}`);}else assert(!week.isRecoveryWeek,`${label}: 회복 주차 오표시`);
  });
}

for(const [label,profile] of profiles){const weeks=twentyFour(profile);assert.equal(weeks.length,24);assertSafety(weeks,label)}
const novice=generatePlan(profiles[0][1])[0],firstRun=novice.sessions.find(session=>session.type==='run');assert.equal(firstRun.blocks[0].minutes,1);assert.equal(firstRun.blocks[1].minutes,2);
const normal=generatePlan({...base,goal:'diet'})[0],knee=generatePlan(profiles[1][1])[0];assert(longestRun(knee)<longestRun(normal));assert(weekMinutes(knee)<weekMinutes(normal));
let continuity=generatePlan({...base,goal:'diet'});const next=extendPlan(continuity,[]);assert.deepEqual(next.map(week=>week.week),[5,6,7,8]);continuity.push(...next);assert.equal(continuity.length,8);
const repeated=repeatWeek(continuity,2);assert.equal(repeated.length,1);assert.deepEqual(repeated[0],continuity[2]);repeated[0].sessions[0].blocks[0].minutes=999;assert.notEqual(repeated[0].sessions[0].blocks[0].minutes,continuity[2].sessions[0].blocks[0].minutes,'반복 계획은 원본을 변경하지 않는다');
let violations=0;for(const [,profile] of profiles){const weeks=twentyFour(profile);for(let i=1;i<weeks.length;i++)if(longestRun(weeks[i])>longestRun(weeks[i-1])*1.5+1e-9)violations++;}assert.equal(violations,0,'연속 달리기 시간이 전주 대비 1.5배를 넘는 주차가 0개');
console.log('Prescription checks passed: 8 profiles × 24 weeks; continuous-run >1.5x violations = 0.');
