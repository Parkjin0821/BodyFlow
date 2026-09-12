"""Extract and adapt actual Lieflat gallery blocks; fail if upstream anchors change."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
B = (ROOT / 'reference/lieflat-charts/templates/basics-gallery.html').read_text(encoding='utf-8')
L = (ROOT / 'reference/lieflat-charts/templates/lupi-gallery.html').read_text(encoding='utf-8')


def block(source, chart_id, function, declarations, changes):
    anchor = source.index("obsReveal('" + chart_id + "'")
    start = source.rfind('(()=>{', 0, anchor)
    end = source.index('\n})();', anchor) + len('\n})();')
    code = source[start:end]
    callback = code.index("obsReveal('")
    code = "function " + function + "(s){\n" + declarations + "\n" + code[code.index("s=>{", callback)+4:]
    code = code[:code.rfind('\n});')] + '\n}\n'
    for old, new in changes:
        if old not in code:
            raise ValueError(f'{chart_id}: missing anchor {old!r}')
        code = code.replace(old, new)
    # BodyFlow's Korean mobile labels and explicit common color roles.
    code = re.sub(r"'font-size':(?:7(?:\.5)?|8(?:\.5)?|9(?:\.5)?)\b", "'font-size':11", code)
    for color in ['#C6C5BF', '#CFCEC7', '#B0AFA9', '#6A6963', '#55554F', '#8F8E88', '#C0BFB8']:
        code = code.replace("'"+color+"'", 'MUTED')
    code = code.replace('opacity:.5+rnd(k+2,i+4)*.5','opacity:.9+rnd(k+2,i+4)*.1')
    return code


parts = ["/* Adapted from Lieflat Charts actual gallery blocks. See provenance.json and LICENSE. */"]
parts.append(block(B,'rungs','drawCalories',
    "const D=weekRows().map(r=>[r.date.slice(5),r.kcal===null?null:r.kcal/10]);",
    [("56+i*56,base=266,step=5.6,HW=14", "40+i*53,base=266,step=210/Math.max(180,...D.map(d=>d[1]||0)),HW=12"),
     ("const x=x0(i);", "const x=x0(i);if(v===null){txt(s,{x,y:base-8,fill:MUTED,'text-anchor':'middle','font-size':12},'—');txt(s,{x,y:base+18,fill:MUTED,'text-anchor':'middle','font-size':11},name);return;}"),
     ("k<v;k++", "k<Math.floor(v);k++"),
     ("const topY=base-(v-1)*step;", "if(v%1){const y=base-Math.floor(v)*step;el(s,'line',{x1:x-HW*(v%1),x2:x+HW*(v%1),y1:y,y2:y,stroke:INK,'stroke-width':1});}const topY=base-Math.max(0,v-1)*step;"),
     ("},v);", "},Math.round(v*10));"),
     ("`${name} — $${v}k MRR`", "`${name} · ${Math.round(v*10)} kcal`"),
     ("'ONE RUNG = $1K · DOT MARKS EVERY FIFTH'", "'한 줄 = 10 kcal · 부분 줄은 나머지 · — 미기록'"),
     ("'stroke-width':1,", "'stroke-width':.8,")]))
parts.append(block(B,'dayline','drawWeight',
    "const rows=weightRows(),N=rows.length;const val=d=>rows[d].weight;const valid=rows.filter(r=>r.weight!==null).map(r=>r.weight);if(!valid.length)return emptyChart(s);const lo=Math.floor(Math.min(...valid)*2)/2-.5,hi=Math.ceil(Math.max(...valid)*2)/2+.5;",
    [("30+d*11.7,base=262,map=v=>base-v*2.15", "40+d*320/Math.max(1,N-1),base=262,map=v=>242-(v-lo)/(hi-lo)*200"),
     ("const top=[];", "for(const v of [lo,(lo+hi)/2,hi]){const y=map(v);el(s,'line',{x1:40,x2:366,y1:y,y2:y,stroke:GRID,'stroke-width':.7});txt(s,{x:35,y:y+4,fill:MUTED,'text-anchor':'end','font-size':11},v.toFixed(1));}const top=[];"),
     ("[...vs.keys()].sort", "[...vs.keys()].filter(d=>vs[d]!==null).sort"),
     ("const pts=vs.map((v,d)=>`${x(d)} ${map(v)}`).join(' L ');", "let pen=false;const pts=vs.map((v,d)=>{if(v===null){pen=false;return '';}const cmd=pen?'L':'M';pen=true;return cmd+x(d)+' '+map(v);}).join(' ');"),
     ("d:'M'+pts", "d:pts"),
     ("const weekend=d%7===5||d%7===6", "if(v===null)return;const day=new Date(rows[d].date+'T12:00:00').getDay();const weekend=day===0||day===6"),
     ("`Day ${d+1} — ${Math.round(v)} sign-ups`", "`${rows[d].date} · ${v.toFixed(1)} kg`"),
     ("Math.round(v));", "v.toFixed(1));"),
     ("[[0,'JUN 1'],[14,'JUN 15'],[29,'JUN 30']]", "[[0,rows[0].date.slice(5)],[Math.floor((N-1)/2),rows[Math.floor((N-1)/2)].date.slice(5)],[N-1,rows[N-1].date.slice(5)]]"),
     ("'ONE DOT = ONE DAY · HOLLOW = WEEKEND'", "'단위 kg · 점 = 측정일 · 빈 점 = 주말 · 결측은 끊음'"),
     ("'stroke-width':1,pathLength", "'stroke-width':1.5,pathLength")]))
parts.append(block(B,'tickdonut','drawRecipe',
    "const D=[['탄수',42,INK],['단백',33,SECOND],['지방',25,MUTED]];",
    [("`${name} — ${v}% of traffic`", "`${name} · 에너지 비중 ${v}% (반올림)`"),
     ("},'100');", "},'510');"),
     ("'TICKS · ONE = 1%'", "'kcal · 예시 한 그릇'"),
     ("'TWELVE O’CLOCK IS ZERO · DOT MARKS EVERY TENTH · READS CLOCKWISE'", "'시계 방향 · 한 눈금 = 1% · 반올림한 구성비'"),
     ("'stroke-width':1,", "'stroke-width':1.8,")]))
parts.append(block(B,'tickrows','drawPace',
    "const D=[['1 km',58],['2 km',56],['3 km',55]];",
    [("52+i*44,X0=104,PX=6.9", "82+i*72,X0=70,PX=4.2"),
     ("x:94", "x:60"), ("X0+34*PX", "X0+60*PX"),
     ("},v);", "},Math.floor(v*10/60)+'′'+String(v*10%60).padStart(2,'0')+'″');"),
     ("`${name} — ${v} releases`", "`${name} · ${v*10} 초/km`"),
     ("'ONE TICK = ONE RELEASE · DOT MARKS EVERY FIFTH'", "'한 눈금 = 10초/km · 짧을수록 빠른 구간'"),
     ("opacity:.55+rnd(k+3,i+5)*.45", "opacity:.9+rnd(k+3,i+5)*.1")]))
parts.append(block(B,'pairrungs','drawActivity',
    "const D=activityPairs();if(rangeRows(14).every(r=>r.strength===null&&r.cardio===null))return emptyChart(s);",
    [("64+i*66,base=258,step=5.4,HW=10", "110+i*180,base=258,step=210/Math.max(100,...D.flatMap(d=>d.slice(1))),HW=12"),
     ("stroke:'#B0AFA9'", "stroke:SECOND"),
     ("`${name} — $${was}k → $${now}k`", "`${name} · 이전 7일 ${was}분 → 최근 7일 ${now}분`"),
     ("'FAINT = 2025 · INK = 2026 · ONE RUNG = $1K'", "'왼쪽 이전 7일 · 오른쪽 최근 7일 · 한 줄 = 1분'"),
     ("opacity:.5+rnd(k+2,i+3)*.4", "opacity:.9+rnd(k+2,i+3)*.1"),
     ("opacity:.6+rnd(k+2,i+8)*.4", "opacity:.9+rnd(k+2,i+8)*.1")]))
parts.append(block(B,'stackrungs','drawRunning',
    "const D=[['준비',[5,0,0]],['본운동',[12,8,0]],['마무리',[5,0,0]]];const SHADE=[SECOND,INK,MUTED];const SEG=['걷기','달리기','기타'];",
    [("72+i*76,base=262,step=5.2,HW=13", "70+i*128,base=262,step=9,HW=15"),
     ("segs.forEach((v,si)=>{", "segs.forEach((v,si)=>{if(!v)return;"),
     ("(k0+k+si)", "(k0+k)"),("(k0+v/2+si)", "(k0+v/2)"),("(k0+2)*step", "k0*step"),
     ("`${name} ${SEG[si]} — $${v}k`", "`${name} · ${SEG[si]} ${v}분`"),
     ("'DARKEST = CORE · MID = ADD-ONS · PALE = SERVICES · ONE RUNG = $1K'", "'한 줄 = 1분 · 걷기 22분 / 달리기 8분'"),
     ("opacity:.6+rnd(k+2,i+si+4)*.4", "opacity:.9+rnd(k+2,i+si+4)*.1")]))
parts.append(block(L,'ballottally','drawNutrition',
    "const r=latestRecord();if(!r)return emptyChart(s);const ASK=[['탄수화물',r.carbs,180],['단백질',r.protein,90],['지방',r.fat,60]].map(([name,g,target])=>[name+' '+(g===null?'미기록':g+' / '+target+' g'),g===null?null:Math.round(g/target*100)]);",
    [("const base=78+i*62;", "const base=78+i*78;if(v===null){txt(s,{x:28,y:base-20,fill:MUTED,'font-size':12},name);return;}const capped=Math.min(100,v);"),
     ("picked=k<v", "picked=k<capped"),
     ("x:28+(v-1)*3.44+9", "x:Math.min(352,28+(capped-1)*3.44+9)"),
     ("},v);", "},v+'%');"),
     ("`${v} of 100 picked this — they could pick several`", "`${name} · 목표 대비 ${v}%`"),
     ("'ONE TICK = ONE RESPONDENT · DOT MARKS EVERY TENTH'", "'각 행의 목표는 독립적 · 한 눈금 = 목표의 1%'"),
     ("'stroke-width':picked?.9:.55", "'stroke-width':picked?1.5:.7")]))

output = ROOT / 'app/charts.js'
output.parent.mkdir(exist_ok=True)
output.write_text('\n'.join(parts), encoding='utf-8')
print('Extracted and adapted 7 actual gallery implementations:', output)
