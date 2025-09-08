/* Biotos CRM v2.5 – hotfix + features */
const APP_VERSION = '2.5';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function tISO(d=new Date()){ return new Date(d).toISOString().slice(0,10); }
function uid(){ return 'id_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4); }
function slug(s){ return (s||'default').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
function showToast(t){ const el=$('.toast'); if(!el) return; el.textContent=t; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1700); }
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
window.addEventListener('error', e=>{ console.error(e.error||e.message); showToast('⚠︎ Errore inatteso'); });

/* Debounce */
function debounce(fn, wait=160){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

/* Profiles */
let PROFILES = safeParse(localStorage.getItem('biotos:profiles'), ['default']);
let CURRENT = localStorage.getItem('biotos:current') || PROFILES[0] || 'default';
function saveProfiles(){ localStorage.setItem('biotos:profiles', JSON.stringify(Array.from(new Set(PROFILES)))); localStorage.setItem('biotos:current', CURRENT); }
function setProfile(name){ CURRENT=name; saveProfiles(); location.reload(); }

/* Theme */
function applyTheme(){
  const pref = localStorage.getItem('biotos:theme') || 'auto';
  let theme = pref;
  if(pref==='auto'){ const dark = window.matchMedia('(prefers-color-scheme: dark)').matches; theme = dark ? 'dark' : 'light'; }
  document.documentElement.setAttribute('data-theme', theme);
}

/* Safe JSON parse */
function safeParse(str, fallback){ try{ const v=JSON.parse(str); return (v==null?fallback:v); } catch{ return fallback; } }

/* DB via IndexedDB */
let medici=[], farmacie=[], visite=[], appuntamenti=[];
let db=null, DBNAME=null;
function idbOpen(){ return new Promise((res,rej)=>{ const r=indexedDB.open(DBNAME,'1');
  r.onupgradeneeded=(e)=>{ const d=e.target.result;
    if(!d.objectStoreNames.contains('medici')) d.createObjectStore('medici',{keyPath:'id'});
    if(!d.objectStoreNames.contains('farmacie')) d.createObjectStore('farmacie',{keyPath:'id'});
    if(!d.objectStoreNames.contains('visite')) d.createObjectStore('visite',{keyPath:'id'});
    if(!d.objectStoreNames.contains('appuntamenti')) d.createObjectStore('appuntamenti',{keyPath:'id'});
  };
  r.onsuccess=()=>{ db=r.result; res(); };
  r.onerror=()=>rej(r.error||new Error('IndexedDB open error'));
});}
function idbLoadAll(store){ return new Promise((res)=>{ const tx=db.transaction(store,'readonly'); const os=tx.objectStore(store); const out=[];
  os.openCursor().onsuccess=(e)=>{ const c=e.target.result; if(c){ out.push(c.value); c.continue(); } else res(out); };
});}
function idbClearAll(){ return Promise.all(['medici','farmacie','visite','appuntamenti'].map(store=>new Promise((res)=>{ const tx=db.transaction(store,'readwrite'); tx.objectStore(store).clear().onsuccess=()=>res(); }))); }
function idbBulkPut(store, arr){ return new Promise((res)=>{ const tx=db.transaction(store,'readwrite'); const os=tx.objectStore(store); arr.forEach(x=>os.put(x)); tx.oncomplete=()=>res(); }); }
async function saveAll(){
  localStorage.setItem('biotos:'+CURRENT+':data', JSON.stringify({medici,farmacie,visite,appuntamenti, _v:APP_VERSION}));
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
  const j=safeParse(localStorage.getItem('biotos:'+CURRENT+':data'), {});
  medici=j.medici||[]; farmacie=j.farmacie||[]; visite=j.visite||[]; appuntamenti=j.appuntamenti||[];
}

/* Common UI */
function setActiveNav(page){ $$('.bottomnav a').forEach(a=>{ if(a.dataset.page===page) a.classList.add('active'); else a.classList.remove('active'); }); }
function populateProfileBadge(){ const pb=$('#profilebadge'); if(pb) pb.textContent='Profilo: '+CURRENT; }
function ensureHeader(){
  const sb=$('#savebadge'); if(sb) sb.textContent='Salvato ✓';
  populateProfileBadge();
  const themeSel=$('#themeSel'); if(themeSel){
    const pref=localStorage.getItem('biotos:theme')||'auto';
    themeSel.value=pref;
    themeSel.addEventListener('change', e=>{ localStorage.setItem('biotos:theme', e.target.value); applyTheme(); });
  }
}

/* Helpers */
function tagsStrToArr(s){ return (s||'').split(/[|,]/).map(x=>x.trim()).filter(Boolean); }
function collectTopTags(items, field){ const map=new Map(); items.forEach(it=> (it[field]||[]).forEach(t=> map.set(t,(map.get(t)||0)+1))); return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]); }

