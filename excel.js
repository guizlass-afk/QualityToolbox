(() => {
'use strict';
const letter=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
const value=v=>v===null||v===undefined?'':v;
async function buildWorkbook(state,t,resolve,only=null){
 const wb=new ExcelJS.Workbook();wb.creator='Quality ToolBox';wb.created=new Date();wb.calcProperties.fullCalcOnLoad=true;
 const formula=(ws,addr,f,cached,format='0.0000')=>{const c=ws.getCell(addr);c.value={formula:f,result:value(cached)};c.numFmt=format;c.font={name:'Calibri',size:11,color:{argb:'FF08796F'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEAF6F1'}};return c;};
 const input=(ws,addr,v,type='text')=>{const c=ws.getCell(addr);c.value=v===''||v===null||v===undefined?null:type==='number'||type==='rating'?QCalc.num(v):type==='date'?new Date(v+'T12:00:00Z'):resolve(String(v));c.font={name:'Calibri',size:11,color:{argb:'FF2155A3'}};c.alignment={vertical:'top',wrapText:true};if(type==='date')c.numFmt='yyyy-mm-dd';if(type==='number')c.numFmt='0.0000';if(type==='rating')c.dataValidation={type:'whole',operator:'between',allowBlank:true,formulae:[1,10],showErrorMessage:true,errorStyle:'stop',error:t('invalidNumber')};return c;};
 const heading=(ws,row,labels)=>{labels.forEach((label,i)=>{const c=ws.getCell(row,i+1);c.value=label;c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF193845'}};c.alignment={wrapText:true,vertical:'middle'};});ws.getRow(row).height=32;};
 const sheet=(name,title,desc,cols=8,note='')=>{
  const ws=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:7}],pageSetup:{orientation:'landscape',paperSize:cols>12?8:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
  ws.properties.defaultRowHeight=24;for(let i=1;i<=cols;i++)ws.getColumn(i).width=23;
  [[1,title],[2,desc],[3,QModels.meta.filter(k=>state.meta[k]&&k!=='criteria').map(k=>t(k)+': '+state.meta[k]).join(' · ')],[4,t('criteria')+': '+(state.meta.criteria||'')],[5,note||t('formulaNote')]].forEach(([r,txt])=>{ws.mergeCells(r,1,r,cols);ws.getCell(r,1).value=txt;ws.getCell(r,1).alignment={wrapText:true,vertical:'middle'};});
  ws.getRow(1).height=34;ws.getCell('A1').font={name:'Calibri',size:20,bold:true,color:{argb:'FF193845'}};ws.getRow(2).height=32;ws.getRow(3).height=42;ws.getRow(4).height=32;ws.getRow(5).height=note?76:28;ws.pageSetup.printTitlesRow='1:7';return ws;
 };
 const pair=(ws,r,label,v,col=1,type='text')=>{ws.getCell(r,col).value=t(label);input(ws,letter(col+1)+r,v,type);};
 function generic(tool){
  const data=state.tools[tool.id];const ws=sheet(tool.id.toUpperCase(),t(tool.title),t(tool.desc),tool.columns.length,tool.id.endsWith('fmea')?t('fmeaNote'):t('scopeNote'));
  let header=8;
  if(tool.fields){for(const k of tool.fields){ws.getCell(header,1).value=t(k);ws.mergeCells(header,2,header,Math.max(2,tool.columns.length));input(ws,'B'+header,data.fields[k]||'');ws.getRow(header).height=44;header++;}header++;}
  heading(ws,header,tool.columns.map(c=>t(c.label)));
  const start=header+1,end=start+data.rows.length-1;
  data.rows.forEach((row,i)=>{const r=start+i;ws.getRow(r).height=54;tool.columns.forEach((c,j)=>{
   const addr=letter(j+1)+r;
   if(c.type==='computed'){
    const after=c.key==='rpnAfter',keys=after?['severityAfter','occurrenceAfter','detectionAfter']:['severity','occurrence','detection'];
    const refs=keys.map(k=>letter(tool.columns.findIndex(x=>x.key===k)+1)+r);const args=refs.join(',');
    formula(ws,addr,`IF(AND(COUNT(${args})=3,MIN(${args})>=1,MAX(${args})<=10,${refs.map(x=>`${x}=INT(${x})`).join(',')}),${refs.join('*')},"")`,QCalc.rpn(row,after),'0');
   }else if(c.type==='select'){
    const cell=input(ws,addr,row[c.key]?t(row[c.key]):'');
    const list=c.options.map(t).join(',');if(list.length<250)cell.dataValidation={type:'list',allowBlank:true,formulae:['"'+list+'"'],showErrorMessage:true,errorStyle:'stop'};
   }else input(ws,addr,row[c.key]||'',c.type);
  });});
  if(data.rows.length){ws.autoFilter={from:{row:header,column:1},to:{row:end,column:tool.columns.length}};}
  ws.views=[{state:'frozen',ySplit:header,xSplit:1}];
  if(['ppap','apqp'].includes(tool.id)){
   const r=end+3;ws.getCell(r,1).value=t('progress');let result=null,f='""';
   if(data.rows.length){const sc=letter(tool.columns.findIndex(x=>x.key==='status')+1),range=`${sc}${start}:${sc}${end}`;const done=t('done').replaceAll('"','""');
    if(tool.id==='ppap'){const ac=letter(tool.columns.findIndex(x=>x.key==='applicable')+1),ar=`${ac}${start}:${ac}${end}`,yes=t('yes').replaceAll('"','""');const n=data.rows.filter(x=>x.applicable==='yes').length;result=n?data.rows.filter(x=>x.applicable==='yes'&&x.status==='done').length/n:null;f=`IF(COUNTIF(${ar},"${yes}")=0,"",COUNTIFS(${ar},"${yes}",${range},"${done}")/COUNTIF(${ar},"${yes}"))`;}
    else{result=data.rows.filter(x=>x.status==='done').length/data.rows.length;f=`COUNTIF(${range},"${done}")/ROWS(${range})`;}}
   formula(ws,'B'+r,f,result,'0.0%');
  }
 }
 function cep(){
  const d=state.tools.cep,c=QCalc.cep(d),ws=sheet('SPC',t('cep'),t('cepDesc'),9,t('cepNote'));
  pair(ws,7,'lsl',d.lsl,1,'number');pair(ws,8,'usl',d.usl,1,'number');pair(ws,9,'constants',1.128,1,'number');ws.getCell('A9').value='d₂ (n=2)';pair(ws,10,'constants',3.267,1,'number');ws.getCell('A10').value='D₄ (n=2)';pair(ws,11,'constants',3,1,'number');ws.getCell('A11').value='k · σ';pair(ws,12,'constants',6,1,'number');ws.getCell('A12').value='k · '+t('studyVariation');pair(ws,14,'characteristic',d.characteristic);pair(ws,15,'unit',d.unit);
  const start=22,end=start+d.rows.length-1,b=`B${start}:B${end}`,mr=`C${start}:C${end}`;
  const specs='AND(COUNT($B$7:$B$8)=2,$B$8>$B$7)';
  const metrics=[['count',`COUNT(${b})`,c.n,'0'],['mean',`IF(F7>0,AVERAGE(${b}),"")`,c.mean],['mrbar',`IF(AND(F7>1,ISNUMBER(B22),COUNT(${mr})=F7-1),AVERAGE(${mr}),"")`,c.mrbar],['sigma','IF(ISNUMBER(F9),F9/$B$9,"")',c.sigma],['sd',`IF(F7>1,STDEV(${b}),"")`,c.sd],['ucl','IF(ISNUMBER(F10),F8+$B$11*F10,"")',c.ucl],['lcl','IF(ISNUMBER(F10),F8-$B$11*F10,"")',c.lcl],['mrucl','IF(ISNUMBER(F9),$B$10*F9,"")',c.mrucl],['cp',`IF(AND(${specs},ISNUMBER(F10),F10>0),($B$8-$B$7)/($B$12*F10),"")`,c.cp],['cpk',`IF(AND(${specs},ISNUMBER(F10),F10>0),MIN($B$8-F8,F8-$B$7)/($B$11*F10),"")`,c.cpk],['pp',`IF(AND(${specs},ISNUMBER(F11),F11>0),($B$8-$B$7)/($B$12*F11),"")`,c.pp],['ppk',`IF(AND(${specs},ISNUMBER(F11),F11>0),MIN($B$8-F8,F8-$B$7)/($B$11*F11),"")`,c.ppk]];
  metrics.forEach(([k,f,v,fmt],i)=>{ws.getCell(i+7,5).value=t(k);formula(ws,'F'+(i+7),f,v,fmt);});
  heading(ws,21,['#',t('value'),t('movingRange'),t('note'),t('mean'),t('lcl'),t('ucl'),t('mrucl'),t('outside')]);
  d.rows.forEach((row,i)=>{const r=start+i;ws.getCell(r,1).value=i+1;input(ws,'B'+r,row.value,'number');input(ws,'D'+r,row.note);if(i)formula(ws,'C'+r,`IF(COUNT(B${r-1}:B${r})=2,ABS(B${r}-B${r-1}),"")`,c.mr[i]);for(const [col,ref,key]of [['E','$F$8','mean'],['F','$F$13','lcl'],['G','$F$12','ucl'],['H','$F$14','mrucl']])formula(ws,col+r,`IF(AND(ISNUMBER(B${r}),ISNUMBER(${ref})),${ref},"")`,c.values[i]===null?null:c[key]);formula(ws,'I'+r,`IF(AND(ISNUMBER(B${r}),ISNUMBER($F$12)),IF(OR(B${r}<$F$13,B${r}>$F$12),"!",""),"")`,c.outside.includes(i+1)?'!':'','General');});
  ws.views=[{state:'frozen',ySplit:21}];
 }
 function msa(){
  const d=state.tools.msa,c=QCalc.msa(d),p=d.parts,o=d.operators,r=d.trials,n=p*o*r;
  const ws=sheet('MSA','MSA',t('msaDesc'),9,t('msaNote')),raw=sheet('MSA Data',t('measurement'),t('msaDesc'),4),means=sheet('MSA Means',t('mean'),t('msaNote'),7),factors=sheet('MSA Factors',t('source'),t('msaNote'),7);
  for(const [row,k,v]of [[7,'parts',p],[8,'operators',o],[9,'trials',r],[10,'lsl',d.lsl],[11,'usl',d.usl],[12,'studyVariation',6],[13,'ndc',1.41]])pair(ws,row,k,v,1,'number');
  ws.getCell('A12').value='k · '+t('studyVariation');ws.getCell('A13').value='k · ndc';pair(ws,27,'characteristic',d.characteristic);pair(ws,28,'gauge',d.gauge);pair(ws,29,'unit',d.unit);
  const range=`'MSA Data'!D8:D${7+n}`,complete='$F$7=$B$7*$B$8*$B$9';
  ws.getCell('E7').value=t('count');formula(ws,'F7',`COUNT(${range})`,c.count,'0');ws.getCell('E8').value=t('mean');formula(ws,'F8',`IF(${complete},AVERAGE(${range}),"")`,c.mean);
  heading(raw,7,[t('part'),t('operator'),t('trial'),t('value')]);heading(means,7,[t('part'),t('operator'),t('mean'),t('partVar'),t('operatorVar'),t('interaction'),t('repeatability')]);heading(factors,7,[t('part'),t('mean'),t('ss'),'',t('operator'),t('mean'),t('ss')]);
  for(let i=0;i<p;i++)for(let j=0;j<o;j++){
   const g=8+i*o+j,start=8+(i*o+j)*r,end=start+r-1,gr=`'MSA Data'!D${start}:D${end}`;
   for(let k=0;k<r;k++){raw.getCell(start+k,1).value=i+1;raw.getCell(start+k,2).value=j+1;raw.getCell(start+k,3).value=k+1;input(raw,'D'+(start+k),d.values[`${i}:${j}:${k}`],'number');}
   means.getCell(g,1).value=i+1;means.getCell(g,2).value=j+1;
   const guard="'MSA'!$F$7='MSA'!$B$7*'MSA'!$B$8*'MSA'!$B$9";
   formula(means,'C'+g,`IF(${guard},AVERAGE(${gr}),"")`,c.complete?c.cm[i][j]:null);
   formula(means,'D'+g,`IF(ISNUMBER(C${g}),'MSA Factors'!B${8+i},"")`,c.complete?c.pm[i]:null);
   formula(means,'E'+g,`IF(ISNUMBER(C${g}),'MSA Factors'!F${8+j},"")`,c.complete?c.om[j]:null);
   formula(means,'F'+g,`IF(ISNUMBER(C${g}),'MSA'!$B$9*(C${g}-D${g}-E${g}+'MSA'!$F$8)^2,"")`,c.complete?r*(c.cm[i][j]-c.pm[i]-c.om[j]+c.mean)**2:null);
   formula(means,'G'+g,`IF(ISNUMBER(C${g}),DEVSQ(${gr}),"")`,c.complete?QCalc.sum(Array.from({length:r},(_,k)=>(QCalc.num(d.values[`${i}:${j}:${k}`])-c.cm[i][j])**2)):null);
  }
  const guard="'MSA'!$F$7='MSA'!$B$7*'MSA'!$B$8*'MSA'!$B$9";
  for(let i=0;i<p;i++){const rr=8+i;factors.getCell(rr,1).value=i+1;formula(factors,'B'+rr,`IF(${guard},AVERAGEIF('MSA Data'!A8:A${7+n},A${rr},${range}),"")`,c.complete?c.pm[i]:null);formula(factors,'C'+rr,`IF(ISNUMBER(B${rr}),'MSA'!$B$8*'MSA'!$B$9*(B${rr}-'MSA'!$F$8)^2,"")`,c.complete?o*r*(c.pm[i]-c.mean)**2:null);}
  for(let j=0;j<o;j++){const rr=8+j;factors.getCell(rr,5).value=j+1;formula(factors,'F'+rr,`IF(${guard},AVERAGEIF('MSA Data'!B8:B${7+n},E${rr},${range}),"")`,c.complete?c.om[j]:null);formula(factors,'G'+rr,`IF(ISNUMBER(F${rr}),'MSA'!$B$7*'MSA'!$B$9*(F${rr}-'MSA'!$F$8)^2,"")`,c.complete?p*r*(c.om[j]-c.mean)**2:null);}
  // Operator identifiers and editable names remain separate from the numeric factor codes.
  raw.getCell(9+n,1).value=t('operators');for(let j=0;j<o;j++){raw.getCell(10+n+j,1).value=j+1;input(raw,'B'+(10+n+j),d.operatorNames[j]||'');}
  ['source','ss','df','ms'].forEach((k,i)=>{ws.getCell(11,5+i).value=t(k);});
  const ssf=[`SUM('MSA Factors'!C8:C${7+p})`,`SUM('MSA Factors'!G8:G${7+o})`,`SUM('MSA Means'!F8:F${7+p*o})`,`SUM('MSA Means'!G8:G${7+p*o})`,`DEVSQ(${range})`];const dff=['$B$7-1','$B$8-1','($B$7-1)*($B$8-1)','$B$7*$B$8*($B$9-1)','$B$7*$B$8*$B$9-1'];
  ['partVar','operatorVar','interaction','repeatability','total'].forEach((k,i)=>{const rr=12+i;ws.getCell(rr,5).value=t(k);formula(ws,'F'+rr,`IF(${complete},${ssf[i]},"")`,c.complete?c.ss[i]:null);formula(ws,'G'+rr,dff[i],[p-1,o-1,(p-1)*(o-1),p*o*(r-1),n-1][i],'0');if(i<4)formula(ws,'H'+rr,`IF(ISNUMBER(F${rr}),F${rr}/G${rr},"")`,c.complete?c.ms[i]:null);});
  ['source','variance','sigma','studyVariation','contribution'].forEach((k,i)=>ws.getCell(18,5+i).value=i===2?'σ':i===4?'% '+t('variance'):t(k));
  const vf=['H15','MAX(0,(H13-H14)/($B$7*$B$9))','MAX(0,(H14-H15)/$B$9)','F20+F21','F19+F22','MAX(0,(H12-H14)/($B$8*$B$9))','F23+F24'];
  ['repeatability','operatorVar','interaction','reproducibility','grr','partVar','total'].forEach((k,i)=>{const rr=19+i,cv=c.complete?c.components[i]:null;ws.getCell(rr,5).value=t(k);formula(ws,'F'+rr,`IF(${complete},${vf[i]},"")`,cv);formula(ws,'G'+rr,`IF(ISNUMBER(F${rr}),SQRT(F${rr}),"")`,cv===null?null:Math.sqrt(cv));formula(ws,'H'+rr,`IF(ISNUMBER(G${rr}),$B$12*G${rr},"")`,cv===null?null:6*Math.sqrt(cv));formula(ws,'I'+rr,`IF(AND(ISNUMBER(F${rr}),$F$25>0),F${rr}/$F$25,"")`,c.complete&&c.components[6]>0?cv/c.components[6]:null,'0.0%');});
  for(const [rr,key,f,v,fmt]of [[16,'grrPercent','IF(AND(ISNUMBER(G23),G25>0),G23/G25,"")',c.grrPercent===null||!c.complete?null:c.grrPercent/100,'0.0%'],[17,'contribution','IF(AND(ISNUMBER(F23),F25>0),F23/F25,"")',c.contribution===null||!c.complete?null:c.contribution/100,'0.0%'],[18,'tolerancePercent','IF(AND(ISNUMBER(G23),COUNT(B10:B11)=2,B11>B10),$B$12*G23/(B11-B10),"")',c.tolerancePercent===null||!c.complete?null:c.tolerancePercent/100,'0.0%'],[19,'ndc','IF(AND(ISNUMBER(G24),G23>0),INT($B$13*G24/G23),"")',c.ndc,'0']]){ws.getCell(rr,1).value=t(key);formula(ws,'B'+rr,f,v,fmt);}
 }
 const cover=sheet('Project','Quality ToolBox',t('formulaNote'),5,t('scopeNote'));
 QModels.meta.forEach((key,i)=>pair(cover,8+i,key,state.meta[key]||''));
 let rr=18;for(const key of ['fmeaNote','cepNote','msaNote']){cover.mergeCells(rr,1,rr,5);cover.getCell(rr,1).value=t(key);cover.getCell(rr,1).alignment={wrapText:true,vertical:'top'};cover.getRow(rr).height=105;rr++;}
 for(const [name,url]of [['AIAG Core Tools','https://www.aiag.org/expertise-areas/quality/quality-core-tools'],['NIST I-MR','https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm'],['NIST Capability','https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm'],['NIST MSA','https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc4.htm']]){cover.getCell(rr,1).value=name;cover.mergeCells(rr,2,rr,5);cover.getCell(rr,2).value={text:url,hyperlink:url};rr++;}
 for(const tool of QModels.tools.filter(x=>!only||x.id===only)){if(tool.id==='cep')cep();else if(tool.id==='msa')msa();else generic(tool);}
 wb.eachSheet(ws=>{ws.eachRow(row=>row.eachCell(cell=>{cell.alignment={...cell.alignment,vertical:'top',wrapText:true};}));ws.headerFooter.oddFooter='Quality ToolBox — &P / &N';});
 return wb;
}
window.QExcel={buildWorkbook};
})();
