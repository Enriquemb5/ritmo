/* ================= Ritmo · herramientas =================
   - Leer horarios en PDF (pdf.js) y convertirlos en asignaturas con sus días y horas.
   - Montar el catálogo de un TeamUp en el navegador (si hay proxy configurado).
   - Exportar avisos a un archivo de calendario (.ics) con alarmas.
   Todo son funciones puras salvo pdfItems/shareICS, para poder probarlas fuera del navegador. */

/* ---------- PDF ---------- */
const DAYW=[['lunes','lun','l'],['martes','mar','m'],['miercoles','mie','x'],['jueves','jue','j'],['viernes','vie','v'],['sabado','sab','s'],['domingo','dom','d']];
const nrmTxt=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
function dayWord(s,short){const t=nrmTxt(s).replace(/[.:,]$/,'');for(let i=0;i<7;i++){const [a,b,c]=DAYW[i];if(t===a||t===b||(short&&t===c))return i}return -1}
const TIME1=/^(\d{1,2})[:.h](\d{2})\b/;
const RANGE=/(\d{1,2})[:.h](\d{2})\s*(?:h\s*)?(?:-|–|—|a|hasta|\/)\s*(\d{1,2})[:.h](\d{2})/i;
const hhmm=(h,m)=>String(+h).padStart(2,'0')+':'+m;
const LOCRX=/\b(?:laboratorio|seminario|edificio|aula|sala|lab|edif|aul)\b\.?\s*[A-Za-z0-9][\w.\-\/]*|\b\d+(?:\.\d+){1,3}[A-Za-z]?\b/i;
function splitLoc(s){const m=String(s).match(LOCRX);if(!m)return{name:clean(s),loc:''};return{name:clean(s.replace(m[0],' ')),loc:m[0].trim()}}
const clean=s=>String(s).replace(/\s+/g,' ').replace(/^[\s\-–—:,;|·()]+|[\s\-–—:,;|·(]+$/g,'').trim();

/* agrupa fragmentos de texto en líneas (misma página y casi la misma altura) */
function groupLines(items){
  const s=[...items].sort((a,b)=>a.p-b.p||a.y-b.y||a.x-b.x);const out=[];
  for(const it of s){const l=out[out.length-1];if(l&&l.p===it.p&&Math.abs(l.y-it.y)<=Math.max(2,Math.min(l.h,it.h)*.45)){l.items.push(it)}else out.push({p:it.p,y:it.y,h:it.h,items:[it]})}
  out.forEach(l=>{l.items.sort((a,b)=>a.x-b.x);l.text=l.items.map(i=>i.s).join(' ')});return out;
}
/* formato lista: «Lunes 9:00-11:00 Matemáticas Aula 2» o un día de cabecera y debajo «9:00-11:00 Matemáticas» */
function parseList(lines){
  let cur=-1;const out=[];
  for(const ln of lines){
    const t=ln.text,ws=t.split(/\s+/);let d=-1;for(const w of ws){const k=dayWord(w,false);if(k>=0){d=k;break}}
    const r=t.match(RANGE);
    if(d>=0&&!r){cur=d;continue}
    if(!r)continue;const day=d>=0?d:cur;if(day<0)continue;
    const rest=t.replace(RANGE,' ').split(/\s+/).filter(w=>dayWord(w,false)<0).join(' ');
    const {name,loc}=splitLoc(rest);if(!name||name.length<2)continue;
    out.push({dow:day,start:hhmm(r[1],r[2]),end:hhmm(r[3],r[4]),name,loc});
  }
  return out;
}
/* formato tabla: días en una fila de cabecera, horas en la primera columna.
   Si el PDF trae las líneas de la tabla (edges), cada celda se mide con ellas, así que las clases que ocupan
   varias filas salen con su duración real. Si la página dice «Del 19/10/2026 al 23/10/2026», las clases van con fecha. */
const dayTok=s=>{for(const w of String(s).split(/[\s\/]+/)){const d=dayWord(w,true);if(d>=0)return d}return -1};
const GROUPRX=/^(.+?)\s+(?:G[A-Za-zÁ-ú]+\s+)?(\d{3}|G\d{1,2}|[Gg]rupo\s*\w+)(?:\s*\((\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\))?(?:\s+(.+))?$/;
const ROOMRX=/^(?:[A-Z]{1,3}\d?[_\-][\w.\-]+|HPA|(?:aula|sala|lab\.?|laboratorio)\s*\S+)$/i;
function cellEntries(lines){
  const out=[];let th=null;
  for(const raw of lines){const t=clean(raw);if(!t)continue;
    const tm=t.match(/^\(?(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\)?$/);
    if(tm&&out.length){const l=out[out.length-1];l.start=hhmm(tm[1],tm[2]);l.end=hhmm(tm[3],tm[4]);continue}
    {const l=out[out.length-1];if(l&&l.group&&/\b(lab|aula|sala|laboratorio)\.?$/i.test(l.loc||'')&&!GROUPRX.test(t)){l.loc+=' '+t;continue}}
    const g=t.match(GROUPRX);
    if(g&&!/^\d/.test(g[1])){th=null;out.push({name:clean(g[1]),group:g[2].replace(/^grupo\s*/i,''),start:g[3]?hhmm(g[3],g[4]):'',end:g[5]?hhmm(g[5],g[6]):'',loc:g[7]||''});continue}
    if(ROOMRX.test(t)){if(th)th.loc=t;else if(out.length&&!out[out.length-1].loc)out[out.length-1].loc=t;continue}
    if(th)th.name+=' '+t;else{th={name:t,group:'',start:'',end:'',loc:''};out.push(th)}
  }
  const CODE=/\b[A-Z]{1,3}\d?_[\w]+(?:\s+y\s+[A-Z]{1,3}\d?_[\w]+)*/;
  return out.map(e=>{const m=e.name.match(CODE);if(m){e={...e,name:e.name.replace(m[0],' '),loc:e.loc||m[0]}}
    if(!e.loc&&!e.group){const r=splitLoc(e.name);return{...e,...r}}return{...e,name:clean(e.name)}}).filter(e=>e.name&&e.name.length>=2);
}
function parseGrid(items,edges=[]){
  const out=[];
  for(const p of [...new Set(items.map(i=>i.p))]){
    const its=items.filter(i=>i.p===p),lines=groupLines(its),E=edges.filter(e=>e.p===p);
    const hdr=lines.find(l=>new Set(l.items.map(i=>dayTok(i.s)).filter(x=>x>=0)).size>=3);
    if(!hdr)continue;
    const cols=[];for(const i of hdr.items){const d=dayTok(i.s);if(d>=0&&!cols.some(c=>c.dow===d))cols.push({dow:d,cx:i.x+i.w/2})}
    cols.sort((a,b)=>a.cx-b.cx);
    const gap=cols.length>1?(cols[cols.length-1].cx-cols[0].cx)/(cols.length-1):120;
    cols.forEach((c,k)=>{c.l=k?(cols[k-1].cx+c.cx)/2:c.cx-gap/2;c.r=k<cols.length-1?(c.cx+cols[k+1].cx)/2:c.cx+gap/2});
    // semana con fecha
    const dm=its.map(i=>i.s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)).find(Boolean);
    const mon=dm?(d=>addDays(d,-dow(d)))(new Date(+dm[3],+dm[2]-1,+dm[1])):null;
    const yc=i=>i.y-i.h*.35;
    const below=its.filter(i=>i.y>hdr.y+1);
    const tl=[];
    for(const ln of groupLines(below.filter(i=>i.x+i.w<=cols[0].l+4))){
      const r=ln.text.match(RANGE),m=ln.text.match(TIME1);if(!r&&!m)continue;
      tl.push({y:yc(ln.items[0]),t:T(r?hhmm(r[1],r[2]):hhmm(m[1],m[2])),t2:r?T(hhmm(r[3],r[4])):null,x:ln.items[0].x+ln.items[0].w/2});
    }
    tl.sort((a,b)=>a.y-b.y);if(tl.length<2)continue;
    const rows=tl.map((r,k)=>({...r,top:k?(tl[k-1].y+r.y)/2:r.y-(tl[1].y-tl[0].y)/2,bot:k<tl.length-1?(r.y+tl[k+1].y)/2:r.y+(r.y-tl[k-1].y)/2,end:r.t2||(tl[k+1]?tl[k+1].t:r.t+(r.t-tl[k-1].t))}));
    // líneas horizontales que cruzan una x
    const hAt=x=>[...new Set(E.filter(e=>e.x1<=x-2&&e.x2>=x+2).map(e=>Math.round(e.y*2)/2))].sort((a,b)=>a-b);
    const lab=hAt(tl[0].x);
    if(lab.length>=rows.length){rows.forEach(r=>{const up=lab.filter(y=>y<=r.y+1),dn=lab.filter(y=>y>r.y+1);if(up.length)r.top=up[up.length-1];if(dn.length)r.bot=dn[0]})}
    const timeAt=(y,edge)=>{let best=null,bd=1e9;for(const r of rows){const d=Math.abs((edge==='top'?r.top:r.bot)-y);if(d<bd){bd=d;best=r}}return edge==='top'?best.t:best.end};
    for(const c of cols){
      const mine=below.filter(i=>{const cx=i.x+i.w/2;return cx>=c.l&&cx<c.r&&yc(i)>=rows[0].top-2&&yc(i)<=rows[rows.length-1].bot+2});
      const date=mon?ymd(addDays(mon,c.dow)):'';
      const push=(e,s0,e0)=>{if(/^(no lectivo|descanso|recreo|libre)$/i.test(e.name))return;
        // una celda que ocupa casi todo el día sin grupo es un festivo o un aviso, no una clase
        if(!e.group&&!e.start&&e0-s0>=360)return;out.push({dow:c.dow,date,start:e.start||clock(s0),end:e.end||clock(e0),name:e.name,loc:e.loc,group:e.group})};
      const hs=hAt(c.cx);
      if(hs.length>=3){
        // celdas medidas con las líneas de la tabla
        const cells=new Map();
        for(const i of mine){const y=yc(i),up=hs.filter(v=>v<=y),dn=hs.filter(v=>v>y);if(!up.length||!dn.length)continue;const k=up[up.length-1]+'|'+dn[0];if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i)}
        for(const [k,ci] of cells){const [top,bot]=k.split('|').map(Number);const s0=timeAt(top,'top'),e0=timeAt(bot,'bot');if(e0<=s0)continue;
          for(const e of cellEntries(groupLines(ci).map(l=>l.text)))push(e,s0,e0)}
        continue;
      }
      // sin líneas: filas por la posición del texto
      const cells={};
      for(const i of mine){const y=yc(i);const k=rows.findIndex(r=>y>=r.top&&y<r.bot);if(k>=0)(cells[k]=cells[k]||[]).push(i)}
      let run=null;
      const flush=()=>{if(run){for(const e of cellEntries(run.lines))push(e,rows[run.a].t,rows[run.b].end);run=null}};
      for(let k=0;k<rows.length;k++){
        const its2=cells[k];
        if(!its2){if(run&&run.b===k-1&&run.low)run.b=k,run.low=false;else flush();continue}
        const ls=groupLines(its2).map(l=>l.text),first=ls[0];
        const yy=its2.reduce((a,i)=>a+yc(i),0)/its2.length,R=rows[k],low=(yy-R.top)/(R.bot-R.top)>.68;
        if(run&&run.b===k-1&&(run.first===first||ls.every(x=>ROOMRX.test(clean(x))||!splitLoc(x).name))){run.b=k;run.low=low;if(run.first!==first)run.lines.push(...ls);continue}
        flush();run={a:k,b:k,lines:ls,first,low};
      }
      flush();
    }
  }
  return out;
}
/* abreviaturas de prácticas con su asignatura: «Physio II» → «Physiology II», «Pat. Médica I» → «Patología Médica I», «APG» ↔ «General Pathological Anatomy» */
function canonNames(slots){
  const full=[...new Set(slots.filter(s=>!s.group).map(s=>s.name))];
  const toks=s=>nrmTxt(s).replace(/[.,]/g,' ').split(/\s+/).filter(Boolean);
  const stop=new Set(['y','de','del','la','el','and','of','the','e']);
  const match=(ab,nm)=>{const a=toks(ab),n=toks(nm);if(!a.length)return false;
    if(a.length===1&&/^[a-z]{2,5}$/.test(a[0])&&a[0]===ab.toLowerCase()&&ab===ab.toUpperCase()){const ini=n.filter(w=>!stop.has(w)).map(w=>w[0]).sort().join('');return ini===a[0].split('').sort().join('')}
    let j=0;for(const w of a){while(j<n.length&&!n[j].startsWith(w))j++;if(j>=n.length)return false;j++}return true};
  const map={};for(const g of new Set(slots.filter(s=>s.group).map(s=>s.name))){if(full.includes(g))continue;const c=full.filter(f=>match(g,f)).sort((a,b)=>a.length-b.length);if(c.length)map[g]=c[0]}
  return slots.map(s=>map[s.name]?{...s,name:map[s.name]}:s);
}
/* junta las clases por asignatura (formato de «Mi propio horario») */
function slotsToCustom(slots){
  const by=new Map();
  for(const s of slots){const k=nrmTxt(s.name);if(!by.has(k))by.set(k,{id:'s'+Date.now().toString(36)+by.size,name:s.name,slots:[]});
    const g=by.get(k);if(!g.slots.some(x=>x.dow===s.dow&&x.start===s.start))g.slots.push({dow:s.dow,start:s.start,end:s.end,loc:s.loc||''})}
  return [...by.values()].map(g=>({...g,slots:g.slots.sort((a,b)=>a.dow-b.dow||a.start.localeCompare(b.start))}));
}
/* resultado: o asignaturas semanales (custom) o clases con fecha (como un .ics, con grupo y curso) */
function parseScheduleItems(items,edges=[],course=''){
  const g=parseGrid(items,edges),l=parseList(groupLines(items));
  let slots=g.length>=l.length?g:l;const mode=slots===g?'tabla':'lista';
  slots=canonNames(slots);
  const dated=slots.length&&slots.every(s=>s.date);
  return{mode,slots,dated,subjects:dated?[]:slotsToCustom(slots),
    events:dated?mergeEv(slots.map(s=>[s.date,s.start,s.end,s.name,s.loc||'',s.group||'',course])):[]};
}
/* une horas seguidas de la misma clase (9-10 y 10-11 → 9-11) */
function mergeEv(ev){ev.sort((a,b)=>(a[0]+a[3]+a[5]+a[1]).localeCompare(b[0]+b[3]+b[5]+b[1]));const out=[];
  for(const e of ev){const l=out[out.length-1];if(l&&l[0]===e[0]&&l[3]===e[3]&&l[5]===e[5]&&l[2]===e[1]&&(l[4]===e[4]||!e[4]||!l[4])){l[2]=e[2];l[4]=l[4]||e[4]}else out.push([...e])}
  return out.sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]))}
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
/* texto con posición y líneas de la tabla de cada página */
async function pdfRead(buf,lib){
  const L=lib||window.pdfjsLib;const {OPS,Util}=L;
  const pdf=await L.getDocument({data:buf}).promise;const items=[],edges=[];let course='';
  for(let p=1;p<=Math.min(pdf.numPages,40);p++){
    const pg=await pdf.getPage(p),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
    for(const it of tc.items){const s=(it.str||'').trim();if(!s)continue;const [,,c,d,e,f]=it.transform;const [x,y]=vp.convertToViewportPoint(e,f);items.push({s,x,y,w:it.width||s.length*5,h:Math.hypot(c,d)||10,p});
      if(!course){const m=s.match(/(\d)\s*\.?\s*(?:º|°|o|er|ero|\.º)?\s*CURSO/i);if(m)course=m[1]+'º curso'}}
    try{const ol=await pg.getOperatorList();let ctm=[1,0,0,1,0,0];const st=[];
      const seg=(a,b)=>{const P=Util.applyTransform(a,ctm),Q=Util.applyTransform(b,ctm);const [x1,y1]=vp.convertToViewportPoint(...P),[x2,y2]=vp.convertToViewportPoint(...Q);
        if(Math.abs(y1-y2)<.6&&Math.abs(x2-x1)>3)edges.push({p,y:(y1+y2)/2,x1:Math.min(x1,x2),x2:Math.max(x1,x2)})};
      for(let i=0;i<ol.fnArray.length;i++){const fn=ol.fnArray[i],a=ol.argsArray[i];
        if(fn===OPS.save)st.push(ctm.slice());else if(fn===OPS.restore)ctm=st.pop()||ctm;else if(fn===OPS.transform)ctm=Util.transform(ctm,a);
        else if(fn===OPS.constructPath){const [ops,args]=a;let j=0,cur=null,start=null;
          for(const o of ops){
            if(o===OPS.rectangle){const [x,y,w,h]=args.slice(j,j+4);j+=4;seg([x,y],[x+w,y]);seg([x,y+h],[x+w,y+h])}
            else if(o===OPS.moveTo){cur=start=[args[j],args[j+1]];j+=2}
            else if(o===OPS.lineTo){const n=[args[j],args[j+1]];j+=2;if(cur)seg(cur,n);cur=n}
            else if(o===OPS.curveTo){cur=[args[j+4],args[j+5]];j+=6}else if(o===OPS.curveTo2||o===OPS.curveTo3){cur=[args[j+2],args[j+3]];j+=4}
            else if(o===OPS.closePath){if(cur&&start)seg(cur,start);cur=start}
          }}}
    }catch(e){}
  }
  return{items,edges,course};
}
async function pdfItems(buf){
  if(!window.pdfjsLib){await loadScript(PDFJS+'pdf.min.js');window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'}
  return pdfRead(buf);
}

/* ---------- TeamUp en el navegador (mismo formato que scripts/sync-teamup.mjs) ---------- */
function buildCatalog(subcals,events,courses){
  const norm=t=>t.replace(/\bloT\b/,'IoT').replace(/\s*\((conferencia[^)]*|GTM)\)|\(GTM\)$/,'').trim();
  const courseOf=n=>{n=String(n||'');const d=(n.match(/\d/)||[''])[0];return d?d+(/\(B\)/i.test(n)?'B':''):n};
  const strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().slice(0,60);
  const course={};for(const s of subcals||[])course[s.id]=(courses&&courses[s.id])||courseOf(s.name);
  const S=[],L=[],E=[],si={},li={};
  for(const e of events||[]){if(e.all_day||!e.title)continue;const c=course[e.subcalendar_id]||'?',t=norm(e.title),k=c+'|'+t;
    if(si[k]===undefined){si[k]=S.length;S.push([t,c])}const loc=e.location||'';if(li[loc]===undefined){li[loc]=L.length;L.push(loc)}
    const row=[e.start_dt.slice(2,10).replace(/-/g,''),e.start_dt.slice(11,16).replace(':',''),e.end_dt.slice(11,16).replace(':',''),si[k],li[loc]];const n=strip(e.notes);if(n)row.push(n);E.push(row)}
  E.sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]));
  return{S,L,E,sync:new Date().toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}).replace('.','')};
}

