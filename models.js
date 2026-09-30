/* Original editable templates, not reproductions of customer or AIAG forms. */
(() => {
const col=(key,type='text',extra={})=>({key,label:key,type,...extra});
const status=()=>col('status','select',{options:['pending','working','done']});
const fmea=[col('item'),col('function'),col('requirement'),col('failure'),col('effect'),col('severity','rating'),col('cause'),col('occurrence','rating'),col('prevention'),col('detectionControl'),col('detection','rating'),col('rpn','computed'),col('priority','select',{options:['unrated','high','medium','low']}),col('action'),col('owner'),col('due','date'),status(),col('severityAfter','rating'),col('occurrenceAfter','rating'),col('detectionAfter','rating'),col('rpnAfter','computed'),col('priorityAfter','select',{options:['unrated','high','medium','low']}),col('rationale')];
const tools=[
{id:'ppap',icon:'▤',title:'PPAP',desc:'ppapDesc',columns:[col('requirement'),col('applicable','select',{options:['yes','no']}),status(),col('evidence'),col('owner'),col('due','date'),col('notes')],seeds:Array.from({length:18},(_,i)=>({requirement:'@ppap'+(i+1),applicable:'yes',status:'pending'}))},
{id:'apqp',icon:'◇',title:'APQP',desc:'apqpDesc',columns:[col('phase'),col('deliverable'),col('owner'),col('start','date'),col('due','date'),col('completion','date'),status(),col('evidence'),col('notes')],seeds:Array.from({length:5},(_,i)=>({phase:'@phase'+(i+1),status:'pending'}))},
{id:'dfmea',icon:'△',title:'DFMEA',desc:'dfmeaDesc',columns:fmea},
{id:'pfmea',icon:'⎔',title:'PFMEA',desc:'pfmeaDesc',columns:fmea},
{id:'control',icon:'☷',title:'control',desc:'controlDesc',columns:[col('phase'),col('process'),col('operation'),col('equipment'),col('characteristic'),col('classification'),col('specification'),col('method'),col('gauge'),col('sample'),col('frequency'),col('controlMethod'),col('reaction'),col('owner')]},
{id:'flow',icon:'⇢',title:'flow',desc:'flowDesc',columns:[col('step'),col('operation'),col('stepType','select',{options:['processType','inspection','transport','storage','decision']}),col('inputs'),col('outputs'),col('nextStep'),col('owner')]},
{id:'cep',icon:'⌁',title:'cep',desc:'cepDesc',special:true},
{id:'msa',icon:'⊞',title:'MSA',desc:'msaDesc',special:true},
{id:'why',icon:'?',title:'why',desc:'whyDesc',columns:[col('level'),col('question'),col('answer'),col('evidence')],seeds:Array.from({length:5},(_,i)=>({level:String(i+1),question:'@whyQuestion'})),fields:['problem','rootCause','action','owner','due','verification']},
{id:'ishikawa',icon:'⋔',title:'Ishikawa',desc:'ishikawaDesc',columns:[col('category','select',{options:['people','machine','method6','material','measurement','environment']}),col('cause'),col('evidence'),col('validation'),col('action'),col('owner')],seeds:['people','machine','method6','material','measurement','environment'].map(category=>({category})),fields:['problem','rootCause','verification']}
];
const makeState=()=>({version:1,meta:{},active:'ppap',tools:Object.fromEntries(tools.map(t=>[t.id,t.id==='cep'?{characteristic:'',unit:'mm',lsl:'',usl:'',rows:Array.from({length:25},()=>({value:'',note:''}))}:t.id==='msa'?{parts:10,operators:3,trials:2,characteristic:'',gauge:'',unit:'mm',lsl:'',usl:'',values:{},operatorNames:{}}:{rows:structuredClone(t.seeds||Array.from({length:3},()=>({}))),fields:{}}]))});
window.QModels={tools,makeState,meta:['project','company','customer','part','revision','owner','date','criteria']};
})();
