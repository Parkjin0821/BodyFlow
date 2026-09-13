from pathlib import Path
import base64

root=Path(__file__).resolve().parents[1]
html=(root/'app/index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'app/style.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="ia.css">','<style>'+(root/'app/ia.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="tokens.css">','<style>'+(root/'app/tokens.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="accessibility.css">','<style>'+(root/'app/accessibility.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="stylesheet" href="logging.css">','<style>'+(root/'app/logging.css').read_text(encoding='utf-8')+'</style>')
fixture=(root/'fixtures/sample-plan.json').read_text(encoding='utf-8')
for name in ['charts.js','presets.js','profile.js','app.js','plan.js','content-cards.js']:
    code=(root/'app'/name).read_text(encoding='utf-8')
    if name=='plan.js': code='window.BODYFLOW_SAMPLE_PLAN='+fixture+';\n'+code
    html=html.replace(f'<script src="{name}"></script>','<script>'+code+'</script>')
photo=base64.b64encode((root/'assets/chicken-tofu-bowl.png').read_bytes()).decode()
html=html.replace('../assets/chicken-tofu-bowl.png','data:image/png;base64,'+photo).replace('../README.md','README.md').replace('../reference/','reference/')
(root/'BodyFlow.html').write_text(html,encoding='utf-8')
print('Built BodyFlow.html')
