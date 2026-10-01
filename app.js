(() => {
'use strict';
const $=id=>document.getElementById(id),storageKey='qualitytoolbox-project-v1',models=QModels.tools;
let lang='pt-BR';try{const saved=localStorage.getItem('qualitytoolbox-language')||localStorage.getItem('factorytoolbox-language');if(QTranslations[saved])lang=saved;else if(saved)lang='en-US';}catch{}
const t=key=>QTranslations[lang]?.[key]??QTranslations['en-US'][key]??key;
const resolve=v=>typeof v==='string'&&v[0]==='@'&&QTranslations['en-US'][v.slice(1)]?t(v.slice(1)):v;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=3)=>v===null||v===undefined||!Number.isFinite(v)?'—':v.toLocaleString(lang,{maximumFractionDigits:d});
const txt=v=>typeof v==='string'&&v.length<=20000?v:typeof v==='number'&&Number.isFinite(v)?String(v):(()=>{throw Error('Invalid value');})();
function currentUnit(){return document.documentElement.dataset.unit==='in'?'in':'mm';}
let displayUnit=currentUnit();
function convertUnit(value,from,to){if(!Number.isFinite(value)||from===to)return value;const mm=from==='in'?value*25.4:value;return to==='in'?mm/25.4:mm;}
function normalizeSpecialUnit(d){
 const sourceUnit=d.unit==='in'?'in':'mm';
 if(sourceUnit!==displayUnit){
  const convert=raw=>{const v=QCalc.num(raw);return v===null||v===undefined?raw:String(convertUnit(v,sourceUnit,displayUnit));};
  d.lsl=convert(d.lsl);d.usl=convert(d.usl);
  if(d.rows)d.rows.forEach(row=>{row.value=convert(row.value);});
  if(d.values)for(const key of Object.keys(d.values))d.values[key]=convert(d.values[key]);
 }
 d.unit=displayUnit;
}
function syncSpecialUnits(s){normalizeSpecialUnit(s.tools.cep);normalizeSpecialUnit(s.tools.msa);return s;}
function validate(raw){
 if(!raw||raw.version!==1||!raw.meta||!raw.tools)throw Error('Invalid project');const clean=QModels.makeState();
 for(const k of QModels.meta)if(raw.meta[k]!==undefined)clean.meta[k]=txt(raw.meta[k]);
 if(models.some(x=>x.id===raw.active))clean.active=raw.active;
 for(const tool of models){const d=raw.tools[tool.id];if(!d||typeof d!=='object')throw Error('Missing tool');
  if(tool.id==='cep'){
   if(!Array.isArray(d.rows)||!d.rows.length||d.rows.length>500)throw Error('Rows');
   for(const k of ['characteristic','unit','lsl','usl'])clean.tools.cep[k]=txt(d[k]??'');
   clean.tools.cep.rows=d.rows.map(row=>{if(!row||typeof row!=='object')throw Error('Row');const value=txt(row.value??'');if(value!==''&&QCalc.num(value)===null)throw Error('Number');return {value,note:txt(row.note??'')};});
  }else if(tool.id==='msa'){
   for(const [k,min,max]of [['parts',2,30],['operators',2,5],['trials',2,5]])if(!Number.isInteger(d[k])||d[k]<min||d[k]>max)throw Error('Design');
   const v=clean.tools.msa;for(const k of ['parts','operators','trials'])v[k]=d[k];for(const k of ['characteristic','gauge','unit','lsl','usl'])v[k]=txt(d[k]??'');
   if(!d.values||typeof d.values!=='object')throw Error('Values');
   for(let i=0;i<v.parts;i++)for(let j=0;j<v.operators;j++)for(let k=0;k<v.trials;k++){const key=`${i}:${j}:${k}`,a=txt(d.values[key]??'');if(a!==''&&QCalc.num(a)===null)throw Error('Number');v.values[key]=a;}
   for(let j=0;j<v.operators;j++)v.operatorNames[j]=txt(d.operatorNames?.[j]??'');
  }else{
   if(!Array.isArray(d.rows)||!d.rows.length||d.rows.length>500)throw Error('Rows');
   clean.tools[tool.id].rows=d.rows.map(row=>{if(!row||typeof row!=='object')throw Error('Row');const result={};for(const c of tool.columns){if(c.type==='computed')continue;const v=txt(row[c.key]??'');if(c.type==='rating'&&v!==''&&QCalc.rating(v)===null)throw Error('Rating');if(c.type==='select'&&v!==''&&!c.options.includes(v))throw Error('Option');if(c.type==='date'&&v!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Date');result[c.key]=v;}return result;});
   for(const k of tool.fields||[])clean.tools[tool.id].fields[k]=txt(d.fields?.[k]??'');
  }
  if(tool.special)for(const k of ['lsl','usl'])if(clean.tools[tool.id][k]!==''&&QCalc.num(clean.tools[tool.id][k])===null)throw Error('Specification');
 }return clean;
}
let state=QModels.makeState(),loadError=false;try{const saved=localStorage.getItem(storageKey);if(saved)state=validate(JSON.parse(saved));}catch{loadError=true;}
syncSpecialUnits(state);
window.addEventListener('pagehide',()=>{if(!loadError)try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}});
let saveTimer;function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));$('saveState').textContent=t('saved');}catch{$('saveState').textContent=t('saveFailed');}},200);}
function toast(message){$('toast').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{$('toast').textContent='';},6000);}
function input(label,key,value,attrs=''){return `<label>${esc(t(label))}<input data-setting="${esc(key)}" value="${esc(value)}" ${attrs}></label>`;}
function renderMeta(){ $('metadata').innerHTML=QModels.meta.map(k=>`<label>${esc(t(k))}<${k==='criteria'?'textarea':'input'} data-meta="${k}" ${k==='date'?'type="date"':''} ${k==='criteria'?'':`value="${esc(state.meta[k]||'')}"`}>${k==='criteria'?esc(state.meta[k]||'')+'</textarea>':''}</label>`).join('');$('projectName').textContent=state.meta.project||'';}
function applyLanguage(code){if(!QTranslations[code])return;lang=code;document.documentElement.lang=lang;document.documentElement.dir=lang==='ar-SA'?'rtl':'ltr';$('language').value=lang;$('languageFlag').src='flags/'+$('language').selectedOptions[0].dataset.flag+'.svg';document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));$('toolNav').setAttribute('aria-label',t('workbench'));$('closeMethods').setAttribute('aria-label',t('close'));try{localStorage.setItem('qualitytoolbox-language',lang);}catch{}renderMeta();render();}
function fieldsHTML(keys,d){return `<div class="form-grid">${keys.map(k=>`<label>${esc(t(k))}<${k==='due'?'input':'textarea'} data-field="${k}" ${k==='due'?`type="date" value="${esc(d[k]||'')}"`:''}>${k==='due'?'':esc(d[k]||'')+'</textarea>'}</label>`).join('')}</div>`;}
function cellHTML(c,row,i){const common=`data-row="${i}" data-key="${c.key}" aria-label="${esc(t(c.label))} ${i+1}"`;if(c.type==='computed')return `<output data-output="${i}:${c.key}">${fmt(QCalc.rpn(row,c.key==='rpnAfter'),0)}</output>`;
 if(c.type==='select')return `<select ${common}><option value="">—</option>${c.options.map(v=>`<option value="${v}" ${row[c.key]===v?'selected':''}>${esc(t(v))}</option>`).join('')}</select>`;
 if(['rating','date'].includes(c.type))return `<input ${common} type="${c.type==='date'?'date':'number'}" ${c.type==='rating'?'min="1" max="10" step="1"':''} value="${esc(row[c.key]||'')}">`;
 return `<textarea ${common} rows="2">${esc(resolve(row[c.key]||''))}</textarea>`;
}
function render(){
 const tool=models.find(x=>x.id===state.active)||models[0];state.active=tool.id;
 $('toolNav').innerHTML=models.map(x=>`<a href="#${x.id}" ${x.id===tool.id?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${x.icon}</span>${esc(t(x.title))}</a>`).join('');
 $('toolTitle').textContent=t(tool.title);$('toolDescription').textContent=t(tool.desc);document.title=t(tool.title)+' · Quality ToolBox';
 if(tool.id==='cep')renderCEP();else if(tool.id==='msa')renderMSA();else{
  const d=state.tools[tool.id];$('content').innerHTML=`${tool.id.endsWith('fmea')?`<p class="method-note">${esc(t('fmeaNote'))}</p>`:''}${tool.fields?`<section class="panel">${fieldsHTML(tool.fields,d.fields)}</section>`:''}<div id="results"></div><section class="panel table-panel"><div class="panel-head"><div><h2>${esc(t('model'))}</h2><p>${esc(t('inputsHint'))}</p></div><button data-add class="secondary">${esc(t('addRow'))}</button></div><div class="table-scroll" tabindex="0" role="region" aria-label="${esc(t(tool.title))}"><table><thead><tr>${tool.columns.map(c=>`<th class="${c.type==='rating'?'rating':''}">${esc(t(c.label))}</th>`).join('')}<th>${esc(t('delete'))}</th></tr></thead><tbody>${d.rows.map((row,i)=>`<tr>${tool.columns.map(c=>`<td>${cellHTML(c,row,i)}</td>`).join('')}<td><button class="delete-row" data-delete="${i}" aria-label="${esc(t('delete'))} ${i+1}">×</button></td></tr>`).join('')}</tbody></table></div></section><div id="diagram"></div>`;updateResults();
 }
}
function metric(key,value,suffix=''){return `<div class="metric"><span>${esc(t(key))}</span><strong>${fmt(value)}${value!==null&&value!==undefined?suffix:''}</strong></div>`;}
function updateResults(){const id=state.active,d=state.tools[id];if(id==='cep'){cepResults();return;}if(id==='msa'){msaResults();return;}
 if(id.endsWith('fmea'))d.rows.forEach((row,i)=>{for(const k of ['rpn','rpnAfter']){const node=document.querySelector(`[data-output="${i}:${k}"]`);if(node)node.textContent=fmt(QCalc.rpn(row,k==='rpnAfter'),0);}});
 if(id==='ppap'||id==='apqp'){const applicable=id==='ppap'?d.rows.filter(x=>x.applicable==='yes'):d.rows;const done=applicable.filter(x=>x.status==='done').length;const percent=applicable.length?100*done/applicable.length:null;$('results').innerHTML=`<div class="progress-panel"><div><span>${esc(t('progress'))}</span><strong>${done} / ${applicable.length}</strong></div><progress max="100" value="${percent||0}"></progress><span>${fmt(percent,0)}%</span></div>`;}
 if(id==='ishikawa')fishbone();if(id==='flow')flow();
}
function renderCEP(){const d=state.tools.cep;$('content').innerHTML=`<section class="panel"><div class="form-grid compact">${input('characteristic','characteristic',d.characteristic)}${input('unit','unit',d.unit,'readonly')}${input('lsl','lsl',d.lsl,'inputmode="decimal" data-numeric')}${input('usl','usl',d.usl,'inputmode="decimal" data-numeric')}</div><p class="method-note">${esc(t('cepNote'))}</p></section><div id="results"></div><div class="charts"><section class="panel"><h2>${esc(t('individuals'))}</h2><div id="ichart"></div></section><section class="panel"><h2>${esc(t('movingRange'))}</h2><div id="mrchart"></div></section></div><section class="panel table-panel"><div class="panel-head"><h2>${esc(t('measurement'))}</h2><button data-add>${esc(t('addRow'))}</button></div><p class="table-help">${esc(t('pasteHint'))}</p><div class="table-scroll"><table class="measure-table"><thead><tr><th>#</th><th>${esc(t('value'))}</th><th>${esc(t('movingRange'))}</th><th>${esc(t('note'))}</th><th>${esc(t('delete'))}</th></tr></thead><tbody>${d.rows.map((row,i)=>`<tr><th>${i+1}</th><td><input data-cvalue="${i}" inputmode="decimal" value="${esc(row.value)}" aria-label="${esc(t('value'))} ${i+1}"></td><td><output data-mr="${i}"></output></td><td><input data-cnote="${i}" value="${esc(row.note)}" aria-label="${esc(t('note'))} ${i+1}"></td><td><button data-delete="${i}" aria-label="${esc(t('delete'))} ${i+1}">×</button></td></tr>`).join('')}</tbody></table></div></section>`;cepResults();}
function cepResults(){const c=QCalc.cep(state.tools.cep),messages=[];if(c.gaps)messages.push(t('gaps'));if(c.invalidSpec)messages.push(t('invalidSpec'));if(c.n>0&&c.n<50)messages.push(t('preliminary'));if(c.sigma===0||c.sd===0)messages.push(t('zeroVariation'));if(c.n>1&&!c.gaps)messages.push(c.outside.length||c.mrOutside.length?`${t('outside')}: I [${c.outside.join(', ')}] · MR [${c.mrOutside.join(', ')}]`:t('noSignals'));
 $('results').innerHTML=`<div class="metrics">${['count','mean','mrbar','sigma','cp','cpk','pp','ppk'].map(k=>metric(k,k==='count'?c.n:c[k])).join('')}</div>${messages.map(s=>`<p class="notice">${esc(s)}</p>`).join('')}`;
 c.mr.forEach((v,i)=>{const el=document.querySelector(`[data-mr="${i}"]`);if(el)el.textContent=fmt(v);});chart('ichart',c.values,c.mean,c.lcl,c.ucl);chart('mrchart',c.mr,c.mrbar,0,c.mrucl);
}
function chart(id,values,center,lower,upper){const valid=values.filter(x=>x!==null);if(!valid.length){$(id).innerHTML=`<p class="empty">${esc(t('empty'))}</p>`;return;}const numbers=[...valid,...[center,lower,upper].filter(x=>x!==null&&x!==undefined)],lo=Math.min(...numbers),hi=Math.max(...numbers),margin=(hi-lo)*.1||Math.abs(hi)*.01||1,min=lo-margin,max=hi+margin,x=i=>52+i*480/Math.max(1,values.length-1),y=v=>185-(v-min)/(max-min)*160;
 let content='';for(let i=0;i<5;i++){const v=min+(max-min)*i/4;content+=`<path class="chart-grid" d="M52 ${y(v)}H540"/><text x="46" y="${y(v)+4}" text-anchor="end">${esc(fmt(v,2))}</text>`;}
 for(const [v,cl]of [[lower,'limit'],[upper,'limit'],[center,'center']])if(v!==null&&v!==undefined)content+=`<path class="${cl}" d="M52 ${y(v)}H540"/>`;
 let path='';values.forEach((v,i)=>{if(v===null)return;path+=(i&&values[i-1]!==null?'L':'M')+x(i)+' '+y(v)+' ';});content+=`<path class="series" d="${path}"/>`;
 values.forEach((v,i)=>{if(v===null)return;const out=upper!==undefined&&upper!==null&&(v>upper||v<lower);content+=`<circle class="${out?'signal':'point'}" cx="${x(i)}" cy="${y(v)}" r="${out?4:2.5}"><title>${i+1}: ${esc(fmt(v,6))}</title></circle>`;});content+=`<text x="52" y="209">1</text><text x="532" y="209" text-anchor="end">${values.length}</text>`;
 $(id).innerHTML=`<svg viewBox="0 0 560 220" role="img" aria-label="${esc($(id).previousElementSibling.textContent)}">${content}</svg><div class="chart-legend"><span>● ${esc(t('value'))}</span><span>— ${esc(t('mean'))}</span><span>┄ ${id==='ichart'?'±3σ':esc(t('mrucl'))}</span></div>`;
}
function renderMSA(){const d=state.tools.msa;const select=(key,max)=>`<label>${esc(t(key))}<select data-design="${key}">${Array.from({length:max-1},(_,i)=>`<option ${d[key]===i+2?'selected':''}>${i+2}</option>`).join('')}</select></label>`;
 let rows='';for(let i=0;i<d.parts;i++)for(let j=0;j<d.operators;j++)rows+=`<tr><th>${i+1}</th><th>${esc(d.operatorNames[j]||String(j+1))}</th>${Array.from({length:d.trials},(_,k)=>`<td><input inputmode="decimal" data-mvalue="${i}:${j}:${k}" value="${esc(d.values[`${i}:${j}:${k}`]??'')}" aria-label="${esc(t('part'))} ${i+1}, ${esc(t('operator'))} ${j+1}, ${esc(t('trial'))} ${k+1}"></td>`).join('')}</tr>`;
 $('content').innerHTML=`<section class="panel"><div class="form-grid compact">${select('parts',30)}${select('operators',5)}${select('trials',5)}${input('unit','unit',d.unit,'readonly')}${input('characteristic','characteristic',d.characteristic)}${input('gauge','gauge',d.gauge)}${input('lsl','lsl',d.lsl,'inputmode="decimal" data-numeric')}${input('usl','usl',d.usl,'inputmode="decimal" data-numeric')}${Array.from({length:d.operators},(_,j)=>`<label>${esc(t('operator'))} ${j+1}<input data-operator="${j}" value="${esc(d.operatorNames[j]||'')}"></label>`).join('')}</div><p class="method-note">${esc(t('msaNote'))}</p></section><div id="results"></div><section class="panel table-panel"><div class="panel-head"><h2>${esc(t('measurement'))}</h2></div><p class="table-help">${esc(t('pasteHint'))}</p><div class="table-scroll"><table class="measure-table"><thead><tr><th>${esc(t('part'))}</th><th>${esc(t('operator'))}</th>${Array.from({length:d.trials},(_,i)=>`<th>${esc(t('trial'))} ${i+1}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;msaResults();}
