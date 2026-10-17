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
/* formato tabla: días en una fila de cabecera, horas en la primera columna */
function parseGrid(items){
  const out=[];
  for(const p of [...new Set(items.map(i=>i.p))]){
    const its=items.filter(i=>i.p===p),lines=groupLines(its);
    const hdr=lines.find(l=>{const ds=new Set(l.items.map(i=>dayWord(i.s.split(/\s+/)[0],true)).filter(x=>x>=0));return ds.size>=3});
    if(!hdr)continue;
    const cols=[];for(const i of hdr.items){const d=dayWord(i.s.split(/\s+/)[0],true);if(d>=0&&!cols.some(c=>c.dow===d))cols.push({dow:d,cx:i.x+i.w/2})}
    cols.sort((a,b)=>a.cx-b.cx);
    const gap=cols.length>1?(cols[cols.length-1].cx-cols[0].cx)/(cols.length-1):120;
    cols.forEach((c,k)=>{c.l=k?(cols[k-1].cx+c.cx)/2:c.cx-gap/2;c.r=k<cols.length-1?(c.cx+cols[k+1].cx)/2:c.cx+gap/2});
    const yc=i=>i.y-i.h*.35;
    const below=its.filter(i=>i.y>hdr.y+1);
    // horas de la columna izquierda
    const tl=[];
    for(const ln of groupLines(below.filter(i=>i.x+i.w<=cols[0].l+4))){
      const r=ln.text.match(RANGE),m=ln.text.match(TIME1);if(!r&&!m)continue;
      tl.push({y:yc(ln.items[0]),t:T(r?hhmm(r[1],r[2]):hhmm(m[1],m[2])),t2:r?T(hhmm(r[3],r[4])):null});
    }
    tl.sort((a,b)=>a.y-b.y);if(tl.length<2)continue;
    const rows=tl.map((r,k)=>({...r,top:k?(tl[k-1].y+r.y)/2:r.y-(tl[1].y-tl[0].y)/2,bot:k<tl.length-1?(r.y+tl[k+1].y)/2:r.y+(r.y-tl[k-1].y)/2,
      end:r.t2||(tl[k+1]?tl[k+1].t:r.t+(r.t-tl[k-1].t))}));
    // contenido de cada celda
    const cells={};
    for(const i of below){const cx=i.x+i.w/2;if(cx<cols[0].l)continue;const c=cols.find(c=>cx>=c.l&&cx<c.r);if(!c)continue;
      const y=yc(i);const k=rows.findIndex(r=>y>=r.top&&y<r.bot);if(k<0)continue;
      (cells[c.dow+'|'+k]=cells[c.dow+'|'+k]||[]).push(i)}
    for(const c of cols){
      let run=null;
      const flush=()=>{if(run){const {name,loc}=splitLoc(run.text);if(name&&name.length>=2&&!/^(descanso|recreo|libre)$/i.test(name))out.push({dow:c.dow,start:clock(rows[run.a].t),end:clock(rows[run.b].end),name,loc});run=null}};
      for(let k=0;k<rows.length;k++){
        const its2=cells[c.dow+'|'+k];
        if(!its2){
          // celda vacía justo debajo de un texto pegado al borde: es la misma clase ocupando dos filas
          if(run&&run.b===k-1&&run.low)run.b=k,run.low=false;else flush();continue}
        const ls=groupLines(its2),text=ls.map(l=>l.text).join(' · ');
        const first=ls[0].text;
        const yy=its2.reduce((a,i)=>a+yc(i),0)/its2.length,R=rows[k],low=(yy-R.top)/(R.bot-R.top)>.68;
        if(run&&run.b===k-1&&(run.first===first||!splitLoc(text).name)){run.b=k;run.low=low;if(run.first!==first)run.text+=' '+text;continue}
        flush();run={a:k,b:k,text:ls.length>1&&ls[0].text.length<4?text:(ls.slice(0,2).map(l=>l.text).join(' ')),first,low};
      }
      flush();
    }
  }
  return out;
}
/* junta las clases por asignatura (formato de «Mi propio horario») */
function slotsToCustom(slots){
  const by=new Map();
  for(const s of slots){const k=nrmTxt(s.name);if(!by.has(k))by.set(k,{id:'s'+Date.now().toString(36)+by.size,name:s.name,slots:[]});
    const g=by.get(k);if(!g.slots.some(x=>x.dow===s.dow&&x.start===s.start))g.slots.push({dow:s.dow,start:s.start,end:s.end,loc:s.loc||''})}
  return [...by.values()].map(g=>({...g,slots:g.slots.sort((a,b)=>a.dow-b.dow||a.start.localeCompare(b.start))}));
}
function parseScheduleItems(items){
  const g=parseGrid(items),l=parseList(groupLines(items));
  const slots=g.length>=l.length?g:l;
  return{mode:slots===g?'tabla':'lista',slots,subjects:slotsToCustom(slots)};
}
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
async function pdfItems(buf){
  if(!window.pdfjsLib){await loadScript(PDFJS+'pdf.min.js');window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'}
  const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;const out=[];
  for(let p=1;p<=Math.min(pdf.numPages,6);p++){
    const pg=await pdf.getPage(p),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
    for(const it of tc.items){const s=(it.str||'').trim();if(!s)continue;const [,,c,d,e,f]=it.transform;const [x,y]=vp.convertToViewportPoint(e,f);out.push({s,x,y,w:it.width||s.length*5,h:Math.hypot(c,d)||10,p})}
  }
  return out;
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
