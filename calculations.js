(() => {
'use strict';
const num=v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sum=a=>a.reduce((s,x)=>s+x,0);
const rating=v=>{const n=num(v);return n!==null&&Number.isInteger(n)&&n>=1&&n<=10?n:null;};
function rpn(row,after=false){const keys=after?['severityAfter','occurrenceAfter','detectionAfter']:['severity','occurrence','detection'];const a=keys.map(k=>rating(row[k]));return a.some(v=>v===null)?null:a.reduce((a,b)=>a*b,1);}
function cep(data){
 const values=data.rows.map(r=>num(r.value));const filled=values.filter(v=>v!==null);
 const last=values.findLastIndex(v=>v!==null);const gaps=last>=0&&values.slice(0,last+1).some(v=>v===null);
 const mr=values.map((v,i)=>i&&v!==null&&values[i-1]!==null?Math.abs(v-values[i-1]):null);
 const mean=filled.length?avg(filled):null;
 const mrValid=mr.filter(v=>v!==null);const mrbar=mrValid.length&&!gaps?avg(mrValid):null;
 const sigma=mrbar===null?null:mrbar/1.128;
 const sd=filled.length>1?Math.sqrt(sum(filled.map(x=>(x-mean)**2))/(filled.length-1)):null;
 const lsl=num(data.lsl),usl=num(data.usl),spec=lsl!==null&&usl!==null&&usl>lsl;
 const limits=sigma!==null?{ucl:mean+3*sigma,lcl:mean-3*sigma,mrucl:3.267*mrbar}:{};
 const outside=values.flatMap((v,i)=>v!==null&&sigma!==null&&(v<limits.lcl||v>limits.ucl)?[i+1]:[]);
 const mrOutside=mr.flatMap((v,i)=>v!==null&&sigma!==null&&v>limits.mrucl?[i+1]:[]);
 return {values,mr,n:filled.length,gaps,mean,mrbar,sigma,sd,...limits,cp:spec&&sigma>0?(usl-lsl)/(6*sigma):null,cpk:spec&&sigma>0?Math.min(usl-mean,mean-lsl)/(3*sigma):null,pp:spec&&sd>0?(usl-lsl)/(6*sd):null,ppk:spec&&sd>0?Math.min(usl-mean,mean-lsl)/(3*sd):null,outside,mrOutside,invalidSpec:lsl!==null&&usl!==null&&!spec};
}
function msa(data){
 const p=data.parts,o=data.operators,r=data.trials,N=p*o*r;
 const vals=Array.from({length:p},(_,i)=>Array.from({length:o},(_,j)=>Array.from({length:r},(_,k)=>num(data.values[`${i}:${j}:${k}`]))));
 const flat=vals.flat(2);const count=flat.filter(x=>x!==null).length;if(count!==N)return {complete:false,count,N};
 const mean=avg(flat);const pm=vals.map(x=>avg(x.flat()));const om=Array.from({length:o},(_,j)=>avg(vals.flatMap(x=>x[j])));const cm=vals.map(x=>x.map(avg));
 const ssp=o*r*sum(pm.map(x=>(x-mean)**2));const sso=p*r*sum(om.map(x=>(x-mean)**2));
 const ssi=r*sum(cm.flatMap((a,i)=>a.map((x,j)=>(x-pm[i]-om[j]+mean)**2)));
 const sse=sum(vals.flatMap((a,i)=>a.flatMap((b,j)=>b.map(x=>(x-cm[i][j])**2))));
 const sst=sum(flat.map(x=>(x-mean)**2));const df=[p-1,o-1,(p-1)*(o-1),p*o*(r-1),N-1];const ss=[ssp,sso,ssi,sse,sst];const ms=ss.map((v,i)=>v/df[i]);
 const raw=[ms[3],(ms[1]-ms[2])/(p*r),(ms[2]-ms[3])/r,(ms[0]-ms[2])/(o*r)];
 const [ev,ov,iv,pv]=raw.map(x=>Math.max(0,x));const av=ov+iv,grr=ev+av,tv=grr+pv;
 const lsl=num(data.lsl),usl=num(data.usl);const tol=lsl!==null&&usl!==null&&usl>lsl?usl-lsl:null;
 return {complete:true,count,N,mean,pm,om,cm,ss,df,ms,components:[ev,ov,iv,av,grr,pv,tv],grrPercent:tv>0?100*Math.sqrt(grr/tv):null,contribution:tv>0?100*grr/tv:null,tolerancePercent:tol?600*Math.sqrt(grr)/tol:null,ndc:grr>0?Math.floor(1.41*Math.sqrt(pv/grr)):null,truncated:raw.some(x=>x<0)};
}
window.QCalc={num,avg,sum,rating,rpn,cep,msa};
})();
