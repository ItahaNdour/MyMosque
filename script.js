/* ====== RÔLES ====== */
const ADMIN_PASSWORD='1234';
const SUPER_ADMIN_PASSWORD='9999';
let SESSION_ROLE='guest';

/* ====== DONNÉES ====== */
const PRAYER_NAMES=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
const DISPLAY={Fajr:{local:'Souba',ar:'Fajr'},Dhuhr:{local:'Tisbar',ar:'Dhuhr'},Asr:{local:'Takusan',ar:'Asr'},Maghrib:{local:'Timis',ar:'Maghrib'},Isha:{local:'Guéwé',ar:'Isha'}};
const WEEKDAYS=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTHS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CITY_COORDS={'Medina':{lat:14.673,lon:-17.447},'Dakar':{lat:14.7167,lon:-17.4677},'Pikine':{lat:14.75,lon:-17.37},'Guédiawaye':{lat:14.7833,lon:-17.4167},'Rufisque':{lat:14.7236,lon:-17.2658},'Thiaroye':{lat:14.7431,lon:-17.3325},'Yoff':{lat:14.767,lon:-17.47},'Parcelles Assainies':{lat:14.7398,lon:-17.447},"M'bao":{lat:14.72,lon:-17.26}};
const DEFAULT_MOSQUES=[
  {id:'bene-tally',name:'Bene Tally',city:'Medina',wave:'772682103',orange:'772682103',contact:'Imam Diallo',phone:'+221772682103',jumua:'13:30',ann:'Bienvenue à Bene Tally.',events:[{title:'Cours de Fiqh',date:'Mardi après Isha'}],method:3,school:0,offsets:[0,0,0,0,0,0],adhanUrl:'',quiet:'22:00-05:00',allowFajr:true},
  {id:'medina-centre',name:'Medina Centre',city:'Dakar',wave:'770000000',orange:'780000000',contact:'Imam Ndiaye',phone:'+221780000000',jumua:'14:00',ann:'Annonce importante pour la Medina.',events:[{title:'Cercle de Coran',date:'Samedi après Fajr'}],method:3,school:0,offsets:[0,0,0,0,0,0],adhanUrl:'',quiet:'22:00-05:00',allowFajr:true}
];
const MOCK={Fajr:'05:45',Sunrise:'07:00',Dhuhr:'13:30',Asr:'16:45',Maghrib:'19:05',Isha:'20:30'};

/* ====== RAMADAN ====== */
const RAMADAN_START_DATE = '2026-02-18';
const RAMADAN_TOTAL_DAYS = 30;

const el=id=>document.getElementById(id);
const $mosqueSel=el('mosque-selector'), $notif=el('notif'), $status=el('status');
let timingsData=null,lastAlertShown='',playedFor='';

