from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json, math, os, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ['TEMP'])/'quality-toolbox-tests';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
def close(a,b): assert math.isclose(a,b,rel_tol=1e-9,abs_tol=1e-9),(a,b)
def paste(page,selector,text):
 page.locator(selector).evaluate("(el,text)=>{const c=new DataTransfer();c.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:c,bubbles:true,cancelable:true}));}",text)
def xlsx(path):
 with ZipFile(path) as z:
  ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  book=ET.fromstring(z.read('xl/workbook.xml'));names=[s.attrib['name'] for s in book.find('s:sheets',ns)]
  result={}
  for i,name in enumerate(names,1):
   root=ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
   result[name]={c.attrib['r']:{'formula':c.findtext('s:f',None,ns),'value':c.findtext('s:v',None,ns),'type':c.attrib.get('t')} for c in root.findall('.//s:sheetData/s:row/s:c',ns)}
  return result
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome',headless=True)
  context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  url=f'http://127.0.0.1:{server.server_port}/';page.goto(url);page.wait_for_function('window.QualityApp')
  assert page.locator('#toolNav a').count()==10
  # Independent numerical fixtures: NIST individuals example and balanced ANOVA with known SS.
  result=page.evaluate("""()=>{
   const s=QModels.makeState();s.tools.cep.rows=[49.6,47.6,49.9,51.3,47.8,51.2,52.6,52.4,53.6,52.1].map(value=>({value:String(value),note:''}));s.tools.cep.lsl='40';s.tools.cep.usl='60';
   const d=s.tools.msa;d.parts=3;d.operators=2;d.trials=2;d.lsl='5';d.usl='35';
   for(let i=0;i<3;i++)for(let j=0;j<2;j++)for(let k=0;k<2;k++)d.values[`${i}:${j}:${k}`]=String([10,20,30][i]+[-1,1][j]+[[-.5,.5],[0,0],[.5,-.5]][i][j]+[-.2,.2][k]);
   s.meta.project='Numerical validation';s.meta.part='00123';s.tools.dfmea.rows[0]={item:'=1+1',severity:'8',occurrence:'4',detection:'3',severityAfter:'8',occurrenceAfter:'2',detectionAfter:'2',due:'2026-10-10'};
   s.tools.ppap.rows[0].status='done';s.tools.ppap.rows[1].applicable='no';
   const c=QCalc.cep(s.tools.cep),m=QCalc.msa(d);return {c,m,s};
  }""")
  close(result['c']['mean'],50.81);close(result['c']['mrbar'],16.9/9);close(result['c']['ucl'],50.81+3*(16.9/9)/1.128)
  for a,b in zip(result['m']['ss'],[800,12,2,.48,814.48]):close(a,b)
  for a,b in zip(result['m']['components'],[.08,11/6,.46,11/6+.46,.08+11/6+.46,99.75,99.75+.08+11/6+.46]):close(a,b)
  page.on('dialog',lambda d:d.accept())
  page.locator('#projectFile').set_input_files({'name':'fixture.json','mimeType':'application/json','buffer':json.dumps(result['s']).encode()})
  page.wait_for_function("QualityApp.getState().meta.project==='Numerical validation'")
  # A genuine download through the app, not a separate workbook writer.
  with page.expect_download() as task: page.locator('#exportAll').click()
  full=OUT/'quality-filled.xlsx';task.value.save_as(full)
  sheets=xlsx(full);assert len(sheets)==14
  assert sheets['DFMEA']['L9']['formula'];close(float(sheets['DFMEA']['L9']['value']),96)
  assert sheets['DFMEA']['A9']['formula'] is None,'Text must never become a formula'
  close(float(sheets['SPC']['F8']['value']),50.81)
  close(float(sheets['MSA']['F12']['value']),800)
  formulas=sum(bool(c['formula']) for cells in sheets.values() for c in cells.values());assert formulas>150,formulas
  assert not any(c['type']=='e' for cells in sheets.values() for c in cells.values())
  expected={name:{addr:float(c['value']) for addr,c in cells.items() if c['formula'] and c['value'] is not None and c['type'] not in ['str','s'] and c['value']!=''} for name,cells in sheets.items()}
  (OUT/'expected.json').write_text(json.dumps(expected),encoding='utf-8')
  # Real edits, RPN update, invalid rating, persistence and language-independent data.
  page.locator('a[href="#dfmea"]').click();page.locator('[data-row="0"][data-key="occurrence"]').fill('5');page.locator('#toolTitle').click()
  assert page.locator('[data-output="0:rpn"]').inner_text()=='120'
  page.locator('[data-row="0"][data-key="severity"]').fill('11');page.locator('#toolTitle').click();assert page.locator('[data-row="0"][data-key="severity"]').input_value()=='8'
  page.wait_for_timeout(300);page.reload();assert page.locator('[data-output="0:rpn"]').inner_text()=='120'
  page.locator('a[href="#cep"]').click();paste(page,'[data-cvalue="0"]','1,5\n2,5\n3,5');assert page.locator('[data-cvalue="1"]').input_value()=='2.5'
  # Edge cases: zero variation, internal blanks, zero as a real observation and incomplete MSA.
  edge=page.evaluate("""()=>{const c=rows=>QCalc.cep({rows:rows.map(value=>({value})),lsl:0,usl:10});const d=QModels.makeState().tools.msa;return {zero:c([2,2,2]),gaps:c([1,'',3]),realZero:c([0,1,2]),msa:QCalc.msa(d),bad:QCalc.rpn({severity:2.5,occurrence:3,detection:4})};}""")
  assert edge['zero']['cp'] is None and edge['gaps']['sigma'] is None and edge['realZero']['n']==3 and not edge['msa']['complete'] and edge['bad'] is None
  page.locator('a[href="#msa"]').click();paste(page,'[data-mvalue="0:0:0"]','0\t0.5\n1\t1.5');assert page.locator('[data-mvalue="0:0:0"]').input_value()=='0'
  # Blank workbook must have formulas ready for later input without cached errors.
  page.locator('.project-panel summary').click();page.locator('#newProject').click()
  with page.expect_download() as task:page.locator('#exportAll').click()
  blank=OUT/'quality-blank.xlsx';task.value.save_as(blank);bl=xlsx(blank)
  assert bl['DFMEA']['L9']['formula'] and bl['SPC']['F15']['formula'] and bl['MSA']['F23']['formula']
  assert not any(c['type']=='e' for cells in bl.values() for c in cells.values())
  # Validation rejects malformed import before replacing any current data.
  assert page.evaluate("()=>{try{QualityApp.validate({version:1,meta:{},tools:{}});return false}catch{return true}}")
  for code in page.evaluate('Object.keys(QTranslations)'):
   page.locator('#language').select_option(code)
   for tool in ['ppap','dfmea','cep','msa','why','ishikawa']:
    page.locator(f'a[href="#{tool}"]').click()
    for width,height in [(1440,1000),(390,844),(320,740)]:
     page.set_viewport_size({'width':width,'height':height})
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(code,tool,width)
   page.set_viewport_size({'width':1440,'height':1000})
  page.locator('#language').select_option('pt-BR');page.locator('a[href="#ppap"]').click();page.screenshot(path=str(OUT/'quality-light.png'),full_page=True)
  page.locator('#themeToggle').click();assert page.locator('html').get_attribute('data-theme')=='dark';page.reload();assert page.locator('html').get_attribute('data-theme')=='dark'
  page.screenshot(path=str(OUT/'quality-dark.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'quality-mobile.png'),full_page=True)
  assert not errors,errors
  browser.close()
  print(f'PASS: model edits, numeric fixtures, persistence, paste, input validation, themes, responsive locales, XLSX downloads with {formulas} formulas.')
  print('Artifacts:',OUT)
finally:server.shutdown()
