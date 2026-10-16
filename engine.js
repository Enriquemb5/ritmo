/* ================= Ritmo · motor de la rutina =================
   Genera cada día a partir de la configuración del cuestionario y de las
   clases reales de TeamUp. Todo en minutos desde las 00:00 (puede pasar de 1440). */

let CAT={S:[],L:[],E:[]},CAT_ID='',CAT_NAME='',CAT_SYNC='',COURSES=[],SUBJ=[],BYDAY={},CAT_FIRST='9999',CAT_LAST='0000',CALS=[];
const CLABEL=c=>/^\d+$/.test(c)?c+'º':/^\d+B$/.test(c)?c.slice(0,-1)+'º · grupo B':c;
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
  meals:{lunch:'14:00',lunchMin:45,dinner:'21:00',dinnerMin:45},
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
  if(!c.source)c.source=teamupId(c.teamup)?'teamup':'propio';
  if(c.margin==null)c.margin=10;
  return c;
}
const AGENDA_KINDS={tarea:'Tarea',recordatorio:'Recordatorio',examen:'Examen',entrega:'Entrega',viaje:'Viaje'};
function Engine(cfg,agenda=[]){
  const C=cfg;
  const trips=(agenda||[]).filter(a=>a.kind==='viaje'&&a.date);
  const tripOn=d=>{const k=ymd(d);return trips.find(t=>k>=t.date&&k<=(t.end||t.date))};
  const sel=new Set(C.subjects||[]);
  const parity=d=>C.parityA==null?'A':(isoWeek(d)%2===C.parityA?'A':'B');
  const rushy=t=>C.rush.some(([a,b])=>t>=T(a)&&t<T(b));
  const drive=dep=>rushy(dep)?C.commute.rush:C.commute.normal;
  const usesTeamup=C.source!=='propio'&&!!CAT_ID&&teamupId(C.teamup)===CAT_ID;
  const icsSel=new Set(C.icsSel||[]);
  const ICS={};(C.ics||[]).forEach(e=>{if(icsSel.has(e[3]))(ICS[e[0]]=ICS[e[0]]||[]).push(e)});
  const inRange=d=>{const k=ymd(d);return k>=CAT_FIRST&&k<=CAT_LAST};

  function classes(d){
    const out=[],k=ymd(d),i=dow(d);
    if(usesTeamup)(BYDAY[k]||[]).filter(e=>sel.has(SUBJ[e[3]].key)).forEach(e=>{
      const s=SUBJ[e[3]];out.push(B(T(e[1].slice(0,2)+':'+e[1].slice(2)),T(e[2].slice(0,2)+':'+e[2].slice(2)),'clase',s.name,[where(CAT.L[e[4]]),e[5]].filter(Boolean).join(' · '),{short:shortName(s.name),fixed:true}));
    });
    if(C.source==='propio'){
      const r=C.customRange||{};
      if((!r.from||k>=r.from)&&(!r.to||k<=r.to))for(const s of C.custom||[])for(const sl of s.slots||[])if(sl.dow===i&&sl.start&&sl.end)out.push(B(T(sl.start),T(sl.end),'clase',s.name,where(sl.loc||''),{short:shortName(s.name),fixed:true}));
      for(const e of ICS[k]||[])out.push(B(T(e[1]),T(e[2]),'clase',e[3],where(e[4]||''),{short:shortName(e[3]),fixed:true}));
    }
    return out.sort((a,b)=>a.s-b.s);
  }
  function events(d){
    const p=parity(d),i=dow(d);
    return (C.events||[]).filter(ev=>ev.dow===i&&(ev.freq==='all'||ev.freq===p)).map(ev=>B(T(ev.start),T(ev.end),ev.work?'trabajo':'evento',ev.label,ev.freq==='all'?'':`Semana ${ev.freq}`,{short:ev.label,fixed:true,isEvent:true}));
  }
  const workMin=i=>C.work.on&&i<5?(C.work.min[i]||0):0;
  const goesOut=(d,cls,evs)=>{const i=dow(d);return i<5&&(cls.length>0||(C.work.on&&C.work.place!=='casa'&&workMin(i)>0)||evs.length>0)};

  /* hora de salida y de despertar */
  function morningOf(d){
    const i=dow(d),cls=classes(d),evs=events(d),out=goesOut(d,cls,evs);
    if(i>=5||tripOn(d))return{wake:T(C.wakeWe),out:false,trip:!!tripOn(d)};
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
  function fillWork(occ,need,from,to,label,maxRun=105){
    const out=[];let run=0;
    for(const [a,z] of freeSlots(occ,from,to)){
      let t=a;if(z-a<20){run=0;continue}
      while(need>0&&t<z){
        if(run>=maxRun){const pe=Math.min(z,t+15);if(z-pe>=20)out.push(B(t,pe,'pausa','Pausa'));t=pe;run=0;continue}
        const len=Math.min(need,z-t,maxRun-run);if(len<15&&need>len)break;
        out.push(B(t,t+len,'trabajo',label));t+=len;need-=len;run+=len;
      }
      if(need<=0)break;run=0;
    }
    return{blocks:out,left:need};
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
    if(i>=5){
      // fin de semana
      let t=M.wake;blocks.push(B(t,t+60,'rutina','Despertar y desayuno sin prisa'));t+=60;
      if(C.weStudy.on){const s=Math.max(t,T(C.weStudy.start)),e=T(C.weStudy.end);if(s>t+15)blocks.push(B(t,s,'libre','Tiempo libre'));if(e-s>=30)blocks.push(B(s,e,'estudio','Estudio','Ejercicios y lo que vaya atrasado'));t=Math.max(t,e)}
      if(C.run.on&&C.run.dow===i){const s=Math.max(t,T(C.run.start));if(s-t>=15)blocks.push(B(t,s,'libre','Tiempo libre'));blocks.push(B(s,s+C.run.min,'deporte',C.run.label,'Incluye ir, calentar, estirar y ducha',{short:'Correr'}));t=s+C.run.min}
      const L0=T(C.meals.lunch);if(L0-t>=15)blocks.push(B(t,L0,'libre','Tiempo libre'));t=Math.max(t,L0);
      blocks.push(B(t,t+60,'comida','Comida'));t+=60;
      H=t;
      return evening(d,{blocks,H,S,warn,weekend:true,home:true});
    }
    const cls=M.cls||classes(d),evs=M.evs||events(d);
    if((usesTeamup&&inRange(d)&&sel.size||C.source==='propio'&&(C.custom.length||icsSel.size))&&!cls.length)warn.push('No tienes clases este día. Organiza la jornada como te venga mejor.');
    // solapes entre clases y eventos
    const fx=[...cls,...evs].sort((a,b)=>a.s-b.s);
    for(let a=0;a<fx.length;a++)for(let b=a+1;b<fx.length;b++)if(fx[b].s<fx[a].e&&fx[b].e>fx[a].s)warn.push(`Se solapan ${fx[a].label} y ${fx[b].label} (${clock(Math.max(fx[a].s,fx[b].s))}–${clock(Math.min(fx[a].e,fx[b].e))}).`);
    if(M.warn)warn.push(M.warn);
    let t=M.wake;
    blocks.push(B(t,t+C.morning,'rutina','Despertar, ducha y desayuno'));t+=C.morning;
    const W=workMin(i);
    if(!M.out){
      // día en casa
      let need=C.work.on&&C.work.place==='casa'?W:0;
      const occ=[...fx];const lunch=T(C.meals.lunch);
      if(need){const r=fillWork([...occ,B(lunch,lunch+C.meals.lunchMin,'x','')],need,t,T('20:00'),C.work.label);blocks.push(...r.blocks);occ.push(...r.blocks)}
      blocks.push(B(lunch,lunch+C.meals.lunchMin,'comida','Comida'));occ.push(blocks[blocks.length-1]);
      for(const [a,z] of freeSlots(occ,t,T('18:30')))if(z-a>=30)blocks.push(B(a,z,a<lunch?'estudio':'libre',a<lunch?'Estudio':'Tiempo libre'));
      blocks.push(...fx);
      return evening(d,{blocks,H:T('18:30'),S,warn,home:true});
    }
    // mañana en casa antes de salir
    const L=M.leave;
    if(C.work.on&&C.work.place==='casa'&&W>0&&L-15-t>=30){const r=fillWork([],Math.min(W,L-15-t),t,L-15,C.work.label);blocks.push(...r.blocks);t=r.blocks.length?r.blocks[r.blocks.length-1].e:t}
    if(L-15-t>=20){blocks.push(B(t,L-15,'estudio','Estudio en casa'));blocks.push(B(L-15,L,'rutina','Prepararte y salir',C.work.place==='uni'&&W?'Tupper para comer allí':''))}
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
    // comida
    const lunchAt=T(C.meals.lunch);
    const lslot=freeSlots(occ,lunchAt,T('17:00')).find(([a,z])=>z-a>=C.meals.lunchMin-10);
    let lunchB=null;
    if(lslot&&lslot[0]<T('16:30')){const dd=Math.min(C.meals.lunchMin,lslot[1]-lslot[0]);lunchB=B(lslot[0],lslot[0]+dd,'comida','Comida',meet&&lslot[0]===meet.e?'Nada más salir de la reunión':'');camp.push(lunchB);occ.push(lunchB)}
    else if(A<T('13:00'))warn.push('Hoy no hay hueco para comer tranquilo: lleva algo para picar entre clases.');
    // resto del trabajo
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
    const din=T(C.meals.dinner),dm=C.meals.dinnerMin;
    const wantStudy=i<5&&(C.evStudy.days||[]).includes(i);
    let studied=false;
    if(t<din){const g=din-t;
      if(wantStudy&&g>=45){const sd=Math.min(g,C.evStudy.min);if(g-sd>=15)ev.push(B(t,t+g-sd,'libre',!series&&!o.weekend&&g-sd>=60?'Tiempo libre o deporte':'Tiempo libre'));ev.push(B(din-sd,din,'estudio','Estudio','Repasa lo que has dado hoy'));studied=true}
      else if(g>=15)ev.push(B(t,din,'libre',!series&&!o.weekend&&g>=60&&i<5?'Tiempo libre o deporte':'Tiempo libre'));
      t=din}
    // cena, hueco, hobby, desconectar hasta dormir
    const hbs=o.trip?[]:(C.hobbies||[]).filter(h=>(h.days||[]).includes(i)&&h.min>0).map(h=>({cat:'hobby',label:h.label,d:h.min,min:Math.min(15,h.min),drop:true}));
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
      const fits=i=>{if(i>=5||tripOn(addDays(mon,i)))return false;const P=baseC(addDays(mon,i));return P.H+5+C.series.min<=T(C.series.endBy)};
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
      P=evening(d,{blocks:pre,H:P.H,S:nextWake+1440-Math.round(C.sleepH*60),warn:[...P.warn],series:true,home:P.home});
      P.series=true;
    }
    P.date=d;P.parity=parity(d);P.src=usesTeamup&&inRange(d)?'teamup':C.source==='propio'?'propio':'tipo';P.trip=tripOn(d)||null;
    return cache[k]=P;
  }
  const wakeOf=d=>plan(d).b[0].s;
  const sleepDur=d=>wakeOf(addDays(d,1))+1440-plan(d).sleep;
  return{plan,wakeOf,sleepDur,seriesDays,parity,classes,usesTeamup};
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