/* ====== STORAGE ====== */
function loadMosques(){let a=JSON.parse(localStorage.getItem('mosques')||'null'); if(!a||!a.length){a=DEFAULT_MOSQUES; localStorage.setItem('mosques',JSON.stringify(a)); localStorage.setItem('currentMosqueId',a[0].id);} return a;}
function saveMosques(a){localStorage.setItem('mosques',JSON.stringify(a));}
function getCurrentMosque(){const arr=loadMosques(); const id=localStorage.getItem('currentMosqueId')||arr[0].id; return arr.find(m=>m.id===id)||arr[0];}
function setCurrentMosque(id){localStorage.setItem('currentMosqueId',id);}
function todayKey(){const d=new Date();return`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
function ymKey(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}

/* ====== HORLOGE ====== */
function updateClock(){
  const n=new Date();
  el('current-time').textContent=[n.getHours(),n.getMinutes(),n.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');
  el('gregorian-date').textContent=`${WEEKDAYS[n.getDay()]} ${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()}`;
}
function fmt(ms){if(ms<0)return'00:00:00';const t=Math.floor(ms/1000),h=Math.floor(t/3600)%24,m=Math.floor(t%3600/60),s=t%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');}
function parseHM(s){const [h,m]=s.split(':').map(x=>parseInt(x,10));return{h:h||0,m:m||0};}

/* ====== UI ====== */
function populateMosqueSelector(){
  const arr=loadMosques(); $mosqueSel.innerHTML='';
  arr.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;$mosqueSel.appendChild(o);});
  $mosqueSel.value=getCurrentMosque().id; $mosqueSel.disabled=true; // seul Super Admin peut changer
}
function populateCitySelect(sel){
  sel.innerHTML='';
  Object.keys(CITY_COORDS).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
}
function showStatus(msg,bg){$status.textContent=msg;$status.style.background=bg||'#2f7d6d';$status.style.display='block';setTimeout(()=>{$status.style.display='none'},3000);}

/* ====== EVENTS ====== */
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderEvents(){
  const m=getCurrentMosque();
  const box=el('events-list');
  const events=Array.isArray(m.events)?m.events:[];
  if(!events.length){box.textContent='—'; return;}
  const wrap=document.createElement('div');
  wrap.style.display='grid';
  wrap.style.gap='8px';
  events.forEach(ev=>{
    const item=document.createElement('div');
    item.style.border='1px solid #eef2f7';
    item.style.borderRadius='12px';
    item.style.padding='10px 12px';
    item.innerHTML=`<div style="font-weight:800;color:#1f5e53">${escapeHtml(ev.title||'')}</div>
                    <div class="small">${escapeHtml(ev.date||'')}</div>`;
    wrap.appendChild(item);
  });
  box.innerHTML='';
  box.appendChild(wrap);
}

/* ====== RAMADAN RENDER ====== */
function renderRamadan(){
  const card=el('ramadan-card');
  if(!card) return;

  const start=new Date(`${RAMADAN_START_DATE}T00:00:00`);
  const now=new Date();
  const msDay=24*60*60*1000;
  const dayIndex=Math.floor((now-start)/msDay)+1;

  if(dayIndex<1 || dayIndex>RAMADAN_TOTAL_DAYS){
    card.style.display='none';
    return;
  }

  const left=RAMADAN_TOTAL_DAYS-dayIndex;
  el('ramadan-sub').textContent=`Début: ${RAMADAN_START_DATE} • Aujourd’hui: ${now.toISOString().slice(0,10)}`;
  el('ramadan-day').textContent=`Jour ${dayIndex}/${RAMADAN_TOTAL_DAYS}`;
  el('ramadan-left').textContent=left===0?'Dernier jour':`${left} jour(s) restant(s)`;

  el('ramadan-iftar').textContent=(timingsData && timingsData.Maghrib)?timingsData.Maghrib:'--:--';
  el('ramadan-suhoor').textContent=(timingsData && timingsData.Fajr)?timingsData.Fajr:'--:--';

  card.style.display='block';
}

/* ====== AFFICHAGE ====== */
function displayAll(data){
  timingsData=data.timings||MOCK; const m=getCurrentMosque();
  el('mosque-name').textContent=m.name; el('wave-number').textContent=m.wave||'—'; el('orange-number').textContent=m.orange||'—';
  el('about-contact-name').textContent=m.contact||'—'; el('about-contact-phone').textContent=m.phone||'—';
  PRAYER_NAMES.forEach(k=>{el(k.toLowerCase()+'-name').textContent=`${DISPLAY[k].local} (${DISPLAY[k].ar})`; el(k.toLowerCase()+'-time').textContent=timingsData[k]||'--:--';});
  el('shuruq-time').textContent=timingsData.Sunrise||'--:--'; el('jumua-time').textContent=m.jumua||'13:30';
  if(data.date&&data.date.hijri){el('hijri-date').textContent=`${data.date.hijri.day} ${data.date.hijri.month.ar} ${data.date.hijri.year} AH`;}
  else el('hijri-date').textContent='Date hégirienne indisponible';

  // annonces badge (par jour et mosquée)
  const ann=(m.ann||'').trim(); el('announcement-text').textContent=ann||'Aucune annonce.';
  const seenKey=`annSeen_${m.id}_${todayKey()}`; $notif.style.display=(ann && !localStorage.getItem(seenKey))?'inline-block':'none';

  updateNextCountdown(); updateQiblaLink(); renderDonation(); renderDonTable(); renderEvents(); renderRamadan();
}

/* ====== COUNTDOWN + AUDIO ====== */
function buildTuneParam(offsets){const a=(offsets&&offsets.length===6)?offsets:[0,0,0,0,0,0];return a.join(',');}
function playBeep(duration=600,freq=880){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator();const g=ctx.createGain();o.type='sine';o.frequency.value=freq;o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(0.001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.02);o.start();setTimeout(()=>{g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.05);o.stop();ctx.close();},duration);}catch(e){}}
function isQuietNow(){
  const m=getCurrentMosque(); const q=(m.quiet||'22:00-05:00').split('-'); if(q.length!==2) return false;
  const s=parseHM(q[0]), e=parseHM(q[1]); const now=new Date(); const n=now.getHours()*60+now.getMinutes();
  const start=s.h*60+s.m, end=e.h*60+e.m; const inRange = start<=end ? (n>=start && n<end) : (n>=start || n<end);
  const txt=(el('next-prayer-name').textContent||'').toLowerCase(); const isFajr=txt.includes('fajr')||txt.includes('souba');
  return inRange && !(m.allowFajr && isFajr);
}
function playChime(){ if(isQuietNow()) return; playBeep(700,740); navigator.vibrate&&navigator.vibrate(200);}
function playAdhan(){ const m=getCurrentMosque(); if(isQuietNow()) return;
  if(m.adhanUrl){const a=new Audio(m.adhanUrl); a.play().catch(()=>playBeep(1200,660));} else { playBeep(1200,660); }
}
function updateNextCountdown(){
  if(!timingsData){el('next-prayer-name').textContent='—'; el('countdown').textContent='--:--:--'; return;}
  const now=new Date(); document.querySelectorAll('.list .row').forEach(r=>r.classList.remove('current'));
  const p={}; PRAYER_NAMES.forEach(k=>{const t=(timingsData[k]||'').split(':'); if(t.length>=2){const d=new Date(); d.setHours(+t[0],+t[1],0,0); p[k]=d;}});
  const m=getCurrentMosque(); if(now.getDay()===5 && m.jumua){const {h, m:jm}=parseHM(m.jumua||'13:30'); const d=new Date(); d.setHours(h,jm,0,0); p.Dhuhr=d;}
  let name='',time=null; for(const k of PRAYER_NAMES){const d=p[k]; if(d && now<d){name=k; time=d; break;}} if(!name){name='Fajr'; const t=(timingsData.Fajr||'05:45').split(':').map(Number); time=new Date(); time.setDate(time.getDate()+1); time.setHours(t[0]||5,t[1]||45,0,0);}
  el('next-prayer-name').textContent=`${DISPLAY[name].local.toUpperCase()} (${DISPLAY[name].ar})`; el('countdown').textContent=fmt(time-now); el(name.toLowerCase()+'-item').classList.add('current');
  const delta=time-now, five=5*60*1000;
  if(delta>0 && delta<=five && lastAlertShown!==name){ playChime(); lastAlertShown=name; showStatus(`Dans 5 min : ${DISPLAY[name].local}.`,'#1f5e53');}
  if(delta<=900 && playedFor!==name){ playAdhan(); playedFor=name; }
  if(delta>1500 && name===playedFor){ playedFor=''; }
}

/* ====== API Aladhan ====== */
function mockData(){return{timings:MOCK,date:{hijri:{day:'3',month:{ar:"Rabi' al-Awwal"},year:'1447'}}};}
async function fetchTimings(){
  const m=getCurrentMosque(); const base=CITY_COORDS[m.city]||CITY_COORDS['Medina'];
  const lat=base.lat, lon=base.lon;
  const method=(m.method!=null)?m.method:3, school=(m.school!=null)?m.school:0, tune=buildTuneParam(m.offsets||[0,0,0,0,0,0]);
  const url=`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}&tune=${tune}`;
  let loaded=false; const key=`cache_${m.id}_${new Date().toDateString()}`; const cached=localStorage.getItem(key);
  if(cached){displayAll(JSON.parse(cached)); loaded=true;}
  try{const r=await fetch(url); const j=await r.json(); if(j&&j.data){localStorage.setItem(key,JSON.stringify(j.data)); displayAll(j.data); loaded=true;} else throw 0;}
  catch(e){showStatus(loaded?'Hors-ligne – cache.':'Données par défaut affichées.', loaded?'#ca8a04':'#e11d48'); if(!loaded) displayAll(mockData());}
}

/* ====== QIBLA MAPS (ville) ====== */
function updateQiblaLink(){
  const m=getCurrentMosque(); const base=CITY_COORDS[m.city]||CITY_COORDS['Medina'];
  const origin=`${base.lat},${base.lon}`; const kaaba=`21.4225,39.8262`;
  el('qibla-maps').onclick=()=>{window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${kaaba}`,'_blank');};
}

