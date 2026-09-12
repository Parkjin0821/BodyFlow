/* Adapted from Lieflat Charts actual gallery blocks. See provenance.json and LICENSE. */
function drawCalories(s){
const D=weekRows().map(r=>[r.date.slice(5),r.kcal===null?null:r.kcal/10]);

  const x0=i=>40+i*53,base=266,step=210/Math.max(180,...D.map(d=>d[1]||0)),HW=12;
  D.forEach(([name,v],i)=>{
    const x=x0(i);if(v===null){txt(s,{x,y:base-8,fill:MUTED,'text-anchor':'middle','font-size':12},'—');txt(s,{x,y:base+18,fill:MUTED,'text-anchor':'middle','font-size':11},name);return;}
    for(let k=0;k<Math.floor(v);k++){
      const y=base-k*step,w=HW-1.5+rnd(k+1,i+2)*3;
      el(s,'line',{x1:x-w,y1:y,x2:x+w,y2:y,stroke:INK,'stroke-width':.8,
        opacity:.9+rnd(k+2,i+4)*.1,class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
      if(k%5===4)el(s,'circle',{cx:x+HW+4.5,cy:y,r:.8,fill:MUTED,
        class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
    }
    if(v%1){const y=base-Math.floor(v)*step;el(s,'line',{x1:x-HW*(v%1),x2:x+HW*(v%1),y1:y,y2:y,stroke:INK,'stroke-width':1});}const topY=base-Math.max(0,v-1)*step;
    const num=txt(s,{x,y:topY-10,'font-size':11,'font-weight':800,fill:INK,'text-anchor':'middle',
      class:'fade',style:`animation-delay:${.4+i*.08}s`},Math.round(v*10));
    tip(num,`${name} · ${Math.round(v*10)} kcal`);
    txt(s,{x,y:base+18,'font-size':11,'font-weight':700,fill:MUTED,'text-anchor':'middle',
      'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.08}s`},name);
  });
  el(s,'line',{x1:28,y1:base+4,x2:372,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
  txt(s,{x:200,y:306,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:.9s'},
    '한 줄 = 10 kcal · 부분 줄은 나머지 · — 미기록');
}

function drawWeight(s){
const rows=weightRows(),N=rows.length;const val=d=>rows[d].weight;const valid=rows.filter(r=>r.weight!==null).map(r=>r.weight);if(!valid.length)return emptyChart(s);const lo=Math.floor(Math.min(...valid)*2)/2-.5,hi=Math.ceil(Math.max(...valid)*2)/2+.5;

  const x=d=>40+d*320/Math.max(1,N-1),base=262,map=v=>242-(v-lo)/(hi-lo)*200;
  // calendar floor
  for(let d=0;d<N;d++)
    el(s,'line',{x1:x(d),y1:base,x2:x(d),y2:base-7,stroke:MUTED,'stroke-width':.6,
      class:'fade',style:`animation-delay:${d*.008}s`});
  el(s,'line',{x1:24,y1:base,x2:376,y2:base,stroke:GRID,'stroke-width':.8,class:'fade'});
  const vs=Array.from({length:N},(_,d)=>val(d));
  // top-2 peaks, apart
  for(const v of [lo,(lo+hi)/2,hi]){const y=map(v);el(s,'line',{x1:40,x2:366,y1:y,y2:y,stroke:GRID,'stroke-width':.7});txt(s,{x:35,y:y+4,fill:MUTED,'text-anchor':'end','font-size':11},v.toFixed(1));}const top=[];
  for(const d of [...vs.keys()].filter(d=>vs[d]!==null).sort((a,b)=>vs[b]-vs[a])){
    if(top.every(t=>Math.abs(t-d)>=5))top.push(d);
    if(top.length===2)break;
  }
  // hairline path
  let pen=false;const pts=vs.map((v,d)=>{if(v===null){pen=false;return '';}const cmd=pen?'L':'M';pen=true;return cmd+x(d)+' '+map(v);}).join(' ');
  el(s,'path',{d:pts,fill:'none',stroke:INK,'stroke-width':1.5,pathLength:1,
    class:'draw',style:'animation-duration:1.2s'});
  vs.forEach((v,d)=>{
    if(v===null)return;const day=new Date(rows[d].date+'T12:00:00').getDay();const weekend=day===0||day===6,big=top.includes(d);
    const dot=el(s,'circle',{cx:x(d),cy:map(v),r:big?4.2:2.1,
      fill:weekend?PAPER:INK,stroke:INK,'stroke-width':weekend?1:0,
      class:'pop',style:`animation-delay:${.2+d*.03}s`});
    tip(dot,`${rows[d].date} · ${v.toFixed(1)} kg`);
    if(big)txt(s,{x:x(d),y:map(v)-11,'font-size':11,'font-weight':800,fill:INK,'text-anchor':'middle',
      style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${1+d*.01}s`,
      class:'fade'},v.toFixed(1));
  });
  [[0,rows[0].date.slice(5)],[Math.floor((N-1)/2),rows[Math.floor((N-1)/2)].date.slice(5)],[N-1,rows[N-1].date.slice(5)]].forEach(([d,m])=>
    txt(s,{x:x(d),y:base+18,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
      'letter-spacing':'.1em',class:'fade'},m));
  txt(s,{x:200,y:306,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
    '단위 kg · 점 = 측정일 · 빈 점 = 주말 · 결측은 끊음');
}

function drawRecipe(s){
const D=[['탄수',42,INK],['단백',33,SECOND],['지방',25,MUTED]];

  const cx=200,cy=148,R0=64;
  let k0=0;
  D.forEach(([name,v,shade],si)=>{
    for(let k=0;k<v;k++){
      const idx=k0+k,a=idx*3.6-90;
      const len=10+rnd(idx+1,si+2)*6;
      const [x1,y1]=pol(cx,cy,R0,a),[x2,y2]=pol(cx,cy,R0+len,a);
      el(s,'line',{x1,y1,x2,y2,stroke:shade,'stroke-width':1.8,
        class:'fade',style:`animation-delay:${idx*.012}s`});
      if(idx%10===0){
        const [dx,dy]=pol(cx,cy,R0-5,a);
        el(s,'circle',{cx:dx,cy:dy,r:.8,fill:MUTED,
          class:'fade',style:`animation-delay:${idx*.012}s`});
      }
    }
    // segment label at mid-angle, outside, tied by a dotted hairline
    const mid=(k0+v/2)*3.6-90,[lx,ly]=pol(cx,cy,R0+38,mid),[gx,gy]=pol(cx,cy,R0+20,mid);
    el(s,'line',{x1:gx,y1:gy,x2:lx,y2:ly,stroke:MUTED,'stroke-width':.7,
      'stroke-dasharray':'1 3',class:'fade',style:`animation-delay:${.6+si*.1}s`});
    const anchor=Math.cos(mid*D2R)>0.3?'start':Math.cos(mid*D2R)<-0.3?'end':'middle';
    const lab=txt(s,{x:lx,y:ly+3,'font-size':11,'font-weight':800,fill:shade,'text-anchor':anchor,
      'letter-spacing':'.06em',style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${.65+si*.1}s`,
      class:'fade'},`${name} · ${v}`);
    tip(lab,`${name} · 에너지 비중 ${v}% (반올림)`);
    k0+=v;
  });
  txt(s,{x:cx,y:cy-2,'font-size':22,'font-weight':800,fill:INK,'text-anchor':'middle',
    class:'fade',style:'animation-delay:.9s'},'510');
  txt(s,{x:cx,y:cy+14,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.1em',class:'fade',style:'animation-delay:.9s'},'kcal · 예시 한 그릇');
  txt(s,{x:200,y:296,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
    '시계 방향 · 한 눈금 = 1% · 반올림한 구성비');
}

function drawPace(s){
const D=[['1 km',58],['2 km',56],['3 km',55]];

  const y0=i=>82+i*72,X0=70,PX=4.2;
  D.forEach(([name,v],i)=>{
    const y=y0(i);
    txt(s,{x:60,y:y+3,'font-size':11,'font-weight':700,fill:MUTED,'text-anchor':'end',
      'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.08}s`},name);
    el(s,'line',{x1:X0,y1:y+9,x2:X0+60*PX,y2:y+9,stroke:GRID,'stroke-width':.6,
      class:'fade',style:`animation-delay:${i*.08}s`});
    for(let k=0;k<v;k++){
      const x=X0+k*PX+PX/2,h=9+rnd(k+1,i+2)*6;
      el(s,'line',{x1:x,y1:y+9,x2:x,y2:y+9-h,stroke:INK,'stroke-width':.9,
        opacity:.9+rnd(k+3,i+5)*.1,class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
      if(k%5===4)el(s,'circle',{cx:x,cy:y+13,r:.8,fill:MUTED,
        class:'fade',style:`animation-delay:${i*.08+k*.012}s`});
    }
    const lab=txt(s,{x:X0+v*PX+10,y:y+4,'font-size':11,'font-weight':800,fill:INK,
      class:'fade',style:`animation-delay:${.4+i*.08}s`},Math.floor(v*10/60)+'′'+String(v*10%60).padStart(2,'0')+'″');
    tip(lab,`${name} · ${v*10} 초/km`);
  });
  txt(s,{x:200,y:308,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:.9s'},
    '한 눈금 = 10초/km · 짧을수록 빠른 구간');
}

function drawActivity(s){
const D=activityPairs();if(rangeRows(14).every(r=>r.strength===null&&r.cardio===null))return emptyChart(s);

  const x0=i=>110+i*180,base=258,step=210/Math.max(100,...D.flatMap(d=>d.slice(1))),HW=12;
  D.forEach(([name,was,now],i)=>{
    const xa=x0(i)-13,xb=x0(i)+13;
    for(let k=0;k<was;k++){
      const y=base-k*step,w=HW-1.2+rnd(k+1,i+2)*2.4;
      el(s,'line',{x1:xa-w,y1:y,x2:xa+w,y2:y,stroke:SECOND,'stroke-width':1,
        opacity:.9+rnd(k+2,i+3)*.1,class:'fade',style:`animation-delay:${i*.08+k*.01}s`});
    }
    for(let k=0;k<now;k++){
      const y=base-k*step,w=HW-1.2+rnd(k+1,i+7)*2.4;
      el(s,'line',{x1:xb-w,y1:y,x2:xb+w,y2:y,stroke:INK,'stroke-width':1,
        opacity:.9+rnd(k+2,i+8)*.1,class:'fade',style:`animation-delay:${.15+i*.08+k*.01}s`});
    }
    const topB=base-(now-1)*step;
    const num=txt(s,{x:xb,y:topB-9,'font-size':10.5,'font-weight':800,fill:INK,'text-anchor':'middle',
      class:'fade',style:`animation-delay:${.5+i*.08}s`},now);
    tip(num,`${name} · 이전 7일 ${was}분 → 최근 7일 ${now}분`);
    txt(s,{x:xa,y:base-(was-1)*step-9,'font-size':11,'font-weight':700,fill:MUTED,'text-anchor':'middle',
      class:'fade',style:`animation-delay:${.5+i*.08}s`},was);
    txt(s,{x:x0(i),y:base+18,'font-size':11,'font-weight':700,fill:MUTED,'text-anchor':'middle',
      'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.08}s`},name);
  });
  el(s,'line',{x1:30,y1:base+4,x2:370,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
  txt(s,{x:200,y:306,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:1s'},
    '왼쪽 이전 7일 · 오른쪽 최근 7일 · 한 줄 = 1분');
}

function drawRunning(s){
const D=[['준비',[5,0,0]],['본운동',[12,8,0]],['마무리',[5,0,0]]];const SHADE=[SECOND,INK,MUTED];const SEG=['걷기','달리기','기타'];

  const x0=i=>70+i*128,base=262,step=9,HW=15;
  D.forEach(([name,segs],i)=>{
    const x=x0(i);let k0=0;
    segs.forEach((v,si)=>{if(!v)return;
      for(let k=0;k<v;k++){
        const y=base-(k0+k)*step,w=HW-1.4+rnd(k+1,i*3+si+2)*2.8;
        el(s,'line',{x1:x-w,y1:y,x2:x+w,y2:y,stroke:SHADE[si],'stroke-width':1,
          opacity:.9+rnd(k+2,i+si+4)*.1,class:'fade',
          style:`animation-delay:${i*.09+(k0+k)*.012}s`});
      }
      const midY=base-(k0+v/2)*step;
      const lab=txt(s,{x:x+HW+7,y:midY+2.5,'font-size':11,'font-weight':800,fill:SHADE[si]===`#C0BFB8`?MUTED:SHADE[si],
        class:'fade',style:`animation-delay:${.5+i*.09+si*.06}s`},v);
      tip(lab,`${name} · ${SEG[si]} ${v}분`);
      k0+=v;
    });
    const total=segs[0]+segs[1]+segs[2];
    txt(s,{x,y:base-k0*step-8,'font-size':10.5,'font-weight':800,fill:INK,'text-anchor':'middle',
      class:'fade',style:`animation-delay:${.6+i*.09}s`},total);
    txt(s,{x,y:base+18,'font-size':11,'font-weight':700,fill:MUTED,'text-anchor':'middle',
      'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.09}s`},name);
  });
  el(s,'line',{x1:36,y1:base+4,x2:364,y2:base+4,stroke:GRID,'stroke-width':.8,class:'fade'});
  txt(s,{x:200,y:306,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},
    '한 줄 = 1분 · 걷기 22분 / 달리기 8분');
}

function drawNutrition(s){
const r=latestRecord();if(!r)return emptyChart(s);const ASK=[['탄수화물',r.carbs,180],['단백질',r.protein,90],['지방',r.fat,60]].map(([name,g,target])=>[name+' '+(g===null?'미기록':g+' / '+target+' g'),g===null?null:Math.round(g/target*100)]);

  ASK.forEach(([name,v],i)=>{
    const base=78+i*78;if(v===null){txt(s,{x:28,y:base-20,fill:MUTED,'font-size':12},name);return;}const capped=Math.min(100,v);
    txt(s,{x:28,y:base-26,'font-size':11,'font-weight':700,fill:MUTED,
      'letter-spacing':'.08em',class:'fade',style:`animation-delay:${i*.1}s`},name);
    el(s,'line',{x1:28,y1:base,x2:372,y2:base,stroke:GRID,'stroke-width':.6,
      class:'fade',style:`animation-delay:${i*.1}s`});
    for(let k=0;k<100;k++){
      const x=28+k*3.44,picked=k<capped;
      const h=picked?12+rnd(k+1,i+2)*5:4.5+rnd(k+1,i+5)*2;
      el(s,'line',{x1:x,y1:base,x2:x,y2:base-h,
        stroke:picked?INK:MUTED,'stroke-width':picked?1.5:.7,
        class:'fade',style:`animation-delay:${i*.1+k*.006}s`});
      if(k%10===0)el(s,'circle',{cx:x,cy:base+4.5,r:.8,fill:MUTED,
        class:'fade',style:`animation-delay:${i*.1+k*.006}s`});
    }
    const lab=txt(s,{x:Math.min(352,28+(capped-1)*3.44+9),y:base-11,'font-size':11,'font-weight':800,fill:INK,
      style:`paint-order:stroke;stroke:${PAPER};stroke-width:3px;animation-delay:${.5+i*.1}s`,
      class:'fade'},v+'%');
    tip(lab,`${name} · 목표 대비 ${v}%`);
  });
  txt(s,{x:200,y:314,'font-size':11,'font-weight':600,fill:MUTED,'text-anchor':'middle',
    'letter-spacing':'.12em',class:'fade',style:'animation-delay:1.1s'},'각 행의 목표는 독립적 · 한 눈금 = 목표의 1%');
}