/* Etichetta leggibile per ref */
function refLabel(id){
  if(!id) return '';
  const m = medici.find(x=>x.id===id);
  if(m) return `Dr. ${m.cognome||''} ${m.nome||''}`.trim();
  const f = farmacie.find(x=>x.id===id);
  if(f) return f.ragione || id;
  return id;
}

/* CSV utils */
function toCSV(arr, headers){
  const esc = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  const lines=[headers.join(',')];
  arr.forEach(o=> lines.push(headers.map(h=> esc(Array.isArray(o[h])? o[h].join(', ') : o[h])).join(',')));
  return lines.join('\r\n');
}
function fromCSV(text){
  const lines=text.split(/\r?\n/).filter(Boolean);
  const hdr=(lines.shift()||'').split(',');
  const rows=lines.map(line=>{
    const out=[]; let cur='', q=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch=='"'){ if(q && line[i+1]=='"'){ cur+='"'; i++; } else { q=!q; } }
      else if(ch==',' && !q){ out.push(cur); cur=''; }
      else cur+=ch;
    }
    out.push(cur);
    const obj={}; hdr.forEach((h,idx)=> obj[h]=out[idx]||'' ); return obj;
  });
  return {headers:hdr, rows};
}

/* Open helpers (modali) */
function openSheet(id){ $(id).classList.add('open'); }
function closeSheet(id){ $(id).classList.remove('open'); }

