/* ================= Ritmo · interfaz ================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const DN=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],DS=['lun','mar','mié','jue','vie','sáb','dom'],DL=['L','M','X','J','V','S','D'];
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const CATN={clase:'Clases',trabajo:'Trabajo',estudio:'Estudio',deporte:'Deporte',trayecto:'Trayectos',comida:'Comidas',libre:'Tiempo libre',hobby:'Hobby',rutina:'Rutina',evento:'Eventos'};
const KINDS={examen:'Examen',entrega:'Entrega',nota:'Nota'};
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const setP=(o,p,v)=>{const ks=p.split('.');let a=o;ks.slice(0,-1).forEach(k=>a=a[k]);a[ks[ks.length-1]]=v};
const ICON={
  cal:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  wave:'<svg viewBox="0 0 24 24"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>'
};

/* ---------- guardado: este dispositivo y, si inicias sesión, Supabase ---------- */
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const loadScript=src=>new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s)});
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
  emit(a){LS.set('ritmo-notas',a);notes=a;if(this.cb)this.cb(a)},
  watchNotes(cb){this.cb=cb;cb(this.local());if(this.mode==='cloud')this.pull()},
  async pull(){if(this.mode!=='cloud')return;const {data,error}=await this.sb.from('notas').select('id,date,text,kind,time,created').eq('user_id',this.uid);if(!error&&data)this.emit(data.map(r=>({...r,time:r.time||''})))},
  async addNote(n){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').insert({...n,user_id:this.uid});if(error)throw error;return this.pull()}this.emit([...this.local(),{id:'n'+Date.now(),...n}])},
  async delNote(id){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').delete().eq('id',id);if(error)throw error;return this.pull()}this.emit(this.local().filter(n=>n.id!==id))},
  async sendCode(email){const {error}=await this.sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error},
  async verify(email,token){const {data,error}=await this.sb.auth.verifyOtp({email,token,type:'email'});if(error)throw error;this.user=data.user;this.mode='cloud';
    const loc=this.local().filter(n=>String(n.id).startsWith('n'));
    if(loc.length)await this.sb.from('notas').insert(loc.map(({id,...n})=>({...n,user_id:this.uid})));
    cfg=await this.loadCfg()||cfg;if(cfg){cfg={...clone(DEFAULT_CFG),...cfg};await loadCatalog(teamupId(cfg.teamup));E=Engine(cfg)}await this.pull()},
  async signOut(){if(this.sb)await this.sb.auth.signOut();this.user=null;this.mode='local'},
  async reset(){if(this.mode==='cloud'){await this.sb.from('notas').delete().eq('user_id',this.uid);await this.sb.from('perfiles').delete().eq('user_id',this.uid)}LS.del('ritmo-cfg');LS.del('ritmo-notas');notes=[]}
};

let cfg=null,E=null,notes=[],now=new Date(),ob=null;
const view={tab:'hoy',sel:sod(new Date())};
const nmin=()=>now.getHours()*60+now.getMinutes();
const notesOf=d=>{const k=ymd(d);return notes.filter(n=>n.date===k).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')||(a.created||0)-(b.created||0))};
const kindOf=ns=>ns.some(n=>n.kind==='examen')?'examen':ns.some(n=>n.kind==='entrega')?'entrega':ns.length?'nota':'';
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}

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

const known=url=>!!CAT_ID&&teamupId(url)===CAT_ID;
const calOf=url=>CALS.find(c=>c.id===teamupId(url));
function tuStatus(url){
  if(!url.trim())return`<div class="status no"><span><b>Sin enlace todavía</b>Pégalo cuando lo tengas. Puedes seguir sin él.</span></div>`;
  const m=calOf(url);if(m)return`<div class="status ok"><span><b>${esc(m.name)}</b>Calendario reconocido${known(url)?` · ${CAT.E.length} clases, sincronizado el ${CAT_SYNC}`:''}.</span></div>`;
  if(teamupId(url))return`<div class="status no"><span><b>Enlace guardado</b>Este calendario aún no está en Ritmo. Se añade en data/calendars.json del repositorio y se sincroniza solo cada día.</span></div>`;
  return`<div class="status no"><span><b>No parece un enlace de TeamUp</b>Debería ser algo como teamup.com/ks…</span></div>`;
}
const STEPS=[
 {id:'hola',btn:'Empezar',render:()=>`<section class="hero-ob">${head('Ritmo','Tu semana,<br><span class="grad">en orden.</span>','Cuéntame cómo es tu día y monto tu rutina con tus clases, tu trabajo, tu deporte y tus ratos libres.')}
   <ul class="feat"><li data-c="clase"><span class="ic">${ICON.cal}</span><span><b>Tus clases de TeamUp</b>Solo las asignaturas que elijas, con su aula.</span></li>
   <li data-c="trabajo"><span class="ic">${ICON.wave}</span><span><b>Se adapta cada día</b>Si una clase cambia o se cruza con algo, la rutina se reorganiza sola.</span></li>
   <li data-c="hobby"><span class="ic">${ICON.heart}</span><span><b>Tiempo para ti</b>Deporte, tu hobby y ratos libres, durmiendo lo que necesitas.</span></li></ul></section>`},
 {id:'nombre',render:d=>`${head('Paso 1 de 6','¿Cómo te<br>llamas?')}<input class="big-in" data-bind="name" value="${esc(d.name)}" placeholder="Tu nombre" autocomplete="given-name" aria-label="Tu nombre">`,ok:d=>d.name.trim().length>0},
 {id:'clases',render:d=>`${head('Paso 2 de 6','Tus clases','Pega el enlace de tu calendario de TeamUp y dime en qué curso estás.')}
   ${grp('Calendario de TeamUp',`<div class="row"><input type="url" data-bind="teamup" value="${esc(d.teamup)}" placeholder="https://teamup.com/ks…" inputmode="url" autocomplete="off" aria-label="Enlace de TeamUp"></div>`)}
   <div id="tuSt">${tuStatus(d.teamup)}</div>
   ${grp('Curso',`<div class="row">${seg('course',[['1','1º'],['2','2º'],['3','3º'],['4','4º']],d.course,true)}</div>`)}`},
 {id:'asig',render:d=>{
   const ok=known(d.teamup);
   if(!ok)return`${head('Paso 3 de 6','Tus asignaturas')}<div class="status no"><span><b>Primero hace falta tu calendario</b>Cuando tu TeamUp esté sincronizado podrás elegir aquí tus asignaturas. Mientras, sigue con el resto.</span></div>`;
   const sel=new Set(d.subjects);
   const cnt={};CAT.E.forEach(e=>cnt[e[3]]=(cnt[e[3]]||0)+1);
   const body=COURSES.map(([c,l])=>{const list=SUBJ.filter(s=>s.course===c&&cnt[s.i]>=3).sort((a,b)=>a.name.localeCompare(b.name));const n=list.filter(s=>sel.has(s.key)).length;
     const open=c===d.course||(c==='1B'&&d.course==='1')||n>0;
     return`<details class="course"${open?' open':''}><summary>${l}<span class="n">${n?`${n} de ${list.length}`:list.length+' asignaturas'}</span></summary>${list.map(s=>`<button type="button" class="subj" role="checkbox" aria-checked="${sel.has(s.key)}" data-subj="${esc(s.key)}"><span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="nm">${esc(s.name)}<small>${cnt[s.i]} clases</small></span></button>`).join('')}</details>`}).join('');
   return`${head('Paso 3 de 6','Tus asignaturas','Marca las que quieres ver en tu calendario. Puedes mezclar cursos.')}<div>${body}</div><p class="foot" style="margin:0 16px;color:var(--fg2);font-size:13px">${sel.size} seleccionadas. Si dos se cruzan, las verás una al lado de la otra.</p>`}},
 {id:'dia',render:d=>`${head('Paso 4 de 6','Tu día','Cuánto duermes, a qué hora te levantas y cuánto tardas en llegar.')}
   ${grp('Sueño',row('Horas de sueño',stp('sleepH',d.sleepH,5,10,.5,'h'))+row('Me levanto entre semana',tin('wakeWk',d.wakeWk))+row('Fin de semana',tin('wakeWe',d.wakeWe)))}
   ${grp('Trayecto a la universidad',row('Normal',stp('commute.normal',d.commute.normal,5,150,5,'min'))+row('En hora punta',stp('commute.rush',d.commute.rush,5,180,5,'min')),'Horas punta: 7:30–9:30, 13:30–15:30 y 17:30–19:30.')}
   ${grp('Salgo de casa',d.leave.map((v,i)=>`<div class="daygrid"><span class="d">${DL[i]}</span>${v==='auto'?`<span style="color:var(--fg2);font-size:15px">Justo para llegar a clase</span>`:`<input type="time" data-bind="leave.${i}" value="${esc(v)}" style="border:0;background:var(--fill);border-radius:8px;padding:5px 8px;justify-self:start">`}<div class="seg"><button type="button" data-leave="${i}" data-v="t" aria-pressed="${v!=='auto'}">Hora</button><button type="button" data-leave="${i}" data-v="auto" aria-pressed="${v==='auto'}">Auto</button></div></div>`).join(''),'Con «Auto» sales justo para llegar a tu primera clase.')}`},
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
 {id:'habitos',render:d=>`${head('Paso 6 de 6','Tus hábitos','Lo que quieres que tenga hueco cada semana.')}
   ${grp('Deporte entre semana',row('Activado',sw('series.on',d.series.on))+(d.series.on?row('Qué',txt('series.label',d.series.label,'Series en pista'))+row('Días por semana',stp('series.count',d.series.count,1,5,1,'x'))+row('Duración',stp('series.min',d.series.min,30,240,15,'min'),'Desde que sales hasta que vuelves')+row('Terminar antes de',tin('series.endBy',d.series.endBy)):''))}
   ${grp('Deporte el fin de semana',row('Activado',sw('run.on',d.run.on))+(d.run.on?row('Qué',txt('run.label',d.run.label,'Carrera'))+row('Día',seg('run.dow',[[5,'Sábado'],[6,'Domingo']],d.run.dow))+row('Hora',tin('run.start',d.run.start))+row('Duración',stp('run.min',d.run.min,30,240,15,'min')):''))}
   ${grp('Hobby diario',row('Activado',sw('hobby.on',d.hobby.on))+(d.hobby.on?row('Qué',txt('hobby.label',d.hobby.label,'Guitarra'))+row('Cada día',stp('hobby.min',d.hobby.min,10,120,5,'min')):''))}
   ${grp('Estudio por la noche',`<div class="row"><div class="chips">${DL.slice(0,5).map((l,i)=>`<button type="button" data-evs="${i}" aria-pressed="${d.evStudy.days.includes(i)}">${DN[i].slice(0,3)}</button>`).join('')}</div></div>`+row('Duración',stp('evStudy.min',d.evStudy.min,30,180,15,'min')),'Si ese día llegas pronto a casa, repasas antes o después de cenar.')}
   ${grp('Comidas',row('Comida a partir de',tin('meals.lunch',d.meals.lunch))+row('Cena',tin('meals.dinner',d.meals.dinner)))}`},
 {id:'listo',btn:'Crear mi rutina',render:d=>{const tot=d.work.on?d.work.min.reduce((a,b)=>a+b,0):0;
   return`<section class="hero-ob">${head('Todo listo',`Hola,<br><span class="grad">${esc(d.name||'tú')}</span>`,'Esto es lo que voy a tener en cuenta. Puedes cambiarlo cuando quieras en Ajustes.')}
   <ul class="feat"><li data-c="clase"><span class="ic">${ICON.cal}</span><span><b>${d.subjects.length} asignaturas</b>${known(d.teamup)?esc(CAT_NAME):'Sin calendario sincronizado'}</span></li>
   <li data-c="trabajo"><span class="ic">${ICON.wave}</span><span><b>${tot?hm(tot)+' de trabajo':'Sin trabajo'}</b>${tot?(d.work.place==='uni'?'Junto a la universidad':'En casa')+(d.events.length?` · ${d.events.length} reuniones fijas`:''):'Más tiempo para estudiar'}</span></li>
   <li data-c="deporte"><span class="ic">${ICON.heart}</span><span><b>${String(d.sleepH).replace('.',',')} h de sueño</b>${[d.series.on?`${d.series.label} ${d.series.count}×`:'',d.run.on?`${d.run.label} el ${DN[d.run.dow].toLowerCase()}`:'',d.hobby.on?`${d.hobby.label} a diario`:''].filter(Boolean).join(' · ')||'Sin hábitos fijos'}</span></li></ul></section>`}}
];
function startOB(step=0,edit=false){ob={step,d:clone(cfg||DEFAULT_CFG),edit};$('#tabs').hidden=true;renderOB(true)}
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
  if(ob.edit||st.id==='listo'){
    const c=ob.d;c.name=c.name.trim();
    if(c.parityA==null&&c.events.some(e=>e.freq!=='all'))c.parityA=isoWeek(new Date())%2;
    $('#obNext').disabled=true;
    try{await Store.saveCfg(c)}catch(e){toast('No se ha podido guardar. Inténtalo otra vez.');$('#obNext').disabled=false;return}
    const wasEdit=ob.edit;cfg=c;E=Engine(cfg);ob=null;view.tab=wasEdit?'ajustes':'hoy';view.sel=sod(new Date());render(true);toast(wasEdit?'Guardado':'Tu rutina está lista');return;
  }
  if(st.id==='clases'){$('#obNext').disabled=true;await loadCatalog(teamupId(ob.d.teamup));}
  ob.step++;renderOB(true);
}
function obBack(){if(ob.edit||ob.step===0){if(cfg){ob=null;render(true)}return}ob.step--;renderOB(true)}

