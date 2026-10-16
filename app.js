/* ================= Ritmo · interfaz ================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const DN=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],DS=['lun','mar','mié','jue','vie','sáb','dom'],DL=['L','M','X','J','V','S','D'];
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const CATN={clase:'Clases',trabajo:'Trabajo',estudio:'Estudio',deporte:'Deporte',trayecto:'Trayectos',comida:'Comidas',libre:'Tiempo libre',hobby:'Hobbies',rutina:'Rutina',evento:'Eventos',viaje:'Viaje'};
const KINDS=AGENDA_KINDS;
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const setP=(o,p,v)=>{const ks=p.split('.');let a=o;ks.slice(0,-1).forEach(k=>a=a[k]);a[ks[ks.length-1]]=v};
const parseDate=k=>{const [Y,M,D]=k.split('-').map(Number);return new Date(Y,M-1,D)};
const ICON={
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  wave:'<svg viewBox="0 0 24 24"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};

/* ---------- logo (propuesta B): R de reloj con check ---------- */
let logoN=0;
function logo(size=40,mode='grad'){const id='lg'+(++logoN);const C={x:48,y:46},R=28,w=9;
  const pt=a=>{const r=a*Math.PI/180;return[+(C.x+R*Math.cos(r)).toFixed(2),+(C.y+R*Math.sin(r)).toFixed(2)]};
  const e=pt(30),s=pt(168),col=mode==='grad'?`url(#${id})`:mode;
  return`<svg class="logo" width="${size}" height="${size}" viewBox="2 4 96 96" role="img" aria-label="Ritmo"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--g1)"/><stop offset="1" stop-color="var(--g2)"/></linearGradient></defs>
  <g fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M52 64 L${e} A${R} ${R} 0 1 0 ${s}"/><path d="M52 64 L81 91"/><path d="M15 69 L25 79 L40 64"/><path d="M48 46 L58 28" stroke-width="${w*.85}"/></g><circle cx="48" cy="46" r="${w*.7}" fill="${col}"/></svg>`}

/* ---------- colores según la hora ---------- */
const PAL={
  man:{name:'Mañana',l:{g1:'#FF7A2F',g2:'#FFB52E',ac:'#D9600F',b1:'#FBE3D0',b2:'#F7EDCF'},d:{g1:'#FF8C4A',g2:'#FFC457',ac:'#FF9A50',b1:'#4A230E',b2:'#3D2E0A'}},
  dia:{name:'Mediodía',l:{g1:'#1F5BFF',g2:'#16B3C9',ac:'#0A6CF0',b1:'#D5E2FB',b2:'#D3EEEA'},d:{g1:'#4C8DFF',g2:'#48D8E6',ac:'#3F8CFF',b1:'#0E2C63',b2:'#0B3A39'}},
  tar:{name:'Atardecer',l:{g1:'#4C5BD4',g2:'#E8833A',ac:'#4553C9',b1:'#DCE0F5',b2:'#F3E4D6'},d:{g1:'#7F8BF0',g2:'#F0A060',ac:'#8C97FF',b1:'#171D45',b2:'#2E2010'}},
  noc:{name:'Noche',l:{g1:'#1D3A8A',g2:'#5B7BE0',ac:'#2F4FC4',b1:'#C9D3F2',b2:'#D8DCF6'},d:{g1:'#5B7BE0',g2:'#9DB2FF',ac:'#7E9BFF',b1:'#0B1E4D',b2:'#1A2350'}}
};
const periodOf=d=>{const h=d.getHours()+d.getMinutes()/60;return h>=6&&h<12?'man':h>=12&&h<18?'dia':h>=18&&h<21.5?'tar':'noc'};
const mqDark=window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){
  const p=cfg&&cfg.timeColors===false?'dia':periodOf(now),v=PAL[p][mqDark.matches?'d':'l'],r=document.documentElement.style;
  r.setProperty('--g1',v.g1);r.setProperty('--g2',v.g2);r.setProperty('--accent',v.ac);r.setProperty('--blob1',v.b1);r.setProperty('--blob2',v.b2);
  document.documentElement.dataset.period=p;
}