/* ---------- avisos y calendario (.ics) ---------- */
/* cuándo avisar de una nota de la agenda (Date o null) */
function alertAt(n){if(n.alert===''||n.alert==null||n.done||!n.date)return null;const d=parseYmd(n.date);d.setMinutes(T(n.time||'09:00')-Number(n.alert));return d}
function alertText(n){const a=Number(n.alert);const when=a>=1440?(a===1440?'Mañana':`En ${Math.round(a/1440)} días`):a>=60?'En 1 hora':a>0?`En ${a} min`:'Ahora';
  return{title:`${AGENDA_KINDS[n.kind]||'Aviso'}: ${n.text}`,body:`${when}${n.time?` a las ${n.time}`:''}`}}
const icsEsc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const icsFold=l=>{let o='';while(l.length>73){o+=l.slice(0,73)+'\r\n ';l=l.slice(73)}return o+l};
const icsStamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
/* ev: {uid,date:'YYYY-MM-DD',start?:'HH:MM',end?:'HH:MM',endDate?:'YYYY-MM-DD',title,desc,alert?:min} */
function buildICS(evs){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ritmo//Avisos//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Ritmo'],now=icsStamp(new Date());
  for(const e of evs){
    const k=e.date.replace(/-/g,'');L.push('BEGIN:VEVENT','UID:'+e.uid+'@ritmo','DTSTAMP:'+now,'SUMMARY:'+icsEsc(e.title));
    if(e.start){L.push('DTSTART:'+k+'T'+e.start.replace(':','')+'00','DTEND:'+k+'T'+(e.end||clock(T(e.start)+60)).replace(':','')+'00')}
    else{const z=addDays(parseYmd(e.endDate||e.date),1);L.push('DTSTART;VALUE=DATE:'+k,'DTEND;VALUE=DATE:'+ymd(z).replace(/-/g,''))}
    if(e.desc)L.push('DESCRIPTION:'+icsEsc(e.desc));
    if(e.alert!==''&&e.alert!=null){
      // en los de todo el día la alarma se cuenta desde las 00:00: se mueve a las 9:00
      const m=e.start?Number(e.alert):Number(e.alert)-540;
      L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(e.title),'TRIGGER:'+(m>=0?'-':'')+'PT'+Math.abs(m)+'M','END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');return L.map(icsFold).join('\r\n')+'\r\n';
}
async function shareICS(name,text){
  const blob=new Blob([text],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob);
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)){location.href=url;return}
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
