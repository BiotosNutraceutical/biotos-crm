/* Biotos CRM v1.5 – shared app.js (multi-page) */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function tISO(d=new Date()){ return new Date(d).toISOString().slice(0,10); }
function uid(){ return 'id_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4); }
function slug(s){ return (s||'default').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
function showToast(t){ const el=$('.toast'); if(!el) return; el.textContent=t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1600); }
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }

/* ===== Profiles ===== */
let PROFILES = JSON.parse(localStorage.getItem('biotos:profiles')||'["default"]');
let CURRENT = localStorage.getItem('biotos:current') || PROFILES[0] || 'default';
function saveProfiles(){ localStorage.setItem('biotos:profiles', JSON.stringify(Array.from(new Set(PROFILES)))); localStorage.setItem('biotos:current', CURRENT); }
function setProfile(name){ CURRENT=name; saveProfiles(); location.reload(); }

/* ===== Theme ===== */
function applyTheme(){
  const pref = localStorage.getItem('biotos:theme') || 'auto';
  let theme = pref;
  if(pref==='auto'){ const dark = window.matchMedia('(prefers-color-scheme: dark)').matches; theme = dark ? 'dark' : 'light'; }
  document.documentElement.setAttribute('data-theme', theme);
}

/* ===== DB via IndexedDB ===== */
let medici=[], farmacie=[], visite=[], appuntamenti=[];
let db=null, DBNAME=null;
function idbOpen(){ return new Promise((res,rej)=>{ const r=indexedDB.open(DBNAME,'1');
  r.onupgradeneeded=(e)=>{ const d=e.target.result;
    d.createObjectStore('medici',{keyPath:'id'});
    d.createObjectStore('farmacie',{keyPath:'id'});
    d.createObjectStore('visite',{keyPath:'id'});
    d.createObjectStore('appuntamenti',{keyPath:'id'});
  };
  r.onsuccess=()=>{ db=r.result; res(); };
  r.onerror=()=>rej(r.error);
});}
function idbLoadAll(store){ return new Promise((res)=>{ const tx=db.transaction(store,'readonly'); const os=tx.objectStore(store); const out=[];
  os.openCursor().onsuccess=(e)=>{ const c=e.target.result; if(c){ out.push(c.value); c.continue(); } else res(out); };
});}
function idbClearAll(){ return Promise.all(['medici','farmacie','visite','appuntamenti'].map(store=>new Promise((res)=>{ const tx=db.transaction(store,'readwrite'); tx.objectStore(store).clear().onsuccess=()=>res(); }))); }
function idbBulkPut(store, arr){ return new Promise((res)=>{ const tx=db.transaction(store,'readwrite'); const os=tx.objectStore(store); arr.forEach(x=>os.put(x)); tx.oncomplete=()=>res(); }); }
async function saveAll(){
  localStorage.setItem('biotos:'+CURRENT+':data', JSON.stringify({medici,farmacie,visite,appuntamenti}));
  try{ if(db){ await idbClearAll(); await idbBulkPut('medici', medici); await idbBulkPut('farmacie', farmacie); await idbBulkPut('visite', visite); await idbBulkPut('appuntamenti', appuntamenti); }
    const sb=$('#savebadge'); if(sb) sb.textContent='Salvato ✓';
  }catch(err){ console.error(err); const sb=$('#savebadge'); if(sb) sb.textContent='⚠︎ Non salvato'; }
}
async function loadAll(){
  try{
    DBNAME='biotos-crm-'+slug(CURRENT);
    await idbOpen();
    const m=await idbLoadAll('medici'); const f=await idbLoadAll('farmacie'); const v=await idbLoadAll('visite'); const a=await idbLoadAll('appuntamenti');
    if(m.length||f.length||v.length||a.length){ medici=m; farmacie=f; visite=v; appuntamenti=a; return; }
  }catch(_){}
  try{ const j=JSON.parse(localStorage.getItem('biotos:'+CURRENT+':data')||'{}'); medici=j.medici||[]; farmacie=j.farmacie||[]; visite=j.visite||[]; appuntamenti=j.appuntamenti||[]; }catch(_){}
}

/* ===== Common UI ===== */
function setActiveNav(page){
  $$('.bottomnav a').forEach(a=>{ if(a.dataset.page===page) a.classList.add('active'); else a.classList.remove('active'); });
}
function populateProfileBadge(){
  const pb=$('#profilebadge'); if(pb) pb.textContent='Profilo: '+CURRENT;
}
function ensureHeader(){
  const sb=$('#savebadge'); if(sb) sb.textContent='Salvato ✓';
  populateProfileBadge();
  const themeSel=$('#themeSel'); if(themeSel){
    const pref=localStorage.getItem('biotos:theme')||'auto';
    themeSel.value=pref;
    themeSel.addEventListener('change', e=>{ localStorage.setItem('biotos:theme', e.target.value); applyTheme(); });
  }
}