function msaResults(){const d=state.tools.msa,c=QCalc.msa(d);if(!c.complete){$('results').innerHTML=`<p class="notice">${esc(t('completeStudy'))} <strong>${c.count} / ${c.N}</strong></p>`;return;}
 const bad=QCalc.num(d.lsl)!==null&&QCalc.num(d.usl)!==null&&Number(d.usl)<=Number(d.lsl);
 $('results').innerHTML=`<div class="metrics">${['grrPercent','contribution','tolerancePercent','ndc'].map(k=>metric(k,c[k],k==='ndc'?'':'%')).join('')}</div>${c.truncated?`<p class="notice">${esc(t('truncated'))}</p>`:''}${bad?`<p class="notice">${esc(t('invalidSpec'))}</p>`:''}${c.components[6]===0?`<p class="notice">${esc(t('zeroVariation'))}</p>`:''}<section class="panel table-panel"><div class="panel-head"><h2>ANOVA</h2></div><div class="table-scroll"><table class="results-table"><thead><tr>${['source','ss','df','ms'].map(k=>`<th>${esc(t(k))}</th>`).join('')}</tr></thead><tbody>${['partVar','operatorVar','interaction','repeatability','total'].map((k,i)=>`<tr><th>${esc(t(k))}</th><td>${fmt(c.ss[i],6)}</td><td>${c.df[i]}</td><td>${i<4?fmt(c.ms[i],6):'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function fishbone(){const d=state.tools.ishikawa,cats=['people','machine','method6','material','measurement','environment'];let branches='';for(let i=0;i<6;i++){const x=70+(i%3)*270,top=i<3,yy=top?45:300;branches+=`<path d="M${x+40} ${top?85:275}L${x+140} 200"/><text class="fish-label" x="${x}" y="${yy}">${esc(t(cats[i]))}</text>`;const causes=d.rows.filter(r=>r.category===cats[i]&&r.cause).map(r=>r.cause);causes.slice(0,3).forEach((s,j)=>branches+=`<text x="${x}" y="${yy+(j+1)*22}">${esc(s.length>31?s.slice(0,29)+'…':s)}</text>`);}
 $('diagram').innerHTML=`<section class="panel"><h2>Ishikawa · 6M</h2><p class="muted">${esc(t('fishHint'))}</p><div class="fish-wrap"><svg viewBox="0 0 1040 420" role="img" aria-label="Ishikawa"><path d="M50 200H875m-15-8 15 8-15 8"/>${branches}<rect x="880" y="165" width="155" height="75" rx="10"/><text x="896" y="193">${esc(t('problem'))}</text><text x="896" y="218">${esc((d.fields.problem||'').slice(0,19))}</text></svg></div></section>`;
}
function flow(){const d=state.tools.flow;$('diagram').innerHTML=`<section class="panel"><h2>${esc(t('flow'))}</h2><p class="muted">${esc(t('flowHint'))}</p><div class="flow-preview">${d.rows.filter(r=>r.operation||r.step).map(r=>`<div class="flow-node ${r.stepType==='decision'?'decision':''}"><small>${esc(r.step||'')} · ${esc(t(r.stepType||'processType'))}</small><strong>${esc(r.operation||'—')}</strong><span>→ ${esc(r.nextStep||'—')}</span></div>`).join('')}</div></section>`;}
function normalize(value){const s=value.trim().replace(',','.');return s===''?'':QCalc.num(s)!==null?String(Number(s)):null;}
$('content').addEventListener('input',event=>{const el=event.target,d=state.tools[state.active];if(el.dataset.field){d.fields[el.dataset.field]=el.value;save();if(state.active==='ishikawa')fishbone();}else if(el.dataset.cnote!==undefined){d.rows[Number(el.dataset.cnote)].note=el.value;save();}else if(el.dataset.row!==undefined&&el.tagName==='TEXTAREA'){d.rows[Number(el.dataset.row)][el.dataset.key]=el.value;save();if(state.active==='ishikawa')fishbone();if(state.active==='flow')flow();}else if(el.dataset.setting&&!el.hasAttribute('data-numeric')){d[el.dataset.setting]=el.value;save();}});
$('content').addEventListener('change',event=>{const el=event.target,d=state.tools[state.active];
 if(el.dataset.design){const key=el.dataset.design,next=Number(el.value),previous=d[key];d[key]=next;const removed=Object.entries(d.values).filter(([k,v])=>{const [i,j,h]=k.split(':').map(Number);return v!==''&&(i>=d.parts||j>=d.operators||h>=d.trials);});if(removed.length&&!confirm(t('confirmResize'))){d[key]=previous;render();return;}for(const key of Object.keys(d.values)){const [i,j,h]=key.split(':').map(Number);if(i>=d.parts||j>=d.operators||h>=d.trials)delete d.values[key];}render();
 }else if(el.dataset.operator!==undefined){d.operatorNames[el.dataset.operator]=el.value;render();
 }else if(el.dataset.row!==undefined){const row=d.rows[Number(el.dataset.row)],col=models.find(x=>x.id===state.active).columns.find(x=>x.key===el.dataset.key);if(col.type==='rating'&&el.value!==''&&QCalc.rating(el.value)===null){toast(t('invalidNumber'));el.value=row[col.key]||'';return;}row[col.key]=el.value;updateResults();
 }else if(el.dataset.cvalue!==undefined||el.dataset.mvalue!==undefined||el.hasAttribute('data-numeric')){const v=normalize(el.value);if(v===null){toast(t('invalidNumber'));if(el.dataset.cvalue!==undefined)el.value=d.rows[Number(el.dataset.cvalue)].value;else if(el.dataset.mvalue!==undefined)el.value=d.values[el.dataset.mvalue]||'';else el.value=d[el.dataset.setting];return;}el.value=v;if(el.dataset.cvalue!==undefined)d.rows[Number(el.dataset.cvalue)].value=v;else if(el.dataset.mvalue!==undefined)d.values[el.dataset.mvalue]=v;else d[el.dataset.setting]=v;updateResults();}
 save();
});
$('content').addEventListener('paste',event=>{const el=event.target,raw=event.clipboardData.getData('text');if(!/[\n\t]/.test(raw)||(!el.hasAttribute('data-cvalue')&&!el.hasAttribute('data-mvalue')))return;event.preventDefault();const cells=raw.trim().split(/\r?\n/).map(line=>line.split('\t').map(normalize));if(cells.some(row=>row.some(v=>v===null))){toast(t('invalidNumber'));return;}const d=state.tools[state.active];if(el.dataset.cvalue!==undefined){const start=Number(el.dataset.cvalue);if(start+cells.length>500||cells.some(row=>row.length!==1)){toast(t('pasteError'));return;}while(d.rows.length<start+cells.length)d.rows.push({value:'',note:''});cells.forEach((row,i)=>d.rows[start+i].value=row[0]);}else{const [part,op,col]=el.dataset.mvalue.split(':').map(Number),start=part*d.operators+op;if(start+cells.length>d.parts*d.operators||cells.some(row=>row.length+col>d.trials)){toast(t('pasteError'));return;}cells.forEach((row,i)=>row.forEach((v,j)=>{const pos=start+i;d.values[`${Math.floor(pos/d.operators)}:${pos%d.operators}:${col+j}`]=v;}));}save();render();});
$('content').addEventListener('click',event=>{const add=event.target.closest('[data-add]'),del=event.target.closest('[data-delete]'),d=state.tools[state.active];if(add){if(d.rows.length>=500){toast(t('maxRows'));return;}d.rows.push(state.active==='cep'?{value:'',note:''}:{});save();render();const rows=$('content').querySelectorAll('tbody tr');rows[rows.length-1]?.querySelector('input,textarea,select')?.focus();}if(del&&confirm(t('confirmDelete'))){d.rows.splice(Number(del.dataset.delete),1);if(!d.rows.length)d.rows.push(state.active==='cep'?{value:'',note:''}:{});save();render();}});
$('metadata').addEventListener('input',event=>{const k=event.target.dataset.meta;if(k){state.meta[k]=event.target.value;$('projectName').textContent=state.meta.project||'';save();}});
$('language').addEventListener('change',()=>applyLanguage($('language').value));
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(models.some(x=>x.id===id)){state.active=id;render();save();}});
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const fileName=()=>('Quality-'+(state.meta.project||'ToolBox')).replace(/[^\p{L}\p{N}_. -]/gu,'_').slice(0,100);
async function exportExcel(only){document.activeElement?.blur();$('exportCurrent').disabled=$('exportAll').disabled=true;try{const wb=await QExcel.buildWorkbook(state,t,resolve,only);const bytes=await wb.xlsx.writeBuffer();download(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),fileName()+(only?'-'+only:'')+'.xlsx');toast(t('exported'));}catch(error){console.error(error);toast(t('exportError'));}finally{$('exportCurrent').disabled=$('exportAll').disabled=false;}}
$('exportCurrent').addEventListener('click',()=>exportExcel(state.active));$('exportAll').addEventListener('click',()=>exportExcel(null));
$('saveProject').addEventListener('click',()=>{document.activeElement?.blur();download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),fileName()+'.json');});
$('openProject').addEventListener('click',()=>$('projectFile').click());$('projectFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Large file');const parsed=validate(JSON.parse(await file.text()));if(confirm(t('confirmImport'))){state=syncSpecialUnits(parsed);history.replaceState(null,'','#'+state.active);renderMeta();render();save();toast(t('imported'));}}catch{toast(t('importError'));}event.target.value='';});
$('newProject').addEventListener('click',()=>{if(confirm(t('confirmNew'))){state=syncSpecialUnits(QModels.makeState());history.replaceState(null,'','#ppap');renderMeta();render();save();}});
$('methodsButton').addEventListener('click',()=>{$('methodsContent').innerHTML=['scopeNote','fmeaNote','cepNote','msaNote','formulaNote'].map(k=>`<p>${esc(t(k))}</p>`).join('')+'<ul><li><a target="_blank" rel="noopener" href="https://www.aiag.org/expertise-areas/quality/quality-core-tools">AIAG · Core Tools</a></li><li><a target="_blank" rel="noopener" href="https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm">NIST · I-MR</a></li><li><a target="_blank" rel="noopener" href="https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm">NIST · Capability</a></li><li><a target="_blank" rel="noopener" href="https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc4.htm">NIST · MSA</a></li></ul>';$('methodsDialog').showModal();});$('closeMethods').addEventListener('click',()=>$('methodsDialog').close());
document.addEventListener('unitchange',e=>{
 const next=e.detail.unit;if(next===displayUnit)return;
 displayUnit=next;
 normalizeSpecialUnit(state.tools.cep);normalizeSpecialUnit(state.tools.msa);
 save();
 if(state.active==='cep'||state.active==='msa')render();
});
const hash=location.hash.slice(1);if(models.some(x=>x.id===hash))state.active=hash;
applyLanguage(lang);$('saveState').textContent=loadError?t('importError'):t('local');
window.QualityApp={validate,getState:()=>structuredClone(state),convertUnit};
})();
