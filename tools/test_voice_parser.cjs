const assert=require('assert');
const {parse}=require('../app/voice-parser.js');
const cases={
  weight:[
    ['육십이 점 삼',{kind:'weight',weight:62.3}],
    ['체중은 육십삼 점 오예요',{kind:'weight',weight:63.5}],
    ['육십사 점 영 킬로',{kind:'weight',weight:64}],
    ['62.3킬로',{kind:'weight',weight:62.3}],
    ['몸무게 65.1kg',{kind:'weight',weight:65.1}]
  ],
  meal:[
    ['아침 보통',{kind:'meal',slot:'breakfast',amount:'normal'}],
    ['점심 많이 먹었어',{kind:'meal',slot:'lunch',amount:'high'}],
    ['저녁 적게 먹었어',{kind:'meal',slot:'dinner',amount:'low'}],
    ['아침은 많이',{kind:'meal',slot:'breakfast',amount:'high'}],
    ['점심 적게 먹었어요',{kind:'meal',slot:'lunch',amount:'low'}]
  ],
  pain:[
    ['무릎이 좀 아팠어',{kind:'pain',areas:['knee'],intensity:'slight'}],
    ['허리가 조금 아파',{kind:'pain',areas:['back'],intensity:'slight'}],
    ['발목이 보통으로 아팠어',{kind:'pain',areas:['ankle'],intensity:'moderate'}],
    ['어깨가 너무 아파',{kind:'pain',areas:['shoulder'],intensity:'severe'}],
    ['무릎이 심하게 불편해',{kind:'pain',areas:['knee'],intensity:'severe'}]
  ],
  completed:[
    ['오늘 다 했어',{kind:'completed'}],
    ['오늘 다 했어요',{kind:'completed'}],
    ['운동 다 했어',{kind:'completed'}],
    ['오늘 운동 완료',{kind:'completed'}],
    ['운동 끝났어',{kind:'completed'}]
  ]
};
for(const [kind,items] of Object.entries(cases)){assert.equal(items.length,5);for(const [utterance,expected] of items){const parsed=parse(utterance);assert(parsed,`${kind}: ${utterance}`);for(const [key,value] of Object.entries(expected))assert.deepEqual(parsed[key],value,`${kind}: ${utterance} -> ${key}`)}}
for(const utterance of ['아침','무릎이 아팠어','체중이 좀 그래','오늘 다 했을까','아침 보통 무릎이 좀 아파','500킬로','오늘 62.3킬로 먹었어'])assert.equal(parse(utterance),null,`추측 금지: ${utterance}`);
console.log('Voice parser checks passed: 4 patterns × 5 variants; ambiguous and incomplete phrases rejected.');
