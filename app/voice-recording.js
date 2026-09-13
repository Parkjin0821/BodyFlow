'use strict';
(() => {
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,button=document.getElementById('voice-record-open');
  if(!Recognition||!button)return;
  button.hidden=false;
  const dialog=document.getElementById('voice-confirm-dialog'),heard=document.getElementById('voice-heard'),interpretation=document.getElementById('voice-interpretation'),message=document.getElementById('voice-record-message'),confirm=document.getElementById('voice-confirm'),retry=document.getElementById('voice-retry');
  let pending=null,listening=false,received=false,restartAfterEnd=false;
  const recognition=new Recognition();recognition.lang='ko-KR';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
  function misunderstood(){pending=null;heard.textContent='';interpretation.textContent='잘 못 알아들었어요. 다시 말씀해주세요';confirm.hidden=true;message.textContent='';if(!dialog.open)dialog.showModal()}
  function listen(){if(listening)return;pending=null;received=false;confirm.hidden=true;heard.textContent='듣고 있어요';interpretation.textContent='말씀이 끝날 때까지 기다릴게요.';message.textContent='';if(!dialog.open)dialog.showModal();try{listening=true;recognition.start()}catch{listening=false;received=true;misunderstood()}}
  recognition.onresult=event=>{received=true;const transcript=event.results?.[0]?.[0]?.transcript??'';pending=BodyFlowVoiceParser.parse(transcript);if(!pending){misunderstood();return}heard.textContent=`들은 말: ${transcript}`;interpretation.textContent=pending.label;confirm.hidden=false};
  recognition.onerror=()=>{received=true;misunderstood()};recognition.onnomatch=()=>{received=true;misunderstood()};recognition.onend=()=>{listening=false;if(restartAfterEnd){restartAfterEnd=false;listen()}else if(!received)misunderstood()};
  button.onclick=listen;retry.onclick=()=>{if(listening){restartAfterEnd=true;(recognition.abort||recognition.stop).call(recognition)}else listen()};
  confirm.onclick=()=>{if(!pending)return;let saved=false;if(pending.kind==='weight')saved=BodyFlowQuickRecord.save(BodyFlowRecord.recordWeight(own,today(),pending.weight),'음성으로 확인한 체중을 기록했어요.');if(pending.kind==='meal')saved=BodyFlowQuickRecord.save(BodyFlowRecord.recordMealAmount(own,today(),pending.amount,pending.slot),'음성으로 확인한 식사를 기록했어요.');if(pending.kind==='pain')saved=BodyFlowQuickRecord.save(BodyFlowRecord.recordPain(own,today(),pending.areas,pending.intensity),'음성으로 확인한 통증을 기록했어요.');if(pending.kind==='completed'){dialog.close();BodyFlowQuickRecord.openSessionCompletion();pending=null;return}if(saved){dialog.close();pending=null}else message.textContent='기록을 저장하지 못했습니다.'};
})();
