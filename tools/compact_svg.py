"""Lossless line grouping, with 2-decimal coordinate precision for Figma import."""
from pathlib import Path
from collections import defaultdict
import xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
NS='http://www.w3.org/2000/svg';ET.register_namespace('',NS)
for file in (root/'assets/lieflat').glob('*.svg'):
    if file.stem.endswith('-figma'):continue
    svg=ET.fromstring(file.read_text(encoding='utf-8'))
    groups=defaultdict(list)
    def number(s):
        try:return f'{float(s):.2f}'.rstrip('0').rstrip('.')
        except ValueError:return s
    for element in list(svg):
        for k in ['x','y','cx','cy','x1','x2','y1','y2','r','opacity','stroke-width']:
            if k in element.attrib:element.set(k,number(element.get(k)))
        if element.tag==f'{{{NS}}}line':
            attrs={k:v for k,v in element.attrib.items() if k not in ['x1','x2','y1','y2']}
            key=tuple(sorted(attrs.items()))
            groups[key].append(f"M{element.get('x1')} {element.get('y1')}L{element.get('x2')} {element.get('y2')}")
            svg.remove(element)
    for key,parts in reversed(list(groups.items())):
        line=ET.Element(f'{{{NS}}}path',dict(key));line.set('d',''.join(parts));line.set('fill','none');svg.insert(0,line)
    for k in ['id','role','aria-label']:svg.attrib.pop(k,None)
    file.with_stem(file.stem+'-figma').write_text(ET.tostring(svg,encoding='unicode'),encoding='utf-8')
print('Prepared editable compact SVG imports')
