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
    const result=[];let previous=clone(completedWeeks.at(-1));for(let i=0;i<4;i++){previous=i===0&&recentLogs.length?adjustNextWeek(previous,recentLogs).after:nextWeek(previous,previous.week+1);result.push(previous);}return result;
  }
  function repeatWeek(plan,weekIndex){
    if(!Array.isArray(plan)||!Number.isInteger(weekIndex)||weekIndex<0||weekIndex>=plan.length)throw Error('반복할 주차를 확인해 주세요.');
    assertWeekShape(plan[weekIndex]);return [clone(plan[weekIndex])];
  }

  const AREA_LABEL={knee:'무릎',back:'허리',ankle:'발목',shoulder:'어깨'};
  const MOVEMENT_AREAS={chair_squat:['knee','ankle','back'],wall_push_up:['shoulder','back','ankle'],glute_bridge:['knee','back'],seated_hand_squeeze:[]};
  const ACTIVITY_LABEL={run:'달리기',walk:'걷기',chair_squat:'의자 앉았다 일어나기',wall_push_up:'벽 밀기',glute_bridge:'누워 엉덩이 들기',seated_hand_squeeze:'등을 받치고 앉아 손 쥐었다 펴기'};
  function validLogDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
  function validateSessionLogs(logs){
    if(!Array.isArray(logs))throw Error('수행 기록은 배열이어야 합니다.');const seen=new Set();
    return logs.map(log=>{if(!log||Object.keys(log).length!==5||!['date','sessionId','status','rpe','pain'].every(key=>Object.hasOwn(log,key))||!validLogDate(log.date)||typeof log.sessionId!=='string'||!log.sessionId.trim()||seen.has(log.sessionId)||!['done','stopped','skipped'].includes(log.status))throw Error('수행 기록 형식을 확인해 주세요.');seen.add(log.sessionId);if(log.rpe!==null&&log.rpe!==undefined&&(!Number.isInteger(log.rpe)||log.rpe<1||log.rpe>10))throw Error('수행 RPE는 1~10 정수여야 합니다.');if(log.status==='done'&&(log.rpe===null||log.rpe===undefined))throw Error('완료한 세션의 RPE가 필요합니다.');if(log.pain!==null&&log.pain!==undefined&&(Object.keys(log.pain).length!==2||!Object.hasOwn(log.pain,'area')||!Object.hasOwn(log.pain,'level')||!Object.hasOwn(AREA_LABEL,log.pain.area)||!['slight','moderate','severe'].includes(log.pain.level)))throw Error('통증 부위와 강도를 확인해 주세요.');return {date:log.date,sessionId:log.sessionId,status:log.status,rpe:log.rpe??null,pain:log.pain?{area:log.pain.area,level:log.pain.level}:null}}).sort((a,b)=>a.date.localeCompare(b.date)||a.sessionId.localeCompare(b.sessionId));
  }
  function scaleWeekTo(week,target){const result=clone(week),factor=target/weekMinutes(result);for(const session of result.sessions){session.warmup_min=round(session.warmup_min*factor);session.cooldown_min=round(session.cooldown_min*factor);session.blocks=session.blocks.map(block=>scaledBlock(block,factor));}const last=result.sessions.at(-1).blocks.at(-1);last.minutes=round(last.minutes+round(target-weekMinutes(result)));return result;}
  function averageRpe(logs){const values=logs.filter(log=>log.rpe!==null&&log.status!=='skipped').map(log=>log.rpe);return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;}
  function addNote(week,reason){return {...week,sessions:week.sessions.map(session=>({...session,note:reason+' '+session.note}))};}
  function adjustNextWeek(previous,logs,asOfDate){
    assertWeekShape(previous);const validated=validateSessionLogs(logs),end=asOfDate??validated.at(-1)?.date;if(!validLogDate(end))throw Error('조정 기준 날짜가 필요합니다.');
    const endTime=Date.parse(end+'T12:00:00Z'),age=log=>(endTime-Date.parse(log.date+'T12:00:00Z'))/86400000,recent=validated.filter(log=>age(log)>=0&&age(log)<14),current=recent.filter(log=>age(log)<7),prior=recent.filter(log=>age(log)>=7),baseline=nextWeek(previous,previous.week+1);
    const severeAreas=[...new Set(recent.filter(log=>log.pain?.level==='severe').map(log=>log.pain.area))],counts={};for(const log of recent)if(log.pain)counts[log.pain.area]=(counts[log.pain.area]||0)+1;const repeated=Object.entries(counts).filter(([,count])=>count>=3).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
    const averages=[averageRpe(prior),averageRpe(current)],skipped=current.filter(log=>log.status==='skipped').length;let rule=null,reason='',after=clone(baseline);
    if(severeAreas.length){rule=1;after=scaleWeekTo(after,Math.min(weekMinutes(previous),weekMinutes(after)));after.sessions=after.sessions.map(session=>({...session,blocks:session.blocks.map(block=>session.type==='run'&&block.activity==='run'?{...block,activity:'walk'}:session.type==='strength'&&(MOVEMENT_AREAS[block.activity]||[]).some(area=>severeAreas.includes(area))?{...block,activity:'seated_hand_squeeze'}:block)}));reason=`${severeAreas.map(area=>AREA_LABEL[area]).join('·')}에 심한 통증이 기록되어 다음 계획의 러닝을 모두 걷기로 바꾸고 해당 부위를 쓰는 근력 동작을 제외했어요.`;}
    else if(repeated){rule=2;after=scaleWeekTo(after,round(weekMinutes(previous)*.8));for(const session of after.sessions.filter(session=>session.type==='run')){const main=session.blocks.reduce((sum,block)=>sum+block.minutes,0);let run=session.blocks.filter(block=>block.activity==='run').reduce((sum,block)=>sum+block.minutes,0);for(const block of session.blocks.filter(block=>block.activity==='run').sort((a,b)=>b.minutes-a.minutes)){if(run<=main*.25+1e-9)break;run-=block.minutes;block.activity='walk';}}reason=`${AREA_LABEL[repeated[0]]} 통증이 최근 2주에 ${repeated[1]}번 기록되어 다음 계획을 걷기 위주로 바꾸고 총 시간을 20% 줄였어요.`;}
    else if(averages.every(value=>value!==null&&value>=8)){rule=3;after=scaleWeekTo(after,Math.min(weekMinutes(previous),weekMinutes(after)));reason='최근 2주 동안 힘든 정도가 계속 높아 다음 계획의 운동 시간을 늘리지 않았어요.';}
    else if(current.length&&skipped>=current.length/2){rule=4;after={...clone(previous),week:baseline.week,isRecoveryWeek:baseline.isRecoveryWeek};if(after.isRecoveryWeek)after=scaleWeekTo(after,round(weekMinutes(previous)*.75));reason=after.isRecoveryWeek?'최근 세션의 절반 이상을 건너뛰어 같은 운동 구성으로 이어가되 회복 일정에 맞춰 시간을 줄였어요.':'최근 세션의 절반 이상을 건너뛰어 다음 계획을 같은 운동량으로 이어가요.';}
    else if(averages.every(value=>value!==null&&value<=4)&&recent.every(log=>!log.pain)){rule=5;reason=after.isRecoveryWeek?'최근 2주 동안 편안하게 수행했고 통증 기록이 없어 다음 계획을 예정된 회복 시간으로 이어가요.':'최근 2주 동안 편안하게 수행했고 통증 기록이 없어 다음 계획을 10% 상한 안에서 천천히 늘려요.';}
    if(reason)after=addNote(after,reason);const change=rule?{date:end,reason,before:clone(previous),after:clone(after)}:null;return {rule,reason,before:clone(previous),baseline,after,change,severeAreas};
  }
  function cumulativeMinutes(logs,durations){return round(validateSessionLogs(logs).filter(log=>log.status!=='skipped').reduce((sum,log)=>sum+(Number.isFinite(durations?.[log.sessionId])&&durations[log.sessionId]>=0?durations[log.sessionId]:0),0));}

  return {generatePlan,extendPlan,repeatWeek,sessionMinutes,weekMinutes,longestRun,adjustNextWeek,validateSessionLogs,cumulativeMinutes,activityLabels:ACTIVITY_LABEL,movementAreas:MOVEMENT_AREAS};
});