/* ====== PARTAGE ====== */
function shareNow(){
  const m=getCurrentMosque();
  const text=`🕌 ${m.name}
${el('gregorian-date').textContent}

Souba (Fajr) : ${el('fajr-time').textContent}
Tisbar (Dhuhr) : ${el('dhuhr-time').textContent}
Takusan (Asr) : ${el('asr-time').textContent}
Timis (Maghrib) : ${el('maghrib-time').textContent}
Guéwé (Isha) : ${el('isha-time').textContent}`;
  const payload=location.protocol==='file:'?text:`${text}\n${location.href}`;
  if(navigator.share){navigator.share({title:`Horaires ${m.name}`,text:payload}).catch(()=>{location.href=`https://wa.me/?text=${encodeURIComponent(payload)}`;});}
  else{location.href=`https://wa.me/?text=${encodeURIComponent(payload)}`;}
}
el('share-btn').onclick=shareNow;

/* ====== WHATSAPP DONS ====== */
function openWhatsApp(to,msg){const url=`https://wa.me/${encodeURIComponent(to)}?text=${encodeURIComponent(msg)}`; window.open(url,'_blank');}
function setupDonButtons(){
  el('btn-wave').onclick=()=>{const m=getCurrentMosque(); const txt=`Salam, je souhaite faire un don via *Wave Money*.
Montant : [à renseigner] CFA
Numéro Wave : ${m.wave}
Mosquée : ${m.name}
BarakAllahou fik.`; openWhatsApp(m.phone||'',txt);};
  el('btn-orange').onclick=()=>{const m=getCurrentMosque(); const txt=`Salam, je souhaite faire un don via *Orange Money*.
Montant : [à renseigner] CFA
Numéro Orange : ${m.orange}
Mosquée : ${m.name}
BarakAllahou fik.`; openWhatsApp(m.phone||'',txt);};
  el('btn-claimed').onclick=()=>{const m=getCurrentMosque(); const txt=`Salam, *j’ai donné* [montant] CFA via [Wave/Orange].
Référence : [collez le reçu]
Mosquée : ${m.name}`; openWhatsApp(m.phone||'',txt);};
}

