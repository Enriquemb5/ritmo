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
const NCOLS='id,date,text,kind,time,created,end,done,alert';
const Store={mode:'local',sb:null,user:null,cb:null,
  async init(){const C=window.RITMO_CONFIG||{};if(!C.supabaseUrl||!C.supabaseKey)return;
    try{await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
      this.sb=window.supabase.createClient(C.supabaseUrl,C.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
      this.sb.auth.onAuthStateChange(async ev=>{if(ev==='PASSWORD_RECOVERY'){const pw=window.prompt('Escribe tu nueva contraseña (mínimo 6 caracteres)');if(pw&&pw.length>=6){const {error}=await this.sb.auth.updateUser({password:pw});toast(error?'No se ha podido cambiar':'Contraseña cambiada')}}});
      const {data}=await this.sb.auth.getSession();if(data&&data.session){this.user=data.session.user;this.mode='cloud'}}catch(e){this.sb=null}},
  get uid(){return this.user&&this.user.id},
  async loadCfg(){const l=LS.get('ritmo-cfg',null);if(this.mode!=='cloud')return l;
    try{const {data,error}=await this.sb.from('perfiles').select('cfg').eq('user_id',this.uid).maybeSingle();if(error)throw error;
      if(data&&data.cfg){LS.set('ritmo-cfg',data.cfg);return data.cfg}if(l)await this.saveCfg(l);return l}catch(e){return l}},
  async saveCfg(c){LS.set('ritmo-cfg',c);if(this.mode==='cloud'){const {error}=await this.sb.from('perfiles').upsert({user_id:this.uid,cfg:c,updated_at:new Date().toISOString()});if(error)throw error}},
  local(){return LS.get('ritmo-notas',[])},
  emit(a){LS.set('ritmo-notas',a);if(this.cb)this.cb(a)},
  watchNotes(cb){this.cb=cb;cb(this.local());if(this.mode==='cloud')this.pull()},
  async pull(){if(this.mode!=='cloud')return;const {data,error}=await this.sb.from('notas').select(NCOLS).eq('user_id',this.uid);if(!error&&data)this.emit(data.map(r=>({...r,time:r.time||'',end:r.end||'',done:!!r.done,alert:r.alert==null?'':r.alert})))},
  async addNote(n){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').insert({...n,alert:n.alert===''?null:n.alert,user_id:this.uid});if(error)throw error;return this.pull()}this.emit([...this.local(),{id:'n'+Date.now(),...n}])},
  async updNote(id,p){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').update(p).eq('id',id);if(error)throw error;return this.pull()}this.emit(this.local().map(n=>n.id===id?{...n,...p}:n))},
  async delNote(id){if(this.mode==='cloud'){const {error}=await this.sb.from('notas').delete().eq('id',id);if(error)throw error;return this.pull()}this.emit(this.local().filter(n=>n.id!==id))},
  async login(email,password,create){
    const {data,error}=create?await this.sb.auth.signUp({email,password}):await this.sb.auth.signInWithPassword({email,password});if(error)throw error;
    if(!data.session)throw new Error('confirm');this.user=data.session.user;this.mode='cloud';
    const loc=this.local().filter(n=>String(n.id).startsWith('n'));
    if(loc.length)await this.sb.from('notas').insert(loc.map(({id,...n})=>({...n,alert:n.alert===''||n.alert==null?null:n.alert,user_id:this.uid})));
    const c=await this.loadCfg();if(c){cfg=normCfg(c);await loadCat(teamupId(cfg.teamup));rebuild()}await this.pull()},
  async resetPw(email){const {error}=await this.sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error},
  async signOut(){if(this.sb)await this.sb.auth.signOut();this.user=null;this.mode='local'},
  async reset(){if(this.mode==='cloud'){await this.sb.from('notas').delete().eq('user_id',this.uid);await this.sb.from('perfiles').delete().eq('user_id',this.uid)}LS.del('ritmo-cfg');LS.del('ritmo-notas');notes=[]}
};

let cfg=null,E=null,notes=[],now=new Date(),ob=null;
/* TeamUp que no está en el repositorio: se lee en directo si hay proxy (config.js → teamupProxy) y se guarda una copia */
async function loadLive(id){
  if(!id||!PROXY())return false;const key='ritmo-tu-'+id,meta=CALS.find(c=>c.id===id)||{id,name:'Tu calendario de TeamUp',short:'TeamUp'};
  if(!CALS.includes(meta))CALS.push(meta);
  try{const base=PROXY()+'/'+id,sc=await (await fetch(base+'/subcalendars')).json();
    const n=new Date(),y=n.getMonth()>=7?n.getFullYear():n.getFullYear()-1;
    const r=await fetch(`${base}/events?startDate=${y}-09-01&endDate=${y+1}-07-31&tz=Europe%2FMadrid`);if(!r.ok)throw new Error(r.status);
    const cat=buildCatalog(sc.subcalendars,(await r.json()).events);if(!cat.E.length)throw new Error('vacío');LS.set(key,cat);setCatalog(meta,cat);return true}
  catch(e){const c=LS.get(key,null);if(c){setCatalog(meta,c);return true}return false}
}
const loadCat=async id=>await loadCatalog(id)||await loadLive(id);
const view={tab:'hoy',sel:sod(new Date()),span:LS.get('ritmo-span',window.innerWidth>=900?7:1)};
const rebuild=()=>{E=cfg?Engine(cfg,notes):null};
const nmin=()=>now.getHours()*60+now.getMinutes();
const itemsOn=d=>{const k=ymd(d);return notes.filter(n=>n.kind==='viaje'||n.kind==='festivo'?k>=n.date&&k<=(n.end||n.date):n.date===k).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')||(a.created||0)-(b.created||0))};
const kindOf=ns=>['examen','entrega','viaje','festivo','tarea','recordatorio'].find(k=>ns.some(n=>n.kind===k&&!n.done))||'';
function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
/* cuántos días caben: móvil 1, móvil en horizontal 3, ordenador 2-7 (por defecto la semana) */
const spanOpts=()=>{const w=window.innerWidth,h=window.innerHeight;if(h<500&&w>h)return null;return w>=900?[1,2,3,7]:w>=700?[1,2,3]:null};
function cols(){const w=window.innerWidth,h=window.innerHeight,o=spanOpts();if(o){const v=view.span||(w>=900?7:1);return o.includes(v)?v:o[o.length-1]}if(w>h&&w>=560)return 3;return 1}

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
const dayChips=(path,days,only)=>`<div class="chips">${DL.map((l,i)=>only&&!only.includes(i)?'':`<button type="button" data-days="${path}" data-i="${i}" aria-pressed="${(days||[]).includes(i)}">${DN[i].slice(0,3)}</button>`).join('')}</div>`;

const known=url=>!!CAT_ID&&teamupId(url)===CAT_ID;
const calOf=url=>CALS.find(c=>c.id===teamupId(url));
const PROXY=()=>((window.RITMO_CONFIG||{}).teamupProxy||'').replace(/\/$/,'');
/* repositorio de la app (para pedir que se añada un calendario) */
const REPO=(()=>{const h=location.hostname,m=h.match(/^([a-z0-9-]+)\.github\.io$/i);const p=location.pathname.split('/').filter(Boolean)[0];return m&&p?`${m[1]}/${p}`:'Enriquemb5/ritmo'})();
const askCalURL=id=>`https://github.com/${REPO}/issues/new?template=calendario.yml&labels=calendario&title=${encodeURIComponent('Calendario: '+id)}&enlace=${encodeURIComponent('https://teamup.com/'+id)}`;
function tuStatus(url){
  if(!url.trim())return`<div class="status no"><span><b>Sin enlace todavía</b>Pégalo cuando lo tengas. Puedes seguir sin él.</span></div>`;
  const m=calOf(url);if(m)return`<div class="status ok"><span><b>${esc(m.name)}</b>Calendario reconocido${known(url)?` · ${CAT.E.length} clases, sincronizado el ${CAT_SYNC}`:''}.</span></div>`;
  const id=teamupId(url);
  if(id&&PROXY())return`<div class="status ok"><span><b>Calendario de TeamUp</b>Lo leo directamente de TeamUp al continuar.</span></div>`;
  if(id)return`<div class="status no"><span><b>Este calendario aún no está en Ritmo</b>Pide que lo añadan: se sincroniza solo en unos minutos y luego cada día. Mientras, puedes usar «Mi propio horario».<br><a href="${askCalURL(id)}" target="_blank" rel="noopener" style="color:var(--accent);font-weight:600">Pedir que se añada →</a></span></div>`;
  return`<div class="status no"><span><b>No parece un enlace de TeamUp</b>Debería ser algo como teamup.com/ks…</span></div>`;
}
/* horario propio: asignaturas (o clases de academia) escritas a mano o importadas */
function customEditor(d,o={}){
  const subs=d.custom||[],h=o.h||'Asignaturas a mano',ph=o.ph||'Nombre de la asignatura',add=o.add||'+ Añadir asignatura';
  return grp(h,subs.map((s,i)=>`<div class="mtg"><input class="full" type="text" data-bind="custom.${i}.name" value="${esc(s.name)}" placeholder="${esc(ph)}" aria-label="Nombre">
    ${(s.slots||[]).map((sl,j)=>`<select data-bindn="custom.${i}.slots.${j}.dow" aria-label="Día">${DN.map((n,k)=>`<option value="${k}"${k===sl.dow?' selected':''}>${n}</option>`).join('')}</select>
      <input type="text" data-bind="custom.${i}.slots.${j}.loc" value="${esc(sl.loc||'')}" placeholder="${o.loc||'Aula'}" aria-label="Lugar">
      <input type="time" data-bind="custom.${i}.slots.${j}.start" value="${esc(sl.start)}" aria-label="Empieza"><input type="time" data-bind="custom.${i}.slots.${j}.end" value="${esc(sl.end)}" aria-label="Termina">
      <button type="button" class="del" data-delslot="${i}.${j}">Quitar este horario</button>`).join('')}
    <button type="button" class="addrow" style="grid-column:1/-1;padding:6px 0" data-addslot="${i}">+ Otro día</button>
    <button type="button" class="del" data-delsub="${i}">Quitar</button></div>`).join('')+`<button type="button" class="addrow" data-addsub>${add}</button>`,o.foot||'Cada asignatura puede tener varios días. Se repiten cada semana dentro del periodo de clases.');
}
/* clases con fecha importadas (.ics o PDF por semanas): por curso, con su grupo de prácticas */
function icsPicker(d){
  if(!(d.ics||[]).length)return'';
  const info={};for(const e of d.ics){const n=e[3],x=info[n]=info[n]||{n:0,course:e[6]||'Del archivo importado',groups:new Set(),theory:0};x.n++;if(e[5])x.groups.add(e[5]);else x.theory++}
  const sel=new Set(d.icsSel),G=d.icsGroup||{};
  const courses=[...new Set(Object.values(info).map(x=>x.course))].sort();
  const body=courses.map(c=>{const names=Object.keys(info).filter(n=>info[n].course===c).sort((a,b)=>(info[b].n>=4)-(info[a].n>=4)||a.localeCompare(b));const k=names.filter(n=>sel.has(n)).length;
    return`<details class="course"${k||courses.length===1?' open':''}><summary>${esc(c)}<span class="n">${k?`${k} de ${names.length}`:names.length+' asignaturas'}</span></summary>${names.map(n=>{const x=info[n],gs=[...x.groups].sort();
      return`<button type="button" class="subj" role="checkbox" aria-checked="${sel.has(n)}" data-icssel="${esc(n)}" data-q="${esc(townKey(n))}"><span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="nm">${esc(n)}<small>${x.theory?`${x.theory} clases`:''}${x.theory&&gs.length?' · ':''}${gs.length?`prácticas en ${gs.length} grupos`:''}</small></span></button>${gs.length&&sel.has(n)?`<div class="grpchips" data-q="${esc(townKey(n))}"><span>Tu grupo de prácticas</span>${gs.map(g=>`<button type="button" data-icsgrp="${esc(n)}" data-g="${esc(g)}" aria-pressed="${G[n]===g}">${esc(g)}</button>`).join('')}</div>`:''}`}).join('')}</details>`}).join('');
  const many=Object.keys(info).length>8;
  return`${many?'<input class="search" id="subjQ" type="search" placeholder="Buscar asignatura" autocomplete="off" aria-label="Buscar asignatura">':''}<div id="subjL">${body}</div><p class="empty" id="subjNone" hidden>No hay ninguna asignatura con ese nombre.</p>
    <label class="addrow" style="display:block;cursor:pointer">+ Añadir otro PDF (otro curso o semestre)<input type="file" accept="application/pdf,.pdf" id="pdfFile" multiple hidden></label><p class="foot" id="pdfMsg" style="margin:0 16px;color:var(--fg2);font-size:13px">${esc(ob.pdfMsg||'')}</p>`;
}
const caSel=(p,v)=>`<select class="sel" data-bind="${p}" aria-label="Comunidad autónoma">${CCAA.map(([k,n])=>`<option value="${k}"${k===v?' selected':''}>${n}</option>`).join('')}</select>`;
const caName=k=>(CCAA.find(c=>c[0]===k)||['',''])[1];
/* qué festivos voy a tener en cuenta según dónde estudias o trabajas */
function festNote(d){
  const p=d.place.same?d.home:d.place,y=new Date().getFullYear(),loc=localOf(p.ca,p.town);
  const yrs=FEST?[y,y+1].filter(x=>FEST[x]).join(' y '):'';
  return`Festivos nacionales y de ${esc(caName(p.ca))}${yrs?` (${yrs})`:''}. `+(p.town?(loc?`También los locales de ${esc(p.town)}.`:`Los locales de ${esc(p.town)} aún no los tengo: márcalos en Agenda → Festivo.`):'Escribe tu municipio para los festivos locales.');
}
/* buscador de municipios (los 8.132 del INE, se cargan al llegar a este paso) */
let MUNI=null;const loadMuni=async()=>{if(!MUNI){try{MUNI=await (await fetch('data/municipios.json')).json()}catch(e){MUNI={}}}return MUNI};
function muniFind(q,ca){q=townKey(q);if(q.length<2||!MUNI)return[];const out=[];
  for(const k of Object.keys(MUNI)){if(k==='fuente')continue;for(const pr in MUNI[k])for(const n of MUNI[k][pr].split('|')){const t=townKey(n);const sc=t===q?0:t.startsWith(q)?1:t.includes(q)?2:9;if(sc<9)out.push({n,pr,k,sc:sc+(k===ca?0:3)})}}
  return out.sort((a,b)=>a.sc-b.sc||a.n.length-b.n.length).slice(0,6)}
function acRender(w){const box=$('#ac-'+w);if(!box||!ob)return;const q=ob.d[w].town||'';const r=muniFind(q,ob.d[w].ca);
  box.innerHTML=r.length&&!(r[0].sc===0&&townKey(r[0].n)===townKey(q)&&r[0].k===ob.d[w].ca)?r.map(x=>`<button type="button" class="acb" data-acpick="${w}" data-v="${esc(x.n)}" data-ca="${x.k}"><span>${esc(x.n)}</span><small>${esc(x.pr)}${x.k!==ob.d[w].ca?' · '+esc(caName(x.k)):''}</small></button>`).join(''):''}
const townsList=()=>'';
const isOpos=d=>d.profile==='opos';
const STEPS=[
 {id:'hola',btn:'Empezar',render:()=>`<section class="hero-ob">${logo(64)}${head('Ritmo','Tu semana,<br><span class="grad">en orden.</span>','Cuéntame cómo es tu día y monto tu rutina con tus clases o tu temario, tu trabajo, tu deporte, tus hobbies y tus ratos libres.')}
   <ul class="feat"><li data-c="clase"><span class="ic">${ICON.cal}</span><span><b>Tu horario</b>Desde TeamUp, un calendario, un PDF o escrito a mano. Y si opositas, por temas.</span></li>
   <li data-c="trabajo"><span class="ic">${ICON.wave}</span><span><b>Se adapta cada día</b>Festivos, viajes, exámenes o una clase que cambia: la rutina se reorganiza sola.</span></li>
   <li data-c="hobby"><span class="ic">${ICON.heart}</span><span><b>Tiempo para ti</b>Deporte, tus hobbies y ratos libres, durmiendo lo que necesitas.</span></li></ul></section>`},
 {id:'nombre',render:d=>`${head(pn('nombre'),'¿Cómo te<br>llamas?')}<input class="big-in" data-bind="name" value="${esc(d.name)}" placeholder="Tu nombre" autocomplete="given-name" aria-label="Tu nombre">`,ok:d=>d.name.trim().length>0},
 {id:'perfil',render:d=>`${head(pn('perfil'),'Sobre ti','Para saber qué horario montarte y qué días son festivo.')}
   ${grp('Ahora mismo',`<div class="row">${seg('profile',[['uni','Universidad'],['opos','Oposiciones'],['otro','Otro']],d.profile,true)}</div>`,d.profile==='otro'?'FP, bachillerato, un trabajo con horario… Podrás poner tu horario a mano, desde un calendario o desde un PDF.':d.profile==='opos'?'Repartimos el temario por semanas, con bloques de estudio, repasos y simulacros.':'')}
   ${grp('Dónde vives',row('Comunidad',caSel('home.ca',d.home.ca))+row('Municipio',`<input type="text" class="tin" data-bind="home.town" value="${esc(d.home.town)}" placeholder="Escribe tu municipio" autocomplete="off" aria-label="Municipio donde vives">`)+'<div class="acl" id="ac-home"></div>')}
   ${grp(isOpos(d)?'¿Dónde está tu academia o tu trabajo?':'¿Dónde estudias o trabajas?',`<div class="row">${seg('place.same',[[true,'En el mismo sitio'],[false,'En otro municipio']],d.place.same,true)}</div>`+(d.place.same?'':row('Comunidad',caSel('place.ca',d.place.ca))+row('Municipio',`<input type="text" class="tin" data-bind="place.town" value="${esc(d.place.town)}" placeholder="Escribe el municipio" autocomplete="off" aria-label="Municipio donde estudias o trabajas">`)+'<div class="acl" id="ac-place"></div>'),`<span id="festN">${festNote(d)}</span>`)}${townsList()}`},
 {id:'clases',when:d=>!isOpos(d),render:d=>`${head(pn('clases'),'Tu horario','¿De dónde lo saco?')}
   ${grp('',`<div class="row">${seg('source',[['teamup','TeamUp'],['propio','Mi propio horario']],d.source,true)}</div>`)}
   ${d.source==='teamup'?`${grp('Calendario de TeamUp',`<div class="row"><input type="url" data-bind="teamup" value="${esc(d.teamup)}" placeholder="https://teamup.com/ks…" inputmode="url" autocomplete="off" aria-label="Enlace de TeamUp"></div>`)}
   <div id="tuSt">${tuStatus(d.teamup)}</div><p class="lede" style="font-size:14px;margin:0 4px">Vale cualquier grado: en el siguiente paso eliges tus asignaturas de entre todos los cursos y grupos.</p>`
   :`${grp('Horario en PDF',`<label class="row file"><span class="lab">Elegir PDF<small>Leo las asignaturas, días, horas y grupos de prácticas. Puedes elegir varios (uno por curso).</small></span><input type="file" accept="application/pdf,.pdf" id="pdfFile" multiple aria-label="Horario en PDF"></label>`,`<span id="pdfMsg">${esc(ob.pdfMsg||'Funciona con horarios en tabla (días arriba, horas a la izquierda) y con listas «Lunes 9:00–11:00 Asignatura».')}</span>`)}
   ${grp('Archivo de calendario',`<label class="row file"><span class="lab">Elegir archivo .ics<small>Lo exportan Google Calendar, Outlook, Apple Calendar y muchas universidades.</small></span><input type="file" accept=".ics,text/calendar" id="icsFile" aria-label="Archivo .ics"></label>`,d.ics.length?`${d.ics.length} clases importadas. Elige cuáles quieres en el siguiente paso.`:'')}
   ${grp('¿Lo tienes en foto?',`<div class="row"><span class="lab">Mándasela a Claude<small>Pídele «el código de Ritmo de mi horario» y pégalo aquí.</small></span></div><div class="row"><input type="text" id="codeIn" placeholder="Pega aquí el código" autocomplete="off" aria-label="Código del horario"></div><button type="button" class="addrow" data-pastecode>Usar este código</button>`)}
   <p class="lede" style="font-size:15px">También puedes escribirlo a mano en el siguiente paso.</p>`}`},
 {id:'asig',when:d=>!isOpos(d),render:d=>{
   if(d.source==='propio')return`${head(pn('asig'),'Tus asignaturas','Revisa lo importado, marca lo que quieres ver y añade lo que falte.')}${icsPicker(d)}${customEditor(d)}
     ${grp('Periodo de clases',row('Desde',`<input type="date" data-bind="customRange.from" value="${esc(d.customRange.from)}">`)+row('Hasta',`<input type="date" data-bind="customRange.to" value="${esc(d.customRange.to)}">`),'Fuera de estas fechas no se ponen las clases escritas a mano. Déjalo vacío si no lo sabes.')}`;
   const ok=known(d.teamup);
   if(!ok)return`${head(pn('asig'),'Tus asignaturas')}<div class="status no"><span><b>Primero hace falta tu calendario</b>Cuando tu TeamUp esté en Ritmo podrás elegir aquí tus asignaturas. También puedes volver atrás y usar tu propio horario.</span></div>`;
   const sel=new Set(d.subjects);const cnt={};CAT.E.forEach(e=>cnt[e[3]]=(cnt[e[3]]||0)+1);
   const anySel=SUBJ.some(s=>sel.has(s.key));
   const body=COURSES.map(([c,l])=>{const list=SUBJ.filter(s=>s.course===c&&cnt[s.i]).sort((a,b)=>(cnt[b.i]>=3)-(cnt[a.i]>=3)||a.name.localeCompare(b.name));if(!list.length)return'';const n=list.filter(s=>sel.has(s.key)).length;
     const open=n>0||(!anySel&&COURSES.length<=2);
     return`<details class="course"${open?' open':''}><summary>${esc(l)}<span class="n">${n?`${n} de ${list.length}`:list.length+' asignaturas'}</span></summary>${list.map(s=>`<button type="button" class="subj" role="checkbox" aria-checked="${sel.has(s.key)}" data-subj="${esc(s.key)}" data-q="${esc(townKey(s.name))}"><span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="nm">${esc(s.name)}<small>${cnt[s.i]} ${cnt[s.i]>1?'sesiones':'sesión'}</small></span></button>`).join('')}</details>`}).join('');
   return`${head(pn('asig'),'Tus asignaturas','Busca las tuyas o abre tu curso. Puedes mezclar cursos y grupos.')}<input class="search" id="subjQ" type="search" placeholder="Buscar asignatura" autocomplete="off" aria-label="Buscar asignatura"><div id="subjL">${body}</div><p class="empty" id="subjNone" hidden>No hay ninguna asignatura con ese nombre.</p><p class="foot" style="margin:0 16px;color:var(--fg2);font-size:13px">${sel.size} seleccionadas. Si dos se cruzan, las verás una al lado de la otra.</p>`}},
 {id:'opos',when:isOpos,render:d=>{const O=d.opos,P=OPOS_TIPOS[O.tipo]||OPOS_TIPOS.otra;
   const dsel=(p,v,none)=>`<select class="sel" data-bindn="${p}">${none?`<option value="-1"${v===-1?' selected':''}>Ninguno</option>`:''}${DN.map((n,k)=>`<option value="${k}"${k===v?' selected':''}>${n}</option>`).join('')}</select>`;
   const sesTot=(O.sessions||[]).reduce((a,x)=>a+Math.max(0,T(x.end||'0:00')-T(x.start||'0:00'))*(x.days||[]).length,0),blkTot=O.study.reduce((a,b)=>a+b,0);
   const ses=(O.sessions||[]).map((x,i)=>`<div class="mtg"><input class="full" type="text" data-bind="opos.sessions.${i}.label" value="${esc(x.label)}" placeholder="Temario, test, callejero…" list="oposAreas" aria-label="Qué estudias">
     <input type="time" data-bind="opos.sessions.${i}.start" value="${esc(x.start)}" aria-label="Empieza"><input type="time" data-bind="opos.sessions.${i}.end" value="${esc(x.end)}" aria-label="Termina">
     <div class="full">${dayChips(`opos.sessions.${i}.days`,x.days)}</div>
     <button type="button" class="del" data-delses="${i}">Quitar sesión</button></div>`).join('');
   const tr=(O.train||[]).map((x,i)=>`<div class="mtg"><input class="full" type="text" data-bind="opos.train.${i}.label" value="${esc(x.label)}" placeholder="Natación, gimnasio, carrera…" aria-label="Entrenamiento">
     <div class="full" style="display:flex;align-items:center;justify-content:space-between;gap:8px">${stp(`opos.train.${i}.min`,x.min,15,240,15,'min')}<input type="time" data-bind="opos.train.${i}.start" value="${esc(x.start||'')}" aria-label="Hora (opcional)" style="max-width:46%"></div>
     <div class="full">${dayChips(`opos.train.${i}.days`,x.days)}</div>
     <button type="button" class="del" data-deltr="${i}">Quitar entrenamiento</button></div>`).join('');
   return`${head(pn('opos'),'Tu oposición','Monta tu día como estudias de verdad: tus horas, tus descansos y tus entrenos.')}
   ${grp('Oposición',row('Tipo',`<select class="sel" data-bind="opos.tipo" aria-label="Tipo de oposición">${Object.entries(OPOS_TIPOS).map(([k,v])=>`<option value="${k}"${k===O.tipo?' selected':''}>${esc(v.n)}</option>`).join('')}</select>`)+row('Cuál',txt('opos.name',O.name,P.ph)),P.pruebas?`Pruebas físicas: ${esc(P.pruebas)} Comprueba siempre tu convocatoria.`:'')}
   ${grp('Cómo estudias',`<div class="row">${seg('opos.mode',[['sesiones','A mi manera'],['bloques','Pomodoro']],O.mode,true)}</div>`,O.mode==='sesiones'?'Pon tus sesiones con su hora y lo que estudias en cada una. Entre sesión y sesión, descanso.':'Bloques cortos con descanso entre medias, hasta completar las horas de cada día.')}
   ${O.mode==='sesiones'?grp('Sesiones de estudio',ses+`<button type="button" class="addrow" data-addses>+ Añadir sesión</button><datalist id="oposAreas">${[...P.areas,'Repaso','Simulacro'].map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`,`${hm(sesTot)} a la semana. Las sesiones de «Temario» dicen qué tema toca.`)
   :grp('Horas de estudio',O.study.map((v,i)=>`<div class="daygrid"><span class="d">${DL[i]}</span>${stp('opos.study.'+i,v,0,720,30,'workh')}<span></span></div>`).join('')+row('Empiezo a las',tin('opos.start',O.start))+row('Bloques de',seg('opos.block',[[25,'25 min'],[50,'50 min'],[90,'90 min']],O.block))+row('Descanso entre bloques',stp('opos.rest',O.rest,5,30,5,'min')),`${hm(blkTot)} a la semana.`)}
   ${grp('Temario',row('Llevar la cuenta de los temas',sw('opos.temasOn',O.temasOn!==false))+(O.temasOn!==false?row('Temas',stp('opos.temas',O.temas,1,400,1,''))+row('Temas por semana',stp('opos.ritmo',O.ritmo,1,40,1,''))+row('Empiezo por el tema',stp('opos.primero',O.primero,1,400,1,'')):''),O.temasOn!==false?'Al acabar el temario vuelve a empezar. Si un tema te lleva más, cambia el tema de inicio en Ajustes.':'Tus sesiones de temario saldrán como «Temario», sin número.')}
   ${grp('Entrenamiento físico',tr+`<button type="button" class="addrow" data-addtr>+ Añadir entrenamiento</button>`,(O.train||[]).length?'Sin hora, lo pongo en el primer hueco de la tarde, con la comida ya bajada y antes de cenar.':P.train?'Toca «+ Añadir entrenamiento» o vuelve a elegir el tipo para cargar los entrenos típicos.':'Si tu oposición tiene pruebas físicas, añade aquí tus entrenos.')}
   ${grp('Repaso y simulacros',row('Día de repaso',dsel('opos.repaso',O.repaso,true))+row('Simulacro semanal',sw('opos.sim.on',O.sim.on))+(O.sim.on?row('Día',dsel('opos.sim.dow',O.sim.dow))+row('Hora',tin('opos.sim.start',O.sim.start))+row('Duración',stp('opos.sim.min',O.sim.min,30,360,30,'min')):''),'El día de repaso, el temario se dedica a repasar la semana. El simulacro manda sobre las sesiones de ese rato.')}
   ${customEditor(d,{h:'Academia o preparador',ph:'Academia, preparador…',add:'+ Añadir clase',loc:'Lugar',foot:'Clases fijas cada semana. Te pongo el trayecto de ida y vuelta.'})}`}},
 {id:'dia',render:d=>`${head(pn('dia'),'Tu día','Cuánto duermes, a qué hora te levantas y cuánto tardas en llegar.')}
   ${grp('Sueño',row('Horas de sueño',stp('sleepH',d.sleepH,5,10,.5,'h'))+row('Me levanto entre semana',tin('wakeWk',d.wakeWk))+row('Fin de semana',tin('wakeWe',d.wakeWe))+row('Me acuesto como muy tarde',tin('bedWk',d.bedWk),'Entre semana')+row('Viernes y sábado',tin('bedWe',d.bedWe)),'Si te levantas tarde, duermes más en vez de trasnochar.')}
   ${grp(isOpos(d)?'Trayecto a la academia':d.profile==='otro'?'Trayecto':'Trayecto a la universidad',row('Normal',stp('commute.normal',d.commute.normal,0,150,5,'min'))+row('En hora punta',stp('commute.rush',d.commute.rush,0,180,5,'min'))+row('Llegar con margen',stp('margin',d.margin,0,45,5,'min'),'Para aparcar, imprevistos o tráfico'),'Horas punta: 7:30–9:30, 13:30–15:30 y 17:30–19:30.')}
   ${isOpos(d)?'':grp('Salgo de casa',d.leave.map((v,i)=>`<div class="daygrid"><span class="d">${DL[i]}</span>${v==='auto'?`<span style="color:var(--fg2);font-size:15px">Justo para llegar</span>`:`<input type="time" data-bind="leave.${i}" value="${esc(v)}" style="border:0;background:var(--fill);border-radius:8px;padding:5px 8px;justify-self:start">`}<div class="seg"><button type="button" data-leave="${i}" data-v="t" aria-pressed="${v!=='auto'}">Hora</button><button type="button" data-leave="${i}" data-v="auto" aria-pressed="${v==='auto'}">Auto</button></div></div>`).join(''),'Con «Auto» sales justo para llegar a tu primera clase con el margen que has puesto.')}`},
 {id:'trabajo',render:d=>{const w=d.work;const tot=w.min.reduce((a,b)=>a+b,0);
   return`${head(pn('trabajo'),'Trabajo','Si trabajas o haces prácticas, lo coloco alrededor de tu horario.')}
   ${grp('',row('Trabajo o prácticas',sw('work.on',w.on)))}
   ${w.on?`${grp('Dónde',`<div class="row">${seg('work.place',[['uni',isOpos(d)||d.profile==='otro'?'Fuera de casa':'Junto a la uni'],['casa','En casa']],w.place,true)}</div>`)}
   ${grp('Horas por día',w.min.map((v,i)=>`<div class="daygrid"><span class="d">${DL[i]}</span>${stp('work.min.'+i,v,0,600,30,'workh')}${seg('work.after.'+i,[[false,'Mañana'],[true,'Tarde']],w.after[i])}</div>`).join(''),`${hm(tot)} a la semana, contando las reuniones de trabajo.`)}
   ${grp('Festivos',`<div class="row">${seg('holidayWork',[['libre','Ese día no trabajo'],['trabaja','Trabajo igual']],d.holidayWork,true)}</div>`,d.holidayWork==='libre'?'En festivo no hay trabajo ni reuniones, y esa semana trabajas menos horas.':'En festivo no hay clase, pero el trabajo y las reuniones siguen.')}
   ${grp('Reuniones fijas',(d.events.map((e,i)=>`<div class="mtg"><input class="full" type="text" data-bind="events.${i}.label" value="${esc(e.label)}" placeholder="Nombre" aria-label="Nombre de la reunión">
     <select data-bindn="events.${i}.dow" aria-label="Día">${DN.slice(0,5).map((n,k)=>`<option value="${k}"${k===e.dow?' selected':''}>${n}</option>`).join('')}</select>
     <select data-bind="events.${i}.freq" aria-label="Frecuencia"><option value="all"${e.freq==='all'?' selected':''}>Cada semana</option><option value="A"${e.freq==='A'?' selected':''}>Semanas A</option><option value="B"${e.freq==='B'?' selected':''}>Semanas B</option></select>
     <input type="time" data-bind="events.${i}.start" value="${esc(e.start)}" aria-label="Empieza"><input type="time" data-bind="events.${i}.end" value="${esc(e.end)}" aria-label="Termina">
     <select class="full" data-bindn="events.${i}.notify" aria-label="Aviso">${[[0,'Sin aviso'],[10,'Avisarme 10 min antes'],[30,'Avisarme 30 min antes'],[60,'Avisarme 1 h antes'],[1440,'Avisarme el día antes']].map(([v,l])=>`<option value="${v}"${(e.notify||0)===v?' selected':''}>${l}</option>`).join('')}</select>
     <button type="button" class="del" data-delev="${i}">Quitar reunión</button></div>`).join(''))+`<button type="button" class="addrow" data-addev>+ Añadir reunión</button>`,'Las semanas A y B se van alternando. En Ajustes eliges cuál es la de esta semana.')}`:''}`}},
 {id:'habitos',render:d=>`${head(pn('habitos'),'Tus hábitos','Deporte, hobbies y estudio: lo que quieres que tenga hueco cada semana.')}
   ${grp('Hobbies',(d.hobbies.map((h,i)=>`<div class="mtg"><input class="full" type="text" data-bind="hobbies.${i}.label" value="${esc(h.label)}" placeholder="Guitarra, leer, dibujar…" aria-label="Hobby">
     <div class="full" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span style="color:var(--fg2);font-size:15px">Cada vez</span>${stp(`hobbies.${i}.min`,h.min,10,180,5,'min')}</div>
     <div class="full">${dayChips(`hobbies.${i}.days`,h.days)}</div>
     <div class="full">${seg(`hobbies.${i}.when`,[['tarde','Antes de cenar'],['noche','Después de cenar']],hobbyWhen(h),true)}</div>
     <button type="button" class="del" data-delhob="${i}">Quitar hobby</button></div>`).join(''))+`<button type="button" class="addrow" data-addhob>+ Añadir hobby</button>`,'El deporte (correr, gimnasio, bici…) va antes de cenar; lo tranquilo, después. Si un día acabas tarde, se acortan antes de quitarte sueño.')}
   ${grp('Deporte entre semana',row('Activado',sw('series.on',d.series.on))+(d.series.on?row('Qué',txt('series.label',d.series.label,'Series en pista'))+row('Días por semana',stp('series.count',d.series.count,1,5,1,'x'))+row('Duración',stp('series.min',d.series.min,30,240,15,'min'),'Desde que sales hasta que vuelves')+row('Terminar antes de',tin('series.endBy',d.series.endBy)):''))}
   ${grp('Fin de semana',(d.weekend||[]).map((x,i)=>`<div class="mtg"><input type="text" data-bind="weekend.${i}.label" value="${esc(x.label)}" placeholder="Estudio, trabajo, plan…" aria-label="Qué haces">
     <select data-bind="weekend.${i}.cat" aria-label="Tipo">${[['estudio','Estudio'],['trabajo','Trabajo'],['libre','Tiempo libre'],['hobby','Hobby']].map(([v,l])=>`<option value="${v}"${(x.cat||'estudio')===v?' selected':''}>${l}</option>`).join('')}</select>
     <input type="time" data-bind="weekend.${i}.start" value="${esc(x.start)}" aria-label="Empieza"><input type="time" data-bind="weekend.${i}.end" value="${esc(x.end)}" aria-label="Termina">
     <div class="full">${dayChips(`weekend.${i}.days`,x.days,[5,6])}</div>
     <button type="button" class="del" data-delwe="${i}">Quitar</button></div>`).join('')+`<button type="button" class="addrow" data-addwe>+ Añadir sesión de fin de semana</button>`,'Lo que haces sábado y domingo con su hora: estudiar, trabajar, un plan… Lo demás queda como tiempo libre. Los festivos entre semana van como un sábado.')}
   ${grp('Gimnasio: horas punta',row('Si hay gente',seg('gym.avoid',[['evitar','Prefiero evitarlo'],['igual','Me da igual']],d.gym.avoid))+(d.gym.avoid!=='igual'?d.gym.peaks.map((pk,i)=>`<div class="mtg"><input type="time" data-bind="gym.peaks.${i}.0" value="${esc(pk[0])}" aria-label="Hora punta desde"><input type="time" data-bind="gym.peaks.${i}.1" value="${esc(pk[1])}" aria-label="Hora punta hasta"><button type="button" class="del" data-delpk="${i}">Quitar esta hora punta</button></div>`).join('')+`<button type="button" class="addrow" data-addpk>+ Añadir otra hora punta</button>`:''),d.gym.avoid!=='igual'?'Si sabes cuándo se llena tu gimnasio, ponlo. Si no, uso la hora punta habitual (de 18:30 a 21:00). Los entrenos de gimnasio se mueven fuera de esas horas cuando caben.':'Los entrenos de gimnasio van a la hora que mejor encaje, haya gente o no.')}
   ${grp('Deporte el fin de semana',row('Activado',sw('run.on',d.run.on))+(d.run.on?row('Qué',txt('run.label',d.run.label,'Carrera'))+row('Día',seg('run.dow',[[5,'Sábado'],[6,'Domingo']],d.run.dow))+row('Hora',tin('run.start',d.run.start))+row('Duración',stp('run.min',d.run.min,30,240,15,'min')):''))}
   ${isOpos(d)?'':grp('Estudio por la noche',`<div class="row">${dayChips('evStudy.days',d.evStudy.days)}</div>`+row('Duración',stp('evStudy.min',d.evStudy.min,30,180,15,'min')),'Si ese día llegas pronto a casa, repasas antes o después de cenar.')}
   ${grp('Comidas',row('Comida a partir de',tin('meals.lunch',d.meals.lunch))+row('Como muy tarde',tin('meals.lunchLate',d.meals.lunchLate))+row('Cena',tin('meals.dinner',d.meals.dinner)),'Si te queda poco trabajo, lo terminas del tirón y comes al acabar, sin pasar de la hora límite.')}`},
 {id:'listo',btn:'Crear mi rutina',render:d=>{const tot=d.work.on?d.work.min.reduce((a,b)=>a+b,0):0;const ns=d.source==='propio'?d.custom.length+d.icsSel.length:d.subjects.length;
   const p=d.place.same?d.home:d.place;
   const first=isOpos(d)?`<li data-c="estudio"><span class="ic">${ICON.cal}</span><span><b>${esc(d.opos.name||'Tu oposición')}</b>${esc((OPOS_TIPOS[d.opos.tipo]||{}).n||'')}${d.opos.temasOn!==false?` · ${d.opos.ritmo} temas por semana`:''}${d.opos.train.length?` · ${d.opos.train.length} entrenos`:''}${d.custom.length?' · academia':''}</span></li>`
     :`<li data-c="clase"><span class="ic">${ICON.cal}</span><span><b>${ns} asignaturas</b>${d.source==='propio'?'Tu propio horario':known(d.teamup)?esc(CAT_NAME):'Sin calendario sincronizado'}</span></li>`;
   return`<section class="hero-ob">${logo(56)}${head('Todo listo',`Hola,<br><span class="grad">${esc(d.name||'tú')}</span>`,'Esto es lo que voy a tener en cuenta. Puedes cambiarlo cuando quieras en Ajustes.')}
   <ul class="feat">${first}
   <li data-c="trabajo"><span class="ic">${ICON.wave}</span><span><b>${tot?hm(tot)+' de trabajo':'Sin trabajo'}</b>${tot?(d.work.place==='uni'?'Fuera de casa':'En casa')+(d.events.length?` · ${d.events.length} reuniones fijas`:''):'Más tiempo para lo tuyo'}${p.town?` · festivos de ${esc(p.town)}`:''}</span></li>
   <li data-c="deporte"><span class="ic">${ICON.heart}</span><span><b>${String(d.sleepH).replace('.',',')} h de sueño</b>${[d.series.on?`${d.series.label} ${d.series.count}×`:'',d.run.on?`${d.run.label} el ${DN[d.run.dow].toLowerCase()}`:'',...d.hobbies.map(h=>h.label)].filter(Boolean).join(' · ')||'Sin hábitos fijos'}</span></li></ul></section>`}}
];
const visSteps=d=>STEPS.filter(s=>!s.when||s.when(d));
function pn(id){const v=visSteps(ob.d).filter(s=>s.id!=='hola'&&s.id!=='listo');return`Paso ${v.findIndex(s=>s.id===id)+1} de ${v.length}`}
const stepIdx=id=>typeof id==='number'?id:Math.max(0,STEPS.findIndex(s=>s.id===id));
const nextVis=(i,dir)=>{let j=i+dir;while(j>=0&&j<STEPS.length&&STEPS[j].when&&!STEPS[j].when(ob.d))j+=dir;return j};
/* quien empieza de cero no hereda el horario de nadie */
function blankCfg(){const c=normCfg(clone(DEFAULT_CFG));Object.assign(c,{teamup:'',subjects:[],events:[],hobbies:[],parityA:null,leave:['auto','auto','auto','auto','auto'],evStudy:{days:[],min:90}});
  c.work={...c.work,on:false};c.series={...c.series,on:false};c.run={...c.run,on:false};c.home={ca:'AN',town:''};c.place={same:true,ca:'AN',town:''};return c}
function startOB(step=0,edit=false){ob={step:stepIdx(step),d:cfg?normCfg(clone(cfg)):blankCfg(),edit,hist:[]};$('#tabs').hidden=true;$('#fab').hidden=true;renderOB(true)}
function renderOB(top){
  const st=STEPS[ob.step],d=ob.d,y=window.scrollY;
  const chain=ob.edit&&(st.id==='perfil'||st.id==='clases');
  const n=visSteps(d).length-1,k=visSteps(d).indexOf(st),label=ob.edit&&!chain?'Guardar':ob.edit?'Continuar':st.btn||'Continuar';
  $('#app').innerHTML=`<div class="ob wrap${top?' screen-in':''}"><div class="obtop">${ob.step>0||ob.edit?`<button class="back" data-ob="back">‹ ${ob.edit&&!ob.hist.length?'Ajustes':'Atrás'}</button>`:'<span></span>'}${ob.edit||ob.step===0?'<span></span>':`<div class="prog" aria-hidden="true"><i style="width:${k/n*100}%"></i></div>`}<span></span></div>
    <div class="obbody">${st.render(d)}</div></div>
    <div class="obfoot"><div class="wrap"><button class="cta" data-ob="next" id="obNext"${st.ok&&!st.ok(d)?' disabled':''}>${label}</button></div></div>`;
  if(top)window.scrollTo(0,0);else window.scrollTo(0,y);
}
async function obNext(){
  const st=STEPS[ob.step];if(st.ok&&!st.ok(ob.d))return;
  if(st.id==='clases'&&ob.d.source==='teamup'){$('#obNext').disabled=true;const id=teamupId(ob.d.teamup);if(!await loadCatalog(id))await loadLive(id)}
  const go=()=>{ob.hist.push(ob.step);ob.step=nextVis(ob.step,1);renderOB(true)};
  if(ob.edit&&(st.id==='perfil'||st.id==='clases'))return go();
  if(ob.edit||st.id==='listo'){
    const c=ob.d;c.name=c.name.trim();
    if(c.parityA==null&&c.events.some(e=>e.freq!=='all'))c.parityA=isoWeek(new Date())%2;
    if(isOpos(c)){c.source='propio';c.leave=c.leave.map(()=>'auto');if(!c.opos.desde)c.opos.desde=ymd(sod(new Date()))}
    $('#obNext').disabled=true;
    try{await Store.saveCfg(c)}catch(e){toast('No se ha podido guardar. Inténtalo otra vez.');$('#obNext').disabled=false;return}
    const wasEdit=ob.edit;cfg=c;rebuild();ob=null;view.tab=wasEdit?'ajustes':'hoy';view.sel=sod(new Date());applyTheme();render(true);toast(wasEdit?'Guardado':'Tu rutina está lista');return;
  }
  go();
}
function obBack(){
  if(ob.hist.length){ob.step=ob.hist.pop();renderOB(true);return}
  if(ob.edit||ob.step===0){if(cfg){ob=null;render(true)}return}
  ob.step=nextVis(ob.step,-1);renderOB(true);
}
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
  const cl=P.b.filter(b=>b.cat==='clase').length,w=P.b.filter(b=>b.cat==='trabajo').reduce((a,b)=>a+b.e-b.s,0),sps=P.b.filter(b=>b.cat==='deporte'),sp=sps[0];
  const p=[];if(P.trip)p.push('De viaje');if(P.hol&&!P.trip)p.push('Festivo');if(cl)p.push(`${cl} ${cl>1?'clases':'clase'}`);if(P.src==='opos'){const st=P.b.filter(b=>b.cat==='estudio').reduce((a,b)=>a+b.e-b.s,0);if(st)p.push(`${hm(st)} de estudio`)}if(w)p.push(`${hm(w)} de trabajo`);for(const x of sps)p.push(`${x.label.toLowerCase()} a las ${clock(x.s)}`);if(!p.length)p.push('Día tranquilo');
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
  const o=spanOpts();const spanSel=o&&view.tab==='hoy'?`<div class="seg" role="group" aria-label="Días a la vista">${o.map(v=>`<button data-span="${v}" aria-pressed="${c===v}">${v===1?'1 día':v===7?'Semana':v+' días'}</button>`).join('')}</div>`:'';
  return`<div class="wnav"><div class="t">${ttl}<small>${rng}${cfg.events.some(e=>e.freq!=='all')?` · semana ${E.parity(mon)}`:''}</small></div><div class="arr">${spanSel}${isThis?'':`<button class="icb pillb" data-act="today" aria-label="Volver a hoy">Hoy</button>`}<button class="icb" data-act="prev" aria-label="Anterior">‹</button><button class="icb" data-act="next" aria-label="Siguiente">›</button></div></div>`;
}
function strip(){
  const mon=monday(view.sel);
  return`<div class="strip" role="group" aria-label="Días">${DS.map((s,i)=>{const d=addDays(mon,i),P=E.plan(d),ns=itemsOn(d),k=kindOf(ns);
    return`<button data-day="${i}" aria-pressed="${sameDay(d,view.sel)}" class="${sameDay(d,now)?'today':''}${P.hol?' hol':''}" aria-label="${DN[i]} ${d.getDate()}${P.hol?', festivo':''}${ns.length?`, ${ns.length} en la agenda`:''}${P.warn.length?', con cambios':''}"><span class="dn">${s}</span><span class="dd">${d.getDate()}</span><span class="dots">${k?`<i data-k="${k}"></i>`:''}${P.warn.length?'<i></i>':''}</span></button>`}).join('')}</div>`;
}
const evHTML=(b,y,PX,isT,t,left,width)=>{const top=y(b.s),hh=Math.max(10,(b.e-b.s)*PX-2),xs=hh<40,xxs=hh<24,n=b._n,c=b._col;const past=isT&&b.e<=t;
  return`<div class="ev${xs?' xs':''}${xxs?' xxs':''}${past?' past':''}${n>1?' ovl':''}" data-c="${b.cat}" style="top:${top}px;height:${hh}px;left:calc(${left} + (${width}) * ${c}/${n});width:calc((${width}) / ${n} - 3px)" title="${esc(b.label)} · ${clock(b.s)}–${clock(b.e)}">
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
  const heads=days.map(d=>{const ns=itemsOn(d),P=E.plan(d);return`<button class="mh${sameDay(d,now)?' today':''}${sameDay(d,view.sel)?' sel':''}" data-pick="${ymd(d)}"><span>${DS[dow(d)]}</span><b>${d.getDate()}</b>${P.hol?`<span class="hb" title="${esc(P.hol.name)}">Festivo</span>`:''}${P.warn.length&&!ns.length&&!P.hol?`<i class="dots"><i></i></i>`:''}${(()=>{const ad=ns.filter(x=>(!x.time||x.kind==='viaje')&&x.kind!=='festivo');return ad.length?`<span class="adbar">${ad.slice(0,3).map(x=>`<span class="adc" data-k="${esc(x.kind)}">${esc(x.text)}</span>`).join('')}${ad.length>3?`<span class="adc" data-k="nota">+${ad.length-3}</span>`:''}</span>`:''})()}</button>`}).join('');
  const colsH=days.map((d,i)=>{const P=Ps[i],isT=sameDay(d,now);
    const evs=layoutCols(P.b.map(b=>({...b}))).map(b=>evHTML(b,y,PX,isT,t,'2px','100% - 2px')).join('');
    const sl=P.sleep<e0?`<div class="sleepb" style="top:${y(P.sleep)}px;height:${Math.max(18,H-y(P.sleep))}px;left:2px;right:2px">Dormir</div>`:'';
    const nl=isT&&t>=s0&&t<=e0?`<div class="nowl" style="top:${y(t)}px;left:0"></div>`:'';
    const mk=itemsOn(d).filter(n=>n.time&&n.kind!=='viaje').map(n=>`<div class="nmk" data-k="${esc(n.kind)}" style="top:${y(T(n.time))}px;left:0"><span>${esc(n.text)}</span></div>`).join('');
    return`<div class="mcol${isT?' today':''}" style="height:${H}px">${hl}${evs}${sl}${mk}${nl}</div>`}).join('');
  return`<div class="mg" style="--n:${c}"><div></div>${heads}<div class="max" style="height:${H}px">${ax}</div>${colsH}</div>`;
}
const ALN={0:'a la hora',10:'10 min antes',30:'30 min antes',60:'1 h antes',1440:'1 día antes',2880:'2 días antes'};
const alertLbl=n=>n.alert===''||n.alert==null?'':`Aviso ${ALN[n.alert]||n.alert+' min antes'}`;
const CALIC='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>';
function agendaRows(ns,full){return ns.map(n=>`<div class="nrow${n.done?' done':''}" data-k="${esc(n.kind)}">${n.kind==='tarea'?`<button class="tick" data-done="${esc(n.id)}" role="checkbox" aria-checked="${!!n.done}" aria-label="Hecha"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`:''}<span class="kk">${KINDS[n.kind]||'Nota'}${n.time?' · '+esc(n.time):''}${(n.kind==='viaje'||n.kind==='festivo')&&n.end&&n.end!==n.date?' · hasta el '+parseDate(n.end).getDate()+' '+MES[parseDate(n.end).getMonth()].slice(0,3):''}</span><span class="tx">${esc(n.text)}${alertLbl(n)?`<small class="bell">${alertLbl(n)}</small>`:''}</span>${full&&n.kind!=='tarea'&&n.kind!=='festivo'&&!n.done?`<button class="addcal" data-cal="${esc(n.id)}" aria-label="Añadir a mi calendario" title="Añadir a mi calendario">${CALIC}</button>`:''}<button class="del" data-delnote="${esc(n.id)}">Quitar</button></div>`).join('')}
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
  const pills=[P.hol&&P.hol.scope!=='manual'?`<span class="pill hol"><span class="dot"></span><span>Festivo · ${esc(P.hol.name)}</span></span>`:'',P.holHome?`<span class="pill hol"><span class="dot"></span><span>Festivo en ${esc(cfg.home.town)} · ${esc(P.holHome.name)}</span></span>`:'',...ns.map(n=>`<span class="pill k" data-k="${esc(n.kind)}"><span class="dot"></span><span>${n.time?esc(n.time)+' · ':''}${esc(n.text)}</span></span>`),...evs.map(e=>`<span class="pill"><span class="dot" style="background:var(--c-${e.cat})"></span><span>${esc(e.label)} ${clock(e.s)}–${clock(e.e)}</span></span>`)].join('');
  return`<header class="hero">${hero}<p class="sum">${esc(summary(P))}</p>${pills?`<div class="pills">${pills}</div>`:''}</header>
    ${isT?nowCard():''}
    ${weekNav()}${strip()}
    ${P.warn.length?`<div class="warn" role="note"><b>Hoy cambia</b>${P.warn.map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}
    <div class="dnotes">${agendaRows(ns)}<button class="addn" data-act="note">+ Añadir a este día</button></div>
    ${grid(P,d)}
    <p class="empty" style="padding:4px 0 0;font-size:13px">${P.src==='opos'?esc(cfg.opos.name||'Tu oposición'):P.src==='teamup'?`Clases de TeamUp · ${CAT_SYNC}`:P.src==='propio'?'Tu propio horario':'Sin clases para esta fecha'} · desliza para cambiar de día</p>`;
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
      ${[['clase','de clase'],['trabajo','de trabajo'],['estudio','de estudio'],['deporte','de deporte'],['hobby','de hobbies']].filter(([k])=>tot[k]>0).map(([k,l])=>`<div data-c="${k}"><b>${hm(tot[k])}</b><span>${l}</span></div>`).join('')}<div data-c="sueno"><b>${hm(Math.min(...nights))}</b><span>de sueño mínimo entre semana</span></div></div></section>
    ${chg.length?`<section class="card"><h3 style="margin:0;font-size:17px">Cambios de esta semana</h3><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;font-size:15px">${chg.join('')}</ul></section>`:''}`;
}
function viewAgenda(){
  const k0=ymd(sod(now));
  const up=notes.filter(n=>(n.end||n.date)>=k0||(n.kind==='tarea'&&!n.done)).sort((a,b)=>(a.date+(a.time||'99')).localeCompare(b.date+(b.time||'99')));
  const by={};up.forEach(n=>{const k=n.kind==='tarea'&&!n.done&&n.date<k0?k0:n.date;(by[k]=by[k]||[]).push(n)});
  return`<header class="hero" style="padding-top:8px"><h1 class="h2">Agenda</h1><p class="sum">Tareas, recordatorios, exámenes, entregas, viajes y festivos.</p></header>
    <div class="quick">${Object.entries(KINDS).map(([k,l])=>`<button data-quick="${k}" data-k="${k}"><span class="dot"></span>${l}</button>`).join('')}</div>
    ${up.length?`<div class="nlist">${Object.keys(by).sort().map(k=>{const d=parseDate(k);return`<div class="nday"><h4>${sameDay(d,now)?'Hoy':sameDay(d,addDays(sod(now),1))?'Mañana':DN[dow(d)]+' '+d.getDate()+' de '+MES[d.getMonth()]}</h4><div class="dnotes">${agendaRows(by[k],true)}</div></div>`}).join('')}</div>`
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
const R=new Function((await get('engine.js'))+';return{Engine,normCfg,setCatalog,setHolidays,teamupId,clock,addDays,sod,ymd,T};')();
try{R.setHolidays(JSON.parse(await get('data/festivos.json')))}catch(e){}
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
   ${grp('Perfil',lk('Nombre',cfg.name,'nombre')+lk('Sobre ti',`${{uni:'Universidad',opos:'Oposiciones',otro:'Otro'}[cfg.profile]||'Universidad'}${cfg.home.town?' · '+cfg.home.town:''}`,'perfil'))}
   ${cfg.profile==='opos'?grp('Oposición',lk('Estudio y entrenos',`${cfg.opos.name||(OPOS_TIPOS[cfg.opos.tipo]||{}).n||'Oposición'}`,'opos')):grp('Clases',lk('Horario',src,'clases')+lk('Asignaturas',cfg.source==='propio'?`${cfg.custom.length+cfg.icsSel.length}`:`${cfg.subjects.length}`,'asig'))}
   ${grp('Rutina',lk('Tu día',`${String(cfg.sleepH).replace('.',',')} h de sueño · margen ${cfg.margin} min`,'dia')+lk('Trabajo',tot?hm(tot)+'/semana':'No','trabajo')+lk('Hábitos',[cfg.series.on?cfg.series.label:'',...cfg.hobbies.map(h=>h.label)].filter(Boolean).join(', ')||'—','habitos'))}
   ${festGroup()}
   ${alertsGroup()}
   ${ab?grp('Reuniones',`<div class="row"><span class="lab">Esta semana es</span><div class="seg" role="group"><button data-par="A" aria-pressed="${p==='A'}">Semana A</button><button data-par="B" aria-pressed="${p==='B'}">Semana B</button></div></div>`,'Cambia esto si la reunión de esta semana no es la que toca.'):''}
   ${grp('Apariencia',row('Color según la hora del día',`<label class="sw"><input type="checkbox" data-cfgsw="timeColors"${cfg.timeColors!==false?' checked':''}><span></span></label>`,'Mañana cálida, mediodía azul, atardecer índigo y naranja, noche azul oscuro'),`Ahora: ${PAL[periodOf(now)].name.toLowerCase()}.`)}
   ${grp('Widgets',`<button class="row link" data-act="wios"><span class="lab">iPhone · Scriptable<small>Copia el script y pégalo en la app gratuita Scriptable</small></span></button><a class="row link" href="widget.html" style="color:inherit;text-decoration:none"><span class="lab">Android y ordenador<small>Abre la vista de widget y añádela a la pantalla de inicio</small></span></a>`,'Los dos muestran lo que te queda en las próximas 6 horas.')}
   <div id="wiosBox" hidden class="card"><b>Cómo ponerlo en el iPhone</b><ol style="margin:0;padding-left:20px;color:var(--fg2);font-size:15px;display:flex;flex-direction:column;gap:4px"><li>Instala <b>Scriptable</b> desde la App Store (es gratis).</li><li>Abre Scriptable, toca <b>+</b> y pega el script.</li><li>Mantén pulsada la pantalla de inicio → <b>+</b> → Scriptable → elige el tamaño.</li><li>Mantén pulsado el widget → <b>Editar widget</b> → Script: el que has pegado.</li></ol><textarea id="wiosTxt" readonly rows="4" aria-label="Script del widget"></textarea></div>
   ${syncGroup()}
   ${grp('',`<button class="row link" data-act="redo"><span class="lab" style="color:var(--accent)">Repetir el cuestionario</span></button><button class="row" data-act="reset" style="border:0;background:none;width:100%;text-align:left"><span class="lab" style="color:var(--c-examen)">Borrar mis datos</span></button>`,Store.mode==='cloud'?'Tu rutina y tu agenda se guardan en tu cuenta y las ves en cualquier dispositivo.':'Tu rutina y tu agenda están guardadas en este dispositivo.')}
   <p class="empty" style="font-size:13px">Ritmo${CAT_SYNC?` · clases de TeamUp sincronizadas el ${CAT_SYNC}`:''}</p>`;
}
/* festivos que se están aplicando: los próximos y cómo marcar uno a mano */
function festGroup(){
  const pl=E.place,list=[];for(let i=0;i<120&&list.length<4;i++){const d=addDays(sod(now),i),h=E.holidayOf(d);if(h)list.push([d,h])}
  const rows=list.map(([d,h])=>`<div class="row"><span class="lab">${esc(h.name)}<small>${DN[dow(d)]} ${d.getDate()} de ${MES[d.getMonth()]} · ${{nacional:'nacional',autonómico:'autonómico',local:'local',manual:'marcado por ti'}[h.scope]}</small></span></div>`).join('');
  return grp('Festivos',`${rows||'<div class="row"><span class="lab">Ningún festivo en los próximos meses</span></div>'}<button class="addrow" data-quick="festivo">+ Marcar un festivo</button>`,
    `${festNote({home:cfg.home,place:cfg.place})} ${cfg.work.on?(cfg.holidayWork==='trabaja'?'Esos días trabajas igual.':'Esos días no trabajas ni hay reuniones.'):''}`);
}
const notifState=()=>!('Notification' in window)?'no':Notification.permission;
function alertsGroup(){
  const st=notifState();
  const n=notes.filter(x=>alertAt(x)&&alertAt(x)>now).length+cfg.events.filter(e=>e.notify>0).length;
  return grp('Avisos',`<div class="row"><span class="lab">Avisos de Ritmo<small>${st==='granted'?'Activados':st==='denied'?'Bloqueados en el navegador':st==='no'?'Este navegador no los admite':'Desactivados'}</small></span>${st==='default'?`<button class="pillb icb" data-act="notif">Activar</button>`:''}</div>
    <button class="row link" data-act="icsall"><span class="lab">Añadir avisos a mi calendario<small>${n?`${n} con aviso: exámenes, entregas, recordatorios y reuniones`:'Exámenes, entregas, recordatorios y reuniones con aviso'}</small></span></button>`,
    'Ritmo avisa mientras la tienes abierta o en segundo plano. Para que te avise siempre, aunque esté cerrada, añádelos a tu calendario: el iPhone o Android te avisan desde ahí. Vuelve a hacerlo cuando apuntes algo nuevo.');
}
/* avisos: se revisan cada 30 s y al volver a la app */
const FIRED=()=>LS.get('ritmo-fired',[]);
function dueAlerts(){
  const out=[],t0=new Date(now.getTime()-20*60000);
  for(const n of notes){const a=alertAt(n);if(a&&a<=now&&a>t0)out.push({id:'n:'+n.id+':'+n.alert,...alertText(n)})}
  for(const k of [0,1])for(const b of E.plan(addDays(sod(now),k)).b){if(!b.isEvent)continue;const ev=cfg.events.find(e=>e.id===b.evId);if(!ev||!(ev.notify>0))continue;
    const a=addDays(sod(now),k);a.setMinutes(b.s-ev.notify);if(a<=now&&a>t0)out.push({id:'e:'+ev.id+':'+ymd(a),title:ev.label,body:`${ev.notify>=1440?'Mañana':'Hoy'} a las ${clock(b.s)}`})}
  return out;
}
async function checkAlerts(){
  if(notifState()!=='granted'||!cfg||!E)return;const fired=FIRED(),due=dueAlerts().filter(a=>!fired.includes(a.id));if(!due.length)return;
  let reg=null;try{reg=await navigator.serviceWorker.getRegistration()}catch(e){}
  for(const a of due){try{const o={body:a.body,tag:a.id,icon:'icons/icon-192.png',badge:'icons/icon-192.png'};if(reg)await reg.showNotification(a.title,o);else new Notification(a.title,o)}catch(e){}fired.push(a.id)}
  LS.set('ritmo-fired',fired.slice(-300));
}
/* archivo de calendario con todo lo que tiene aviso (y los exámenes y entregas) */
function calEvents(only){
  const k0=ymd(sod(now)),evs=[];
  for(const n of notes){if(only&&n.id!==only)continue;if(!only&&((n.end||n.date)<k0||n.done||n.kind==='tarea'||n.kind==='festivo'))continue;if(!only&&(n.alert===''||n.alert==null)&&!['examen','entrega','viaje'].includes(n.kind))continue;
    evs.push({uid:'nota-'+n.id,date:n.date,start:n.time||'',endDate:n.end||'',title:`${KINDS[n.kind]||'Nota'}: ${n.text}`,alert:n.alert})}
  if(!only)for(const ev of cfg.events){if(!(ev.notify>0))continue;
    for(let i=0;i<180;i++){const d=addDays(sod(now),i);if(E.plan(d).b.some(b=>b.evId===ev.id))evs.push({uid:`reunion-${ev.id}-${ymd(d)}`,date:ymd(d),start:ev.start,end:ev.end,title:ev.label,alert:ev.notify})}}
  return evs;
}
let syncStep={email:'',create:false,busy:false,err:'',ok:''};
function syncGroup(){
  if(!Store.sb)return grp('Sincronización',`<div class="row"><span class="lab">Solo en este dispositivo<small>Para verlo también en otros dispositivos hay que conectar Supabase (README del repositorio).</small></span></div>`);
  if(Store.mode==='cloud')return grp('Sincronización',`<div class="row"><span class="lab">Conectado<small>${esc(Store.user.email||'')}</small></span><button class="pillb icb" data-act="signout">Salir</button></div>`,'Tus cambios se guardan en tu cuenta y aparecen en todos tus dispositivos.');
  const c=syncStep.create;
  return grp('Sincronizar entre dispositivos',`<div class="row">${seg('x',[[false,'Ya tengo cuenta'],[true,'Crear cuenta']],c,true).replace(/data-seg="x"/g,'data-sycreate')}</div>
    <div class="row"><input type="email" id="syEmail" placeholder="tu@email.com" value="${esc(syncStep.email)}" autocomplete="email" aria-label="Email"></div>
    <div class="row"><input type="password" id="syPw" placeholder="${c?'Elige una contraseña (mín. 6)':'Contraseña'}" autocomplete="${c?'new-password':'current-password'}" aria-label="Contraseña" style="flex:1;min-width:0;border:0;background:none;padding:6px 0;font-size:17px"></div>
    <button class="addrow" data-act="sylogin"${syncStep.busy?' disabled':''}>${c?'Crear cuenta y sincronizar':'Entrar'}</button>${c?'':`<button class="addrow" data-act="syforgot" style="font-size:14px;padding-top:0">He olvidado la contraseña</button>`}`,
    syncStep.err?`<span style="color:var(--c-examen)">${esc(syncStep.err)}</span>`:syncStep.ok?esc(syncStep.ok):'Con la misma cuenta en el móvil, la tablet y el ordenador tienes lo mismo en todos.');
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
function setKind(k){nKind=k;$$('#nKinds button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===k));const rng=k==='viaje'||k==='festivo';$('#nEndRow').hidden=!rng;$('#nEndLab').innerHTML=k==='viaje'?'Vuelta':'Hasta <small>Opcional</small>';$('#nTimeRow').hidden=rng;
  $('#nAlertRow').hidden=k==='festivo';$('#nAlert').value=String(ALERT_DEFAULT[k]??'');
  $('#nText').placeholder={tarea:'Hacer la práctica 2',recordatorio:'Llamar al dentista',examen:'Examen de Redes y Servicios',entrega:'Entrega de la memoria',viaje:'Madrid',festivo:'Feria del pueblo'}[k];$('#sheetT').textContent='Nuevo: '+KINDS[k].toLowerCase()}
async function saveNote(){
  const text=$('#nText').value.trim(),date=$('#nDate').value,end=$('#nEnd').value;
  if(!text||!date){$('#nErr').textContent=!text?'Escribe qué es.':'Elige el día.';$('#nErr').hidden=false;return}
  if((nKind==='viaje'||nKind==='festivo')&&end&&end<date){$('#nErr').textContent=nKind==='viaje'?'La vuelta no puede ser antes de la ida.':'El último día no puede ser antes del primero.';$('#nErr').hidden=false;return}
  $('#nSave').disabled=true;
  const rng=nKind==='viaje'||nKind==='festivo',al=nKind==='festivo'?'':$('#nAlert').value;
  try{await Store.addNote({date,text:text.slice(0,80),kind:nKind,time:rng?'':($('#nTime').value||''),end:rng?(end||date):'',done:false,created:Date.now(),alert:al===''?'':Number(al)});$('#sheet').hidden=true;
    toast(nKind==='festivo'?'Festivo guardado: ese día se reorganiza':al!==''&&notifState()!=='granted'?'Guardado. Activa los avisos en Ajustes':'Guardado en tu agenda')}
  catch(e){$('#nErr').textContent='No se ha podido guardar. Inténtalo otra vez.';$('#nErr').hidden=false}
  $('#nSave').disabled=false;
}

/* ---------- eventos ---------- */
document.addEventListener('input',e=>{
  if(!ob)return;const el=e.target,p=el.dataset.bind;
  if(el.id==='subjQ'){const q=townKey(el.value);let any=0;
    $$('#subjL details').forEach(det=>{let n=0;det.querySelectorAll('.subj').forEach(b=>{const m=!q||b.dataset.q.includes(q);b.hidden=!m;if(m)n++});det.querySelectorAll('.grpchips').forEach(c=>c.hidden=!!q&&!c.dataset.q.includes(q));det.hidden=!n;if(q)det.open=n>0;any+=n});
    $('#subjNone').hidden=any>0;return}
  if(!p)return;
  setP(ob.d,p,el.value);
  if(p==='teamup'){const st=$('#tuSt');if(st)st.innerHTML=tuStatus(el.value)}
  if(/\.(ca|town)$/.test(p)){const f=$('#festN');if(f)f.innerHTML=festNote(ob.d)}
  if(/^(home|place)\.town$/.test(p)){const w=p.split('.')[0];loadMuni().then(()=>acRender(w))}
  if(p==='opos.tipo'){const O=ob.d.opos;if(!O.edited)O.sessions=oposSessions(O.tipo);if(!O.edited||!O.train.length)O.train=oposTrain(O.tipo);renderOB();return}
  if(/^opos\.(sessions|train)\./.test(p))ob.d.opos.edited=true;
  const st=STEPS[ob.step];if(st.ok)$('#obNext').disabled=!st.ok(ob.d);
});
document.addEventListener('change',async e=>{
  const el=e.target;
  if(el.dataset.cfgsw){cfg[el.dataset.cfgsw]=el.checked;applyTheme();Store.saveCfg(cfg).catch(()=>toast('No se ha podido guardar'));return}
  if(!ob)return;
  if(el.id==='icsFile'&&el.files&&el.files[0]){const f=el.files[0];if(f.size>5e6){toast('El archivo es demasiado grande');return}
    const ev=parseICS(await f.text());if(!ev.length){toast('No he encontrado clases en ese archivo');return}
    ob.d.ics=ev;const names=[...new Set(ev.map(x=>x[3]))];ob.d.icsSel=names;toast(`${ev.length} clases importadas`);renderOB();return}
  if(el.id==='pdfFile'&&el.files&&el.files.length){const files=[...el.files];const msg=t=>{ob.pdfMsg=t;const m=$('#pdfMsg');if(m)m.textContent=t};
    if(files.some(f=>f.size>15e6)){msg('El PDF es demasiado grande (máximo 15 MB).');return}
    msg(files.length>1?`Leyendo ${files.length} PDF…`:'Leyendo el PDF…');
    let weekly=0,dated=0,courses=[];
    for(const f of files){
      try{const P=await pdfItems(await f.arrayBuffer());const course=P.course||f.name.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ').slice(0,40);
        const r=parseScheduleItems(P.items,P.edges,course);
        if(r.dated&&r.events.length){ob.d.ics=[...(ob.d.ics||[]).filter(e=>e[6]!==course),...r.events];dated+=r.events.length;courses.push(course)}
        else if(r.subjects.length){ob.d.custom=[...ob.d.custom,...r.subjects];weekly+=r.subjects.length}}
      catch(err){}
    }
    if(!weekly&&!dated){msg('No he encontrado clases en este PDF. Si es una foto escaneada, usa la opción de la foto o escríbelo a mano.');return}
    ob.d.source='propio';ob.pdfMsg='';
    toast(dated?`${courses.join(' y ')}: marca tus asignaturas y tu grupo de prácticas`:`${weekly} asignaturas leídas del PDF. Revisa días y horas.`);
    if(STEPS[ob.step].id!=='asig'){ob.hist.push(ob.step);ob.step=nextVis(ob.step,1)}renderOB(true);
    return}
  if(el.dataset.bindn){setP(ob.d,el.dataset.bindn,Number(el.value));if(el.dataset.bindn.startsWith('opos.'))renderOB();return}
  if(el.dataset.sw){setP(ob.d,el.dataset.sw,el.checked);renderOB()}
});
document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-go]');if(!t)return;
  if(ob){
    if(t.dataset.ob==='next')return obNext();
    if(t.dataset.ob==='back')return obBack();
    if(t.dataset.seg){const v=JSON.parse(t.dataset.v);setP(ob.d,t.dataset.seg,v);
      if(t.dataset.seg==='profile'&&v!=='uni'&&!(v==='otro'&&teamupId(ob.d.teamup)))ob.d.source='propio';
      if(t.dataset.seg==='profile'&&v==='opos'&&!ob.edit&&!cfg){ob.d.work.on=false;ob.d.events=[];ob.d.series.on=false;ob.d.run.on=false}
      if(t.dataset.seg==='place.same'&&!v&&!ob.d.place.town)ob.d.place.ca=ob.d.home.ca;
      return renderOB()}
    if(t.dataset.stp){const p=t.dataset.stp,v=Number(getP(ob.d,p))+Number(t.dataset.d);setP(ob.d,p,Math.min(Number(t.dataset.max),Math.max(Number(t.dataset.min),Math.round(v*100)/100)));return renderOB()}
    if(t.dataset.acpick){const w=t.dataset.acpick;ob.d[w].town=t.dataset.v;ob.d[w].ca=t.dataset.ca;return renderOB()}
    if(t.hasAttribute('data-addwe')){const l=ob.d.weekend.slice(-1)[0];ob.d.weekend.push({id:'w'+Date.now(),label:'Estudio',cat:'estudio',start:l?l.end:'10:00',end:l?clock(T(l.end)+120):'13:00',days:[5,6]});return renderOB()}
    if(t.dataset.delwe!==undefined){ob.d.weekend.splice(+t.dataset.delwe,1);return renderOB()}
    if(t.hasAttribute('data-addpk')){ob.d.gym.peaks.push(['07:30','09:00']);return renderOB()}
    if(t.dataset.delpk!==undefined){ob.d.gym.peaks.splice(+t.dataset.delpk,1);return renderOB()}
    if(t.dataset.icsgrp){const n=t.dataset.icsgrp,g=t.dataset.g,G=ob.d.icsGroup=ob.d.icsGroup||{};G[n]=G[n]===g?'':g;return renderOB()}
    if(t.dataset.icssel){const k=t.dataset.icssel,s=new Set(ob.d.icsSel);s.has(k)?s.delete(k):s.add(k);ob.d.icsSel=[...s];return renderOB()}
    if(t.dataset.subj||t.dataset.icssel){const isI=!!t.dataset.icssel,k=isI?t.dataset.icssel:t.dataset.subj,arr=isI?'icsSel':'subjects',s=new Set(ob.d[arr]);s.has(k)?s.delete(k):s.add(k);ob.d[arr]=[...s];t.setAttribute('aria-checked',s.has(k));const det=t.closest('details'),n=det.querySelectorAll('[aria-checked="true"]').length,tot=det.querySelectorAll('.subj').length;det.querySelector('.n').textContent=n?`${n} de ${tot}`:`${tot} asignaturas`;return}
    if(t.dataset.leave!==undefined){const i=+t.dataset.leave;ob.d.leave[i]=t.dataset.v==='auto'?'auto':(ob.d.leave[i]==='auto'?'09:30':ob.d.leave[i]);return renderOB()}
    if(t.dataset.days){const arr=getP(ob.d,t.dataset.days)||[],i=+t.dataset.i,s=new Set(arr);s.has(i)?s.delete(i):s.add(i);setP(ob.d,t.dataset.days,[...s].sort());return renderOB()}
    if(t.hasAttribute('data-addev')){ob.d.events.push({id:'e'+Date.now(),label:'Reunión',dow:0,start:'12:00',end:'13:00',freq:'all',work:true});return renderOB()}
    if(t.dataset.delev!==undefined){ob.d.events.splice(+t.dataset.delev,1);return renderOB()}
    if(t.hasAttribute('data-addses')){const l=ob.d.opos.sessions.slice(-1)[0];ob.d.opos.sessions.push({id:'o'+Date.now(),label:'Temario',start:l?l.end:'09:00',end:l?clock(T(l.end)+120):'11:00',days:l?[...l.days]:[0,1,2,3,4]});ob.d.opos.edited=true;return renderOB()}
    if(t.dataset.delses!==undefined){ob.d.opos.sessions.splice(+t.dataset.delses,1);ob.d.opos.edited=true;return renderOB()}
    if(t.hasAttribute('data-addtr')){const P=OPOS_TIPOS[ob.d.opos.tipo]||{};const used=new Set(ob.d.opos.train.map(x=>x.label));const nx=(P.train||[]).find(x=>!used.has(x[0]));ob.d.opos.train.push({id:'t'+Date.now(),label:nx?nx[0]:'',min:nx?nx[1]:60,days:nx?nx[2]:[0,2,4],start:''});ob.d.opos.edited=true;return renderOB()}
    if(t.dataset.deltr!==undefined){ob.d.opos.train.splice(+t.dataset.deltr,1);ob.d.opos.edited=true;return renderOB()}
    if(t.hasAttribute('data-addhob')){ob.d.hobbies.push({id:'h'+Date.now(),label:'',min:30,days:[0,1,2,3,4]});return renderOB()}
    if(t.dataset.delhob!==undefined){ob.d.hobbies.splice(+t.dataset.delhob,1);return renderOB()}
    if(t.hasAttribute('data-addsub')){ob.d.custom.push({id:'s'+Date.now(),name:'',slots:[{dow:0,start:'09:00',end:'11:00',loc:''}]});return renderOB()}
    if(t.dataset.delsub!==undefined){ob.d.custom.splice(+t.dataset.delsub,1);return renderOB()}
    if(t.dataset.addslot!==undefined){const s=ob.d.custom[+t.dataset.addslot];const l=s.slots[s.slots.length-1]||{dow:0,start:'09:00',end:'11:00',loc:''};s.slots.push({...l,dow:Math.min(5,l.dow+1)});return renderOB()}
    if(t.dataset.delslot){const [i,j]=t.dataset.delslot.split('.').map(Number);ob.d.custom[i].slots.splice(j,1);return renderOB()}
    if(t.hasAttribute('data-pastecode')){const err=importCode($('#codeIn').value||'');if(err){toast(err);return}toast(`${ob.d.custom.length} asignaturas añadidas`);ob.hist.push(ob.step);ob.step=nextVis(ob.step,1);return renderOB(true)}
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
  if(a==='notif'){try{await Notification.requestPermission()}catch(e){}render();if(notifState()==='granted'){toast('Avisos activados');checkAlerts()}return}
  if(a==='icsall'){const evs=calEvents();if(!evs.length){toast('No hay nada con aviso todavía');return}await shareICS('ritmo-avisos.ics',buildICS(evs));return}
  if(t.dataset.cal){const evs=calEvents(t.dataset.cal);if(evs.length)await shareICS('ritmo.ics',buildICS(evs));return}
  if(a==='wios'){const box=$('#wiosBox'),ta=$('#wiosTxt'),s=widgetScript();ta.value=s;box.hidden=false;try{await navigator.clipboard.writeText(s);toast('Script copiado')}catch(err){ta.select();toast('Selecciona el texto y cópialo')}return}
  if(t.hasAttribute('data-sycreate')){syncStep.create=JSON.parse(t.dataset.v);syncStep.email=($('#syEmail')||{}).value||syncStep.email;syncStep.err='';render();return}
  if(a==='sylogin'||a==='syforgot'){const em=($('#syEmail').value||'').trim(),pw=($('#syPw')||{}).value||'';syncStep.email=em;
    if(!/^\S+@\S+\.\S+$/.test(em)){syncStep.err='Escribe un email válido.';render();return}
    if(a==='syforgot'){try{await Store.resetPw(em);syncStep.err='';syncStep.ok='Te he mandado un email para cambiar la contraseña.'}catch(e){syncStep.err='No se ha podido enviar el email.'}render();return}
    if(pw.length<6){syncStep.err='La contraseña tiene que tener al menos 6 caracteres.';render();return}
    syncStep.busy=true;syncStep.err='';render();
    try{await Store.login(em,pw,syncStep.create);syncStep={email:'',create:false,busy:false,err:'',ok:''};toast('Sincronizado');render()}
    catch(e){syncStep.busy=false;const m=String(e.message||'');
      syncStep.err=m==='confirm'?'Cuenta creada. Confirma el email que te ha llegado y luego entra con «Ya tengo cuenta».':/already registered|already exists/i.test(m)?'Ya hay una cuenta con ese email: entra con «Ya tengo cuenta».':/invalid login|credentials/i.test(m)?'Email o contraseña incorrectos.':/not confirmed/i.test(m)?'Falta confirmar el email: abre el enlace que te llegó al crear la cuenta.':'No se ha podido conectar. Inténtalo otra vez.';render()}return}
  if(a==='signout'){await Store.signOut();render();toast('Sesión cerrada');return}
  if(a==='reset'){if(!t.dataset.armed){t.dataset.armed='1';t.querySelector('.lab').textContent='Toca otra vez para borrar todo';setTimeout(()=>{if(t.isConnected){delete t.dataset.armed;t.querySelector('.lab').textContent='Borrar mis datos'}},3500);return}
    await Store.reset();cfg=null;E=null;startOB(0);return}
  if(t.dataset.edit){startOB(t.dataset.edit,true);return}
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
const layoutKey=()=>cols()+'|'+(spanOpts()||[]).join(',');let lastCols=null;window.addEventListener('resize',()=>{const c=layoutKey();if(c!==lastCols&&!ob&&cfg){lastCols=c;render()}});
mqDark.addEventListener&&mqDark.addEventListener('change',applyTheme);
const tick=()=>{const was=sameDay(view.sel,now);now=new Date();if(was)view.sel=sod(now);applyTheme();checkAlerts();if(!ob&&cfg&&$('#sheet').hidden&&!document.activeElement.matches('input,select,textarea'))render()};
setInterval(tick,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();Store.pull().catch(()=>{})}});

(async function boot(){
  applyTheme();
  await Promise.all([Store.init(),loadCals(),loadHolidays()]);
  const c=await Store.loadCfg();
  if(c){cfg=normCfg(c);await loadCat(teamupId(cfg.teamup))}
  else await loadCatalog((CALS[0]||{}).id);
  Store.watchNotes(a=>{notes=a;rebuild();if(!ob&&cfg)render()});
  lastCols=layoutKey();render(true);checkAlerts();
})();
