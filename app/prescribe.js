'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BodyFlowPrescription=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DAY_NUMBER={monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:7};
  const round=value=>Math.round(value*100)/100;
  const clone=value=>JSON.parse(JSON.stringify(value));

  function validateProfile(profile){
    if(!profile||!['senior_health','diet','strength'].includes(profile.goal))throw Error('지원하는 목표를 선택해 주세요.');
    if(!['none','under_6_months','at_least_6_months'].includes(profile.running_experience))throw Error('러닝 경험 값을 확인해 주세요.');
    if(!Array.isArray(profile.pain_areas))throw Error('통증 부위 값을 확인해 주세요.');
    for(const key of ['height_cm','weight_kg','rpe'])if(!Number.isFinite(profile[key]))throw Error(`${key} 값을 확인해 주세요.`);
    return clone(profile);
  }

  function sessionMinutes(session){return round(session.warmup_min+session.blocks.reduce((sum,block)=>sum+block.minutes,0)+session.cooldown_min);}
  function weekMinutes(week){return round(week.sessions.reduce((sum,session)=>sum+sessionMinutes(session),0));}
  function longestRun(week){return Math.max(0,...week.sessions.flatMap(session=>session.blocks.filter(block=>block.activity==='run').map(block=>block.minutes)));}
  function intervalBlocks(runMinutes,walkMinutes,repeats=4){const blocks=[];for(let i=0;i<repeats;i++){blocks.push({activity:'run',minutes:round(runMinutes)});blocks.push({activity:'walk',minutes:round(walkMinutes)});}return blocks;}
  function strengthBlocks(minutes){const unit=round(minutes/3);return [
    {activity:'chair_squat',minutes:unit},
    {activity:'wall_push_up',minutes:unit},
    {activity:'glute_bridge',minutes:round(minutes-unit*2)},
  ];}
  function makeSession(day,type,warmup,blocks,cooldown,rpe,note){return {day,type,warmup_min:round(warmup),blocks, cooldown_min:round(cooldown),target_cadence:type==='run'?'170-180 spm':'해당 없음',target_rpe:rpe,note};}

  function firstWeek(profile){
    const novice=profile.running_experience==='none'||profile.goal==='senior_health';
    const knee=profile.pain_areas.includes('knee');
    const bmi=profile.weight_kg/((profile.height_cm/100)**2);
    const highBmi=Number.isFinite(bmi)&&bmi>=30;
    let run=novice?1:5,walk=novice?2:1,repeats=novice?4:3,warmup=5,cooldown=5,strengthMain=9;
    if(highBmi&&novice){run=.75;walk=2.25;repeats=3;warmup=4;cooldown=4;strengthMain=8;}
    if(knee){run=.5;walk=2.5;repeats=3;warmup=4;cooldown=4;strengthMain=7;}
    const runRpe=profile.goal==='senior_health'||knee?'3-4':'4-5';
    const runNote=knee?'무릎 불편을 반영해 달리기 비율과 총 시간을 낮췄어요. 불편이 커지면 걷기로 전환하세요.':novice?'달리기 1분과 걷기 2분을 번갈아 진행하세요.':'속도를 올리기보다 대화 가능한 RPE를 유지하세요.';
    return {week:1,isRecoveryWeek:false,sessions:[
      makeSession('monday','run',warmup,intervalBlocks(run,walk,repeats),cooldown,runRpe,runNote),
      makeSession('wednesday','strength',3,strengthBlocks(strengthMain),3,'3-4','맨몸 동작을 천천히 수행하고 통증이 생기는 동작은 중단하세요.'),
      makeSession('thursday','run',warmup,intervalBlocks(run,walk,repeats),cooldown,runRpe,runNote),
      makeSession('sunday','strength',3,strengthBlocks(strengthMain),3,'3-4','자세를 유지할 수 있는 범위에서 맨몸 동작을 수행하세요.'),
    ]};
  }

  function scaledBlock(block,factor){return {...block,minutes:round(block.minutes*factor)};}
  function nextWeek(previous,weekNumber){
    const recovery=weekNumber%4===0,factor=recovery?.75:1.08;
    const sessions=previous.sessions.map(session=>{
      let blocks=session.blocks.map(block=>scaledBlock(block,factor));
      if(!recovery&&session.type==='run'){
        for(let i=0;i<blocks.length-1;i++)if(blocks[i].activity==='run'&&blocks[i+1].activity==='walk'){
          const previousRun=session.blocks[i].minutes,total=blocks[i].minutes+blocks[i+1].minutes;
          const oldRatio=session.blocks[i].minutes/(session.blocks[i].minutes+session.blocks[i+1].minutes);
          const proposed=Math.min(total*(oldRatio+.04),previousRun*1.4);
          blocks[i].minutes=round(proposed);blocks[i+1].minutes=round(total-proposed);
        }
      }
      const note=recovery?'회복 주간이라 직전 주보다 전체 시간을 줄였어요.':session.note;
      return {...session,warmup_min:round(session.warmup_min*factor),blocks,cooldown_min:round(session.cooldown_min*factor),note};
    });
    return {week:weekNumber,isRecoveryWeek:recovery,sessions};
  }

  function assertWeekShape(week){
    if(!week||!Number.isInteger(week.week)||!Array.isArray(week.sessions))throw Error('완료 주차 형식을 확인해 주세요.');
    const runs=week.sessions.filter(session=>session.type==='run');
    if(runs.length>3)throw Error('러닝 세션은 주 3회를 넘을 수 없습니다.');
    const runDays=runs.map(session=>DAY_NUMBER[session.day]).sort((a,b)=>a-b);
    if(runDays.some((day,index)=>index&&day-runDays[index-1]===1))throw Error('러닝 세션을 연속된 날에 배치할 수 없습니다.');
  }

  function generatePlan(profile){validateProfile(profile);const weeks=[firstWeek(profile)];for(let week=2;week<=4;week++)weeks.push(nextWeek(weeks.at(-1),week));return weeks;}
  function extendPlan(completedWeeks,recentLogs){
    if(!Array.isArray(completedWeeks)||!completedWeeks.length)throw Error('완료한 주차 계획이 필요합니다.');
    if(!Array.isArray(recentLogs))throw Error('최근 수행 기록은 배열이어야 합니다.');
    completedWeeks.forEach(assertWeekShape);
    const result=[];let previous=clone(completedWeeks.at(-1));for(let i=0;i<4;i++){previous=nextWeek(previous,previous.week+1);result.push(previous);}return result;
  }
  function repeatWeek(plan,weekIndex){
    if(!Array.isArray(plan)||!Number.isInteger(weekIndex)||weekIndex<0||weekIndex>=plan.length)throw Error('반복할 주차를 확인해 주세요.');
    assertWeekShape(plan[weekIndex]);return [clone(plan[weekIndex])];
  }

  return {generatePlan,extendPlan,repeatWeek,sessionMinutes,weekMinutes,longestRun};
});
