from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
codes=['pt-BR','en-US','es-ES','zh-CN','hi-IN','ar-SA','fr-FR','bn-BD','ru-RU','de-DE','it-IT','ja-JP']
data={code:json.loads((root/'locales'/f'{code}.json').read_text(encoding='utf-8')) for code in codes}
for code,values in data.items():
 assert values.keys()==data['en-US'].keys() and all(values.values()),code
(root/'i18n.js').write_text('window.QTranslations='+json.dumps(data,ensure_ascii=False)+';\n',encoding='utf-8')
print('12 complete dictionaries compiled.')