/* ---------- guardado: este dispositivo y, si inicias sesión, Supabase ---------- */
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const loadScript=src=>new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s)});
const NCOLS='id,date,text,kind,time,created,end,done';
const Store={mode:'local',sb:null,user:null,cb:null,
  async init(){const C=window.RITMO_CONFIG||{};if(!C.supabaseUrl||!C.supabaseKey)return;
    try{await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
      this.sb=window.supabase.createClient(C.supabaseUrl,C.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
      const {data}=await this.sb.auth.getSession();if(data&&data.session){this.user=data.session.user;this.mode='cloud'}}catch(e){this.sb=null}},
  get uid(){return this.user&&this.user.id},
  async loadCfg(){const l=LS.get('ritmo-cfg',null);if(this.mode!=='cloud')return l;
    try{const {data,error}=await this.sb.from('perfiles').select('cfg').eq('user_id',this.uid).maybeSingle();if(error)throw error;
      if(data&&data.cfg){LS.set('ritmo-cfg',data.cfg);return data.cfg}if(l)await this.saveCfg(l);return l}catch(e){return l}},
  async saveCfg(c){LS.set('ritmo-cfg',c);if(this.mode==='cloud'){const {error}=await this.sb.from('perfiles').upsert({user_id:this.uid,cfg:c,updated_at:new Date().toISOString()});if(error)throw error}},
  local(){return LS.get('ritmo-notas',[])},
  emit(a){LS.set('ritmo-notas',a);if(this.cb)this.cb(a)},
  watchNotes(cb){this.cb=cb;cb(this.local());if(this.mode==='cloud')this.pull()},
  async pull(){if(this.mode!=='cloud')return;const {data,error}=await this.sb.from('notas').select(NCOLS).eq('user_id',this.uid);if(!error&&data)this.emit(data.map(r=>({...r,time:r.time||'',end:r.end||'',done:!!r.done})))},
  async addNote(n){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').insert({...n,user_id:this.uid});if(error)throw error;return this.pull()}this.emit([...this.local(),{id:'n'+Date.now(),...n}])},
  async updNote(id,p){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').update(p).eq('id',id);if(error)throw error;return this.pull()}this.emit(this.local().map(n=>n.id===id?{...n,...p}:n))},
  async delNote(id){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').delete().eq('id',id);if(error)throw error;return this.pull()}this.emit(this.local().filter(n=>n.id!==id))},
  async sendCode(email){const {error}=await this.sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error},
  async verify(email,token){const {data,error}=await this.sb.auth.verifyOtp({email,token,type:'email'});if(error)throw error;this.user=data.user;this.mode='cloud';
    const loc=this.local().filter(n=>String(n.id).startsWith('n'));
    if(loc.length)await this.sb.from('notas').insert(loc.map(({id,...n})=>({...n,user_id:this.uid})));
    const c=await this.loadCfg();if(c){cfg=normCfg(c);await loadCatalog(teamupId(cfg.teamup));rebuild()}await this.pull()},
  async signOut(){if(this.sb)await this.sb.auth.signOut();this.user=null;this.mode='local'},
  async reset(){if(this.mode==='cloud'){await this.sb.from('notas').delete().eq('user_id',this.uid);await this.sb.from('perfiles').delete().eq('user_id',this.uid)}LS.del('ritmo-cfg');LS.del('ritmo-notas');notes=[]}
};

let cfg=null,E=null,notes=[],now=new Date(),ob=null;
const view={tab:'hoy',sel:sod(new Date()),span:LS.get('ritmo-span',7)};
const rebuild=()=>{E=cfg?Engine(cfg,notes):null};
const nmin=()=>now.getHours()*60+now.getMinutes();
const itemsOn=d=>{const k=ymd(d);return notes.filter(n=>n.kind==='viaje'?k>=n.date&&k<=(n.end||n.date):n.date===k).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')||(a.created||0)-(b.created||0))};
const kindOf=ns=>['examen','entrega','viaje','tarea','recordatorio'].find(k=>ns.some(n=>n.kind===k&&!n.done))||'';
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
/* cuántos días caben: móvil 1, móvil en horizontal 3, ordenador 2-7 (por defecto la semana) */
function cols(){const w=window.innerWidth,h=window.innerHeight;if(w>=900)return Math.max(2,view.span||7);if(w>h&&w>=560)return 3;return 1}

/* ================= cuestionario ================= */
const sw=(p,v)=>`<label class="sw"><input type="checkbox" data-sw="${p}"${v?' checked':''}><span></span></label>`;
const seg=(p,opts,v,wide)=>`<div class="seg${wide?' wide':''}" role="group">${opts.map(([val,l])=>`<button type="button" data-seg="${p}" data-v="${esc(JSON.stringify(val))}" aria-pressed="${JSON.stringify(val)===JSON.stringify(v)}">${l}</button>`).join('')}</div>`;
const fmtV=(v,f)=>f==='h'?`${String(v).replace('.',',')} h`:f==='min'?hm(v):f==='workh'?(v?`${String(v/60).replace('.',',')} h`:'—'):f==='x'?`${v}×`:v;
const stp=(p,v,mn,mx,st,f)=>`<div class="stp"><button type="button" data-stp="${p}" data-d="${-st}" data-min="${mn}" data-max="${mx}" aria-label="Menos">−</button><output>${fmtV(v,f)}</output><button type="button" data-stp="${p}" data-d="${st}" data-min="${mn}" data-max="${mx}" aria-label="Más">+</button></div>`;
const row=(lab,ctrl,sm)=>`<div class="row"><span class="lab">${lab}${sm?`<small>${sm}</small>`:''}</span>${ctrl}</div>`;
const tin=(p,v)=>`<input type="time" data-bind="${p}" value="${esc(v)}">`;
const txt=(p,v,ph)=>`<input type="text" data-bind="${p}" value="${esc(v)}" placeholder="${esc(ph)}">`;
const grp=(h,body,foot)=>`<section class="grp">${h?`<h4>${h}</h4>`:''}<div class="list">${body}</div>${foot?`<p class="foot">${foot}</p>`:''}</section>`;
const head=(n,t,l)=>`<p class="eyebrow">${n}</p><h1 class="display">${t}</h1>${l?`<p class="lede">${l}</p>`:''}`;
const dayChips=(path,days)=>`<div class="chips">${DL.map((l,i)=>`<button type="button" data-days="${path}" data-i="${i}" aria-pressed="${(days||[]).includes(i)}">${DN[i].slice(0,3)}</button>`).join('')}</div>`;

const known=url=>!!CAT_ID&&teamupId(url)===CAT_ID;
const calOf=url=>CALS.find(c=>c.id===teamupId(url));
function tuStatus(url){
  if(!url.trim())return`<div class="status no"><span><b>Sin enlace todavía</b>Pégalo cuando lo tengas. Puedes seguir sin él.</span></div>`;
  const m=calOf(url);if(m)return`<div class="status ok"><span><b>${esc(m.name)}</b>Calendario reconocido${known(url)?` · ${CAT.E.length} clases, sincronizado el ${CAT_SYNC}`:''}.</span></div>`;
  if(teamupId(url))return`<div class="status no"><span><b>Enlace guardado</b>Este calendario aún no está en Ritmo. Se añade en data/calendars.json del repositorio y se sincroniza solo cada día.</span></div>`;
  return`<div class="status no"><span><b>No parece un enlace de TeamUp</b>Debería ser algo como teamup.com/ks…</span></div>`;
}
/* horario propio: asignaturas escritas a mano o importadas */
function customEditor(d){
  const subs=d.custom||[];
  return grp('Asignaturas a mano',subs.map((s,i)=>`<div class="mtg"><input class="full" type="text" data-bind="custom.${i}.name" value="${esc(s.name)}" placeholder="Nombre de la asignatura" aria-label="Asignatura">
    ${(s.slots||[]).map((sl,j)=>`<select data-bindn="custom.${i}.slots.${j}.dow" aria-label="Día">${DN.slice(0,6).map((n,k)=>`<option value="${k}"${k===sl.dow?' selected':''}>${n}</option>`).join('')}</select>
      <input type="text" data-bind="custom.${i}.slots.${j}.loc" value="${esc(sl.loc||'')}" placeholder="Aula" aria-label="Aula">
      <input type="time" data-bind="custom.${i}.slots.${j}.start" value="${esc(sl.start)}" aria-label="Empieza"><input type="time" data-bind="custom.${i}.slots.${j}.end" value="${esc(sl.end)}" aria-label="Termina">
      <button type="button" class="del" data-delslot="${i}.${j}">Quitar este horario</button>`).join('')}
    <button type="button" class="addrow" style="grid-column:1/-1;padding:6px 0" data-addslot="${i}">+ Otro día</button>
    <button type="button" class="del" data-delsub="${i}">Quitar asignatura</button></div>`).join('')+`<button type="button" class="addrow" data-addsub>+ Añadir asignatura</button>`,'Cada asignatura puede tener varios días. Se repiten cada semana dentro del periodo de clases.');
}
function icsPicker(d){
  if(!(d.ics||[]).length)return'';
  const cnt={};d.ics.forEach(e=>cnt[e[3]]=(cnt[e[3]]||0)+1);const sel=new Set(d.icsSel);
  const names=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
  return`<details class="course" open><summary>Del archivo importado<span class="n">${names.filter(n=>sel.has(n)).length} de ${names.length}</span></summary>${names.map(n=>`<button type="button" class="subj" role="checkbox" aria-checked="${sel.has(n)}" data-icssel="${esc(n)}"><span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="nm">${esc(n)}<small>${cnt[n]} clases</small></span></button>`).join('')}</details>`;
}
const STEPS=[
 {id:'hola',btn:'Empezar',render:()=>`<section class="hero-ob">${logo(64)}${head('Ritmo','Tu semana,<br><span class="grad">en orden.</span>','Cuéntame cómo es tu día y monto tu rutina con tus clases, tu trabajo, tu deporte, tus hobbies y tus ratos libres.')}
   <ul class="feat"><li data-c="clase"><span class="ic">${ICON.cal}</span><span><b>Tus clases</b>Desde TeamUp, desde un archivo de calendario o escritas a mano.</span></li>
   <li data-c="trabajo"><span class="ic">${ICON.wave}</span><span><b>Se adapta cada día</b>Si una clase cambia, te vas de viaje o tienes un examen, la rutina se reorganiza.</span></li>
   <li data-c="hobby"><span class="ic">${ICON.heart}</span><span><b>Tiempo para ti</b>Deporte, tus hobbies y ratos libres, durmiendo lo que necesitas.</span></li></ul></section>`},
 {id:'nombre',render:d=>`${head('Paso 1 de 6','¿Cómo te<br>llamas?')}<input class="big-in" data-bind="name" value="${esc(d.name)}" placeholder="Tu nombre" autocomplete="given-name" aria-label="Tu nombre">`,ok:d=>d.name.trim().length>0},
 {id:'clases',render:d=>`${head('Paso 2 de 6','Tus clases','¿De dónde saco tu horario?')}
   ${grp('',`<div class="row">${seg('source',[['teamup','TeamUp'],['propio','Mi propio horario']],d.source,true)}</div>`)}
   ${d.source==='teamup'?`${grp('Calendario de TeamUp',`<div class="row"><input type="url" data-bind="teamup" value="${esc(d.teamup)}" placeholder="https://teamup.com/ks…" inputmode="url" autocomplete="off" aria-label="Enlace de TeamUp"></div>`)}
   <div id="tuSt">${tuStatus(d.teamup)}</div>
   ${grp('Curso',`<div class="row">${seg('course',[['1','1º'],['2','2º'],['3','3º'],['4','4º']],d.course,true)}</div>`)}`
   :`${grp('Importar archivo de calendario',`<label class="row file"><span class="lab">Elegir archivo .ics<small>Lo exportan Google Calendar, Outlook, Apple Calendar y muchas universidades.</small></span><input type="file" accept=".ics,text/calendar" id="icsFile" aria-label="Archivo .ics"></label>`,d.ics.length?`${d.ics.length} clases importadas. Elige cuáles quieres en el siguiente paso.`:'')}
   ${grp('¿Tienes el horario en foto o PDF?',`<div class="row"><span class="lab">Mándaselo a Claude<small>Pídele «el código de Ritmo de mi horario» y pégalo aquí.</small></span></div><div class="row"><input type="text" id="codeIn" placeholder="Pega aquí el código" autocomplete="off" aria-label="Código del horario"></div><button type="button" class="addrow" data-pastecode>Usar este código</button>`)}
   <p class="lede" style="font-size:15px">También puedes escribir tus asignaturas a mano en el siguiente paso.</p>`}`},
 {id:'asig',render:d=>{
   if(d.source==='propio')return`${head('Paso 3 de 6','Tus asignaturas','Marca las que quieres ver y añade las que falten.')}${icsPicker(d)}${customEditor(d)}
     ${grp('Periodo de clases',row('Desde',`<input type="date" data-bind="customRange.from" value="${esc(d.customRange.from)}">`)+row('Hasta',`<input type="date" data-bind="customRange.to" value="${esc(d.customRange.to)}">`),'Fuera de estas fechas no se ponen las clases escritas a mano. Déjalo vacío si no lo sabes.')}`;
   const ok=known(d.teamup);
   if(!ok)return`${head('Paso 3 de 6','Tus asignaturas')}<div class="status no"><span><b>Primero hace falta tu calendario</b>Cuando tu TeamUp esté sincronizado podrás elegir aquí tus asignaturas. También puedes volver atrás y usar tu propio horario.</span></div>`;
   const sel=new Set(d.subjects);const cnt={};CAT.E.forEach(e=>cnt[e[3]]=(cnt[e[3]]||0)+1);
   const body=COURSES.map(([c,l])=>{const list=SUBJ.filter(s=>s.course===c&&cnt[s.i]>=3).sort((a,b)=>a.name.localeCompare(b.name));const n=list.filter(s=>sel.has(s.key)).length;
     const open=c===d.course||(c==='1B'&&d.course==='1')||n>0;
     return`<details class="course"${open?' open':''}><summary>${l}<span class="n">${n?`${n} de ${list.length}`:list.length+' asignaturas'}</span></summary>${list.map(s=>`<button type="button" class="subj" role="checkbox" aria-checked="${sel.has(s.key)}" data-subj="${esc(s.key)}"><span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="nm">${esc(s.name)}<small>${cnt[s.i]} clases</small></span></button>`).join('')}</details>`}).join('');
   return`${head('Paso 3 de 6','Tus asignaturas','Marca las que quieres ver en tu calendario. Puedes mezclar cursos.')}<div>${body}</div><p class="foot" style="margin:0 16px;color:var(--fg2);font-size:13px">${sel.size} seleccionadas. Si dos se cruzan, las verás una al lado de la otra.</p>`}},
 {id:'dia',render:d=>`${head('Paso 4 de 6','Tu día','Cuánto duermes, a qué hora te levantas y cuánto tardas en llegar.')}
   ${grp('Sueño',row('Horas de sueño',stp('sleepH',d.sleepH,5,10,.5,'h'))+row('Me levanto entre semana',tin('wakeWk',d.wakeWk))+row('Fin de semana',tin('wakeWe',d.wakeWe)))}
   ${grp('Trayecto a la universidad',row('Normal',stp('commute.normal',d.commute.normal,0,150,5,'min'))+row('En hora punta',stp('commute.rush',d.commute.rush,0,180,5,'min'))+row('Llegar con margen',stp('margin',d.margin,0,45,5,'min'),'Para aparcar, imprevistos o tráfico'),'Horas punta: 7:30–9:30, 13:30–15:30 y 17:30–19:30.')}
   ${grp('Salgo de casa',d.leave.map((v,i)=>`<div class="daygrid"><span class="d">${DL[i]}</span>${v==='auto'?`<span style="color:var(--fg2);font-size:15px">Justo para llegar</span>`:`<input type="time" data-bind="leave.${i}" value="${esc(v)}" style="border:0;background:var(--fill);border-radius:8px;padding:5px 8px;justify-self:start">`}<div class="seg"><button type="button" data-leave="${i}" data-v="t" aria-pressed="${v!=='auto'}">Hora</button><button type="button" data-leave="${i}" data-v="auto" aria-pressed="${v==='auto'}">Auto</button></div></div>`).join(''),'Con «Auto» sales justo para llegar a tu primera clase con el margen que has puesto.')}`},
 {id:'trabajo',render:d=>{const w=d.work;const tot=w.min.reduce((a,b)=>a+b,0);
   return`${head('Paso 5 de 6','Trabajo','Si trabajas o haces prácticas, lo coloco alrededor de tus clases.')}
   ${grp('',row('Trabajo o prácticas',sw('work.on',w.on)))}
   ${w.on?`${grp('Dónde',`<div class="row">${seg('work.place',[['uni','Junto a la uni'],['casa','En casa']],w.place,true)}</div>`)}
   ${grp('Horas por día',w.min.map((v,i)=>`<div class="daygrid"><span class="d">${DL[i]}</span>${stp('work.min.'+i,v,0,600,30,'workh')}${seg('work.after.'+i,[[false,'Mañana'],[true,'Tarde']],w.after[i])}</div>`).join(''),`${hm(tot)} a la semana, contando las reuniones de trabajo.`)}
   ${grp('Reuniones fijas',(d.events.map((e,i)=>`<div class="mtg"><input class="full" type="text" data-bind="events.${i}.label" value="${esc(e.label)}" placeholder="Nombre" aria-label="Nombre de la reunión">
     <select data-bindn="events.${i}.dow" aria-label="Día">${DN.slice(0,5).map((n,k)=>`<option value="${k}"${k===e.dow?' selected':''}>${n}</option>`).join('')}</select>
     <select data-bind="events.${i}.freq" aria-label="Frecuencia"><option value="all"${e.freq==='all'?' selected':''}>Cada semana</option><option value="A"${e.freq==='A'?' selected':''}>Semanas A</option><option value="B"${e.freq==='B'?' selected':''}>Semanas B</option></select>
     <input type="time" data-bind="events.${i}.start" value="${esc(e.start)}" aria-label="Empieza"><input type="time" data-bind="events.${i}.end" value="${esc(e.end)}" aria-label="Termina">
     <button type="button" class="del" data-delev="${i}">Quitar reunión</button></div>`).join(''))+`<button type="button" class="addrow" data-addev>+ Añadir reunión</button>`,'Las semanas A y B se van alternando. En Ajustes eliges cuál es la de esta semana.')}`:''}`}},
 {id:'habitos',render:d=>`${head('Paso 6 de 6','Tus hábitos','Deporte, hobbies y estudio: lo que quieres que tenga hueco cada semana.')}
   ${grp('Hobbies',(d.hobbies.map((h,i)=>`<div class="mtg"><input class="full" type="text" data-bind="hobbies.${i}.label" value="${esc(h.label)}" placeholder="Guitarra, leer, dibujar…" aria-label="Hobby">
     <div class="full" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span style="color:var(--fg2);font-size:15px">Cada vez</span>${stp(`hobbies.${i}.min`,h.min,10,180,5,'min')}</div>
     <div class="full">${dayChips(`hobbies.${i}.days`,h.days)}</div>
     <button type="button" class="del" data-delhob="${i}">Quitar hobby</button></div>`).join(''))+`<button type="button" class="addrow" data-addhob>+ Añadir hobby</button>`,'Van por la noche, después de cenar. Si un día acabas tarde, se acortan antes de quitarte sueño.')}
   ${grp('Deporte entre semana',row('Activado',sw('series.on',d.series.on))+(d.series.on?row('Qué',txt('series.label',d.series.label,'Series en pista'))+row('Días por semana',stp('series.count',d.series.count,1,5,1,'x'))+row('Duración',stp('series.min',d.series.min,30,240,15,'min'),'Desde que sales hasta que vuelves')+row('Terminar antes de',tin('series.endBy',d.series.endBy)):''))}
   ${grp('Deporte el fin de semana',row('Activado',sw('run.on',d.run.on))+(d.run.on?row('Qué',txt('run.label',d.run.label,'Carrera'))+row('Día',seg('run.dow',[[5,'Sábado'],[6,'Domingo']],d.run.dow))+row('Hora',tin('run.start',d.run.start))+row('Duración',stp('run.min',d.run.min,30,240,15,'min')):''))}
   ${grp('Estudio por la noche',`<div class="row">${dayChips('evStudy.days',d.evStudy.days)}</div>`+row('Duración',stp('evStudy.min',d.evStudy.min,30,180,15,'min')),'Si ese día llegas pronto a casa, repasas antes o después de cenar.')}
   ${grp('Comidas',row('Comida a partir de',tin('meals.lunch',d.meals.lunch))+row('Cena',tin('meals.dinner',d.meals.dinner)))}`},
 {id:'listo',btn:'Crear mi rutina',render:d=>{const tot=d.work.on?d.work.min.reduce((a,b)=>a+b,0):0;const ns=d.source==='propio'?d.custom.length+d.icsSel.length:d.subjects.length;
   return`<section class="hero-ob">${logo(56)}${head('Todo listo',`Hola,<br><span class="grad">${esc(d.name||'tú')}</span>`,'Esto es lo que voy a tener en cuenta. Puedes cambiarlo cuando quieras en Ajustes.')}
   <ul class="feat"><li data-c="clase"><span class="ic">${ICON.cal}</span><span><b>${ns} asignaturas</b>${d.source==='propio'?'Tu propio horario':known(d.teamup)?esc(CAT_NAME):'Sin calendario sincronizado'}</span></li>
   <li data-c="trabajo"><span class="ic">${ICON.wave}</span><span><b>${tot?hm(tot)+' de trabajo':'Sin trabajo'}</b>${tot?(d.work.place==='uni'?'Junto a la universidad':'En casa')+(d.events.length?` · ${d.events.length} reuniones fijas`:''):'Más tiempo para estudiar'}</span></li>
   <li data-c="deporte"><span class="ic">${ICON.heart}</span><span><b>${String(d.sleepH).replace('.',',')} h de sueño</b>${[d.series.on?`${d.series.label} ${d.series.count}×`:'',d.run.on?`${d.run.label} el ${DN[d.run.dow].toLowerCase()}`:'',...d.hobbies.map(h=>h.label)].filter(Boolean).join(' · ')||'Sin hábitos fijos'}</span></li></ul></section>`}}
];
function startOB(step=0,edit=false){ob={step,d:normCfg(clone(cfg||DEFAULT_CFG)),edit};$('#tabs').hidden=true;$('#fab').hidden=true;renderOB(true)}
function renderOB(top){
  const st=STEPS[ob.step],d=ob.d,y=window.scrollY;
  const n=STEPS.length-1,label=ob.edit?'Guardar':st.btn||'Continuar';
  $('#app').innerHTML=`<div class="ob wrap${top?' screen-in':''}"><div class="obtop">${ob.step>0||ob.edit?`<button class="back" data-ob="back">‹ ${ob.edit?'Ajustes':'Atrás'}</button>`:'<span></span>'}${ob.edit||ob.step===0?'<span></span>':`<div class="prog" aria-hidden="true"><i style="width:${ob.step/n*100}%"></i></div>`}<span></span></div>
    <div class="obbody">${st.render(d)}</div></div>
    <div class="obfoot"><div class="wrap"><button class="cta" data-ob="next" id="obNext"${st.ok&&!st.ok(d)?' disabled':''}>${label}</button></div></div>`;
  if(top)window.scrollTo(0,0);else window.scrollTo(0,y);
}
async function obNext(){
  const st=STEPS[ob.step];if(st.ok&&!st.ok(ob.d))return;
  if(st.id==='clases'&&ob.d.source==='teamup'){$('#obNext').disabled=true;await loadCatalog(teamupId(ob.d.teamup))}
  if(ob.edit&&st.id==='clases'){ob.step++;renderOB(true);return}
  if(ob.edit||st.id==='listo'){
    const c=ob.d;c.name=c.name.trim();
    if(c.parityA==null&&c.events.some(e=>e.freq!=='all'))c.parityA=isoWeek(new Date())%2;
    $('#obNext').disabled=true;
    try{await Store.saveCfg(c)}catch(e){toast('No se ha podido guardar. Inténtalo otra vez.');$('#obNext').disabled=false;return}
    const wasEdit=ob.edit;cfg=c;rebuild();ob=null;view.tab=wasEdit?'ajustes':'hoy';view.sel=sod(new Date());applyTheme();render(true);toast(wasEdit?'Guardado':'Tu rutina está lista');return;
  }
  ob.step++;renderOB(true);
}
function obBack(){if(ob.edit&&STEPS[ob.step].id==='asig'&&ob.fromClases){ob.step--;renderOB(true);return}if(ob.edit||ob.step===0){if(cfg){ob=null;render(true)}return}ob.step--;renderOB(true)}
/* código que devuelve Claude a partir de una foto/PDF del horario */
function importCode(raw){
  let j;try{j=JSON.parse(raw.trim().replace(/^```(json)?|```$/g,''))}catch(e){return'El código no es válido. Cópialo entero, desde la primera llave hasta la última.'}
  const subs=j.asignaturas||j.subjects||[];if(!Array.isArray(subs)||!subs.length)return'El código no trae asignaturas.';
  const dmap={l:0,lunes:0,m:1,martes:1,x:2,'miércoles':2,miercoles:2,j:3,jueves:3,v:4,viernes:4,s:5,'sábado':5,sabado:5};
  ob.d.custom=subs.map((s,i)=>({id:'s'+Date.now()+i,name:String(s.nombre||s.name||'Asignatura'),slots:(s.clases||s.slots||[]).map(c=>({dow:typeof c.dia==='number'?c.dia:(dmap[String(c.dia??c.day??'').toLowerCase()]??0),start:String(c.inicio||c.start||'09:00'),end:String(c.fin||c.end||'10:00'),loc:String(c.aula||c.loc||'')}))}));
  if(j.desde||j.from)ob.d.customRange.from=String(j.desde||j.from);if(j.hasta||j.to)ob.d.customRange.to=String(j.hasta||j.to);
  return'';
}

/* ================= app ================= */
function greet(){const h=now.getHours();return h<6?'Buenas noches':h<14?'Buenos días':h<21?'Buenas tardes':'Buenas noches'}
function summary(P){
  const cl=P.b.filter(b=>b.cat==='clase').length,w=P.b.filter(b=>b.cat==='trabajo').reduce((a,b)=>a+b.e-b.s,0),sp=P.b.find(b=>b.cat==='deporte');
  const p=[];if(P.trip)p.push('De viaje');if(cl)p.push(`${cl} ${cl>1?'clases':'clase'}`);if(w)p.push(`${hm(w)} de trabajo`);if(sp)p.push(`${sp.label.toLowerCase()} a las ${clock(sp.s)}`);if(!p.length)p.push('Día tranquilo');
  return p.join(' · ');
}
function status(){
  const td=sod(now),t=nmin(),P=E.plan(td),Y=E.plan(addDays(td,-1)),N=E.plan(addDays(td,1));
  if(t<Y.sleep-1440){const tt=t+1440,cur=Y.b.find(b=>tt>=b.s&&tt<b.e);if(cur){const nx=Y.b.find(b=>b.s>=cur.e);return{cur,t:tt,next:nx||{label:'Dormir',s:Y.sleep}}}return{late:true,s:Y.sleep,next:P.b[0]}}
  if(t<P.b[0].s)return{sleep:true,e:P.b[0].s,next:P.b[0]};
  const cur=P.b.filter(b=>t>=b.s&&t<b.e).sort((a,b)=>(b.fixed?1:0)-(a.fixed?1:0))[0];
  if(cur){const nx=P.b.find(b=>b.s>=cur.e);return{cur,t,next:nx||{label:'Dormir',s:P.sleep}}}
  const nx=P.b.find(b=>b.s>t);if(nx)return{gap:true,t,next:nx};
  if(t<P.sleep)return{late:true,s:P.sleep,next:N.b[0]};
  return{sleep:true,e:N.b[0].s,next:N.b[0]};
}
function nowCard(){
  const s=status();
  if(s.cur){const b=s.cur,p=Math.min(100,Math.max(0,(s.t-b.s)/(b.e-b.s)*100));
    return`<section class="glass now" data-c="${b.cat}" aria-live="polite"><div class="k">Ahora · ${CATN[b.cat]||''}</div><h2>${esc(b.label)}</h2>${b.note?`<div class="sub">${esc(b.note)}</div>`:''}
    <div class="bar"><i style="width:${p}%"></i></div><div class="r2"><span>${clock(b.s)} – ${clock(b.e)}</span><span>quedan ${hm(b.e-s.t)}</span></div>
    <div class="nx"><span>Después</span><b>${esc(s.next.label)}</b><em>${clock(s.next.s)}</em></div></section>`}
  if(s.gap)return`<section class="glass now" data-c="${s.next.cat}"><div class="k">Siguiente</div><h2>${esc(s.next.label)}</h2><div class="sub">A las ${clock(s.next.s)}, dentro de ${hm(s.next.s-s.t)}${s.next.note?` · ${esc(s.next.note)}`:''}</div></section>`;
  if(s.late)return`<section class="glass now" data-c="sueno"><div class="k">Fin del día</div><h2>A dormir a las ${clock(s.s)}</h2><div class="sub">Mañana te levantas a las ${clock(s.next.s)}</div></section>`;
  return`<section class="glass now" data-c="sueno"><div class="k">Descansando</div><h2>Hora de dormir</h2><div class="sub">Te levantas a las ${clock(s.e)}</div></section>`;
}
function rangeStart(){const c=cols();return c>=7?monday(view.sel):view.sel}
function weekNav(){
  const c=cols(),st=rangeStart(),en=addDays(st,(c>1?c:7)-1),mon=monday(view.sel),isThis=c>1&&c<7?sameDay(st,sod(now)):sameDay(mon,monday(now));
  const a=c>1&&c<7?st:mon,z=c>1&&c<7?en:addDays(mon,6);
  const rng=a.getMonth()===z.getMonth()?`${a.getDate()}–${z.getDate()} de ${MES[z.getMonth()]}`:`${a.getDate()} ${MES[a.getMonth()].slice(0,3)} – ${z.getDate()} ${MES[z.getMonth()].slice(0,3)}`;
  const ttl=c>1&&c<7?(isThis?'Desde hoy':`${c} días`):(isThis?'Esta semana':'Semana '+isoWeek(mon));
  const spanSel=window.innerWidth>=900&&view.tab==='hoy'?`<div class="seg" role="group" aria-label="Días a la vista">${[[2,'2 días'],[3,'3 días'],[7,'Semana']].map(([v,l])=>`<button data-span="${v}" aria-pressed="${view.span===v}">${l}</button>`).join('')}</div>`:'';
  return`<div class="wnav"><div class="t">${ttl}<small>${rng}${cfg.events.some(e=>e.freq!=='all')?` · semana ${E.parity(mon)}`:''}</small></div><div class="arr">${spanSel}${isThis?'':`<button class="icb pillb" data-act="today" aria-label="Volver a hoy">Hoy</button>`}<button class="icb" data-act="prev" aria-label="Anterior">‹</button><button class="icb" data-act="next" aria-label="Siguiente">›</button></div></div>`;
}
function strip(){
  const mon=monday(view.sel);
  return`<div class="strip" role="group" aria-label="Días">${DS.map((s,i)=>{const d=addDays(mon,i),P=E.plan(d),ns=itemsOn(d),k=kindOf(ns);
    return`<button data-day="${i}" aria-pressed="${sameDay(d,view.sel)}" class="${sameDay(d,now)?'today':''}" aria-label="${DN[i]} ${d.getDate()}${ns.length?`, ${ns.length} en la agenda`:''}${P.warn.length?', con cambios':''}"><span class="dn">${s}</span><span class="dd">${d.getDate()}</span><span class="dots">${k?`<i data-k="${k}"></i>`:''}${P.warn.length?'<i></i>':''}</span></button>`}).join('')}</div>`;
}
const evHTML=(b,y,PX,isT,t,left,width)=>{const top=y(b.s),hh=Math.max(15,(b.e-b.s)*PX-2),xs=hh<40,n=b._n,c=b._col;const past=isT&&b.e<=t;
  return`<div class="ev${xs?' xs':''}${past?' past':''}${n>1?' ovl':''}" data-c="${b.cat}" style="top:${top}px;height:${hh}px;left:calc(${left} + (${width}) * ${c}/${n});width:calc((${width}) / ${n} - 3px)" title="${esc(b.label)} · ${clock(b.s)}–${clock(b.e)}">
    <span class="tt">${esc(n>2&&b.short?b.short:b.label)}${b.cat==='pausa'?` · ${hm(b.e-b.s)}`:''}</span>${b.cat==='pausa'?'':`<span class="tm">${clock(b.s)} – ${clock(b.e)}</span>`}${!xs&&hh>=62&&b.note?`<span class="nt">${esc(b.note)}</span>`:''}</div>`};
function grid(P,d){
  const PX=1.15,isT=sameDay(d,now),t=nmin();
  const s0=Math.floor(P.b[0].s/60)*60,e0=Math.ceil((P.sleep+45)/60)*60,H=(e0-s0)*PX;
  const y=v=>(v-s0)*PX;
  let h='';for(let m=s0;m<=e0;m+=60)h+=`<div class="hr" style="top:${y(m)}px"><span>${clock(m)}</span></div>`;
  const ev=layoutCols(P.b.map(b=>({...b}))).map(b=>evHTML(b,y,PX,isT,t,'46px','100% - 46px')).join('');
  const sl=`<div class="sleepb" style="top:${y(P.sleep)}px;height:${Math.max(30,y(e0)-y(P.sleep))}px;left:46px;right:0">Dormir · ${hm(E.sleepDur(d))}</div>`;
  const nl=isT&&t>=s0&&t<=e0?`<div class="nowl" style="top:${y(t)}px;left:46px"></div><div class="nowt" style="top:${y(t)}px">${clock(t)}</div>`:'';
  const mk=itemsOn(d).filter(n=>n.time&&n.kind!=='viaje').map(n=>`<div class="nmk" data-k="${esc(n.kind)}" style="top:${y(T(n.time))}px;left:46px"><span>${esc(n.time)} · ${esc(n.text)}</span></div>`).join('');
  return`<div class="tg" id="tg" style="height:${H+10}px">${h}${ev}${sl}${mk}${nl}</div>`;
}
/* varios días en columnas (horizontal y ordenador) */
function multiGrid(){
  const c=cols(),st=rangeStart(),days=[...Array(c)].map((_,i)=>addDays(st,i)),Ps=days.map(d=>E.plan(d)),t=nmin();
  const wide=window.innerWidth>=900,PX=wide?.92:.72;
  const s0=Math.floor(Math.min(...Ps.map(P=>P.b[0].s))/60)*60,e0=Math.min(1560,Math.ceil((Math.max(...Ps.map(P=>P.sleep))+30)/60)*60),H=(e0-s0)*PX;
  const y=v=>(Math.min(e0,Math.max(s0,v))-s0)*PX;
  let ax='';for(let m=s0;m<=e0;m+=60)ax+=`<span style="top:${y(m)}px">${clock(m)}</span>`;
  let hl='';for(let m=s0;m<=e0;m+=60)hl+=`<div class="hl" style="top:${y(m)}px"></div>`;
  const heads=days.map(d=>{const ns=itemsOn(d),P=E.plan(d);return`<button class="mh${sameDay(d,now)?' today':''}${sameDay(d,view.sel)?' sel':''}" data-pick="${ymd(d)}"><span>${DS[dow(d)]}</span><b>${d.getDate()}</b>${P.warn.length&&!ns.length?`<i class="dots"><i></i></i>`:''}${(()=>{const ad=ns.filter(x=>!x.time||x.kind==='viaje');return ad.length?`<span class="adbar">${ad.slice(0,3).map(x=>`<span class="adc" data-k="${esc(x.kind)}">${esc(x.text)}</span>`).join('')}${ad.length>3?`<span class="adc" data-k="nota">+${ad.length-3}</span>`:''}</span>`:''})()}</button>`}).join('');
  const colsH=days.map((d,i)=>{const P=Ps[i],isT=sameDay(d,now);
    const evs=layoutCols(P.b.map(b=>({...b}))).map(b=>evHTML(b,y,PX,isT,t,'2px','100% - 2px')).join('');
    const sl=P.sleep<e0?`<div class="sleepb" style="top:${y(P.sleep)}px;height:${Math.max(18,H-y(P.sleep))}px;left:2px;right:2px">Dormir</div>`:'';
    const nl=isT&&t>=s0&&t<=e0?`<div class="nowl" style="top:${y(t)}px;left:0"></div>`:'';
    const mk=itemsOn(d).filter(n=>n.time&&n.kind!=='viaje').map(n=>`<div class="nmk" data-k="${esc(n.kind)}" style="top:${y(T(n.time))}px;left:0"><span>${esc(n.text)}</span></div>`).join('');
    return`<div class="mcol${isT?' today':''}" style="height:${H}px">${hl}${evs}${sl}${mk}${nl}</div>`}).join('');
  return`<div class="mg" style="--n:${c}"><div></div>${heads}<div class="max" style="height:${H}px">${ax}</div>${colsH}</div>`;
}
function agendaRows(ns){return ns.map(n=>`<div class="nrow${n.done?' done':''}" data-k="${esc(n.kind)}">${n.kind==='tarea'?`<button class="tick" data-done="${esc(n.id)}" role="checkbox" aria-checked="${!!n.done}" aria-label="Hecha"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`:''}<span class="kk">${KINDS[n.kind]||'Nota'}${n.time?' · '+esc(n.time):''}${n.kind==='viaje'&&n.end&&n.end!==n.date?' · hasta el '+parseDate(n.end).getDate()+' '+MES[parseDate(n.end).getMonth()].slice(0,3):''}</span><span class="tx">${esc(n.text)}</span><button class="del" data-delnote="${esc(n.id)}">Quitar</button></div>`).join('')}
function viewHoy(){
  const c=cols(),d=view.sel,P=E.plan(d),isT=sameDay(d,now),ns=itemsOn(d);
  const evs=P.b.filter(b=>b.isEvent);
  const showToday=c===1?isT:sameDay(rangeStart(),sod(now))||c>=7&&sameDay(monday(view.sel),monday(now));
  const hero=c>1||isT?`<p class="eyebrow">${logo(18)}<span>${DN[dow(sod(now))]}, ${now.getDate()} de ${MES[now.getMonth()]}</span></p><h1 class="display">${greet()},${c>1?' ':'<br>'}<span class="grad">${esc(cfg.name)}</span></h1>`
    :`<p class="eyebrow">${logo(18)}<span>${sameDay(d,addDays(sod(now),1))?'Mañana':sameDay(d,addDays(sod(now),-1))?'Ayer':'Tu día'}</span></p><h1 class="display">${DN[dow(d)]}<br><span class="grad">${d.getDate()} de ${MES[d.getMonth()]}</span></h1>`;
  if(c>1){const TP=E.plan(sod(now));const pend=notes.filter(n=>n.kind==='tarea'&&!n.done&&n.date<=ymd(addDays(sod(now),7))).length;
    return`<header class="hero">${hero}<p class="sum">${esc(summary(TP))}${pend?` · ${pend} tareas pendientes`:''}</p></header>
      <div class="mtop">${showToday?nowCard():''}<div class="mside">${weekNav()}${(()=>{const w=[];days7().forEach(dd=>E.plan(dd).warn.forEach(x=>w.push(`<span><b>${DS[dow(dd)]} ${dd.getDate()}.</b> ${esc(x)}</span>`)));return w.length?`<div class="warn" role="note"><b>Cambios</b>${w.slice(0,4).join('')}${w.length>4?`<span>y ${w.length-4} más en Semana.</span>`:''}</div>`:''})()}</div></div>
      ${multiGrid()}`;
  }
  const pills=[...ns.map(n=>`<span class="pill k" data-k="${esc(n.kind)}"><span class="dot"></span><span>${n.time?esc(n.time)+' · ':''}${esc(n.text)}</span></span>`),...evs.map(e=>`<span class="pill"><span class="dot" style="background:var(--c-${e.cat})"></span><span>${esc(e.label)} ${clock(e.s)}–${clock(e.e)}</span></span>`)].join('');
  return`<header class="hero">${hero}<p class="sum">${esc(summary(P))}</p>${pills?`<div class="pills">${pills}</div>`:''}</header>
    ${isT?nowCard():''}
    ${weekNav()}${strip()}
    ${P.warn.length?`<div class="warn" role="note"><b>Hoy cambia</b>${P.warn.map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}
    <div class="dnotes">${agendaRows(ns)}<button class="addn" data-act="note">+ Añadir a este día</button></div>
    ${grid(P,d)}
    <p class="empty" style="padding:4px 0 0;font-size:13px">${P.src==='teamup'?`Clases de TeamUp · ${CAT_SYNC}`:P.src==='propio'?'Tu propio horario':'Sin clases para esta fecha'} · desliza para cambiar de día</p>`;
}
const days7=()=>{const c=cols(),st=rangeStart();return[...Array(c>1?c:7)].map((_,i)=>addDays(st,i))};
function viewSem(){
  const S=360,EN=1500,PX=window.innerWidth>=900?.62:.52,H=(EN-S)*PX,mon=monday(view.sel),t=nmin();
  const y=v=>(Math.min(EN,Math.max(S,v))-S)*PX;
  let ax='';for(let h=8;h<=24;h+=2)ax+=`<span style="top:${y(h*60)}px">${h}</span>`;
  let hl='';for(let h=7;h<=24;h++)hl+=`<div class="hl" style="top:${y(h*60)}px"></div>`;
  const hd=DS.map((s,i)=>{const dd=addDays(mon,i);return`<div class="hd${sameDay(dd,now)?' today':''}">${s}<b>${dd.getDate()}</b></div>`}).join('');
  const tot={},chg=[];
  const cl=DS.map((s,i)=>{const dd=addDays(mon,i),P=E.plan(dd);P.b.forEach(b=>tot[b.cat]=(tot[b.cat]||0)+(b.e-b.s));P.warn.forEach(w=>chg.push(`<li><b>${DN[i]} ${dd.getDate()}.</b> ${esc(w)}</li>`));
    const it=layoutCols(P.b.filter(b=>b.cat!=='pausa').map(b=>({...b})));
    const z=(P.b[0].s>S?`<div class="zz" style="top:0;height:${y(P.b[0].s)}px"></div>`:'')+(P.sleep<EN?`<div class="zz" style="top:${y(P.sleep)}px;height:${H-y(P.sleep)}px"></div>`:'');
    const nl=sameDay(dd,now)&&t>=S?`<div class="nowl" style="top:${y(t)}px;left:0"></div>`:'';
    return`<button class="col${sameDay(dd,now)?' today':''}" data-day="${i}" data-go style="height:${H}px" aria-label="Ver ${DN[i]}">${hl}${z}${it.map(b=>{const hh=Math.max(4,(Math.min(b.e,EN)-b.s)*PX-1);return`<div class="wb" data-c="${b.cat}" style="top:${y(b.s)}px;height:${hh}px;left:calc(100% * ${b._col}/${b._n} + 1px);width:calc(100% / ${b._n} - 2px)">${hh>=22&&b._n<3?esc(b.short||b.label):''}</div>`}).join('')}${nl}</button>`}).join('');
  const nights=[-1,0,1,2,3].map(k=>E.sleepDur(addDays(mon,k)));
  return`<header class="hero" style="padding-top:8px"><h1 class="h2">Semana</h1></header>${weekNav()}
    <div class="wk"><div></div>${hd}<div class="ax" style="height:${H}px">${ax}</div>${cl}</div>
    <div class="legend">${['clase','trabajo','estudio','deporte','comida','libre','hobby','trayecto','viaje'].map(c=>`<span data-c="${c}">${CATN[c]}</span>`).join('')}</div>
    <section class="card"><div class="stats">
      <div data-c="clase"><b>${hm(tot.clase||0)}</b><span>de clase</span></div><div data-c="trabajo"><b>${hm(tot.trabajo||0)}</b><span>de trabajo</span></div>
      <div data-c="estudio"><b>${hm(tot.estudio||0)}</b><span>de estudio</span></div><div data-c="deporte"><b>${hm(tot.deporte||0)}</b><span>de deporte</span></div>
      <div data-c="hobby"><b>${hm(tot.hobby||0)}</b><span>de hobbies</span></div><div data-c="sueno"><b>${hm(Math.min(...nights))}</b><span>de sueño mínimo entre semana</span></div></div></section>
    ${chg.length?`<section class="card"><h3 style="margin:0;font-size:17px">Cambios de esta semana</h3><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;font-size:15px">${chg.join('')}</ul></section>`:''}`;
}
function viewAgenda(){
  const k0=ymd(sod(now));
  const up=notes.filter(n=>(n.end||n.date)>=k0||(n.kind==='tarea'&&!n.done)).sort((a,b)=>(a.date+(a.time||'99')).localeCompare(b.date+(b.time||'99')));
  const by={};up.forEach(n=>{const k=n.kind==='tarea'&&!n.done&&n.date<k0?k0:n.date;(by[k]=by[k]||[]).push(n)});
  return`<header class="hero" style="padding-top:8px"><h1 class="h2">Agenda</h1><p class="sum">Tareas, recordatorios, exámenes, entregas y viajes.</p></header>
    <div class="quick">${Object.entries(KINDS).map(([k,l])=>`<button data-quick="${k}" data-k="${k}"><span class="dot"></span>${l}</button>`).join('')}</div>
    ${up.length?`<div class="nlist">${Object.keys(by).sort().map(k=>{const d=parseDate(k);return`<div class="nday"><h4>${sameDay(d,now)?'Hoy':sameDay(d,addDays(sod(now),1))?'Mañana':DN[dow(d)]+' '+d.getDate()+' de '+MES[d.getMonth()]}</h4><div class="dnotes">${agendaRows(by[k])}</div></div>`}).join('')}</div>`
    :`<div class="empty"><b>No tienes nada apuntado</b>Toca un tipo de arriba para añadir tu próximo examen, una entrega o un viaje.</div>`}`;
}
function widgetScript(){
  const agenda=notes.filter(n=>(n.end||n.date)>=ymd(addDays(sod(now),-1))).slice(0,60);
  return `// Ritmo · widget para Scriptable (iPhone). Muestra lo que te queda en las próximas 6 h.
// Si cambias tu rutina o la agenda, vuelve a copiar este script desde Ajustes.
const BASE='${location.origin+location.pathname.replace(/[^/]*$/,'')}';
const CFG=${JSON.stringify(cfg)};
const AGENDA=${JSON.stringify(agenda)};
const fm=FileManager.local(),dir=fm.joinPath(fm.cacheDirectory(),'ritmo');if(!fm.fileExists(dir))fm.createDirectory(dir);
async function get(u){const p=fm.joinPath(dir,u.replace(/[^a-z0-9.]/gi,'_'));try{const s=await new Request(BASE+u).loadString();if(s&&!/^\\s*</.test(s))fm.writeString(p,s);return s}catch(e){if(fm.fileExists(p))return fm.readString(p);throw e}}
const R=new Function((await get('engine.js'))+';return{Engine,normCfg,setCatalog,teamupId,clock,addDays,sod,ymd,T};')();
const cfg=R.normCfg(CFG);
try{const cals=JSON.parse(await get('data/calendars.json'));const meta=cals.find(c=>c.id===R.teamupId(cfg.teamup));if(meta&&cfg.source!=='propio')R.setCatalog(meta,JSON.parse(await get('data/teamup/'+meta.id+'.json')))}catch(e){}
const E=R.Engine(cfg,AGENDA),now=new Date(),td=R.sod(now),t=now.getHours()*60+now.getMinutes(),lim=t+360;
let items=[];
for(const [off,d] of [[-1440,R.addDays(td,-1)],[0,td],[1440,R.addDays(td,1)]]){const P=E.plan(d);P.b.forEach(b=>{if(b.cat!=='pausa')items.push({s:b.s+off,e:b.e+off,label:b.label,cat:b.cat})});items.push({s:P.sleep+off,e:P.sleep+off+30,label:'Dormir',cat:'sueno'})}
for(const a of AGENDA){if(!a.time||a.kind==='viaje'||a.done)continue;const d=new Date(a.date.replace(/-/g,'/'));const off=Math.round((d-td)/864e5)*1440;items.push({s:R.T(a.time)+off,e:R.T(a.time)+off+1,label:a.text,cat:a.kind,ag:true})}
items=items.filter(b=>b.e>t&&b.s<lim).sort((a,b)=>a.s-b.s);
const COL={clase:'#5E5CE6',trabajo:'#40C8E0',estudio:'#0A84FF',deporte:'#30D158',trayecto:'#98989D',comida:'#FF9F0A',libre:'#FFD60A',hobby:'#FF375F',rutina:'#AC8E68',evento:'#BF5AF2',viaje:'#00C7BE',sueno:'#8E8E93',examen:'#FF453A',entrega:'#FF9F0A',tarea:'#64D2FF',recordatorio:'#BF5AF2'};
const h=now.getHours()+now.getMinutes()/60,per=h>=6&&h<12?['#FF7A2F','#FFB52E']:h>=12&&h<18?['#1F5BFF','#16B3C9']:h>=18&&h<21.5?['#4C5BD4','#E8833A']:['#0B1E4D','#2A3F8F'];
const w=new ListWidget();const g=new LinearGradient();g.colors=per.map(c=>new Color(c));g.locations=[0,1];g.startPoint=new Point(0,0);g.endPoint=new Point(1,1);w.backgroundGradient=g;w.setPadding(14,14,12,14);
const top=w.addStack();const tt=top.addText('Ritmo');tt.font=Font.boldSystemFont(13);tt.textColor=Color.white();top.addSpacer();const sub=top.addText('próximas 6 h');sub.font=Font.mediumSystemFont(11);sub.textColor=new Color('#ffffff',.8);
w.addSpacer(8);
const max=config.widgetFamily==='small'?3:config.widgetFamily==='large'?9:4;
const fmt=m=>R.clock(m);
if(!items.length){const x=w.addText('Nada más por hoy');x.font=Font.semiboldSystemFont(15);x.textColor=Color.white()}
for(const b of items.slice(0,max)){const r=w.addStack();r.centerAlignContent();r.spacing=6;
  const dot=r.addText('●');dot.font=Font.systemFont(9);dot.textColor=new Color(COL[b.cat]||'#ffffff');
  const tm=r.addText(b.s<=t?'Ahora':fmt(b.s));tm.font=Font.semiboldMonospacedSystemFont(12);tm.textColor=Color.white();
  const lb=r.addText(b.label);lb.font=b.s<=t?Font.boldSystemFont(14):Font.mediumSystemFont(13);lb.textColor=Color.white();lb.lineLimit=1;w.addSpacer(4)}
w.addSpacer();w.refreshAfterDate=new Date(Date.now()+15*60000);w.url=BASE;
if(config.runsInWidget)Script.setWidget(w);else await w.presentMedium();
Script.complete();`;
}
function viewAjustes(){
  const lk=(lab,val,step)=>`<button class="row link" data-edit="${step}"><span class="lab">${lab}</span><span class="val">${esc(val)}</span></button>`;
  const ab=cfg.events.some(e=>e.freq!=='all');const p=E.parity(sod(now));
  const tot=cfg.work.on?cfg.work.min.reduce((a,b)=>a+b,0):0;
  const src=cfg.source==='propio'?`Propio · ${cfg.custom.length+cfg.icsSel.length} asignaturas`:known(cfg.teamup)?(calOf(cfg.teamup).short||CAT_NAME):cfg.teamup?'Sin sincronizar':'—';
  return`<header class="hero" style="padding-top:8px"><p class="eyebrow">${logo(18)}<span>Ritmo</span></p><h1 class="h2">Ajustes</h1></header>
   ${grp('Perfil',lk('Nombre',cfg.name,1))}
   ${grp('Clases',lk('Horario',src,2)+lk('Asignaturas',cfg.source==='propio'?`${cfg.custom.length+cfg.icsSel.length}`:`${cfg.subjects.length}`,3))}
   ${grp('Rutina',lk('Tu día',`${String(cfg.sleepH).replace('.',',')} h de sueño · margen ${cfg.margin} min`,4)+lk('Trabajo',tot?hm(tot)+'/semana':'No',5)+lk('Hábitos',[cfg.series.on?cfg.series.label:'',...cfg.hobbies.map(h=>h.label)].filter(Boolean).join(', ')||'—',6))}
   ${ab?grp('Reuniones',`<div class="row"><span class="lab">Esta semana es</span><div class="seg" role="group"><button data-par="A" aria-pressed="${p==='A'}">Semana A</button><button data-par="B" aria-pressed="${p==='B'}">Semana B</button></div></div>`,'Cambia esto si la reunión de esta semana no es la que toca.'):''}
   ${grp('Apariencia',row('Color según la hora del día',`<label class="sw"><input type="checkbox" data-cfgsw="timeColors"${cfg.timeColors!==false?' checked':''}><span></span></label>`,'Mañana cálida, mediodía azul, atardecer violeta y noche azul oscuro'),`Ahora: ${PAL[periodOf(now)].name.toLowerCase()}.`)}
   ${grp('Widgets',`<button class="row link" data-act="wios"><span class="lab">iPhone · Scriptable<small>Copia el script y pégalo en la app gratuita Scriptable</small></span></button><a class="row link" href="widget.html" style="color:inherit;text-decoration:none"><span class="lab">Android y ordenador<small>Abre la vista de widget y añádela a la pantalla de inicio</small></span></a>`,'Los dos muestran lo que te queda en las próximas 6 horas.')}
   <div id="wiosBox" hidden class="card"><b>Cómo ponerlo en el iPhone</b><ol style="margin:0;padding-left:20px;color:var(--fg2);font-size:15px;display:flex;flex-direction:column;gap:4px"><li>Instala <b>Scriptable</b> desde la App Store (es gratis).</li><li>Abre Scriptable, toca <b>+</b> y pega el script.</li><li>Mantén pulsada la pantalla de inicio → <b>+</b> → Scriptable → elige el tamaño.</li><li>Mantén pulsado el widget → <b>Editar widget</b> → Script: el que has pegado.</li></ol><textarea id="wiosTxt" readonly rows="4" aria-label="Script del widget"></textarea></div>
   ${syncGroup()}
   ${grp('',`<button class="row link" data-act="redo"><span class="lab" style="color:var(--accent)">Repetir el cuestionario</span></button><button class="row" data-act="reset" style="border:0;background:none;width:100%;text-align:left"><span class="lab" style="color:var(--c-examen)">Borrar mis datos</span></button>`,Store.mode==='cloud'?'Tu rutina y tu agenda se guardan en tu cuenta y las ves en cualquier dispositivo.':'Tu rutina y tu agenda están guardadas en este dispositivo.')}
   <p class="empty" style="font-size:13px">Ritmo${CAT_SYNC?` · clases de TeamUp sincronizadas el ${CAT_SYNC}`:''}</p>`;
}
let syncStep={email:'',sent:false,busy:false,err:''};
function syncGroup(){
  if(!Store.sb)return grp('Sincronización',`<div class="row"><span class="lab">Solo en este dispositivo<small>Para verlo también en otros dispositivos hay que conectar Supabase (README del repositorio).</small></span></div>`);
  if(Store.mode==='cloud')return grp('Sincronización',`<div class="row"><span class="lab">Conectado<small>${esc(Store.user.email||'')}</small></span><button class="pillb icb" data-act="signout">Salir</button></div>`,'Tus cambios se guardan en tu cuenta y aparecen en todos tus dispositivos.');
  return grp('Sincronizar entre dispositivos',`<div class="row"><input type="email" id="syEmail" placeholder="tu@email.com" value="${esc(syncStep.email)}" autocomplete="email" aria-label="Email"></div>
    ${syncStep.sent?`<div class="row"><input type="text" id="syCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Código del email" aria-label="Código"></div>`:''}
    <button class="addrow" data-act="${syncStep.sent?'sycode':'symail'}"${syncStep.busy?' disabled':''}>${syncStep.sent?'Entrar':'Enviarme un código'}</button>`,syncStep.err?`<span style="color:var(--c-examen)">${esc(syncStep.err)}</span>`:'Te llega un código al email. Úsalo en cada dispositivo para tener lo mismo en todos.');
}
function render(top){
  applyTheme();
  if(ob){renderOB(top);return}
  if(!cfg){startOB(0);return}
  $('#tabs').hidden=false;$('#fab').hidden=!(view.tab==='hoy'||view.tab==='agenda');$$('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===view.tab));
  document.body.classList.toggle('wide',cols()>1);
  const y=window.scrollY;
  const html=view.tab==='hoy'?viewHoy():view.tab==='sem'?viewSem():view.tab==='agenda'?viewAgenda():viewAjustes();
  $('#app').innerHTML=`<main class="wrap scr${top?' screen-in':''}" id="main">${html}</main>`;
  if(top)window.scrollTo(0,0);else window.scrollTo(0,y);
}

/* ---------- agenda (hoja inferior) ---------- */
let nKind='tarea';
function openNote(kind){const s=$('#sheet');$('#nText').value='';$('#nTime').value='';$('#nDate').value=ymd(view.sel<sod(now)?sod(now):view.sel);$('#nEnd').value='';$('#nErr').hidden=true;setKind(kind||'tarea');s.hidden=false;setTimeout(()=>$('#nText').focus(),60)}
function setKind(k){nKind=k;$$('#nKinds button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===k));$('#nEndRow').hidden=k!=='viaje';$('#nTimeRow').hidden=k==='viaje';
  $('#nText').placeholder={tarea:'Hacer la práctica 2',recordatorio:'Llamar al dentista',examen:'Examen de Redes y Servicios',entrega:'Entrega de la memoria',viaje:'Madrid'}[k];$('#sheetT').textContent='Nuevo: '+KINDS[k].toLowerCase()}
async function saveNote(){
  const text=$('#nText').value.trim(),date=$('#nDate').value,end=$('#nEnd').value;
  if(!text||!date){$('#nErr').textContent=!text?'Escribe qué es.':'Elige el día.';$('#nErr').hidden=false;return}
  if(nKind==='viaje'&&end&&end<date){$('#nErr').textContent='La vuelta no puede ser antes de la ida.';$('#nErr').hidden=false;return}
  $('#nSave').disabled=true;
  try{await Store.addNote({date,text:text.slice(0,80),kind:nKind,time:nKind==='viaje'?'':($('#nTime').value||''),end:nKind==='viaje'?(end||date):'',done:false,created:Date.now()});$('#sheet').hidden=true;toast('Guardado en tu agenda')}
  catch(e){$('#nErr').textContent='No se ha podido guardar. Inténtalo otra vez.';$('#nErr').hidden=false}
  $('#nSave').disabled=false;
}

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{
  if(!ob)return;const el=e.target,p=el.dataset.bind;if(!p)return;
  setP(ob.d,p,el.value);
  if(p==='teamup'){const st=$('#tuSt');if(st)st.innerHTML=tuStatus(el.value)}
  const st=STEPS[ob.step];if(st.ok)$('#obNext').disabled=!st.ok(ob.d);
});
document.addEventListener('change',async e=>{
  const el=e.target;
  if(el.dataset.cfgsw){cfg[el.dataset.cfgsw]=el.checked;applyTheme();Store.saveCfg(cfg).catch(()=>toast('No se ha podido guardar'));return}
  if(!ob)return;
  if(el.id==='icsFile'&&el.files&&el.files[0]){const f=el.files[0];if(f.size>5e6){toast('El archivo es demasiado grande');return}
    const ev=parseICS(await f.text());if(!ev.length){toast('No he encontrado clases en ese archivo');return}
    ob.d.ics=ev;const names=[...new Set(ev.map(x=>x[3]))];ob.d.icsSel=names;toast(`${ev.length} clases importadas`);renderOB();return}
  if(el.dataset.bindn){setP(ob.d,el.dataset.bindn,Number(el.value));return}
  if(el.dataset.sw){setP(ob.d,el.dataset.sw,el.checked);renderOB()}
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-go]');if(!t)return;
  if(ob){
    if(t.dataset.ob==='next')return obNext();
    if(t.dataset.ob==='back')return obBack();
    if(t.dataset.seg){setP(ob.d,t.dataset.seg,JSON.parse(t.dataset.v));return renderOB()}
    if(t.dataset.stp){const p=t.dataset.stp,v=Number(getP(ob.d,p))+Number(t.dataset.d);setP(ob.d,p,Math.min(Number(t.dataset.max),Math.max(Number(t.dataset.min),Math.round(v*100)/100)));return renderOB()}
    if(t.dataset.subj||t.dataset.icssel){const isI=!!t.dataset.icssel,k=isI?t.dataset.icssel:t.dataset.subj,arr=isI?'icsSel':'subjects',s=new Set(ob.d[arr]);s.has(k)?s.delete(k):s.add(k);ob.d[arr]=[...s];t.setAttribute('aria-checked',s.has(k));const det=t.closest('details'),n=det.querySelectorAll('[aria-checked="true"]').length,tot=det.querySelectorAll('.subj').length;det.querySelector('.n').textContent=n?`${n} de ${tot}`:`${tot} asignaturas`;return}
    if(t.dataset.leave!==undefined){const i=+t.dataset.leave;ob.d.leave[i]=t.dataset.v==='auto'?'auto':(ob.d.leave[i]==='auto'?'09:30':ob.d.leave[i]);return renderOB()}
    if(t.dataset.days){const arr=getP(ob.d,t.dataset.days)||[],i=+t.dataset.i,s=new Set(arr);s.has(i)?s.delete(i):s.add(i);setP(ob.d,t.dataset.days,[...s].sort());return renderOB()}
    if(t.hasAttribute('data-addev')){ob.d.events.push({id:'e'+Date.now(),label:'Reunión',dow:0,start:'12:00',end:'13:00',freq:'all',work:true});return renderOB()}
    if(t.dataset.delev!==undefined){ob.d.events.splice(+t.dataset.delev,1);return renderOB()}
    if(t.hasAttribute('data-addhob')){ob.d.hobbies.push({id:'h'+Date.now(),label:'',min:30,days:[0,1,2,3,4]});return renderOB()}
    if(t.dataset.delhob!==undefined){ob.d.hobbies.splice(+t.dataset.delhob,1);return renderOB()}
    if(t.hasAttribute('data-addsub')){ob.d.custom.push({id:'s'+Date.now(),name:'',slots:[{dow:0,start:'09:00',end:'11:00',loc:''}]});return renderOB()}
    if(t.dataset.delsub!==undefined){ob.d.custom.splice(+t.dataset.delsub,1);return renderOB()}
    if(t.dataset.addslot!==undefined){const s=ob.d.custom[+t.dataset.addslot];const l=s.slots[s.slots.length-1]||{dow:0,start:'09:00',end:'11:00',loc:''};s.slots.push({...l,dow:Math.min(5,l.dow+1)});return renderOB()}
    if(t.dataset.delslot){const [i,j]=t.dataset.delslot.split('.').map(Number);ob.d.custom[i].slots.splice(j,1);return renderOB()}
    if(t.hasAttribute('data-pastecode')){const err=importCode($('#codeIn').value||'');if(err){toast(err);return}toast(`${ob.d.custom.length} asignaturas añadidas`);ob.step++;return renderOB(true)}
    return;
  }
  if(t.closest('#tabs')&&t.dataset.t){if(t.dataset.t==='hoy'&&view.tab==='hoy'){view.sel=sod(now);render(true);return}view.tab=t.dataset.t;render(true);return}
  if(t.id==='fab'){openNote(view.tab==='agenda'?'tarea':'tarea');return}
  if(t.dataset.quick){openNote(t.dataset.quick);return}
  if(t.dataset.span){view.span=+t.dataset.span;LS.set('ritmo-span',view.span);render();return}
  if(t.dataset.pick){view.sel=parseDate(t.dataset.pick);if(cols()===1)render();else{view.sel=parseDate(t.dataset.pick);openNote('tarea')}return}
  if(t.dataset.day!==undefined){view.sel=addDays(monday(view.sel),+t.dataset.day);if(t.hasAttribute('data-go')){view.tab='hoy';render(true)}else render();return}
  if(t.dataset.done){const n=notes.find(x=>x.id===t.dataset.done);if(n)Store.updNote(n.id,{done:!n.done}).catch(()=>toast('No se ha podido guardar'));return}
  const a=t.dataset.act;
  if(a==='prev'||a==='next'){const c=cols(),step=c>1&&c<7?c:7;view.sel=addDays(view.sel,a==='next'?step:-step);render();return}
  if(a==='today'){view.sel=sod(now);render();return}
  if(a==='note'){openNote('tarea');return}
  if(a==='redo'){startOB(0);return}
  if(a==='wios'){const box=$('#wiosBox'),ta=$('#wiosTxt'),s=widgetScript();ta.value=s;box.hidden=false;try{await navigator.clipboard.writeText(s);toast('Script copiado')}catch(err){ta.select();toast('Selecciona el texto y cópialo')}return}
  if(a==='symail'){const em=($('#syEmail').value||'').trim();if(!/^\S+@\S+\.\S+$/.test(em)){syncStep.err='Escribe un email válido.';render();return}
    syncStep={email:em,sent:false,busy:true,err:''};render();try{await Store.sendCode(em);syncStep.sent=true}catch(err){syncStep.err='No se ha podido enviar el código. Inténtalo otra vez.'}syncStep.busy=false;render();return}
  if(a==='sycode'){const code=($('#syCode').value||'').trim();if(code.length<6){syncStep.err='Escribe el código del email.';render();return}
    syncStep.busy=true;syncStep.err='';render();try{await Store.verify(syncStep.email,code);syncStep={email:'',sent:false,busy:false,err:''};toast('Sincronizado');render()}catch(err){syncStep.busy=false;syncStep.err='Código incorrecto o caducado.';render()}return}
  if(a==='signout'){await Store.signOut();render();toast('Sesión cerrada');return}
  if(a==='reset'){if(!t.dataset.armed){t.dataset.armed='1';t.querySelector('.lab').textContent='Toca otra vez para borrar todo';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.querySelector('.lab').textContent='Borrar mis datos'}},3500);return}
    await Store.reset();cfg=null;E=null;startOB(0);return}
  if(t.dataset.edit){startOB(+t.dataset.edit,true);return}
  if(t.dataset.par){const W=isoWeek(sod(now))%2;cfg.parityA=t.dataset.par==='A'?W:1-W;rebuild();render();Store.saveCfg(cfg).catch(()=>toast('No se ha podido guardar'));return}
  if(t.dataset.delnote){if(!t.dataset.armed){t.dataset.armed='1';t.textContent='¿Seguro?';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.textContent='Quitar'}},3000);return}Store.delNote(t.dataset.delnote).catch(()=>toast('No se ha podido borrar'));return}
});
$('#nSave').onclick=saveNote;$('#nCancel').onclick=()=>$('#sheet').hidden=true;
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')$('#sheet').hidden=true});
$$('#nKinds button').forEach(b=>b.onclick=()=>setKind(b.dataset.v));
$('#nText').addEventListener('keydown',e=>{if(e.key==='Enter')saveNote()});
let tx=null,ty=null;
document.addEventListener('touchstart',e=>{if(ob||view.tab!=='hoy'||cols()>1||!e.target.closest('#tg'))return;tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
document.addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;tx=null;if(Math.abs(dx)>60&&Math.abs(dy)<45){view.sel=addDays(view.sel,dx<0?1:-1);render()}},{passive:true});
document.addEventListener('keydown',e=>{if(ob||view.tab!=='hoy'||e.target.matches('input,select,textarea'))return;if(e.key==='ArrowRight'){view.sel=addDays(view.sel,1);render()}if(e.key==='ArrowLeft'){view.sel=addDays(view.sel,-1);render()}});
let lastCols=null;window.addEventListener('resize',()=>{const c=cols();if(c!==lastCols&&!ob&&cfg){lastCols=c;render()}});
mqDark.addEventListener&&mqDark.addEventListener('change',applyTheme);
const tick=()=>{const was=sameDay(view.sel,now);now=new Date();if(was)view.sel=sod(now);applyTheme();if(!ob&&cfg&&$('#sheet').hidden&&!document.activeElement.matches('input,select,textarea'))render()};
setInterval(tick,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();Store.pull().catch(()=>{})}});

(async function boot(){
  applyTheme();
  await Promise.all([Store.init(),loadCals()]);
  const c=await Store.loadCfg();
  if(c){cfg=normCfg(c);await loadCatalog(teamupId(cfg.teamup))}
  else await loadCatalog((CALS[0]||{}).id);
  Store.watchNotes(a=>{notes=a;rebuild();if(!ob&&cfg)render()});
  lastCols=cols();render(true);
})();