/* ====== DONNÉES DONS ====== */
function kGoal(m){return `dong_${m.id}`;}
function getGoal(m){const g=localStorage.getItem(kGoal(m)); return g?parseInt(g,10):100000;}
function setGoal(m,val){localStorage.setItem(kGoal(m), String(Math.max(0,parseInt(val,10)||0)));}
function keyDay(){const d=new Date();return d.toISOString().slice(0,10);}
function kList(m){return `donlist_${m.id}_${keyDay()}`;}
function kMonthSum(m){return `donm_${m.id}_${ymKey()}`;}
function loadList(m){return JSON.parse(localStorage.getItem(kList(m))||'[]');}
function saveList(m,list){localStorage.setItem(kList(m), JSON.stringify(list));}
function monthSum(m){return parseInt(localStorage.getItem(kMonthSum(m))||'0',10);}
function setMonthSum(m,v){localStorage.setItem(kMonthSum(m), String(Math.max(0,parseInt(v,10)||0)));}

function confirmedSumToday(){const m=getCurrentMosque(); return loadList(m).filter(x=>x.status==='ok').reduce((s,x)=>s+x.amount,0);}
function renderDonation(){
  const m=getCurrentMosque(); const goal=getGoal(m), day=confirmedSumToday(), month=monthSum(m);
  el('don-goal').textContent=goal.toLocaleString('fr-FR');
  el('don-today').textContent=day.toLocaleString('fr-FR');
  el('don-month').textContent=month.toLocaleString('fr-FR');
  const left=Math.max(0,goal-day); el('don-left').textContent=left.toLocaleString('fr-FR');
  const p=goal?Math.min(100,Math.round(day*100/goal)):0; el('don-bar').style.width=p+'%';
}
function renderDonTable(){
  const m=getCurrentMosque(); const tb=document.querySelector('#don-table tbody'); tb.innerHTML='';
  loadList(m).forEach(r=>{
    const tr=document.createElement('tr');
    const st=r.status==='ok'?'<span class="badge b-ok">Confirmé</span>':(r.status==='no'?'<span class="badge b-no">Annulé</span>':'<span class="badge b-p">En attente</span>');
    tr.innerHTML=`<td>${new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</td>
      <td><strong>${r.amount.toLocaleString('fr-FR')}</strong></td>
      <td>${r.method}</td>
      <td>${r.ref||''}</td>
      <td>${st}</td>
      <td style="white-space:nowrap">
        <button data-act="ok" data-id="${r.id}" class="btn btn-primary" style="padding:6px 10px">OK</button>
        <button data-act="no" data-id="${r.id}" class="btn" style="padding:6px 10px; background:#ef4444; color:#fff">X</button>
      </td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('button[data-act]').forEach(b=>b.onclick=()=>setEntryStatus(b.dataset.id,b.dataset.act));
}
function addDonationEntry({amount,method,ref}){
  const m=getCurrentMosque(); const list=loadList(m);
  const id=Date.now().toString(36); const row={id,ts:new Date().toISOString(),amount:+amount||0,method:method||'Wave',ref:ref||'',status:'pending'};
  list.unshift(row); saveList(m,list); renderDonTable(); renderDonation();
}
function setEntryStatus(id,newStatus){
  const m=getCurrentMosque(); const list=loadList(m); const i=list.findIndex(x=>x.id===id); if(i<0) return;
  const wasOk=list[i].status==='ok'; list[i].status=newStatus; saveList(m,list);
  if(newStatus==='ok'&&!wasOk){setMonthSum(m, monthSum(m)+list[i].amount);}
  if(wasOk&&newStatus!=='ok'){setMonthSum(m, monthSum(m)-list[i].amount);}
  renderDonTable(); renderDonation();
}
el('don-add').onclick=()=>{const amt=parseInt(el('don-amt').value,10)||0; if(amt<=0) return alert('Montant invalide');
  addDonationEntry({amount:amt,method:el('don-method').value,ref:el('don-ref').value}); el('don-amt').value=''; el('don-ref').value='';};

/* ====== MODALS / NOMS / ANNONCES ====== */
function openModal(id){el(id).style.display='block';}
function closeAll(){document.querySelectorAll('.modal').forEach(m=>m.style.display='none');}
document.querySelectorAll('.modal .close').forEach(x=>x.addEventListener('click',closeAll));
window.addEventListener('click',e=>{if(e.target.classList.contains('modal')) closeAll();});

document.getElementById('events-btn').onclick=()=>{renderEvents(); openModal('modal-events');};
document.getElementById('announce-btn').onclick=()=>{openModal('modal-ann'); const m=getCurrentMosque(); localStorage.setItem(`annSeen_${m.id}_${todayKey()}`,'1'); $notif.style.display='none';};
document.getElementById('about-btn').onclick=()=>openModal('modal-about');
document.getElementById('names-btn').onclick=()=>{
  const ul=el('names-list'); ul.innerHTML='';
  const ALLAH_NAMES=[{"en":"Ar-Rahman","fr":"Le Tout Miséricordieux","ar":"ٱلرَّحْمَٰنُ"},{"en":"Ar-Rahim","fr":"Le Très Miséricordieux","ar":"ٱلرَّحِيمُ"},{"en":"Al-Malik","fr":"Le Souverain","ar":"ٱلْمَلِكُ"},{"en":"Al-Quddus","fr":"Le Saint","ar":"ٱلْقُدُّوسُ"},{"en":"As-Salam","fr":"La Paix","ar":"ٱلسَّلَامُ"},{"en":"Al-Mu'min","fr":"Le Fidèle","ar":"ٱلْمُؤْمِنُ"},{"en":"Al-Muhaymin","fr":"Le Protecteur","ar":"ٱلْمُهَيْمِنُ"},{"en":"Al-Aziz","fr":"Le Tout Puissant","ar":"ٱلْعَزِيزُ"},{"en":"Al-Jabbar","fr":"Le Contraignant","ar":"ٱلْجَبَّارُ"},{"en":"Al-Mutakabbir","fr":"L'Immense","ar":"ٱلْمُتَكَبِّرُ"},{"en":"Al-Khaliq","fr":"Le Créateur","ar":"ٱلْخَالِقُ"},{"en":"Al-Bari'","fr":"Le Producteur","ar":"ٱلْبَارِئُ"},{"en":"Al-Musawwir","fr":"Le Formateur","ar":"ٱلْمُصَوِّرُ"},{"en":"Al-Ghaffar","fr":"Le Grand Pardonneur","ar":"ٱلْغَفَّارُ"},{"en":"Al-Qahhar","fr":"Le Dominateur","ar":"ٱلْقَهَّارُ"},{"en":"Al-Wahhab","fr":"Le Donateur","ar":"ٱلْوَهَّابُ"},{"en":"Ar-Razzaq","fr":"Le Pourvoyeur","ar":"ٱلرَّزَّاقُ"},{"en":"Al-Fattah","fr":"Le Grand Juge","ar":"ٱلْفَتَّاحُ"},{"en":"Al-Alim","fr":"L'Omniscient","ar":"ٱلْعَلِيمُ"},{"en":"Al-Qabid","fr":"Celui qui retient","ar":"ٱلْقَابِضُ"},{"en":"Al-Basit","fr":"Celui qui étend","ar":"ٱلْبَASِطُ"},{"en":"Al-Khafid","fr":"Celui qui abaisse","ar":"ٱلْخَافِضُ"},{"en":"Ar-Rafi'","fr":"Celui qui élève","ar":"ٱلرَّافِعُ"},{"en":"Al-Mu'izz","fr":"Celui qui donne la puissance","ar":"ٱلْمُعِزُّ"},{"en":"Al-Muzill","fr":"Celui qui humilie","ar":"ٱلْمُذِلُّ"},{"en":"As-Sami'","fr":"L'Audient","ar":"ٱلسَّمِيعُ"},{"en":"Al-Basir","fr":"Le Clairvoyant","ar":"ٱلْبَصِيرُ"},{"en":"Al-Hakam","fr":"Le Juge","ar":"ٱلْحَكَمُ"},{"en":"Al-Adl","fr":"Le Juste","ar":"ٱلْعَدْلُ"},{"en":"Al-Latif","fr":"Le Subtil","ar":"ٱللَّطِيفُ"},{"en":"Al-Khabir","fr":"Le Bien Informé","ar":"ٱلْخَبِيرُ"},{"en":"Al-Halim","fr":"Le Clément","ar":"ٱلْحَلِيمُ"},{"en":"Al-Azim","fr":"L'Immense","ar":"ٱلْعَظِيمُ"},{"en":"Al-Ghafur","fr":"Le Pardonneur","ar":"ٱلْغَفُورُ"},{"en":"Ash-Shakur","fr":"Le Reconnaissant","ar":"ٱلشَّكُورُ"},{"en":"Al-Ali","fr":"Le Très Haut","ar":"ٱلْعَلِيُّ"},{"en":"Al-Kabir","fr":"Le Grand","ar":"ٱلْكَبِيرُ"},{"en":"Al-Hafiz","fr":"Le Préservateur","ar":"ٱلْحَفِيظُ"},{"en":"Al-Muqit","fr":"Le Nourricier","ar":"ٱلْمُقِيتُ"},{"en":"Al-Hasib","fr":"Celui qui règle les comptes","ar":"ٱلْحَسِيبُ"},{"en":"Al-Jalil","fr":"Le Majestueux","ar":"ٱلْجَلِيلُ"},{"en":"Al-Karim","fr":"Le Généreux","ar":"ٱلْكَرِيمُ"},{"en":"Ar-Raqib","fr":"L'Observateur","ar":"ٱلرَّقِيبُ"},{"en":"Al-Mujib","fr":"Celui qui exauce","ar":"ٱلْمُجِيبُ"},{"en":"Al-Wasi'","fr":"Le Vaste","ar":"ٱلْوَاسِعُ"},{"en":"Al-Hakim","fr":"Le Sage","ar":"ٱلْحَكِيمُ"},{"en":"Al-Wadud","fr":"Le Bien Aimé","ar":"ٱلْوَدُودُ"},{"en":"Al-Majid","fr":"Le Glorieux","ar":"ٱلْمَجِيدُ"},{"en":"Al-Ba'ith","fr":"Le Ressusciteur","ar":"ٱلْبَاعِثُ"},{"en":"Ash-Shahid","fr":"Le Témoin","ar":"ٱلشَّهِيدُ"},{"en":"Al-Haqq","fr":"La Vérité","ar":"ٱلْحَقُّ"},{"en":"Al-Wakil","fr":"Le Gérant","ar":"ٱلْوَكِيلُ"},{"en":"Al-Qawi","fr":"Le Fort","ar":"ٱلْقَوِيُّ"},{"en":"Al-Matin","fr":"L'Inébranlable","ar":"ٱلْمَتِينُ"},{"en":"Al-Wali","fr":"Le Protecteur","ar":"ٱلْوَلِيُّ"},{"en":"Al-Hamid","fr":"Le Loué","ar":"ٱلْحَمِيدُ"},{"en":"Al-Muhsi","fr":"Celui qui tient compte de tout","ar":"ٱلْمُحْصِي"},{"en":"Al-Mubdi'","fr":"L'Auteur","ar":"ٱلْمُبْدِئُ"},{"en":"Al-Mu'id","fr":"Celui qui ramène","ar":"ٱلْمُعِيدُ"},{"en":"Al-Muhyi","fr":"Celui qui donne la vie","ar":"ٱلْمُحْيِۦ"},{"en":"Al-Mumit","fr":"Celui qui donne la mort","ar":"ٱلْمُمِيتُ"},{"en":"Al-Hayy","fr":"Le Vivant","ar":"ٱلْحَىُّ"},{"en":"Al-Qayyum","fr":"L'Eternel","ar":"ٱلْقَيُّومُ"},{"en":"Al-Wajid","fr":"Celui qui trouve tout","ar":"ٱلْوَاجِدُ"},{"en":"Al-Majid","fr":"Le Noble","ar":"ٱلْمَاجِدُ"},{"en":"Al-Wahid","fr":"L'Unique","ar":"ٱلْوَاحِدُ"},{"en":"Al-Ahad","fr":"Le Seul","ar":"ٱلْأَحَدُ"},{"en":"As-Samad","fr":"L'Absolu","ar":"ٱلصَّمَدُ"},{"en":"Al-Qadir","fr":"Le Capable","ar":"ٱلْقَادِرُ"},{"en":"Al-Muqtadir","fr":"Le Tout Puissant","ar":"ٱلْمُقْتَدِرُ"},{"en":"Al-Muqaddim","fr":"Celui qui avance","ar":"ٱلْمُقَدِّمُ"},{"en":"Al-Mu'akhkhir","fr":"Celui qui recule","ar":"ٱلْمُؤَخِّرُ"},{"en":"Al-Awwal","fr":"Le Premier","ar":"ٱلْأَوَّلُ"},{"en":"Al-Akhir","fr":"Le Dernier","ar":"ٱلْآخِرُ"},{"en":"Az-Zahir","fr":"L'Apparent","ar":"ٱلظَّاهِرُ"},{"en":"Al-Batin","fr":"Le Caché","ar":"ٱلْبَاطِنُ"},{"en":"Al-Wali","fr":"Le Maître","ar":"ٱلْوَالِي"},{"en":"Al-Muta'ali","fr":"Le Sublime","ar":"ٱلْمُتَعَالِي"},{"en":"Al-Barr","fr":"Le Bienfaisant","ar":"ٱلْبَرُّ"},{"en":"At-Tawwab","fr":"L'Accueillant au Repentir","ar":"ٱلتَّوَّابُ"},{"en":"Al-Muntaqim","fr":"Le Vengeur","ar":"ٱلْمُنْتَقِمُ"},{"en":"Al-'Afuww","fr":"Le Pardonneur","ar":"ٱلْعَفُوُّ"},{"en":"Ar-Ra'uf","fr":"Le Plein de Compassion","ar":"ٱلرَّءُوفُ"},{"en":"Malik-ul-Mulk","fr":"Le Possesseur du Royaume","ar":"مَٰلِكُ ٱلْمُلْكِ"},{"en":"Dhul-Jalal wal-Ikram","fr":"Le Détenteur de la Majesté et de la Générosité","ar":"ذُو ٱلْجَلَٰلِ وَٱلْإِكْرَامِ"},{"en":"Al-Muqsit","fr":"L'Équitable","ar":"ٱلْمُقْسِطُ"},{"en":"Al-Jami'","fr":"Le Rassembleur","ar":"ٱلْجَامِعُ"},{"en":"Al-Ghani","fr":"Le Riche","ar":"ٱلْغَنِيُّ"},{"en":"Al-Mughni","fr":"Celui qui enrichit","ar":"ٱلْمُغْنِي"},{"en":"Al-Mani'","fr":"Celui qui empêche","ar":"ٱلْمَانِعُ"},{"en":"Ad-Darr","fr":"Celui qui nuit","ar":"ٱلضَّارُّ"},{"en":"An-Nafi'","fr":"Celui qui est bénéfique","ar":"ٱلنَّافِعُ"},{"en":"An-Nur","fr":"La Lumière","ar":"ٱلنُّورُ"},{"en":"Al-Hadi","fr":"Le Guide","ar":"ٱلْهَادِي"},{"en":"Al-Badi'","fr":"L'Inventeur","ar":"ٱلْبَدِيعُ"},{"en":"Al-Baqi","fr":"Le Permanent","ar":"ٱلْبَاقِي"},{"en":"Al-Warith","fr":"L'Héritier","ar":"ٱلْوَارِثُ"},{"en":"Ar-Rashid","fr":"Le Bien Guidé","ar":"ٱلرَّشِيدُ"},{"en":"As-Sabur","fr":"Le Patient","ar":"ٱلصَّبُورُ"}];
  ALLAH_NAMES.forEach((n,i)=>{const li=document.createElement('li'); li.innerHTML=`<span>${i+1}. ${n.fr} (${n.en})</span><span style="font-weight:700">${n.ar}</span>`; ul.appendChild(li);});
  document.getElementById('names-header').textContent=`Les 99 Noms d'Allah (${ALLAH_NAMES.length})`;
  openModal('modal-names');
};

/* ====== ADMIN ====== */
document.getElementById('admin-button').onclick=()=>{
  const pw=prompt('Code d’accès :');
  if(pw===SUPER_ADMIN_PASSWORD) SESSION_ROLE='super';
  else if(pw===ADMIN_PASSWORD) SESSION_ROLE='admin';
  else return alert('Code incorrect.');

  const isSuper=SESSION_ROLE==='super';
  document.getElementById('super-row').style.display=isSuper?'flex':'none';
  document.getElementById('advanced-block').style.display=isSuper?'block':'none';
  document.getElementById('role-hint').textContent=isSuper?'Mode SUPER ADMIN':'Mode ADMIN (mosquée verrouillée)';
  $mosqueSel.disabled=!isSuper;
  el('don-admin').style.display='block'; // suivi visible pour admin/super

  populateCitySelect(el('adm-city'));
  const arr=loadMosques(); const cur=getCurrentMosque();
  const sel=el('adm-mosque'); if(isSuper){sel.innerHTML=''; arr.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;sel.appendChild(o);}); sel.value=cur.id;}
  fillAdminForm(cur.id); openModal('modal-admin');
};
function fillAdminForm(id){
  const m=loadMosques().find(x=>x.id===id); if(!m) return;
  el('adm-name').value=m.name||''; el('adm-city').value=m.city||'Medina';
  el('adm-wave').value=m.wave||''; el('adm-orange').value=m.orange||'';
  el('adm-contact').value=m.contact||''; el('adm-phone').value=m.phone||'';
  el('adm-jumua').value=m.jumua||'13:30'; el('adm-ann').value=m.ann||'';
  el('adm-events').value=(m.events||[]).map(e=>`${e.title} | ${e.date}`).join('\n');
  el('adm-method').value=(m.method!=null)?m.method:3; el('adm-school').value=(m.school!=null)?m.school:0;
  el('adm-offsets').value=(m.offsets&&m.offsets.length===6?m.offsets:[0,0,0,0,0,0]).join(',');
  el('adm-adhan-url').value=m.adhanUrl||''; el('adm-quiet').value=m.quiet||'22:00-05:00'; el('adm-allow-fajr').checked=!!m.allowFajr;
  el('adm-goal').value=getGoal(m);
  el('adm-solde-wave').value=localStorage.getItem(`solde_wave_${m.id}_${todayKey()}`)||'';
  el('adm-solde-orange').value=localStorage.getItem(`solde_orange_${m.id}_${todayKey()}`)||'';
}
document.getElementById('add-mosque').onclick=()=>{ if(SESSION_ROLE!=='super') return;
  const name=prompt('Nom de la nouvelle mosquée :'); if(!name) return;
  const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+Date.now().toString(36);
  const arr=loadMosques(); arr.push({id,name,city:'Medina',wave:'',orange:'',contact:'',phone:'',jumua:'13:30',ann:'',events:[],method:3,school:0,offsets:[0,0,0,0,0,0],adhanUrl:'',quiet:'22:00-05:00',allowFajr:true});
  saveMosques(arr); setCurrentMosque(id); populateMosqueSelector(); fillAdminForm(id);
  const sel=el('adm-mosque'); sel.innerHTML=''; arr.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;sel.appendChild(o);}); sel.value=id;
};
document.getElementById('del-mosque').onclick=()=>{ if(SESSION_ROLE!=='super') return;
  const arr=loadMosques(); if(arr.length<=1) return alert('Il doit rester au moins une mosquée.');
  const sel=el('adm-mosque'); const id=sel.value; if(!confirm('Supprimer cette mosquée ?')) return;
  const next=arr.filter(m=>m.id!==id); saveMosques(next); setCurrentMosque(next[0].id); populateMosqueSelector(); fillAdminForm(next[0].id);
  sel.innerHTML=''; next.forEach(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=m.name;sel.appendChild(o);}); sel.value=next[0].id; fetchTimings();
};
document.getElementById('save').onclick=()=>{
  const isSuper=SESSION_ROLE==='super'; const arr=loadMosques(); const cur=getCurrentMosque();
  const id=isSuper ? (document.getElementById('adm-mosque').value||cur.id) : cur.id;
  const mIdx=arr.findIndex(x=>x.id===id); if(mIdx<0)return;

  let offsets=el('adm-offsets').value.split(',').map(v=>parseInt(v.trim(),10)); if(offsets.length!==6||offsets.some(isNaN)) offsets=[0,0,0,0,0,0];

  arr[mIdx]={...arr[mIdx],
    name:el('adm-name').value.trim()||'Mosquée',
    city:el('adm-city').value,
    wave:el('adm-wave').value.trim(),
    orange:el('adm-orange').value.trim(),
    contact:el('adm-contact').value.trim(),
    phone:el('adm-phone').value.trim(),
    jumua:el('adm-jumua').value||'13:30',
    ann:el('adm-ann').value,
    events:el('adm-events').value.split('\n').filter(l=>l.trim()!=='').map(l=>{const [t,...r]=l.split('|');return{title:(t||'').trim(),date:(r.join('|')||'').trim()};}),
    method:parseInt(el('adm-method').value,10),
    school:parseInt(el('adm-school').value,10),
    offsets,
    adhanUrl:el('adm-adhan-url').value.trim(),
    quiet:el('adm-quiet').value.trim()||'22:00-05:00',
    allowFajr:el('adm-allow-fajr').checked
  };
  saveMosques(arr); setCurrentMosque(id);

  setGoal(getCurrentMosque(), el('adm-goal').value);
  localStorage.setItem(`solde_wave_${id}_${todayKey()}`, el('adm-solde-wave').value||'');
  localStorage.setItem(`solde_orange_${id}_${todayKey()}`, el('adm-solde-orange').value||'');

  displayAll({timings:timingsData||MOCK,date:{}}); fetchTimings(); closeAll(); showStatus('Données enregistrées.');
};

/* ====== INIT ====== */
function setup(){
  populateMosqueSelector(); updateClock(); setInterval(updateClock,1000);
  fetchTimings(); setInterval(updateNextCountdown,1000);
  updateQiblaLink(); setupDonButtons();

  // annonces badge disparaît après lecture
  const m=getCurrentMosque(); const seenKey=`annSeen_${m.id}_${todayKey()}`;
  const ann=(m.ann||'').trim(); $notif.style.display=(ann && !localStorage.getItem(seenKey))?'inline-block':'none';

  renderEvents();
  renderRamadan();
}
document.addEventListener('DOMContentLoaded', setup);