/* ===== Helpers ===== */
function tagsStrToArr(s){ return (s||'').split(',').map(x=>x.trim()).filter(Boolean); }
function collectTopTags(items, field){ const map=new Map(); items.forEach(it=> (it[field]||[]).forEach(t=> map.set(t,(map.get(t)||0)+1))); return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]); }
function chips(container, tags, set, onToggle){
  const el=$(container); if(!el) return; el.innerHTML=''; tags.forEach(t=>{ const b=document.createElement('button'); b.className='chip'+(set.has(t)?' on':''); b.textContent=t; b.onclick=()=>{ if(set.has(t)) set.delete(t); else set.add(t); onToggle(); }; el.appendChild(b); });
}
function refreshRefs(selectRef, includeBoth=true){
  const sel=$(selectRef); if(!sel) return; sel.innerHTML='';
  if(includeBoth){
    medici.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=`Dr. ${m.cognome||''} ${m.nome||''}`; sel.appendChild(o); });
    farmacie.forEach(f=>{ const o=document.createElement('option'); o.value=f.id; o.textContent=f.ragione; sel.appendChild(o); });
  }else{
    medici.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=`Dr. ${m.cognome||''} ${m.nome||''}`; sel.appendChild(o); });
  }
}

/* ===== Page bootstraps ===== */
async function boot(page){
  applyTheme();
  await loadAll();
  ensureHeader();
  setActiveNav(page);

  if(page==='home'){ // Dashboard
    $('#k_medici').value = medici.length;
    $('#k_farmacie').value = farmacie.length;
    $('#k_visite').value = visite.length;
    $('#k_appt').value = appuntamenti.filter(a=>a.data>=tISO()).length;
    const list = appuntamenti.slice().sort((a,b)=> (a.data+a.ora).localeCompare(b.data+b.ora)).slice(0,8);
    $('#cards_dash').innerHTML = list.map(a=>`
      <div class="card"><div class="main">
        <div class="title">${a.data} ${a.ora||''} • ${a.tit}</div>
        <div class="meta">${a.tipo}${a.ref?(' • ref:'+a.ref):''}</div>
      </div><a class="btn" href="visite.html#new?from=${a.id}">→ Visita</a></div>`).join('');
  }

  if(page==='medici'){
    const M_TAGS=new Set();
    const render=()=>{
      const q=($('#m_q')?.value||'').toLowerCase();
      const qc=($('#m_q_comune')?.value||'').toLowerCase();
      const qs=$('#m_q_spec')?.value||'';
      const extra = tagsStrToArr($('#m_q_tag')?.value||''); extra.forEach(t=>M_TAGS.add(t));
      const items = medici.filter(m=>(!q || (`${m.nome} ${m.cognome}`).toLowerCase().includes(q))
        && (!qc || (m.comune||'').toLowerCase().includes(qc))
        && (!qs || m.spec===qs)
        && ([...M_TAGS].every(t=>(m.tag||[]).map(x=>x.toLowerCase()).includes(t.toLowerCase()))));
      $('#cards_medici').innerHTML = items.map(m=>`
        <div class="card"><div class="main">
          <div class="title">${m.tit||'Dott.'} ${m.cognome||''} ${m.nome||''} • <span class="meta">${m.spec||''}</span></div>
          <div class="meta">${m.strutt||''} — ${m.comune||''}</div>
          <div class="meta">${(m.tag||[]).join(', ')}</div>
        </div>
        <a class="btn" href="visite.html#new?tipo=Medico&ref=${m.id}">+ Visita</a></div>`).join('');
      const top=collectTopTags(medici,'tag'); chips('#m_chips', top, M_TAGS, render);
    };
    $$('#m_q, #m_q_comune, #m_q_spec, #m_q_tag').forEach(el=>el.addEventListener('input',render));
    $('#btn_new_med')?.addEventListener('click', ()=> $('#sheet_medico').classList.add('open'));
    $('#btn_save_medico')?.addEventListener('click', async ()=>{
      const nome=$('#m_nome').value.trim(), cognome=$('#m_cognome').value.trim();
      if(!nome||!cognome) return alert('Nome e Cognome obbligatori');
      medici.unshift({id:uid(), tit:$('#m_tit').value, nome, cognome, spec:$('#m_spec').value, strutt:$('#m_strutt').value.trim(),
        comune:$('#m_comune').value.trim(), tel:$('#m_tel').value.trim(), email:$('#m_email').value.trim(),
        tag:tagsStrToArr($('#m_tag').value), note:$('#m_note').value.trim()});
      await saveAll(); $('#sheet_medico').classList.remove('open'); render(); showToast('Medico salvato');
    });
    render();
  }

  if(page==='farmacie'){
    const F_TAGS=new Set();
    const render=()=>{
      const q=($('#f_q')?.value||'').toLowerCase();
      const qc=($('#f_q_comune')?.value||'').toLowerCase();
      const extra=tagsStrToArr($('#f_q_tag')?.value||''); extra.forEach(t=>F_TAGS.add(t));
      const items = farmacie.filter(f=>(!q || (f.ragione||'').toLowerCase().includes(q))
        && (!qc || (f.comune||'').toLowerCase().includes(qc))
        && ([...F_TAGS].every(t=>(f.tag||[]).map(x=>x.toLowerCase()).includes(t.toLowerCase()))));
      $('#cards_farmacie').innerHTML = items.map(f=>`
        <div class="card"><div class="main">
          <div class="title">${f.ragione}</div>
          <div class="meta">${f.comune||''} — ${f.dir||''}</div>
          <div class="meta">${(f.tag||[]).join(', ')}</div>
        </div>
        <a class="btn" href="visite.html#new?tipo=Farmacia&ref=${f.id}">+ Visita</a></div>`).join('');
      const top=collectTopTags(farmacie,'tag'); chips('#f_chips', top, F_TAGS, render);
    };
    $$('#f_q, #f_q_comune, #f_q_tag').forEach(el=>el.addEventListener('input',render));
    $('#btn_new_far')?.addEventListener('click', ()=> $('#sheet_farmacia').classList.add('open'));
    $('#btn_save_farmacia')?.addEventListener('click', async ()=>{
      const ragione=$('#f_ragione').value.trim(); if(!ragione) return alert('Ragione sociale obbligatoria');
      farmacie.unshift({id:uid(), ragione, dir:$('#f_dir').value.trim(), comune:$('#f_comune').value.trim(),
        tel:$('#f_tel').value.trim(), email:$('#f_email').value.trim(), tag:tagsStrToArr($('#f_tag').value),
        addr:$('#f_addr').value.trim(), note:$('#f_note').value.trim()});
      await saveAll(); $('#sheet_farmacia').classList.remove('open'); render(); showToast('Farmacia salvata');
    });
    render();
  }

  if(page==='visite'){
    const params = new URLSearchParams((location.hash.split('?')[1]||''));
    refreshRefs('#v_ref', true);
    if(params.get('from')){ // da agenda
      const a = appuntamenti.find(x=>x.id===params.get('from'));
      if(a){ $('#v_data').value=a.data; $('#v_tipo').value=a.tipo; $('#v_ref').value=a.ref||''; $('#v_next').value='Dopo appuntamento'; }
    } else {
      if(params.get('tipo')) $('#v_tipo').value=params.get('tipo');
      if(params.get('ref')) $('#v_ref').value=params.get('ref');
      $('#v_data').value = tISO();
    }

    const V_TAGS=new Set();
    const render=()=>{
      const vf=$('#v_q_from').value, vt=$('#v_q_to').value, vtit=$('#v_q_tipo').value;
      const extra=tagsStrToArr($('#v_q_tag').value||''); extra.forEach(t=>V_TAGS.add(t));
      const items = visite.filter(v=>(!vf || v.data>=vf) && (!vt || v.data<=vt) && (!vtit || v.tipo===vtit)
        && ([...V_TAGS].every(t=>(v.tag||[]).map(x=>x.toLowerCase()).includes(t.toLowerCase()))))
        .slice().sort((a,b)=> (b.data).localeCompare(a.data));
      $('#cards_visite').innerHTML = items.map(v=>`
        <div class="card"><div class="main">
          <div class="title">${v.data} • ${v.tipo} • ${v.prod||'—'}</div>
          <div class="meta">${v.esito||''} • ref:${v.ref||''} • FU:${v.follow||'-'} • FV/FL:${v.fv||0}/${v.fl||0}</div>
          <div class="meta">${(v.tag||[]).join(', ')}</div>
        </div>
        <div class="actions">
          ${v.follow?`<button class="btn" onclick="postponeFU('${v.id}',1)">+1</button>
                       <button class="btn" onclick="postponeFU('${v.id}',3)">+3</button>
                       <button class="btn" onclick="postponeFU('${v.id}',7)">+7</button>`:''}
        </div></div>`).join('');
      const top=collectTopTags(visite,'tag'); chips('#v_chips', top, V_TAGS, render);
    };
    window.postponeFU = async (id,days)=>{ const v=visite.find(x=>x.id===id); if(!v) return; const base = v.follow || tISO(); const x=new Date(base); x.setDate(x.getDate()+days); v.follow = tISO(x); await saveAll(); render(); };

    $('#btn_new_vis')?.addEventListener('click', ()=> $('#sheet_visita').classList.add('open'));
    $('#btn_save_visita')?.addEventListener('click', async ()=>{
      const data=$('#v_data').value||tISO(), tipo=$('#v_tipo').value, ref=$('#v_ref').value||'';
      if(!data||!tipo||!ref) return alert('Data, Tipo e Riferimento obbligatori');
      visite.unshift({ id:uid(), data, tipo, ref, prod:$('#v_prod').value, esito:$('#v_esito').value, refe:$('#v_refe').value,
        mat:$('#v_mat').value.trim(), next:$('#v_next').value.trim(), follow:$('#v_follow').value||'',
        fv:+($('#v_fv').value||0), fl:+($('#v_fl').value||0), tag:tagsStrToArr($('#v_tag').value), note:$('#v_note').value.trim() });
      await saveAll(); $('#sheet_visita').classList.remove('open'); render(); showToast('Visita salvata');
    });

    $$('#v_q_from,#v_q_to,#v_q_tipo,#v_q_tag').forEach(el=>el.addEventListener('input',render));
    render();
  }

  if(page==='agenda'){
    refreshRefs('#a_ref', true);
    const render=()=>{
      const af=$('#a_from').value, at=$('#a_to').value;
      const items=appuntamenti.filter(a=>(!af || a.data>=af)&&(!at || a.data<=at))
        .slice().sort((a,b)=> (a.data+a.ora).localeCompare(b.data+b.ora));
      $('#cards_agenda').innerHTML = items.map(a=>`
        <div class="card"><div class="main">
          <div class="title">${a.data} ${a.ora||''} • ${a.tit}</div>
          <div class="meta">${a.tipo}${a.ref?(' • ref:'+a.ref):''}</div>
        </div>
        <a class="btn" href="visite.html#new?from=${a.id}">→ Visita</a></div>`).join('');
    };
    $$('#a_from,#a_to').forEach(el=>el.addEventListener('input',render));
    $('#btn_new_appt')?.addEventListener('click', ()=> $('#sheet_appt').classList.add('open'));
    $('#btn_save_appt')?.addEventListener('click', async ()=>{
      const data=$('#a_data').value||tISO(), ora=$('#a_ora').value||'', tit=($('#a_tit').value||'Appuntamento').trim();
      if(!data||!tit) return alert('Data e Titolo obbligatori');
      appuntamenti.unshift({id:uid(), data, ora, tit, tipo:$('#a_tipo').value, ref:$('#a_ref').value||'', note:$('#a_note').value.trim()});
      await saveAll(); $('#sheet_appt').classList.remove('open'); render(); showToast('Appuntamento salvato');
    });
    render();
  }

  if(page==='followup'){
    const render=()=>{
      const st=$('#fu_state').value; const now=tISO(); const soon=tISO(new Date(Date.now()+3*86400000));
      const items=visite.filter(v=>v.follow).filter(v=> st==='all' || (st==='over'&&v.follow<now) || (st==='soon'&&v.follow>=now&&v.follow<=soon) || (st==='future'&&v.follow>soon));
      $('#cards_follow').innerHTML = items.map(v=>`
        <div class="card"><div class="main"><div class="title">${v.follow} • ${v.tipo}</div>
          <div class="meta">ref:${v.ref||''} • next:${v.next||'-'}</div></div>
          <div>
            <button class="btn" onclick="postponeFU('${v.id}',1)">+1</button>
            <button class="btn" onclick="postponeFU('${v.id}',3)">+3</button>
            <button class="btn" onclick="postponeFU('${v.id}',7)">+7</button>
            <a class="btn" href="agenda.html#new?date=${v.follow}&tipo=${v.tipo}&ref=${v.ref||''}">FU → Appt</a>
          </div></div>`).join('');
    };
    window.postponeFU = async (id,days)=>{ const v=visite.find(x=>x.id===id); if(!v) return; const base=v.follow||tISO(); const x=new Date(base); x.setDate(x.getDate()+days); v.follow=tISO(x); await saveAll(); render(); };
    $('#fu_state').addEventListener('input',render);
    $('#btn_exp_ics')?.addEventListener('click', ()=>{
      const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Biotos CRM//FollowUp//IT'];
      visite.filter(v=>v.follow).forEach(v=>{
        const dt=v.follow.replace(/-/g,'')+'T090000';
        lines.push('BEGIN:VEVENT','UID:'+v.id+'@biotos','DTSTAMP:'+dt,'DTSTART:'+dt,'SUMMARY:Follow-up '+v.tipo,'DESCRIPTION:ref '+(v.ref||''),'END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar'})); a.download='followup_'+slug(CURRENT)+'.ics'; a.click();
    });
    render();
  }

  if(page==='report'){
    const render=()=>{
      const month=$('#r_month').value || tISO().slice(0,7);
      const refe=$('#r_refe').value;
      const inMonth = visite.filter(v=>v.data.startsWith(month) && (!refe || v.refe===refe));
      $('#rk_visite').value = inMonth.length;
      $('#rk_nuovi').value = inMonth.filter(v=>v.esito==='Nuovo contatto').length;
      $('#rk_fu').value = inMonth.filter(v=>v.follow).length;
      const sumFV=inMonth.reduce((s,v)=>s+(+v.fv||0),0), sumFL=inMonth.reduce((s,v)=>s+(+v.fl||0),0);
      $('#rk_ord').value = sumFV+'/'+sumFL;
      $('#cards_rep').innerHTML = inMonth.map(v=>`<div class="card"><div class="main"><div class="title">${v.data} • ${v.tipo} ${v.prod||''}</div><div class="meta">${v.esito||''} • FV/FL:${v.fv||0}/${v.fl||0} • tag:${(v.tag||[]).join(',')}</div></div></div>`).join('');
    };
    $$('#r_month,#r_refe').forEach(el=>el.addEventListener('input',render));
    render();
  }

  if(page==='settings'){
    // Profili
    const sel=$('#profileSel');
    if(sel){ sel.innerHTML=''; PROFILES.forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; if(p===CURRENT) o.selected=true; sel.appendChild(o); });
      sel.addEventListener('change', e=> setProfile(e.target.value));
    }
    $('#btn_add_profile')?.addEventListener('click', ()=>{
      const n = ($('#profileNew').value||'').trim(); if(!n) return alert('Nome profilo?');
      if(!PROFILES.includes(n)) PROFILES.push(n); saveProfiles(); setProfile(n);
    });

    // Backup/restore
    $('#btn_backup')?.addEventListener('click', ()=>{
      const payload={exportedAt:new Date().toISOString(), version:'v1.5', profile:CURRENT, data:{medici,farmacie,visite,appuntamenti}};
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
      a.download='biotos_crm_'+slug(CURRENT)+'_backup.json'; a.click();
    });
    $('#inp_restore')?.addEventListener('change', e=>{
      const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=async()=>{ try{
        const j=JSON.parse(rd.result); medici=j.data?.medici||[]; farmacie=j.data?.farmacie||[]; visite=j.data?.visite||[]; appuntamenti=j.data?.appuntamenti||[];
        await saveAll(); showToast('Backup importato');
      }catch(_){ alert('File non valido'); } }; rd.readAsText(f);
    });

    // CSV (rapidi)
    $('#exp_med')?.addEventListener('click', ()=>{
      const hdr=['id','tit','nome','cognome','spec','strutt','comune','tel','email','tag','note'];
      const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
      const csv=[hdr.join(',')].concat(medici.map(o=>hdr.map(h=>esc(Array.isArray(o[h])?o[h].join(', '):o[h])).join(','))).join('\r\n');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='medici_'+slug(CURRENT)+'.csv'; a.click();
    });
    $('#exp_far')?.addEventListener('click', ()=>{
      const hdr=['id','ragione','dir','comune','tel','email','tag','addr','note'];
      const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
      const csv=[hdr.join(',')].concat(farmacie.map(o=>hdr.map(h=>esc(Array.isArray(o[h])?o[h].join(', '):o[h])).join(','))).join('\r\n');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='farmacie_'+slug(CURRENT)+'.csv'; a.click();
    });
    $('#exp_vis')?.addEventListener('click', ()=>{
      const hdr=['id','data','tipo','ref','prod','esito','refe','mat','next','follow','fv','fl','tag','note'];
      const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
      const csv=[hdr.join(',')].concat(visite.map(o=>hdr.map(h=>esc(Array.isArray(o[h])?o[h].join(', '):o[h])).join(','))).join('\r\n');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='visite_'+slug(CURRENT)+'.csv'; a.click();
    });

    // Theme pref is bound in ensureHeader()
  }
}

/* ===== Page detector ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.body.dataset.page || 'home';
  boot(page);
});