/* ================= app ================= */
function greet(){const h=now.getHours();return h<6?'Buenas noches':h<14?'Buenos días':h<21?'Buenas tardes':'Buenas noches'}
function summary(P){
  const cl=P.b.filter(b=>b.cat==='clase').length,w=P.b.filter(b=>b.cat==='trabajo').reduce((a,b)=>a+b.e-b.s,0),sp=P.b.find(b=>b.cat==='deporte');
  const p=[];if(cl)p.push(`${cl} ${cl>1?'clases':'clase'}`);if(w)p.push(`${hm(w)} de trabajo`);if(sp)p.push(`${sp.label.toLowerCase()} a las ${clock(sp.s)}`);if(!p.length)p.push('Día tranquilo');
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
function weekNav(){
  const mon=monday(view.sel),sun=addDays(mon,6),isThis=sameDay(mon,monday(now));
  const rng=mon.getMonth()===sun.getMonth()?`${mon.getDate()}–${sun.getDate()} de ${MES[sun.getMonth()]}`:`${mon.getDate()} ${MES[mon.getMonth()].slice(0,3)} – ${sun.getDate()} ${MES[sun.getMonth()].slice(0,3)}`;
  return`<div class="wnav"><div class="t">${isThis?'Esta semana':'Semana '+isoWeek(mon)}<small>${rng}${cfg.events.some(e=>e.freq!=='all')?` · semana ${E.parity(mon)}`:''}</small></div><div class="arr">${isThis?'':`<button class="icb" data-act="today" aria-label="Volver a hoy" style="width:auto;padding:0 12px;border-radius:18px;font-size:14px;font-weight:600">Hoy</button>`}<button class="icb" data-act="wk-1" aria-label="Semana anterior">‹</button><button class="icb" data-act="wk1" aria-label="Semana siguiente">›</button></div></div>`;
}
function strip(){
  const mon=monday(view.sel);
  return`<div class="strip" role="group" aria-label="Días">${DS.map((s,i)=>{const d=addDays(mon,i),P=E.plan(d),ns=notesOf(d),k=kindOf(ns);
    return`<button data-day="${i}" aria-pressed="${sameDay(d,view.sel)}" class="${sameDay(d,now)?'today':''}" aria-label="${DN[i]} ${d.getDate()}${ns.length?`, ${ns.length} notas`:''}${P.warn.length?', con cambios':''}"><span class="dn">${s}</span><span class="dd">${d.getDate()}</span><span class="dots">${k?`<i data-k="${k}"></i>`:''}${P.warn.length?'<i></i>':''}</span></button>`}).join('')}</div>`;
}
function grid(P,d){
  const PX=1.15,isT=sameDay(d,now),t=nmin();
  const s0=Math.floor(P.b[0].s/60)*60,e0=Math.ceil((P.sleep+45)/60)*60,H=(e0-s0)*PX;
  const y=v=>(v-s0)*PX;
  let h='';for(let m=s0;m<=e0;m+=60)h+=`<div class="hr" style="top:${y(m)}px"><span>${clock(m)}</span></div>`;
  const items=layoutCols(P.b.map(b=>({...b})));
  const ev=items.map(b=>{const top=y(b.s),hh=Math.max(15,(b.e-b.s)*PX-2),xs=hh<40,n=b._n,c=b._col;
    const past=isT&&b.e<=t;
    return`<div class="ev${xs?' xs':''}${past?' past':''}${n>1?' ovl':''}" data-c="${b.cat}" style="top:${top}px;height:${hh}px;left:calc(46px + (100% - 46px) * ${c}/${n});width:calc((100% - 46px) / ${n} - 3px)">
      <span class="tt">${esc(n>2&&b.short?b.short:b.label)}${b.cat==='pausa'?` · ${hm(b.e-b.s)}`:''}</span>${b.cat==='pausa'?'':`<span class="tm">${clock(b.s)} – ${clock(b.e)}</span>`}${!xs&&hh>=62&&b.note?`<span class="nt">${esc(b.note)}</span>`:''}</div>`}).join('');
  const sl=`<div class="sleepb" style="top:${y(P.sleep)}px;height:${Math.max(30,y(e0)-y(P.sleep))}px;left:46px;right:0">Dormir · ${hm(E.sleepDur(d))}</div>`;
  const nl=isT&&t>=s0&&t<=e0?`<div class="nowl" style="top:${y(t)}px;left:46px"></div><div class="nowt" style="top:${y(t)}px">${clock(t)}</div>`:'';
  const mk=notesOf(d).filter(n=>n.time).map(n=>`<div class="nmk" data-k="${esc(n.kind)}" style="top:${y(T(n.time))}px;left:46px"><span>${esc(n.time)} · ${esc(n.text)}</span></div>`).join('');
  return`<div class="tg" id="tg" style="height:${H+10}px">${h}${ev}${sl}${mk}${nl}</div>`;
}
function viewHoy(){
  const d=view.sel,P=E.plan(d),isT=sameDay(d,now),ns=notesOf(d);
  const evs=P.b.filter(b=>b.isEvent);
  const hero=isT?`<p class="eyebrow">${DN[dow(d)]}, ${d.getDate()} de ${MES[d.getMonth()]}</p><h1 class="display">${greet()},<br><span class="grad">${esc(cfg.name)}</span></h1>`
    :`<p class="eyebrow">${sameDay(d,addDays(sod(now),1))?'Mañana':sameDay(d,addDays(sod(now),-1))?'Ayer':'Tu día'}</p><h1 class="display">${DN[dow(d)]}<br><span class="grad">${d.getDate()} de ${MES[d.getMonth()]}</span></h1>`;
  const pills=[...ns.map(n=>`<span class="pill k" data-k="${esc(n.kind)}"><span class="dot"></span><span>${n.time?esc(n.time)+' · ':''}${esc(n.text)}</span></span>`),...evs.map(e=>`<span class="pill" data-k="nota" style="--k:var(--c-${e.cat})"><span class="dot" style="background:var(--c-${e.cat})"></span><span>${esc(e.label)} ${clock(e.s)}–${clock(e.e)}</span></span>`)].join('');
  return`<header class="hero">${hero}<p class="sum">${esc(summary(P))}</p>${pills?`<div class="pills">${pills}</div>`:''}</header>
    ${isT?nowCard():''}
    ${weekNav()}${strip()}
    ${P.warn.length?`<div class="warn" role="note"><b>Hoy cambia</b>${P.warn.map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}
    <div class="dnotes">${ns.map(n=>`<div class="nrow" data-k="${esc(n.kind)}"><span class="kk">${KINDS[n.kind]||'Nota'}${n.time?' · '+esc(n.time):''}</span><span class="tx">${esc(n.text)}</span><button class="del" data-delnote="${esc(n.id)}">Quitar</button></div>`).join('')}<button class="addn" data-act="note">+ Añadir nota a este día</button></div>
    ${grid(P,d)}
    <p class="empty" style="padding:4px 0 0;font-size:13px">${P.src==='teamup'?`Clases de TeamUp · ${CAT_SYNC}`:'Sin clases de TeamUp para esta fecha'} · desliza para cambiar de día</p>`;
}
function viewSem(){
  const S=360,EN=1500,PX=.52,H=(EN-S)*PX,mon=monday(view.sel),t=nmin();
  const y=v=>(Math.min(EN,Math.max(S,v))-S)*PX;
  let ax='';for(let h=8;h<=24;h+=2)ax+=`<span style="top:${y(h*60)}px">${h}</span>`;
  let hl='';for(let h=7;h<=24;h++)hl+=`<div class="hl" style="top:${y(h*60)}px"></div>`;
  const hd=DS.map((s,i)=>{const dd=addDays(mon,i);return`<div class="hd${sameDay(dd,now)?' today':''}">${s}<b>${dd.getDate()}</b></div>`}).join('');
  const tot={},chg=[];
  const cols=DS.map((s,i)=>{const dd=addDays(mon,i),P=E.plan(dd);P.b.forEach(b=>tot[b.cat]=(tot[b.cat]||0)+(b.e-b.s));P.warn.forEach(w=>chg.push(`<li><b>${DN[i]} ${dd.getDate()}.</b> ${esc(w)}</li>`));
    const it=layoutCols(P.b.filter(b=>b.cat!=='pausa').map(b=>({...b})));
    const z=(P.b[0].s>S?`<div class="zz" style="top:0;height:${y(P.b[0].s)}px"></div>`:'')+(P.sleep<EN?`<div class="zz" style="top:${y(P.sleep)}px;height:${H-y(P.sleep)}px"></div>`:'');
    const nl=sameDay(dd,now)&&t>=S?`<div class="nowl" style="top:${y(t)}px;left:0"></div>`:'';
    return`<button class="col${sameDay(dd,now)?' today':''}" data-day="${i}" data-go style="height:${H}px" aria-label="Ver ${DN[i]}">${hl}${z}${it.map(b=>{const hh=Math.max(4,(Math.min(b.e,EN)-b.s)*PX-1);return`<div class="wb" data-c="${b.cat}" style="top:${y(b.s)}px;height:${hh}px;left:calc(100% * ${b._col}/${b._n} + 1px);width:calc(100% / ${b._n} - 2px)">${hh>=22&&b._n<3?esc(b.short||b.label):''}</div>`}).join('')}${nl}</button>`}).join('');
  const nights=[-1,0,1,2,3].map(k=>E.sleepDur(addDays(mon,k)));
  return`<header class="hero" style="padding-top:8px"><h1 class="h2">Semana</h1></header>${weekNav()}
    <div class="wk"><div></div>${hd}<div class="ax" style="height:${H}px">${ax}</div>${cols}</div>
    <div class="legend">${['clase','trabajo','estudio','deporte','comida','libre','hobby','trayecto'].map(c=>`<span data-c="${c}">${CATN[c]}</span>`).join('')}</div>
    <section class="card"><div class="stats">
      <div data-c="clase"><b>${hm(tot.clase||0)}</b><span>de clase</span></div><div data-c="trabajo"><b>${hm(tot.trabajo||0)}</b><span>de trabajo</span></div>
      <div data-c="estudio"><b>${hm(tot.estudio||0)}</b><span>de estudio</span></div><div data-c="deporte"><b>${hm(tot.deporte||0)}</b><span>de deporte</span></div>
      <div data-c="libre"><b>${hm(tot.libre||0)}</b><span>de tiempo libre</span></div><div data-c="sueno"><b>${hm(Math.min(...nights))}</b><span>de sueño mínimo entre semana</span></div></div></section>
    ${chg.length?`<section class="card"><h3 style="margin:0;font-size:17px">Cambios de esta semana</h3><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;font-size:15px">${chg.join('')}</ul></section>`:''}`;
}
function viewNotas(){
  const k0=ymd(sod(now));const up=notes.filter(n=>n.date>=k0).sort((a,b)=>(a.date+(a.time||'99')).localeCompare(b.date+(b.time||'99')));
  const by={};up.forEach(n=>(by[n.date]=by[n.date]||[]).push(n));
  return`<header class="hero" style="padding-top:8px"><h1 class="h2">Notas</h1><p class="sum">Exámenes, entregas y cualquier cosa que quieras recordar de un día.</p></header>
    <button class="cta" data-act="note">Nueva nota</button>
    ${up.length?`<div class="nlist">${Object.keys(by).map(k=>{const [Y,M,D]=k.split('-').map(Number),d=new Date(Y,M-1,D);return`<div class="nday"><h4>${sameDay(d,now)?'Hoy':DN[dow(d)]+' '+D+' de '+MES[M-1]}</h4><div class="dnotes">${by[k].map(n=>`<div class="nrow" data-k="${esc(n.kind)}"><span class="kk">${KINDS[n.kind]||'Nota'}${n.time?' · '+esc(n.time):''}</span><span class="tx">${esc(n.text)}</span><button class="del" data-delnote="${esc(n.id)}">Quitar</button></div>`).join('')}</div></div>`}).join('')}</div>`
    :`<div class="empty"><b>No tienes nada apuntado</b>Añade tu próximo examen o entrega y saldrá en el día que toque.</div>`}`;
}
function viewAjustes(){
  const lk=(lab,val,step)=>`<button class="row link" data-edit="${step}"><span class="lab">${lab}</span><span class="val">${esc(val)}</span></button>`;
  const ab=cfg.events.some(e=>e.freq!=='all');const p=E.parity(sod(now));
  const tot=cfg.work.on?cfg.work.min.reduce((a,b)=>a+b,0):0;
  return`<header class="hero" style="padding-top:8px"><h1 class="h2">Ajustes</h1></header>
   ${grp('Perfil',lk('Nombre',cfg.name,1))}
   ${grp('Clases',lk('TeamUp',known(cfg.teamup)?(calOf(cfg.teamup).short||CAT_NAME):cfg.teamup?'Sin sincronizar':'—',2)+lk('Curso',cfg.course==='1B'?'1º':cfg.course+'º',2)+lk('Asignaturas',`${cfg.subjects.length}`,3))}
   ${grp('Rutina',lk('Tu día',`${String(cfg.sleepH).replace('.',',')} h de sueño`,4)+lk('Trabajo',tot?hm(tot)+'/semana':'No',5)+lk('Hábitos',[cfg.series.on?cfg.series.label:'',cfg.hobby.on?cfg.hobby.label:''].filter(Boolean).join(', ')||'—',6))}
   ${ab?grp('Reuniones',`<div class="row"><span class="lab">Esta semana es</span>${`<div class="seg" role="group"><button data-par="A" aria-pressed="${p==='A'}">Semana A</button><button data-par="B" aria-pressed="${p==='B'}">Semana B</button></div>`}</div>`,'Cambia esto si la reunión de esta semana no es la que toca.'):''}
   ${syncGroup()}
   ${grp('',`<button class="row link" data-act="redo"><span class="lab" style="color:var(--accent)">Repetir el cuestionario</span></button><button class="row" data-act="reset" id="resetBtn" style="border:0;background:none;width:100%;text-align:left"><span class="lab" style="color:var(--c-examen)">Borrar mis datos</span></button>`,Store.mode==='cloud'?'Tu rutina y tus notas se guardan en tu cuenta y las ves en cualquier dispositivo.':'Tu rutina y tus notas están guardadas en este dispositivo.')}
   <p class="empty" style="font-size:13px">Ritmo · clases de TeamUp sincronizadas el ${CAT_SYNC}</p>`;
}
let syncStep={email:'',sent:false,busy:false,err:''};
function syncGroup(){
  if(!Store.sb)return grp('Sincronización',`<div class="row"><span class="lab">Solo en este dispositivo<small>Para verlo también en el ordenador hay que conectar Supabase (README del repositorio).</small></span></div>`);
  if(Store.mode==='cloud')return grp('Sincronización',`<div class="row"><span class="lab">Conectado<small>${esc(Store.user.email||'')}</small></span><button class="seg" style="border:0;padding:6px 12px" data-act="signout">Salir</button></div>`,'Tus cambios se guardan en tu cuenta y aparecen en todos tus dispositivos.');
  return grp('Sincronizar entre dispositivos',`<div class="row"><input type="email" id="syEmail" placeholder="tu@email.com" value="${esc(syncStep.email)}" autocomplete="email" aria-label="Email"></div>
    ${syncStep.sent?`<div class="row"><input type="text" id="syCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Código del email" aria-label="Código"></div>`:''}
    <button class="addrow" data-act="${syncStep.sent?'sycode':'symail'}"${syncStep.busy?' disabled':''}>${syncStep.sent?'Entrar':'Enviarme un código'}</button>`,syncStep.err?`<span style="color:var(--c-examen)">${esc(syncStep.err)}</span>`:'Te llega un código al email. Úsalo en el móvil y en el ordenador para tener lo mismo en los dos.');
}
function render(top){
  if(ob){renderOB(top);return}
  if(!cfg){startOB(0);return}
  $('#tabs').hidden=false;$$('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===view.tab));
  const y=window.scrollY;
  const html=view.tab==='hoy'?viewHoy():view.tab==='sem'?viewSem():view.tab==='notas'?viewNotas():viewAjustes();
  $('#app').innerHTML=`<main class="wrap scr${top?' screen-in':''}" id="main">${html}</main>`;
  if(top){window.scrollTo(0,0);if(view.tab==='hoy'&&sameDay(view.sel,now)){/* deja ver la tarjeta de ahora */}}else window.scrollTo(0,y);
}

/* ---------- notas (hoja inferior) ---------- */
let nKind='examen';
function openNote(){const s=$('#sheet');$('#nText').value='';$('#nTime').value='';$('#nDate').value=ymd(view.sel);$('#nErr').hidden=true;setKind('examen');s.hidden=false;setTimeout(()=>$('#nText').focus(),60)}
function setKind(k){nKind=k;$$('#nKinds button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===k))}
async function saveNote(){
  const text=$('#nText').value.trim(),date=$('#nDate').value;
  if(!text||!date){$('#nErr').textContent=!text?'Escribe qué tienes ese día.':'Elige el día.';$('#nErr').hidden=false;return}
  $('#nSave').disabled=true;
  try{await Store.addNote({date,text:text.slice(0,80),kind:nKind,time:$('#nTime').value||'',created:Date.now()});$('#sheet').hidden=true;toast('Nota guardada')}
  catch(e){$('#nErr').textContent=e&&e.code==='quota_exceeded'?'No caben más notas. Borra alguna antigua.':'No se ha podido guardar. Inténtalo otra vez.';$('#nErr').hidden=false}
  $('#nSave').disabled=false;
}

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{
  if(!ob)return;const el=e.target,p=el.dataset.bind;if(!p)return;
  setP(ob.d,p,el.value);
  if(p==='teamup'){const st=$('#tuSt');if(st)st.innerHTML=tuStatus(el.value)}
  const st=STEPS[ob.step];if(st.ok)$('#obNext').disabled=!st.ok(ob.d);
});
document.addEventListener('change',e=>{
  if(!ob)return;const el=e.target;
  if(el.dataset.bindn){setP(ob.d,el.dataset.bindn,Number(el.value));return}
  if(el.dataset.sw){setP(ob.d,el.dataset.sw,el.checked);renderOB()}
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-go]');if(!t)return;
  // cuestionario
  if(ob){
    if(t.dataset.ob==='next')return obNext();
    if(t.dataset.ob==='back')return obBack();
    if(t.dataset.seg){setP(ob.d,t.dataset.seg,JSON.parse(t.dataset.v));return renderOB()}
    if(t.dataset.stp){const p=t.dataset.stp,v=Number(getP(ob.d,p))+Number(t.dataset.d);setP(ob.d,p,Math.min(Number(t.dataset.max),Math.max(Number(t.dataset.min),Math.round(v*100)/100)));return renderOB()}
    if(t.dataset.subj){const k=t.dataset.subj,s=new Set(ob.d.subjects);s.has(k)?s.delete(k):s.add(k);ob.d.subjects=[...s];const on=s.has(k);t.setAttribute('aria-checked',on);const det=t.closest('details'),n=det.querySelectorAll('[aria-checked="true"]').length,tot=det.querySelectorAll('.subj').length;det.querySelector('.n').textContent=n?`${n} de ${tot}`:`${tot} asignaturas`;return}
    if(t.dataset.leave!==undefined){const i=+t.dataset.leave;ob.d.leave[i]=t.dataset.v==='auto'?'auto':(ob.d.leave[i]==='auto'?'09:30':ob.d.leave[i]);return renderOB()}
    if(t.dataset.evs!==undefined){const i=+t.dataset.evs,s=new Set(ob.d.evStudy.days);s.has(i)?s.delete(i):s.add(i);ob.d.evStudy.days=[...s].sort();return renderOB()}
    if(t.hasAttribute('data-addev')){ob.d.events.push({id:'e'+Date.now(),label:'Reunión',dow:0,start:'12:00',end:'13:00',freq:'all',work:true});return renderOB()}
    if(t.dataset.delev!==undefined){ob.d.events.splice(+t.dataset.delev,1);return renderOB()}
    return;
  }
  if(t.closest('#tabs')&&t.dataset.t){if(t.dataset.t==='hoy'&&view.tab==='hoy'){view.sel=sod(now);render(true);return}view.tab=t.dataset.t;render(true);return}
  if(t.dataset.day!==undefined){view.sel=addDays(monday(view.sel),+t.dataset.day);if(t.hasAttribute('data-go')){view.tab='hoy';render(true)}else render();return}
  const a=t.dataset.act;
  if(a==='wk-1'||a==='wk1'){view.sel=addDays(view.sel,a==='wk1'?7:-7);render();return}
  if(a==='today'){view.sel=sod(now);render();return}
  if(a==='note'){openNote();return}
  if(a==='redo'){startOB(0);return}
  if(a==='symail'){const em=($('#syEmail').value||'').trim();if(!/^\S+@\S+\.\S+$/.test(em)){syncStep.err='Escribe un email válido.';render();return}
    syncStep={email:em,sent:false,busy:true,err:''};render();try{await Store.sendCode(em);syncStep.sent=true}catch(err){syncStep.err='No se ha podido enviar el código. Inténtalo otra vez.'}syncStep.busy=false;render();return}
  if(a==='sycode'){const code=($('#syCode').value||'').trim();if(code.length<6){syncStep.err='Escribe el código del email.';render();return}
    syncStep.busy=true;syncStep.err='';render();try{await Store.verify(syncStep.email,code);syncStep={email:'',sent:false,busy:false,err:''};toast('Sincronizado');render()}catch(err){syncStep.busy=false;syncStep.err='Código incorrecto o caducado.';render()}return}
  if(a==='signout'){await Store.signOut();render();toast('Sesión cerrada');return}
  if(a==='reset'){if(!t.dataset.armed){t.dataset.armed='1';t.querySelector('.lab').textContent='Toca otra vez para borrar todo';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.querySelector('.lab').textContent='Borrar mis datos'}},3500);return}
    await Store.reset();cfg=null;E=null;startOB(0);return}
  if(t.dataset.edit){startOB(+t.dataset.edit,true);return}
  if(t.dataset.par){const W=isoWeek(sod(now))%2;cfg.parityA=t.dataset.par==='A'?W:1-W;E=Engine(cfg);render();Store.saveCfg(cfg).catch(()=>toast('No se ha podido guardar'));return}
  if(t.dataset.delnote){if(!t.dataset.armed){t.dataset.armed='1';t.textContent='¿Seguro?';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.textContent='Quitar'}},3000);return}Store.delNote(t.dataset.delnote).catch(()=>toast('No se ha podido borrar'));return}
});
$('#nSave').onclick=saveNote;$('#nCancel').onclick=()=>$('#sheet').hidden=true;
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')$('#sheet').hidden=true});
$$('#nKinds button').forEach(b=>b.onclick=()=>setKind(b.dataset.v));
$('#nText').addEventListener('keydown',e=>{if(e.key==='Enter')saveNote()});
let tx=null,ty=null;
document.addEventListener('touchstart',e=>{if(ob||view.tab!=='hoy'||!e.target.closest('#tg'))return;tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
document.addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;tx=null;if(Math.abs(dx)>60&&Math.abs(dy)<45){view.sel=addDays(view.sel,dx<0?1:-1);render()}},{passive:true});
document.addEventListener('keydown',e=>{if(ob||view.tab!=='hoy'||e.target.matches('input,select,textarea'))return;if(e.key==='ArrowRight'){view.sel=addDays(view.sel,1);render()}if(e.key==='ArrowLeft'){view.sel=addDays(view.sel,-1);render()}});
const tick=()=>{const was=sameDay(view.sel,now);now=new Date();if(was)view.sel=sod(now);if(!ob&&cfg&&$('#sheet').hidden&&!document.activeElement.matches('input,select'))render()};
setInterval(tick,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();Store.pull().catch(()=>{})}});

(async function boot(){
  await Promise.all([Store.init(),loadCals()]);
  cfg=await Store.loadCfg();
  if(cfg){cfg={...clone(DEFAULT_CFG),...cfg};await loadCatalog(teamupId(cfg.teamup));E=Engine(cfg)}
  else await loadCatalog((CALS[0]||{}).id);
  Store.watchNotes(a=>{notes=a;if(!ob&&cfg)render()});
  render(true);
})();