/* Page boot */
async function boot(page){
  applyTheme();
  await loadAll();
  ensureHeader();
  setActiveNav(page);

  /* HOME */
  if(page==='home'){
    $('#k_medici').value = medici.length;
    $('#k_farmacie').value = farmacie.length;
    $('#k_visite').value = visite.length;
    $('#k_appt').value = appuntamenti.filter(a=>a.data>=tISO()).length;
    const list = appuntamenti.slice().sort((a,b)=> (a.data+a.ora).localeCompare(b.data+b.ora)).slice(0,8);
    $('#cards_dash').innerHTML = list.map(a=>`
      <div class="card">
        <div class="main">
          <div class="title">${a.data} ${a.ora||''} • ${a.tit}</div>
          <div class="meta">${a.tipo}${a.ref?(' • '+refLabel(a.ref)) : ''}</div>
        </div>
        <a class="btn" href="visite.html#new?from=${encodeURIComponent(a.id)}" aria-label="Converti in visita">→ Visita</a>
      </div>`).join('');
  }

  /* MEDICI */
  if(page==='medici'){
    const M_TAGS=new Set();

    function fillMedicoForm(m={}){
      $('#m_id').value = m.id || '';
      $('#m_tit').value = m.tit || 'Dott.';
      $('#m_nome').value = m.nome || '';
      $('#m_cognome').value = m.cognome || '';
      $('#m_spec').value = m.spec || 'Ginecologia';
      $('#m_strutt').value = m.strutt || '';
      $('#m_comune').value = m.comune || '';
      $('#m_tel').value = m.tel || '';
      $('#m_email').value = m.email || '';
      $('#m_tag').value = (m.tag||[]).join(', ');
      $('#m_note').value = m.note || '';
      $('#m_title').textContent = m.id ? 'Modifica medico' : 'Nuovo medico';
    }

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
        <div class="card" data-id="${m.id}">
          <div class="main">
            <div class="title">${m.tit||'Dott.'} ${m.cognome||''} ${m.nome||''} • <span class="meta">${m.spec||''}</span></div>
            <div class="meta">${m.strutt||''} — ${m.comune||''}</div>
            <div class="meta">${(m.tag||[]).join(', ')}</div>
          </div>
          <div class="actions" style="display:flex;gap:6px">
            <button class="btn" data-act="edit-med" data-id="${m.id}" title="Modifica">✎</button>
            <button class="btn" data-act="del-med" data-id="${m.id}" title="Elimina">🗑</button>
            <a class="btn" href="visite.html#new?tipo=Medico&ref=${encodeURIComponent(m.id)}">+ Visita</a>
          </div>
        </div>`).join('');
      const top=collectTopTags(medici,'tag'); const set=M_TAGS; const container='#m_chips';
      const el=$(container); if(el){ el.innerHTML=''; top.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'+(set.has(t)?' on':''); b.textContent=t; b.onclick=()=>{ if(set.has(t)) set.delete(t); else set.add(t); render(); }; el.appendChild(b); }); }
    };

    const rDeb=debounce(render, 120);
    $$('#m_q, #m_q_comune, #m_q_spec, #m_q_tag').forEach(el=>el.addEventListener('input', rDeb));

    $('#btn_new_med')?.addEventListener('click', ()=>{ fillMedicoForm({}); openSheet('#sheet_medico'); });

    $('#btn_save_medico')?.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      const nome=$('#m_nome').value.trim(), cognome=$('#m_cognome').value.trim();
      if(!nome||!cognome) return alert('Nome e Cognome obbligatori');

      const id = $('#m_id').value.trim();
      const payload = {id: id || uid(), tit:$('#m_tit').value, nome, cognome, spec:$('#m_spec').value, strutt:($('#m_strutt').value||'').trim(),
        comune:($('#m_comune').value||'').trim(), tel:($('#m_tel').value||'').trim(), email:($('#m_email').value||'').trim(),
        tag:tagsStrToArr($('#m_tag').value), note:($('#m_note').value||'').trim()};

      if(id){
        const ix = medici.findIndex(x=>x.id===id);
        if(ix>=0) medici[ix]=payload;
      }else{
        medici.unshift(payload);
      }
      await saveAll();
      closeSheet('#sheet_medico');
      fillMedicoForm({}); // campi liberi al prossimo “Nuovo”
      render(); showToast('Medico salvato');
    });

    // Deleghe Modifica/Elimina
    $('#cards_medici')?.addEventListener('click', (e)=>{
      const btn=e.target.closest('button');
      if(!btn) return;
      const id=btn.dataset.id, act=btn.dataset.act;
      const m=medici.find(x=>x.id===id);
      if(!m) return;
      if(act==='edit-med'){ fillMedicoForm(m); openSheet('#sheet_medico'); }
      if(act==='del-med'){
        if(confirm('Eliminare questo medico?')){ medici=medici.filter(x=>x.id!==id); saveAll().then(()=>{ render(); showToast('Medico eliminato'); }); }
      }
    });

    render();
  }

  /* FARMACIE */
  if(page==='farmacie'){
    const F_TAGS=new Set();

    function fillFarForm(f={}){
      $('#f_id').value = f.id || '';
      $('#f_ragione').value = f.ragione || '';
      $('#f_dir').value = f.dir || '';
      $('#f_comune').value = f.comune || '';
      $('#f_tel').value = f.tel || '';
      $('#f_email').value = f.email || '';
      $('#f_tag').value = (f.tag||[]).join(', ');
      $('#f_addr').value = f.addr || '';
      $('#f_note').value = f.note || '';
      $('#f_title').textContent = f.id ? 'Modifica farmacia' : 'Nuova farmacia';
    }

    const render=()=>{
      const q=($('#f_q')?.value||'').toLowerCase();
      const qc=($('#f_q_comune')?.value||'').toLowerCase();
      const extra=tagsStrToArr($('#f_q_tag')?.value||''); extra.forEach(t=>F_TAGS.add(t));
      const items = farmacie.filter(f=>(!q || (f.ragione||'').toLowerCase().includes(q))
        && (!qc || (f.comune||'').toLowerCase().includes(qc))
        && ([...F_TAGS].every(t=>(f.tag||[]).map(x=>x.toLowerCase()).includes(t.toLowerCase()))));
      $('#cards_farmacie').innerHTML = items.map(f=>`
        <div class="card" data-id="${f.id}">
          <div class="main">
            <div class="title">${f.ragione}</div>
            <div class="meta">${f.comune||''} — ${f.dir||''}</div>
            <div class="meta">${(f.tag||[]).join(', ')}</div>
          </div>
          <div class="actions" style="display:flex;gap:6px">
            <button class="btn" data-act="edit-far" data-id="${f.id}" title="Modifica">✎</button>
            <button class="btn" data-act="del-far" data-id="${f.id}" title="Elimina">🗑</button>
            <a class="btn" href="visite.html#new?tipo=Farmacia&ref=${encodeURIComponent(f.id)}">+ Visita</a>
          </div>
        </div>`).join('');
      const top=collectTopTags(farmacie,'tag'); const set=F_TAGS; const container='#f_chips';
      const el=$(container); if(el){ el.innerHTML=''; top.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'+(set.has(t)?' on':''); b.textContent=t; b.onclick=()=>{ if(set.has(t)) set.delete(t); else set.add(t); render(); }; el.appendChild(b); }); }
    };

    const rDeb=debounce(render, 120);
    $$('#f_q, #f_q_comune, #f_q_tag').forEach(el=>el.addEventListener('input', rDeb));

    $('#btn_new_far')?.addEventListener('click', ()=>{ fillFarForm({}); openSheet('#sheet_farmacia'); });

    $('#btn_save_farmacia')?.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      const ragione=$('#f_ragione').value.trim(); if(!ragione) return alert('Ragione sociale obbligatoria');

      const id = $('#f_id').value.trim();
      const payload = {id: id || uid(), ragione, dir:($('#f_dir').value||'').trim(), comune:($('#f_comune').value||'').trim(),
        tel:($('#f_tel').value||'').trim(), email:($('#f_email').value||'').trim(), tag:tagsStrToArr($('#f_tag').value),
        addr:($('#f_addr').value||'').trim(), note:($('#f_note').value||'').trim()};

      if(id){
        const ix=farmacie.findIndex(x=>x.id===id);
        if(ix>=0) farmacie[ix]=payload;
      }else{
        farmacie.unshift(payload);
      }
      await saveAll();
      closeSheet('#sheet_farmacia');
      fillFarForm({}); // campi liberi
      render(); showToast('Farmacia salvata');
    });

    // Deleghe Modifica/Elimina
    $('#cards_farmacie')?.addEventListener('click', (e)=>{
      const btn=e.target.closest('button');
      if(!btn) return;
      const id=btn.dataset.id, act=btn.dataset.act;
      const f=farmacie.find(x=>x.id===id);
      if(!f) return;
      if(act==='edit-far'){ fillFarForm(f); openSheet('#sheet_farmacia'); }
      if(act==='del-far'){
        if(confirm('Eliminare questa farmacia?')){ farmacie=farmacie.filter(x=>x.id!==id); saveAll().then(()=>{ render(); showToast('Farmacia eliminata'); }); }
      }
    });

    render();
  }

  /* VISITE */
  if(page==='visite'){
    const hash = location.hash || '';
    const qstr = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(qstr);

    const refSel = $('#v_ref');

    function refreshRefs(){
      refSel.innerHTML='';
      medici.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=`Dr. ${m.cognome||''} ${m.nome||''}`; refSel.appendChild(o); });
      farmacie.forEach(f=>{ const o=document.createElement('option'); o.value=f.id; o.textContent=f.ragione; refSel.appendChild(o); });
    }
    refreshRefs();

    if(params.get('from')){
      const id = params.get('from');
      const a = appuntamenti.find(x=>x.id===id);
      if(a){
        $('#v_data').value=a.data;
        $('#v_tipo').value=a.tipo;
        $('#v_ref').value=a.ref||'';
        $('#v_next').value='Dopo appuntamento';
        openSheet('#sheet_visita'); // ← apre direttamente il modulo
      }
    }else{
      if(params.get('tipo')) $('#v_tipo').value=params.get('tipo');
      if(params.get('ref')) $('#v_ref').value=params.get('ref');
      if(!$('#v_data').value) $('#v_data').value = tISO();
    }

    const V_TAGS=new Set();
    const render=()=>{
      const vf=$('#v_q_from').value, vt=$('#v_q_to').value, vtit=$('#v_q_tipo').value;
      const extra=tagsStrToArr($('#v_q_tag').value||''); extra.forEach(t=>V_TAGS.add(t));
      const items = visite.filter(v=>(!vf || v.data>=vf) && (!vt || v.data<=vt) && (!vtit || v.tipo===vtit)
        && ([...V_TAGS].every(t=>(v.tag||[]).map(x=>x.toLowerCase()).includes(t.toLowerCase()))))
        .slice().sort((a,b)=> (b.data).localeCompare(a.data));
      $('#cards_visite').innerHTML = items.map(v=>`
        <div class="card">
          <div class="main">
            <div class="title">${v.data} • ${v.tipo} • ${v.prod||'—'}</div>
            <div class="meta">${v.esito||''} • ${refLabel(v.ref)||''} • FU:${v.follow||'-'} • FV/FL:${v.fv||0}/${v.fl||0}</div>
            <div class="meta">${(v.tag||[]).join(', ')}</div>
          </div>
          ${v.follow?`<a class="btn" href="agenda.html#new?date=${encodeURIComponent(v.follow)}&tipo=${encodeURIComponent(v.tipo)}&ref=${encodeURIComponent(v.ref||'')}">FU → Appt</a>`:''}
        </div>`).join('');
      const top=collectTopTags(visite,'tag'); const set=V_TAGS; const container='#v_chips';
      const el=$(container); if(el){ el.innerHTML=''; top.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'+(set.has(t)?' on':''); b.textContent=t; b.onclick=()=>{ if(set.has(t)) set.delete(t); else set.add(t); render(); }; el.appendChild(b); }); }
    };
    const rDeb=debounce(render, 120);
    $$('#v_q_from,#v_q_to,#v_q_tipo,#v_q_tag').forEach(el=>el.addEventListener('input', rDeb));

    $('#btn_new_vis')?.addEventListener('click', ()=> openSheet('#sheet_visita'));

    $('#btn_save_visita')?.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      const data=$('#v_data').value||tISO(), tipo=$('#v_tipo').value, ref=$('#v_ref').value||'';
      if(!data||!tipo||!ref) return alert('Data, Tipo e Riferimento obbligatori');
      visite.unshift({ id:uid(), data, tipo, ref, prod:$('#v_prod').value, esito:$('#v_esito').value, refe:$('#v_refe').value,
        mat:($('#v_mat').value||'').trim(), next:($('#v_next').value||'').trim(), follow:$('#v_follow').value||'',
        fv:+($('#v_fv').value||0), fl:+($('#v_fl').value||0), tag:tagsStrToArr($('#v_tag').value), note:($('#v_note').value||'').trim() });
      await saveAll();
      closeSheet('#sheet_visita');
      // reset campi per nuovo inserimento
      $('#v_data').value=tISO(); $('#v_tipo').value='Medico'; refreshRefs();
      $('#v_prod').value='FV'; $('#v_esito').value='Incontro svolto'; $('#v_refe').value='Stefano';
      $('#v_mat').value=''; $('#v_next').value=''; $('#v_follow').value=''; $('#v_fv').value=0; $('#v_fl').value=0; $('#v_tag').value=''; $('#v_note').value='';
      render(); showToast('Visita salvata');
    });

    render();
  }

  /* AGENDA */
  if(page==='agenda'){
    const refSel = $('#a_ref');
    function refreshRefs(){
      refSel.innerHTML='';
      medici.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=`Dr. ${m.cognome||''} ${m.nome||''}`; refSel.appendChild(o); });
      farmacie.forEach(f=>{ const o=document.createElement('option'); o.value=f.id; o.textContent=f.ragione; refSel.appendChild(o); });
    }
    refreshRefs();

    const render=()=>{
      const af=$('#a_from').value, at=$('#a_to').value;
      const items=appuntamenti.filter(a=>(!af || a.data>=af)&&(!at || a.data<=at))
        .slice().sort((a,b)=> (a.data+a.ora).localeCompare(b.data+b.ora));
      $('#cards_agenda').innerHTML = items.map(a=>`
        <div class="card">
          <div class="main">
            <div class="title">${a.data} ${a.ora||''} • ${a.tit}</div>
            <div class="meta">${a.tipo}${a.ref?(' • '+refLabel(a.ref)) : ''}</div>
          </div>
          <a class="btn" href="visite.html#new?from=${encodeURIComponent(a.id)}">→ Visita</a>
        </div>`).join('');
    };
    const rDeb=debounce(render, 120);
    $$('#a_from,#a_to').forEach(el=>el.addEventListener('input', rDeb));

    $('#btn_new_appt')?.addEventListener('click', ()=> openSheet('#sheet_appt'));

    $('#btn_save_appt')?.addEventListener('click', async (ev)=>{
      ev.preventDefault();
      const data=$('#a_data').value||tISO(), ora=$('#a_ora').value||'', tit=($('#a_tit').value||'Appuntamento').trim();
      if(!data||!tit) return alert('Data e Titolo obbligatori');
      appuntamenti.unshift({id:uid(), data, ora, tit, tipo:$('#a_tipo').value, ref:$('#a_ref').value||'', note:($('#a_note').value||'').trim()});
      await saveAll();
      closeSheet('#sheet_appt');
      // reset per nuovo
      $('#a_data').value=''; $('#a_ora').value=''; $('#a_tit').value=''; $('#a_tipo').value='Medico'; refreshRefs(); $('#a_note').value='';
      render(); showToast('Appuntamento salvato');
    });

    const hash = location.hash || '';
    if(hash.startsWith('#new?')){
      const p = new URLSearchParams(hash.substring(5));
      if(p.get('date')) $('#a_data').value = p.get('date');
      if(p.get('tipo')) $('#a_tipo').value = p.get('tipo');
      if(p.get('ref')) $('#a_ref').value = p.get('ref');
      openSheet('#sheet_appt');
    }
    render();
  }

  /* FOLLOW-UP */
  if(page==='followup'){
    const render=()=>{
      const st=$('#fu_state').value; const now=tISO(); const soon=tISO(new Date(Date.now()+3*86400000));
      const items=visite.filter(v=>v.follow).filter(v=> st==='all' || (st==='over'&&v.follow<now) || (st==='soon'&&v.follow>=now&&v.follow<=soon) || (st==='future'&&v.follow>soon));
      $('#cards_follow').innerHTML = items.map(v=>`
        <div class="card">
          <div class="main">
            <div class="title">${v.follow} • ${v.tipo}</div>
            <div class="meta">${refLabel(v.ref)||''} • next:${v.next||'-'}</div>
          </div>
          <a class="btn" href="agenda.html#new?date=${encodeURIComponent(v.follow)}&tipo=${encodeURIComponent(v.tipo)}&ref=${encodeURIComponent(v.ref||'')}">FU → Appt</a>
        </div>`).join('');
    };
    $('#fu_state').addEventListener('input', render);
    $('#btn_exp_ics')?.addEventListener('click', ()=>{
      const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Biotos CRM//FollowUp//IT'];
      visite.filter(v=>v.follow).forEach(v=>{
        const dt=v.follow.replace(/-/g,'')+'T090000';
        lines.push('BEGIN:VEVENT','UID:'+v.id+'@biotos','DTSTAMP:'+dt,'DTSTART:'+dt,'SUMMARY:Follow-up '+v.tipo+' - '+(refLabel(v.ref)||''),
        'DESCRIPTION: next '+(v.next||'-'),'END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar'})); a.download='followup_'+slug(CURRENT)+'.ics'; a.click();
    });
    render();
  }

  /* REPORT */
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
      $('#cards_rep').innerHTML = inMonth.map(v=>`<div class="card"><div class="main"><div class="title">${v.data} • ${v.tipo} ${v.prod||''}</div><div class="meta">${refLabel(v.ref)||''} • ${v.esito||''} • FV/FL:${v.fv||0}/${v.fl||0} • tag:${(v.tag||[]).join(',')}</div></div></div>`).join('');
    };
    const rDeb=debounce(render, 120);
    $$('#r_month,#r_refe').forEach(el=>el.addEventListener('input', rDeb));
    render();
  }

  /* SETTINGS */
  if(page==='settings'){
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
      const payload={exportedAt:new Date().toISOString(), version:'v'+APP_VERSION, profile:CURRENT, data:{medici,farmacie,visite,appuntamenti}};
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
      a.download='biotos_crm_'+slug(CURRENT)+'_backup.json'; a.click();
    });
    $('#inp_restore')?.addEventListener('change', e=>{
      const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=async()=>{ try{
        const j=safeParse(rd.result, null); if(!j) throw new Error('file');
        medici=j.data?.medici||[]; farmacie=j.data?.farmacie||[]; visite=j.data?.visite||[]; appuntamenti=j.data?.appuntamenti||[];
        await saveAll(); showToast('Backup importato');
      }catch(_){ alert('File non valido'); } }; rd.readAsText(f);
    });

    // Export/Import CSV
    $('#exp_med')?.addEventListener('click', ()=>{
      const csv = toCSV(medici, ['id','tit','nome','cognome','spec','strutt','comune','tel','email','tag','note']);
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='medici_'+slug(CURRENT)+'.csv'; a.click();
    });
    $('#exp_far')?.addEventListener('click', ()=>{
      const csv = toCSV(farmacie, ['id','ragione','dir','comune','tel','email','tag','addr','note']);
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='farmacie_'+slug(CURRENT)+'.csv'; a.click();
    });
    $('#exp_vis')?.addEventListener('click', ()=>{
      const csv = toCSV(visite, ['id','data','tipo','ref','prod','esito','refe','mat','next','follow','fv','fl','tag','note']);
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='visite_'+slug(CURRENT)+'.csv'; a.click();
    });
    $('#imp_med')?.addEventListener('change', async e=>{
      const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=async()=>{ const {rows}=fromCSV(rd.result);
        rows.forEach(r=>{ r.tag = (r.tag? r.tag.split(/[|,]/).map(s=>s.trim()).filter(Boolean):[]); });
        medici = rows.map(r=>Object.assign({id:r.id||uid()}, r));
        await saveAll(); showToast('Medici importati');
      }; rd.readAsText(f);
    });
    $('#imp_far')?.addEventListener('change', async e=>{
      const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=async()=>{ const {rows}=fromCSV(rd.result);
        rows.forEach(r=>{ r.tag = (r.tag? r.tag.split(/[|,]/).map(s=>s.trim()).filter(Boolean):[]); });
        farmacie = rows.map(r=>Object.assign({id:r.id||uid()}, r));
        await saveAll(); showToast('Farmacie importate');
      }; rd.readAsText(f);
    });
    $('#imp_vis')?.addEventListener('change', async e=>{
      const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=async()=>{ const {rows}=fromCSV(rd.result);
        rows.forEach(r=>{ r.fv=+r.fv||0; r.fl=+r.fl||0; r.tag = (r.tag? r.tag.split(/[|,]/).map(s=>s.trim()).filter(Boolean):[]); });
        visite = rows.map(r=>Object.assign({id:r.id||uid()}, r));
        await saveAll(); showToast('Visite importate');
      }; rd.readAsText(f);
    });
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.body.dataset.page || 'home';
  boot(page).catch(err=>{ console.error(err); showToast('⚠︎ Avvio fallito'); });
});
