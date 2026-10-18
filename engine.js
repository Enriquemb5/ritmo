/* ================= Ritmo · motor de la rutina =================
   Genera cada día a partir de la configuración del cuestionario y de las
   clases reales de TeamUp. Todo en minutos desde las 00:00 (puede pasar de 1440). */

let CAT={S:[],L:[],E:[]},CAT_ID='',CAT_NAME='',CAT_SYNC='',COURSES=[],SUBJ=[],BYDAY={},CAT_FIRST='9999',CAT_LAST='0000',CALS=[];
const CLABEL=c=>/^\d+$/.test(c)?c+'º curso':/^\d+B$/.test(c)?c.slice(0,-1)+'º curso · grupo B':c==='?'||!c?'Otras':c;

/* ---------- festivos (data/festivos.json: BOE por comunidad + locales conocidos) ---------- */
let FEST=null;
const CCAA=[['AN','Andalucía'],['AR','Aragón'],['AS','Asturias'],['IB','Illes Balears'],['CN','Canarias'],['CB','Cantabria'],['CM','Castilla-La Mancha'],['CL','Castilla y León'],['CT','Cataluña'],['EX','Extremadura'],['GA','Galicia'],['MD','Comunidad de Madrid'],['MC','Región de Murcia'],['NC','Navarra'],['PV','País Vasco'],['RI','La Rioja'],['VC','Comunitat Valenciana'],['CE','Ceuta'],['ML','Melilla']];
const setHolidays=f=>{FEST=f};
async function loadHolidays(){try{const r=await fetch('data/festivos.json',{cache:'no-cache'});if(r.ok)FEST=await r.json()}catch(e){}}
const townKey=t=>String(t||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const localOf=(ca,town)=>{if(!FEST||!town)return null;const e=Object.entries(FEST.local||{}).find(([k])=>{const [c,t]=k.split('|');return c===ca&&townKey(t)===townKey(town)});return e?e[1]:null};
const knownTowns=ca=>Object.keys((FEST&&FEST.local)||{}).filter(k=>k.startsWith(ca+'|')).map(k=>k.split('|')[1]);
function officialHoliday(k,ca,town){
  if(!FEST)return null;const y=k.slice(0,4),md=k.slice(5,7)+k.slice(8,10),Y=FEST[y];
  const find=(arr,scope)=>{for(const s of arr||[])if(s.slice(0,4)===md)return{name:s.slice(5),scope};return null};
  if(Y){const r=find(Y.ES,'nacional')||find(Y[ca],'autonómico');if(r)return r}
  const L=localOf(ca,town);return L?find(L[y],'local'):null;
}
function setCatalog(meta,cat){
  CAT=cat;CAT_ID=meta.id;CAT_NAME=meta.name;CAT_SYNC=cat.sync||'';
  SUBJ=CAT.S.map(([name,course],i)=>({i,name,course,key:course+'|'+name}));
  BYDAY={};CAT.E.forEach(e=>{const k='20'+e[0].slice(0,2)+'-'+e[0].slice(2,4)+'-'+e[0].slice(4,6);(BYDAY[k]=BYDAY[k]||[]).push(e)});
  const ks=Object.keys(BYDAY).sort();CAT_FIRST=ks[0]||'9999';CAT_LAST=ks[ks.length-1]||'0000';
  COURSES=[...new Set(CAT.S.map(s=>s[1]))].sort().map(c=>[c,CLABEL(c)]);
}
async function loadCals(){try{CALS=await (await fetch('data/calendars.json',{cache:'no-cache'})).json()}catch(e){CALS=[]}}
async function loadCatalog(id){const meta=CALS.find(c=>c.id===id);if(!meta)return false;if(CAT_ID===id)return true;
  try{const r=await fetch('data/teamup/'+id+'.json',{cache:'no-cache'});if(!r.ok)return false;setCatalog(meta,await r.json());return true}catch(e){return false}}
const SHORTN={'Gestión Inteligente de Redes Móviles':'Gestión Redes','Laboratorio de Redes Móviles con Inteligencia Artificial':'Lab IA Móviles','Inteligencia Artificial para Redes y Servicios':'IA Redes','Redes y Servicios Virtualizados':'RSV','Laboratorio de Proyectos':'Lab Proyectos','Servicios en Dispositivos Inalámbricos':'Disp. Inalámbricos','Redes y Servicios de Telecomunicación 2':'RST 2','Redes y Servicios de Telecomunicación 3':'RST 3','Arquitecturas de Redes y Servicios':'Arq. Redes','Sistemas Concurrentes y de Tiempo Real':'Concurrentes','Fundamentos de Inteligencia Artificial':'Fund. IA','Fundamentos de Electrónica':'Fund. Electrónica','Comunicaciones Digitales':'Com. Digitales'};
const shortName=n=>SHORTN[n]||n;
const teamupId=url=>{const m=String(url||'').match(/teamup\.com\/(ks[a-z0-9]+)/i);return m?m[1].toLowerCase():''};

const DEFAULT_CFG={
  v:1,name:'',teamup:'',course:'4',
  subjects:['4|Gestión Inteligente de Redes Móviles','4|Laboratorio de Redes Móviles con Inteligencia Artificial','4|Laboratorio de Proyectos','4|Inteligencia Artificial para Redes y Servicios','4|Redes y Servicios Virtualizados'],
  sleepH:7.5,wakeWk:'07:00',wakeWe:'08:30',morning:60,
  commute:{normal:40,rush:50},rush:[['07:30','09:30'],['13:30','15:30'],['17:30','19:30']],
  leave:['08:40','09:30','09:30','09:30','auto'],
  work:{on:true,place:'uni',label:'Trabajo',min:[210,210,210,210,60],after:[false,false,false,false,true]},
  events:[{id:'e1',label:'Reunión',dow:0,start:'12:45',end:'14:30',freq:'A',work:true},{id:'e2',label:'Reunión',dow:0,start:'13:30',end:'14:30',freq:'B',work:true}],
  meals:{lunch:'14:00',lunchLate:'15:00',lunchMin:45,dinner:'21:00',dinnerMin:45},
  profile:'uni',
  home:{ca:'AN',town:'Mijas'},place:{same:false,ca:'AN',town:'Málaga'},holidayWork:'libre',
  opos:{tipo:'otra',name:'',mode:'sesiones',sessions:null,train:[],temasOn:true,temas:60,ritmo:3,primero:1,desde:'',study:[300,300,300,300,240,240,0],start:'08:30',block:50,rest:10,repaso:4,sim:{on:true,dow:5,start:'10:00',min:240}},
  evStudy:{days:[0],min:90},
  hobbies:[{id:'h1',label:'Guitarra',min:30,days:[0,1,2,3,4,5,6]}],
  source:'teamup',custom:[],customRange:{from:'',to:''},ics:[],icsSel:[],margin:10,timeColors:true,
  wind:30,
  series:{on:true,count:2,min:120,endBy:'22:30',label:'Series en pista',prefer:[0,2,1,3,4]},
  run:{on:true,dow:5,start:'12:00',min:90,label:'Carrera'},
  weStudy:{on:true,start:'09:30',end:'12:00'},
  parityA:null
};

/* ---------- utilidades ---------- */
const T=s=>{const[a,b]=String(s).split(':').map(Number);return a*60+(b||0)};
const clock=x=>{x=((Math.round(x)%1440)+1440)%1440;return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0')};
const hm=x=>{x=Math.round(x);if(x<=0)return'0 min';const h=Math.floor(x/60),r=x%60;return h&&r?`${h} h ${String(r).padStart(2,'0')}`:h?`${h} h`:`${r} min`};
const sod=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const dow=d=>(d.getDay()+6)%7;
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const sameDay=(a,b)=>ymd(a)===ymd(b);
const monday=d=>addDays(d,-dow(d));
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y=new Date(Date.UTC(t.getUTCFullYear(),0,1));return Math.ceil(((t-y)/864e5+1)/7)}
const where=l=>!l?'':/^\d/.test(l)?`Aula ${l}`:l;
const B=(s,e,cat,label,note='',extra={})=>({s,e,cat,label,note,...extra});

/* ---------- motor ---------- */
/* migra configuraciones antiguas */
function normCfg(c){
  c={...JSON.parse(JSON.stringify(DEFAULT_CFG)),...c};
  if(!Array.isArray(c.hobbies)){c.hobbies=c.hobby&&c.hobby.on!==false?[{id:'h1',label:c.hobby.label||'Hobby',min:c.hobby.min||30,days:[0,1,2,3,4,5,6]}]:[]}
  delete c.hobby;
  for(const k of ['custom','ics','icsSel'])if(!Array.isArray(c[k]))c[k]=[];
  if(!c.icsGroup||typeof c.icsGroup!=='object')c.icsGroup={};
  if(!c.source)c.source=teamupId(c.teamup)?'teamup':'propio';
  if(c.margin==null)c.margin=10;
  c.meals={...DEFAULT_CFG.meals,...c.meals};
  const oldOpos=c.opos&&!c.opos.mode;
  c.opos={...DEFAULT_CFG.opos,...c.opos,sim:{...DEFAULT_CFG.opos.sim,...(c.opos||{}).sim}};
  if(oldOpos)c.opos.mode='bloques'; // quien ya usaba bloques los mantiene
  if(!Array.isArray(c.opos.sessions))c.opos.sessions=oposSessions(c.opos.tipo);
  if(!Array.isArray(c.opos.train))c.opos.train=[];
  c.home={...DEFAULT_CFG.home,...c.home};c.place={...DEFAULT_CFG.place,...c.place};
  return c;
}
/* hobbies que son deporte: van antes de cenar, nunca con la cena en el estómago */
const SPORTY=/correr|running|run\b|carrera|trotar|gym|gimnasio|pesas|bici|ciclismo|spinning|nadar|nataci|piscina|f[uú]tbol|baloncesto|basket|p[aá]del|tenis|crossfit|yoga|pilates|entren|deporte|boxeo|escalada|surf|rugby|voley|v[oó]ley|patinar|senderismo|caminar|andar\b/i;
const hobbyWhen=h=>h.when||(SPORTY.test(h.label||'')?'tarde':'noche');
/* tipos de oposición: cómo se suele repartir el estudio y qué pruebas físicas hay (orientativo: manda la convocatoria) */
const OPOS_TIPOS={
  bomberos:{n:'Bomberos',ph:'Bombero del Ayuntamiento de Málaga',pruebas:'Suelen pedir natación, trepa de cuerda, press banca, velocidad y un circuito de obstáculos, y en muchas también dominadas o carrera de fondo.',
    areas:['Temario','Callejero','Test','Supuestos prácticos'],first:['Callejero',30],train:[['Natación',60,[0,2,4]],['Gimnasio: press banca, dominadas y trepa',75,[1,3]],['Carrera y velocidad',60,[5]]]},
  policia_nacional:{n:'Policía Nacional',ph:'Escala básica',pruebas:'Circuito de agilidad, dominadas (hombres) o suspensión en barra (mujeres) y 1.000 m.',
    areas:['Temario','Test','Ortografía','Psicotécnicos'],train:[['Dominadas y fuerza',60,[0,2,4]],['Carrera: 1.000 m y series',60,[1,3]],['Circuito de agilidad',45,[5]]]},
  policia_local:{n:'Policía Local',ph:'Policía Local de Málaga',pruebas:'En Andalucía: 50 m, dominadas (hombres) o lanzamiento de balón (mujeres), flexibilidad, salto vertical y 1.000 m. Algunos ayuntamientos añaden 25 m de natación.',
    areas:['Temario','Test','Psicotécnicos'],train:[['Dominadas y fuerza',60,[0,2,4]],['Carrera: 1.000 m y 50 m',60,[1,3]],['Salto vertical y flexibilidad',45,[5]]]},
  guardia_civil:{n:'Guardia Civil',ph:'Cabos y guardias',pruebas:'Circuito de agilidad, 2.000 m, flexiones y 50 m de natación.',
    areas:['Temario','Ortografía y gramática','Inglés','Psicotécnicos'],train:[['Carrera 2.000 m',60,[0,3]],['Natación 50 m',45,[1,4]],['Flexiones y circuito de agilidad',45,[2,5]]]},
  docente:{n:'Magisterio y profesorado',ph:'Maestro de Educación Primaria',pruebas:'',areas:['Temario','Programación didáctica','Supuesto práctico','Unidades didácticas']},
  administracion:{n:'Administración (AGE, Junta, ayuntamientos)',ph:'Auxiliar administrativo',pruebas:'',areas:['Temario','Test','Supuesto práctico']},
  sanidad:{n:'Sanidad',ph:'Enfermería SAS',pruebas:'',areas:['Temario','Test','Casos clínicos']},
  justicia:{n:'Justicia',ph:'Tramitación procesal',pruebas:'',areas:['Temario','Test','Supuesto práctico']},
  otra:{n:'Otra',ph:'Tu oposición',pruebas:'',areas:['Temario','Test','Repaso']}
};
let sesN=0;
function oposSessions(tipo){
  const P=OPOS_TIPOS[tipo]||OPOS_TIPOS.otra,a=P.areas,wk=[0,1,2,3,4],id=()=>'o'+(++sesN)+Date.now().toString(36);
  const m=P.first?[{id:id(),label:P.first[0],start:'08:15',end:clock(T('08:15')+P.first[1]),days:wk},{id:id(),label:'Temario',start:clock(T('08:15')+P.first[1]),end:'11:00',days:wk}]
    :[{id:id(),label:'Temario',start:'08:30',end:'11:00',days:wk}];
  return[...m,{id:id(),label:'Temario',start:'11:20',end:'14:00',days:wk},{id:id(),label:a.includes('Test')?'Test':a[1]||'Repaso',start:'16:30',end:'19:00',days:wk},{id:id(),label:'Repaso',start:'09:30',end:'13:00',days:[5]}];
}
const oposTrain=tipo=>((OPOS_TIPOS[tipo]||{}).train||[]).map(([label,min,days],k)=>({id:'t'+k+Date.now().toString(36),label,min,days,start:''}));
const AGENDA_KINDS={tarea:'Tarea',recordatorio:'Recordatorio',examen:'Examen',entrega:'Entrega',viaje:'Viaje',festivo:'Festivo'};
/* aviso por defecto de cada tipo (minutos antes; '' = sin aviso) */
const ALERT_DEFAULT={tarea:'',recordatorio:0,examen:1440,entrega:1440,viaje:1440,festivo:''};
const parseYmd=k=>{const [Y,M,D]=String(k).split('-').map(Number);return new Date(Y,M-1,D)};
function Engine(cfg,agenda=[]){
  const C=cfg;
  const trips=(agenda||[]).filter(a=>a.kind==='viaje'&&a.date);
  const tripOn=d=>{const k=ymd(d);return trips.find(t=>k>=t.date&&k<=(t.end||t.date))};
  /* festivos: los del sitio donde estudias o trabajas cambian el día; los de tu pueblo solo se muestran */
  const place=C.place&&!C.place.same?C.place:(C.home||{});
  const manual=(agenda||[]).filter(a=>a.kind==='festivo'&&a.date);
  const hcache={};
  const holidayOf=d=>{const k=ymd(d);if(k in hcache)return hcache[k];const m=manual.find(a=>k>=a.date&&k<=(a.end||a.date));
    return hcache[k]=m?{name:m.text||'Festivo',scope:'manual'}:officialHoliday(k,place.ca,place.town)};
  const homeHoliday=d=>{if(!C.place||C.place.same||!C.home)return null;return holidayOf(d)?null:officialHoliday(ymd(d),C.home.ca,C.home.town)};
  const opos=C.profile==='opos';
  /* festivo que libra el día entero (sin clase y, si así lo has dicho, sin trabajo ni reuniones) */
  const offDay=d=>{const h=holidayOf(d);return h&&(!C.work.on||C.holidayWork!=='trabaja')?h:null};
  const sel=new Set(C.subjects||[]);
  const parity=d=>C.parityA==null?'A':(isoWeek(d)%2===C.parityA?'A':'B');
  const rushy=t=>C.rush.some(([a,b])=>t>=T(a)&&t<T(b));
  const drive=dep=>rushy(dep)?C.commute.rush:C.commute.normal;
  const usesTeamup=C.source!=='propio'&&!!CAT_ID&&teamupId(C.teamup)===CAT_ID;
  const icsSel=new Set(C.icsSel||[]);
  /* clases con fecha (archivo .ics o PDF por semanas); las de prácticas solo las de tu grupo */
  const IG=C.icsGroup||{},ICS={};let icsFirst='9999',icsLast='0000';
  (C.ics||[]).forEach(e=>{if(e[0]<icsFirst)icsFirst=e[0];if(e[0]>icsLast)icsLast=e[0];if(icsSel.has(e[3])&&(!e[5]||!IG[e[3]]||IG[e[3]]===e[5]))(ICS[e[0]]=ICS[e[0]]||[]).push(e)});
  const inRange=d=>{const k=ymd(d);return k>=CAT_FIRST&&k<=CAT_LAST};

  function classes(d){
    const out=[],k=ymd(d),i=dow(d);
    if(holidayOf(d))return out;
    if(usesTeamup)(BYDAY[k]||[]).filter(e=>sel.has(SUBJ[e[3]].key)).forEach(e=>{
      const s=SUBJ[e[3]];out.push(B(T(e[1].slice(0,2)+':'+e[1].slice(2)),T(e[2].slice(0,2)+':'+e[2].slice(2)),'clase',s.name,[where(CAT.L[e[4]]),e[5]].filter(Boolean).join(' · '),{short:shortName(s.name),fixed:true}));
    });
    if(C.source==='propio'){
      const r=C.customRange||{};
      if((!r.from||k>=r.from)&&(!r.to||k<=r.to))for(const s of C.custom||[])for(const sl of s.slots||[])if(sl.dow===i&&sl.start&&sl.end)out.push(B(T(sl.start),T(sl.end),'clase',s.name,where(sl.loc||''),{short:shortName(s.name),fixed:true}));
      for(const e of ICS[k]||[])out.push(B(T(e[1]),T(e[2]),'clase',e[3],[e[5]?`Prácticas · grupo ${e[5]}`:'',where(e[4]||'')].filter(Boolean).join(' · '),{short:shortName(e[3])+(e[5]?' (P)':''),fixed:true}));
    }
    return out.sort((a,b)=>a.s-b.s);
  }
  function events(d){
    const p=parity(d),i=dow(d);if(offDay(d))return[];
    return (C.events||[]).filter(ev=>ev.dow===i&&(ev.freq==='all'||ev.freq===p)).map(ev=>B(T(ev.start),T(ev.end),ev.work?'trabajo':'evento',ev.label,ev.freq==='all'?'':`Semana ${ev.freq}`,{short:ev.label,fixed:true,isEvent:true,evId:ev.id}));
  }
  const workMin=d=>{const i=dow(d);return C.work.on&&i<5&&!offDay(d)?(C.work.min[i]||0):0};
  const goesOut=(d,cls,evs)=>{const i=dow(d);return (i<5||opos&&cls.length>0)&&(cls.length>0||(C.work.on&&C.work.place!=='casa'&&workMin(d)>0)||evs.length>0)};

  /* hora de salida y de despertar */
  function morningOf(d){
    const i=dow(d),cls=classes(d),evs=events(d),out=goesOut(d,cls,evs);
    if((i>=5&&!out)||tripOn(d)||(offDay(d)&&!opos))return{wake:T(C.wakeWe),out:false,trip:!!tripOn(d)};
    let wake=T(C.wakeWk);
    const mg=Math.max(0,C.margin??10);
    if(!out)return{wake,out:false,cls,evs};
    const fixed=[...cls,...evs].sort((a,b)=>a.s-b.s);
    const first=fixed.length?fixed[0].s:Infinity;
    let L=C.leave[i]==='auto'||!C.leave[i]?null:T(C.leave[i]);
    let warn='';
    const autoLeave=target=>{let dep=target-C.commute.normal;if(rushy(dep))dep=target-C.commute.rush;return dep};
    if(L==null){
      const target=first<Infinity?first-mg:(C.work.after[i]?T('15:00'):T('10:15'));
      L=autoLeave(target);
    }else if(L+drive(L)+mg>first){
      const nl=autoLeave(first-mg);warn=`Hoy sales a las ${clock(nl)} para llegar a ${fixed[0].label} a las ${clock(first)}${fixed[0].note?` (${fixed[0].note})`:''}.`;L=nl;
    }
    if(L-C.morning<wake){wake=L-C.morning}
    return{wake,out:true,leave:L,cls,evs,warn};
  }

  /* rellena huecos libres con bloques de trabajo (tramos de 1 h 45 con pausa de 15) */
  function freeSlots(occ,from,to){
    const o=[...occ].filter(b=>b.e>from&&b.s<to).sort((a,b)=>a.s-b.s);const out=[];let t=from;
    for(const b of o){if(b.s>t)out.push([t,Math.min(b.s,to)]);t=Math.max(t,b.e);if(t>=to)break}
    if(t<to)out.push([t,to]);return out.filter(([a,z])=>z-a>=1);
  }
  /* si lo que queda cabe con media hora más de tirón, se termina sin pausa (2 h seguidas mejor que 1 h 45 + pausa + 15 min) */
  function fillWork(occ,need,from,to,label,maxRun=105,cat='trabajo',pause=15){
    const out=[];let run=0;
    for(const [a,z] of freeSlots(occ,from,to)){
      let t=a;if(z-a<20){run=0;continue}
      while(need>0&&t<z){
        const room=need<=maxRun-run+30?need:maxRun-run;
        if(room<=0){const pe=Math.min(z,t+pause);if(z-pe>=20)out.push(B(t,pe,'pausa','Pausa'));t=pe;run=0;continue}
        const len=Math.min(need,z-t,room);if(len<15&&need>len)break;
        out.push(B(t,t+len,cat,label));t+=len;need-=len;run+=len;
      }
      if(need<=0)break;run=0;
    }
    return{blocks:out,left:need};
  }
  /* mejor momento para comer: lo más cerca posible de tu hora (mejor un poco después que antes) y nunca más tarde del límite */
  function pickLunch(occ,from,strict){
    const at=T(C.meals.lunch),late0=Math.max(at,T(C.meals.lunchLate||clock(at+60))),d0=C.meals.lunchMin||45;
    const pass=(early,late)=>{let best=null;
      for(const [a,z] of freeSlots(occ,Math.max(from,at-early),late+d0)){
        const dur=Math.min(d0,z-a);if(dur<Math.min(30,d0))continue;
        const s=Math.min(Math.max(at,a),z-dur);if(s>late)continue;
        const sc=s>=at?s-at:(at-s)*2;if(!best||sc<best.sc)best={s,dur,sc};
      }return best};
    // si a tu hora es imposible, se busca algo antes o un poco más tarde (y se avisa)
    return pass(60,late0)||(strict?null:(r=>r&&{...r,odd:true})(pass(120,late0+60)));
  }
  /* temas de la oposición: rotan cada semana al ritmo que hayas puesto */
  function temaOf(d){
    const O=C.opos,i=dow(d);if(O.repaso===i)return{label:'Repaso',note:'Repasa los temas de la semana'};
    const days=O.mode==='sesiones'?[0,1,2,3,4,5,6].filter(j=>j!==O.repaso&&(O.sessions||[]).some(s=>/^temario$/i.test(s.label||'Temario')&&(s.days||[]).includes(j)))
      :[0,1,2,3,4,5,6].filter(j=>(O.study[j]||0)>0&&j!==O.repaso&&!(O.sim&&O.sim.on&&O.sim.dow===j&&O.sim.min>=(O.study[j]||0)));
    const k=days.indexOf(i);if(!O.temas||k<0)return{label:'Estudio',note:O.name||''};
    const w=Math.max(0,Math.round((monday(d)-monday(O.desde?parseYmd(O.desde):d))/6048e5));
    const n=Math.max(1,O.ritmo||1),a=Math.floor(k*n/days.length),b=Math.max(a,Math.floor((k+1)*n/days.length)-1);
    const tm=x=>((O.primero-1+w*n+x)%O.temas+O.temas)%O.temas+1;
    return{label:a===b?`Tema ${tm(a)}`:`Temas ${tm(a)}–${tm(b)}`,note:O.name||''};
  }
  /* semana de trabajo real (los festivos libres restan) frente a la normal */
  function weekWork(d){const m=monday(d);let real=0,norm=0;for(let j=0;j<5;j++){const x=addDays(m,j);norm+=C.work.on?(C.work.min[j]||0):0;real+=workMin(x)}return{real,norm}}
  function holidayNote(d,h){
    if(!C.work.on||C.holidayWork!=='trabaja'){
      const ww=weekWork(d);
      return `Festivo: ${h.name}. Hoy no hay clase${C.work.on?' ni trabajo':''}${C.events.length&&C.work.on?' ni reuniones':''}.`+(C.work.on&&ww.real<ww.norm?` Esta semana trabajas ${hm(ww.real)} en lugar de ${hm(ww.norm)}.`:'');
    }
    return `Festivo: ${h.name}. No hay clase, pero trabajas como siempre.`;
  }

  /* día de quien prepara oposiciones: estudio por bloques, academia y simulacros */
  function oposDay(d,M){
    const i=dow(d),O=C.opos,warn=[],blocks=[],hol=holidayOf(d);
    const nextWake=morningOf(addDays(d,1)).wake;const S=nextWake+1440-Math.round(C.sleepH*60);
    if(hol)warn.push(`Festivo: ${hol.name}. ${C.custom.length?'No hay academia y hoy':'Hoy'} estudias como un sábado.`);
    let t=M.wake;blocks.push(B(t,t+C.morning,'rutina',i>=5?'Despertar y desayuno sin prisa':'Despertar, ducha y desayuno'));t+=C.morning;
    const cls=classes(d),evs=events(d),occ=[...cls,...evs];
    // ida y vuelta a la academia (las sesiones seguidas cuentan como una)
    const ses=[];for(const c of [...cls].sort((a,b)=>a.s-b.s)){const l=ses[ses.length-1];if(l&&c.s-l.e<60)l.e=Math.max(l.e,c.e);else ses.push({s:c.s,e:c.e})}
    for(const s of ses){const g=drive(s.s-C.commute.normal),b=drive(s.e);occ.push(B(s.s-g-(C.margin||0),s.s,'trayecto','Ida a la academia',g===C.commute.rush?'Hora punta':'',{short:'Ida'}),B(s.e,s.e+b,'trayecto','Vuelta a casa','',{short:'Vuelta'}))}
    let sim=null;
    if(O.sim&&O.sim.on&&O.sim.dow===i){const ss=Math.max(T(O.sim.start),t);sim=B(ss,ss+O.sim.min,'estudio','Simulacro','Como el examen real: con cronómetro y sin apuntes',{short:'Simulacro',fixed:true});occ.push(sim)}
    const sesMode=O.mode==='sesiones';
    // sesiones fijas, como las hace cada uno (la academia y el simulacro mandan si se cruzan)
    if(sesMode){const di=hol&&i<5?5:i,tm=temaOf(d);
      for(const s of (O.sessions||[]).filter(s=>(s.days||[]).includes(di)&&s.start&&s.end&&T(s.end)>T(s.start)).sort((a,b)=>T(a.start)-T(b.start))){
        const tem=O.temasOn!==false&&/^temario$/i.test(s.label||'Temario');
        for(const [a,z] of freeSlots(occ,Math.max(T(s.start),t),T(s.end)))if(z-a>=15)occ.push(B(a,z,'estudio',tem?tm.label:(s.label||'Estudio'),tem?[s.label||'Temario',O.name].filter(Boolean).join(' · '):O.name||'',{short:tem?tm.label:s.label}));
      }}
    const L=pickLunch(occ,t);let lunch=null;
    if(L){lunch=B(L.s,L.s+L.dur,'comida','Comida',L.odd?'Hoy no cuadra a tu hora':'');occ.push(lunch)}
    const W=workMin(d);
    if(W>0){const r=fillWork(occ,W,t,T('20:30'),C.work.label);occ.push(...r.blocks);if(r.left>=10)warn.push(`Hoy te faltan ${hm(r.left)} de trabajo.`)}
    let need=sesMode?0:(hol&&i<5?O.study[5]:O.study[i])||0;if(sim)need-=sim.e-sim.s;
    if(need>0){const tm=temaOf(d);const r=fillWork(occ,need,Math.max(t,T(O.start||'08:30')),T(C.meals.dinner),tm.label,O.block||50,'estudio',O.rest||10);
      r.blocks.forEach(b=>{if(b.cat==='estudio')b.note=tm.note});occ.push(...r.blocks);
      if(r.left>=15)warn.push(`Hoy no caben ${hm(r.left)} de estudio. Muévelos a otro día o empieza antes.`)}
    // entrenamiento físico: a su hora o en el primer hueco de la tarde (con la comida bajada) antes de cenar
    const din=T(C.meals.dinner);
    for(const tr of (O.train||[]).filter(x=>(x.days||[]).includes(i)&&x.min>0)){
      const mk=s=>B(s,s+tr.min,'deporte',tr.label,'Entrenamiento',{short:tr.label});
      if(tr.start){occ.push(mk(T(tr.start)));continue}
      const fit=(a0,z0)=>freeSlots(occ,a0,z0).find(([a,z])=>z-a>=tr.min);
      const f=fit(lunch?lunch.e+60:t,din)||fit(t,din);
      if(f)occ.push(mk(f[0]));else warn.push(`Hoy no cabe ${tr.label.toLowerCase()}: muévelo de día o ponle hora.`);
    }
    const H=Math.max(t,lunch?lunch.e:0,...occ.map(b=>b.e));
    for(const [a,z] of freeSlots(occ,t,H))if(z-a>=15)occ.push(B(a,z,'libre',z-a>=120?'Tiempo libre':'Descanso'));
    blocks.push(...occ);
    return evening(d,{blocks,H,S,warn,weekend:i>=5,home:true});
  }

  function base(d){
    const i=dow(d),warn=[],k=ymd(d);
    const M=morningOf(d);
    const nextWake=morningOf(addDays(d,1)).wake;
    let S=nextWake+1440-Math.round(C.sleepH*60);
    const blocks=[];
    let H; // llegada a casa
    const trip=tripOn(d);
    if(trip){
      let t=M.wake;blocks.push(B(t,t+60,'rutina','Despertar y desayuno'));t+=60;
      blocks.push(B(t,T('21:00'),'viaje',trip.title||'Viaje',trip.note||'Hoy no hay rutina: disfruta',{short:'Viaje'}));
      {const z=new Date((trip.end||trip.date).replace(/-/g,'/'));warn.push(`Estás de viaje${trip.title?': '+trip.title:''}. La rutina se pausa hasta el ${z.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][z.getMonth()]}.`)}
      return evening(d,{blocks,H:T('21:00'),S,warn,weekend:true,home:true,trip:true});
    }
    if(opos)return oposDay(d,M);
    const hol=holidayOf(d);
    if(hol&&i<5)warn.push(holidayNote(d,hol));
    if(i>=5||offDay(d)){
      // fin de semana o festivo
      let t=M.wake;blocks.push(B(t,t+60,'rutina','Despertar y desayuno sin prisa'));t+=60;
      if(C.weStudy.on){const s=Math.max(t,T(C.weStudy.start)),e=T(C.weStudy.end);if(s>t+15)blocks.push(B(t,s,'libre','Tiempo libre'));if(e-s>=30)blocks.push(B(s,e,'estudio','Estudio','Ejercicios y lo que vaya atrasado'));t=Math.max(t,e)}
      if(C.run.on&&C.run.dow===i){const s=Math.max(t,T(C.run.start));if(s-t>=15)blocks.push(B(t,s,'libre','Tiempo libre'));blocks.push(B(s,s+C.run.min,'deporte',C.run.label,'Incluye ir, calentar, estirar y ducha',{short:'Correr'}));t=s+C.run.min}
      const L0=T(C.meals.lunch);if(L0-t>=15)blocks.push(B(t,L0,'libre','Tiempo libre'));t=Math.max(t,L0);
      blocks.push(B(t,t+60,'comida','Comida'));t+=60;
      H=t;
      return evening(d,{blocks,H,S,warn,weekend:true,home:true});
    }
    const cls=M.cls||classes(d),evs=M.evs||events(d);
    if(!hol&&(usesTeamup&&inRange(d)&&sel.size||C.source==='propio'&&(C.custom.length||icsSel.size&&k>=icsFirst&&k<=icsLast))&&!cls.length)warn.push('No tienes clases este día. Organiza la jornada como te venga mejor.');
    // solapes entre clases y eventos
    const fx=[...cls,...evs].sort((a,b)=>a.s-b.s);
    for(let a=0;a<fx.length;a++)for(let b=a+1;b<fx.length;b++)if(fx[b].s<fx[a].e&&fx[b].e>fx[a].s)warn.push(`Se solapan ${fx[a].label} y ${fx[b].label} (${clock(Math.max(fx[a].s,fx[b].s))}–${clock(Math.min(fx[a].e,fx[b].e))}).`);
    if(M.warn)warn.push(M.warn);
    let t=M.wake;
    blocks.push(B(t,t+C.morning,'rutina','Despertar, ducha y desayuno'));t+=C.morning;
    const W=workMin(d);
    if(!M.out){
      // día en casa
      let need=C.work.on&&C.work.place==='casa'?W:0;
      const occ=[...fx];
      if(need){
        // igual que en la uni: si el trabajo acaba a tiempo, se come después en vez de partirlo
        const X=fillWork(occ,need,t,T('20:00'),C.work.label),LX=pickLunch([...occ,...X.blocks],t,true);
        const LY=pickLunch(occ,t),Y=fillWork(LY?[...occ,B(LY.s,LY.s+LY.dur,'x','')]:occ,need,t,T('20:00'),C.work.label);
        const [r,L]=LX&&X.left<=Y.left?[X,LX]:[Y,LY];blocks.push(...r.blocks);occ.push(...r.blocks);
        if(L){const lb=B(L.s,L.s+L.dur,'comida','Comida');blocks.push(lb);occ.push(lb)}
      }else{const L=pickLunch(occ,t);if(L){const lb=B(L.s,L.s+L.dur,'comida','Comida');blocks.push(lb);occ.push(lb)}}
      const lunch=T(C.meals.lunch);
      for(const [a,z] of freeSlots(occ,t,T('18:30')))if(z-a>=30)blocks.push(B(a,z,a<lunch?'estudio':'libre',a<lunch?'Estudio':'Tiempo libre'));
      blocks.push(...fx);
      return evening(d,{blocks,H:Math.max(T('18:30'),...occ.map(b=>b.e)),S,warn,home:true});
    }
    // mañana en casa antes de salir (si sales después de tu hora de comer, comes en casa)
    const L=M.leave;
    let homeLunch=null;
    {const at=T(C.meals.lunch),lm=C.meals.lunchMin||45;if(L-15-lm>=at-45&&L-15-lm>=t){const s=Math.max(t,Math.min(at,L-15-lm));homeLunch=B(s,s+lm,'comida','Comida','En casa, antes de salir')}}
    if(C.work.on&&C.work.place==='casa'&&W>0&&L-15-t>=30){const r=fillWork(homeLunch?[homeLunch]:[],Math.min(W,L-15-t),t,L-15,C.work.label);blocks.push(...r.blocks);t=r.blocks.length?r.blocks[r.blocks.length-1].e:t}
    if(homeLunch){blocks.push(homeLunch);for(const [a,z] of freeSlots([homeLunch],t,L-15))if(z-a>=20)blocks.push(B(a,z,'estudio','Estudio en casa'));blocks.push(B(L-15,L,'rutina','Prepararte y salir'))}
    else if(L-15-t>=20){blocks.push(B(t,L-15,'estudio','Estudio en casa'));blocks.push(B(L-15,L,'rutina','Prepararte y salir',C.work.place==='uni'&&W?'Tupper para comer allí':''))}
    else if(L>t)blocks.push(B(t,L,'rutina','Prepararte y salir'));
    const dur=drive(L);
    blocks.push(B(L,L+dur,'trayecto',C.work.place==='uni'&&W&&!C.work.after[i]?'Ida a la universidad':'Ida a clase',dur===C.commute.rush?'Hora punta':'',{short:'Coche'}));
    const A=L+dur;
    // en la universidad
    const occ=[...fx];const camp=[];
    const lastFix=fx.length?Math.max(...fx.map(b=>b.e)):A;
    let need=C.work.place==='uni'?W:0;
    for(const ev of evs)if(ev.cat==='trabajo')need-=ev.e-ev.s;
    need=Math.max(0,need);
    // trabajo pegado a la reunión
    const meet=evs.find(e=>e.cat==='trabajo');
    if(need>0&&!C.work.after[i]&&meet){
      const s=Math.max(A,meet.s-need);const r=fillWork(occ,meet.s-s,s,meet.s,C.work.label,600);camp.push(...r.blocks);occ.push(...r.blocks);need-=(meet.s-s)-r.left;
    }
    // comida y resto del trabajo
    let lunchB=null;
    const putLunch=(L,note)=>{if(!L)return;lunchB=B(L.s,L.s+L.dur,'comida','Comida',meet&&L.s===meet.e?'Nada más salir de la reunión':L.odd?'Hoy no cuadra a tu hora: come cuando puedas':note||'');camp.push(lunchB);occ.push(lunchB)};
    if(homeLunch){}
    else if(need>0&&!C.work.after[i]){
      // dos opciones: trabajar del tirón y comer al acabar, o parar a comer a tu hora. Se queda con la primera si comes antes del límite.
      const lim=fx.length?lastFix:A+need+60;
      const X=fillWork(occ,need,A,lim,C.work.label),LX=pickLunch([...occ,...X.blocks],A,true);
      const LY=pickLunch(occ,A),Y=fillWork(LY?[...occ,B(LY.s,LY.s+LY.dur,'x','')]:occ,need,A,lim,C.work.label);
      const noSplit=!!LX&&X.left<=Y.left,r=noSplit?X:Y,L=noSplit?LX:LY;
      camp.push(...r.blocks);occ.push(...r.blocks);
      putLunch(L,noSplit&&r.blocks.some(b=>b.cat==='trabajo'&&b.e===L.s&&b.s<T(C.meals.lunch))?'Al terminar de trabajar, sin cortar la jornada':'');
      if(r.left>=10)warn.push(`Hoy te faltan ${hm(r.left)} de trabajo: las clases no dejan hueco. Recupéralas otro día de esta semana.`);
      need=0;
    }else putLunch(pickLunch(occ,A));
    if(!lunchB&&!homeLunch&&A<T('13:00'))warn.push('Hoy no hay hueco para comer tranquilo: lleva algo para picar entre clases.');
    if(need>0){
      let r;
      if(C.work.after[i]){
        const late=lastFix>T('20:00');
        r=late?fillWork(occ,need,A,lastFix,C.work.label):{left:need,blocks:[]};
        if(r.left>0){const r2=fillWork(occ,r.left,Math.max(lastFix,A),lastFix+r.left+30,C.work.label);r={blocks:[...r.blocks,...r2.blocks],left:r2.left}}
      }else r=fillWork(occ,need,A,fx.length?lastFix:A+need+60,C.work.label);
      camp.push(...r.blocks);occ.push(...r.blocks);
      if(r.left>=10)warn.push(`Hoy te faltan ${hm(r.left)} de trabajo: las clases no dejan hueco. Recupéralas otro día de esta semana.`);
    }
    // descanso tras comer y huecos → estudio
    if(lunchB){const nx=occ.filter(b=>b.s>=lunchB.e).sort((a,b)=>a.s-b.s)[0];if(nx&&nx.s-lunchB.e>=90){const dz=B(lunchB.e,lunchB.e+30,'libre','Descanso','Un paseo por el campus');camp.push(dz);occ.push(dz)}}
    const endC=Math.max(lastFix,...camp.map(b=>b.e),A);
    for(const [a,z] of freeSlots(occ,A,endC))if(z-a>=25){const lbl=a===A&&C.leave[i]!=='auto'&&dow(d)===0?'Estudio (flexible)':'Estudio en la biblioteca';camp.push(B(a,z,'estudio',lbl,lbl.includes('flexible')?'Si no te hace falta, úsalo de margen o para descansar':''))}
    blocks.push(...camp,...fx);
    const vd=drive(endC);
    blocks.push(B(endC,endC+vd,'trayecto','Vuelta a casa',vd===C.commute.rush?'Hora punta':'',{short:'Coche'}));
    H=endC+vd;
    return evening(d,{blocks,H,S,warn});
  }

  function evening(d,o){
    const i=dow(d);let {blocks,H,S,warn}=o;
    const series=!!o.series;
    let t=H;const ev=[];
    if(series){ev.push(B(t+5,t+5+C.series.min,'deporte',C.series.label,'Ir, calentar, series, vuelta a la calma y volver',{short:'Series'}));t+=5+C.series.min}
    let din=T(C.meals.dinner);const dm=C.meals.dinnerMin;
    // hobbies de antes de cenar (deporte): después de llegar o, en fin de semana, con la comida ya hecha
    const todayH=o.trip?[]:(C.hobbies||[]).filter(h=>(h.days||[]).includes(i)&&h.min>0);
    for(const h of todayH.filter(h=>hobbyWhen(h)==='tarde')){
      let s=Math.max(t+5,o.weekend?H+90:t+5);if(s+h.min>din)s=Math.max(t+5,din-h.min);
      if(s+h.min>din+30){warn.push(`Hoy no da tiempo a ${h.label.toLowerCase()} antes de cenar.`);continue}
      if(s+h.min>din)din=s+h.min; // se retrasa la cena como mucho media hora
      if(s-t>=15)ev.push(B(t,s,'libre','Tiempo libre'));
      ev.push(B(s,s+h.min,SPORTY.test(h.label||'')?'deporte':'hobby',h.label,'',{short:h.label}));t=s+h.min;
    }
    const wantStudy=!opos&&!o.weekend&&i<5&&(C.evStudy.days||[]).includes(i);
    let studied=false;
    if(t<din){const g=din-t;
      if(wantStudy&&g>=45){const sd=Math.min(g,C.evStudy.min);if(g-sd>=15)ev.push(B(t,t+g-sd,'libre',!series&&!o.weekend&&g-sd>=60?'Tiempo libre o deporte':'Tiempo libre'));ev.push(B(din-sd,din,'estudio','Estudio','Repasa lo que has dado hoy'));studied=true}
      else if(g>=15)ev.push(B(t,din,'libre',!series&&!o.weekend&&g>=60&&i<5?'Tiempo libre o deporte':'Tiempo libre'));
      t=din}
    // cena, hueco, hobby, desconectar hasta dormir
    const hbs=todayH.filter(h=>hobbyWhen(h)==='noche').map(h=>({cat:'hobby',label:h.label,d:h.min,min:Math.min(15,h.min),drop:true}));
    let parts=[{cat:'comida',label:'Cena',d:dm,min:30},{cat:'hueco',d:0,min:0},...hbs,{cat:'rutina',label:'Desconectar',note:'Sin pantallas, deja listo lo de mañana',d:C.wind,min:10}];
    let avail=S-t,need=parts.reduce((a,p)=>a+p.d,0);
    if(avail>need){const gap=avail-need;
      if(wantStudy&&!studied&&gap>=60){parts.splice(1,0,{cat:'estudio',label:'Estudio',note:'Repasa lo que has dado hoy',d:Math.min(C.evStudy.min,gap-15)});}
      const n2=parts.reduce((a,p)=>a+p.d,0);parts.find(p=>p.cat==='hueco').d=Math.max(0,avail-n2)}
    else{let over=need-avail;
      for(const p of [parts.find(x=>x.cat==='rutina'),parts.find(x=>x.cat==='comida'),...parts.filter(x=>x.cat==='hobby')]){if(!p||over<=0)continue;const cut=Math.min(over,p.d-p.min);p.d-=cut;over-=cut}
      for(const hb of parts.filter(p=>p.cat==='hobby').reverse()){if(over<=0)break;over-=hb.d;hb.d=0;warn.push(`Hoy acabas tarde y no da tiempo a ${hb.label.toLowerCase()}.`)}
      if(over>0){S+=over;warn.push(`Hoy te acuestas a las ${clock(S)}.`)}}
    for(const p of parts){if(p.d<=0)continue;
      if(p.cat==='hueco'){if(p.d>=15)ev.push(B(t,t+p.d,'libre','Tiempo libre'));t+=p.d;continue}
      ev.push(B(t,t+p.d,p.cat,p.label,p.note||''));t+=p.d}
    blocks=[...blocks,...ev].filter(b=>b.e-b.s>0).sort((a,b)=>a.s-b.s||(a.fixed?-1:1));
    return{b:blocks,sleep:Math.max(S,t),warn,H,weekend:!!o.weekend,home:!!o.home};
  }

  const cache={},bcache={},scache={};
  const baseC=d=>bcache[ymd(d)]||(bcache[ymd(d)]=base(d));
  function seriesDays(mon){
    const k=ymd(mon);if(scache[k])return scache[k];
    const pick=[];
    if(C.series.on&&C.series.count>0){
      const fits=i=>{if(i>=5||tripOn(addDays(mon,i))||opos&&!C.series.on)return false;const P=baseC(addDays(mon,i));return P.H+5+C.series.min<=T(C.series.endBy)};
      const pref=(C.series.prefer||[0,1,2,3,4]).filter(i=>i<5);
      for(const pass of [0,1])for(const i of pref){if(pick.length>=C.series.count)break;if(pick.includes(i))continue;if(pass===0&&(pick.includes(i-1)||pick.includes(i+1)))continue;if(fits(i))pick.push(i)}
    }
    return scache[k]=pick.sort();
  }
  function plan(d){
    const k=ymd(d);if(cache[k])return cache[k];
    let P=baseC(d);
    if(seriesDays(monday(d)).includes(dow(d))){
      // rehace la tarde con series
      const pre=P.b.filter(b=>b.e<=P.H||(b.fixed&&b.s<P.H));
      const nextWake=morningOf(addDays(d,1)).wake;
      P=evening(d,{blocks:pre,H:P.H,S:nextWake+1440-Math.round(C.sleepH*60),warn:[...P.warn],series:true,home:P.home,weekend:P.weekend});
      P.series=true;
    }
    P.date=d;P.parity=parity(d);P.src=opos?'opos':usesTeamup&&inRange(d)?'teamup':C.source==='propio'?'propio':'tipo';P.trip=tripOn(d)||null;P.hol=holidayOf(d);P.holHome=homeHoliday(d);
    return cache[k]=P;
  }
  const wakeOf=d=>plan(d).b[0].s;
  const sleepDur=d=>wakeOf(addDays(d,1))+1440-plan(d).sleep;
  return{plan,wakeOf,sleepDur,seriesDays,parity,classes,usesTeamup,holidayOf,homeHoliday,weekWork,place};
}

/* lee un archivo .ics y devuelve [fecha, inicio, fin, título, lugar] (repite los RRULE semanales) */
function parseICS(text,horizonDays=300){
  const lines=text.replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'').split(/\r?\n/);
  const out=[];let ev=null;
  const un=s=>String(s||'').replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').trim();
  const dt=v=>{const m=String(v).match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?(Z)?/);if(!m)return null;
    let d=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));if(m[6])d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0)));return{d,allDay:!m[4]}};
  for(const raw of lines){
    if(raw==='BEGIN:VEVENT'){ev={};continue}
    if(raw==='END:VEVENT'){if(ev&&ev.s&&ev.e&&!ev.s.allDay){
        const push=(s,e2)=>{const p=n=>String(n).padStart(2,'0');out.push([`${s.getFullYear()}-${p(s.getMonth()+1)}-${p(s.getDate())}`,`${p(s.getHours())}:${p(s.getMinutes())}`,`${p(e2.getHours())}:${p(e2.getMinutes())}`,ev.title||'Clase',ev.loc||''])};
        const dur=ev.e.d-ev.s.d;push(ev.s.d,ev.e.d);
        if(ev.rrule&&/FREQ=WEEKLY/.test(ev.rrule)){const until=(ev.rrule.match(/UNTIL=([0-9TZ]+)/)||[])[1];const cnt=+((ev.rrule.match(/COUNT=(\d+)/)||[])[1]||0);
          const lim=until?dt(until).d:new Date(ev.s.d.getTime()+horizonDays*864e5);const ex=new Set(ev.ex||[]);
          for(let n=1,t=new Date(ev.s.d);;n++){t=new Date(t.getFullYear(),t.getMonth(),t.getDate()+7,t.getHours(),t.getMinutes());if(t>lim||(cnt&&n>=cnt))break;if(!ex.has(t.toDateString()))push(t,new Date(t.getTime()+dur))}}
      }ev=null;continue}
    if(!ev)continue;
    const i=raw.indexOf(':');if(i<0)continue;const key=raw.slice(0,i).split(';')[0].toUpperCase(),val=raw.slice(i+1);
    if(key==='SUMMARY')ev.title=un(val);else if(key==='LOCATION')ev.loc=un(val);else if(key==='DTSTART')ev.s=dt(val);else if(key==='DTEND')ev.e=dt(val);else if(key==='RRULE')ev.rrule=val;else if(key==='EXDATE')(ev.ex=ev.ex||[]).push(...val.split(',').map(v=>{const x=dt(v);return x?x.d.toDateString():''}));
  }
  return out.sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]));
}

/* reparte bloques solapados en columnas (para pintarlos lado a lado) */
function layoutCols(items){
  const s=[...items].sort((a,b)=>a.s-b.s||b.e-a.e);const out=[];let group=[],gEnd=-1;
  const flush=()=>{const cols=[];for(const it of group){let c=cols.findIndex(end=>end<=it.s);if(c<0){c=cols.length;cols.push(0)}cols[c]=it.e;it._col=c}group.forEach(it=>it._n=cols.length);out.push(...group);group=[]};
  for(const it of s){if(group.length&&it.s>=gEnd){flush();gEnd=-1}group.push(it);gEnd=Math.max(gEnd,it.e)}
  if(group.length)flush();return out;
}
