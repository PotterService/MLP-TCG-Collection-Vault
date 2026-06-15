let cards = [];
let view = "home";
const saveKey = "mlp_kayou_from_xlsx_v10_year_home";
const $ = id => document.getElementById(id);
const fields = ["cardName","cardNumber","setName","sheetName","year","rarity","image","chineseQty","englishQty","quantity","duplicateCount","notes"];
const checks = ["owned","wishlist"];

function clean(v){return (v??"").toString().trim();}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function isOwned(c){return c.owned === true || Number(c.quantity)>0 || Number(c.chineseQty)>0 || Number(c.englishQty)>0;}
function dupes(c){return Number(c.duplicateCount)>0 || Number(c.quantity)>1;}
function getImg(c){return clean(c.image);}
function searchUrl(c){return c.imageSearch || ("https://www.google.com/search?tbm=isch&q="+encodeURIComponent(`Kayou My Little Pony card ${c.cardNumber} ${c.cardName}`));}
function yearOf(c){return clean(c.year) || ((clean(c.releaseDate).match(/(20\d{2}|19\d{2})/)||[])[1] || "");}
function setYear(s){return clean(s.year) || ((clean(s.releaseDate).match(/(20\d{2}|19\d{2})/)||[])[1] || "");}

function load(){
  try{
    const saved = localStorage.getItem(saveKey);
    cards = saved ? JSON.parse(saved).cards : INITIAL_CARDS;
  }catch(e){ cards = INITIAL_CARDS; }
  cards.forEach(c=>{ if(!c.year) c.year=yearOf(c); });
  fillFilters();
  render();
}
function save(){ localStorage.setItem(saveKey, JSON.stringify({cards}, null, 2)); }

function fillFilters(){
  const setVal = setFilter.value;
  const rarityVal = rarityFilter.value;
  const yearVal = yearFilter.value;
  const sets = [...new Map(cards.map(c=>[c.setId, c])).values()].sort((a,b)=>yearOf(a).localeCompare(yearOf(b)) || a.setName.localeCompare(b.setName));
  setFilter.innerHTML = '<option value="">All Sets</option>' + sets.map(c=>`<option value="${esc(c.setId)}">${esc(c.setName)}${yearOf(c)?' • '+esc(yearOf(c)):''}</option>`).join("");
  setFilter.value = setVal;
  const rarities = [...new Set(cards.map(c=>clean(c.rarity)).filter(Boolean))].sort();
  rarityFilter.innerHTML = '<option value="">All Rarities</option>' + rarities.map(r=>`<option>${esc(r)}</option>`).join("");
  rarityFilter.value = rarityVal;
  const years = [...new Set(cards.map(yearOf).filter(Boolean))].sort();
  yearFilter.innerHTML = '<option value="">All Years</option>' + years.map(y=>`<option>${esc(y)}</option>`).join("");
  yearFilter.value = yearVal;
}

function getFiltered(baseCards=cards){
  const term = clean(searchInput.value).toLowerCase();
  const set = setFilter.value;
  const rarity = rarityFilter.value;
  const year = yearFilter.value;
  return baseCards.filter(c=>{
    const hay=[c.cardName,c.cardNumber,c.setName,c.sheetName,c.rarity,c.notes,yearOf(c),c.releaseDate].map(clean).join(" ").toLowerCase();
    if(term && !hay.includes(term)) return false;
    if(set && c.setId !== set) return false;
    if(rarity && c.rarity !== rarity) return false;
    if(year && yearOf(c) !== year) return false;
    if(view==="owned" && !isOwned(c)) return false;
    if(view==="missing" && isOwned(c)) return false;
    if(view==="dupes" && !dupes(c)) return false;
    if(view==="wishlist" && !c.wishlist) return false;
    return true;
  });
}

function updateStats(list){
  const total=list.length;
  const owned=list.filter(isOwned).length;
  const missing=total-owned;
  const dup=list.reduce((a,c)=>a+(Number(c.duplicateCount)||Math.max(0,(Number(c.quantity)||0)-1)),0);
  const pct=total?Math.round(owned/total*100):0;
  statTotal.textContent=total;
  statOwned.textContent=owned;
  statMissing.textContent=missing;
  statDupes.textContent=dup;
  statPercent.textContent=pct+"%";
  bar.style.width=pct+"%";
}

function render(){
  const list=getFiltered();
  updateStats(list);
  if(view==="home"){ renderHome(); return; }
  if(view==="sets"){ renderSets(); return; }
  if(view==="rarities"){ renderRarities(); return; }
  if(view==="info"){ renderInfo(); return; }
  content.innerHTML=`<section class="grid">${list.map(cardHtml).join("")}</section>`;
  document.querySelectorAll(".card").forEach(card=>card.onclick=()=>openCard(card.dataset.id));
}

function cardHtml(c){
  const img=getImg(c);
  return `<article class="card ${isOwned(c)?'owned':''}" data-id="${esc(c.id)}">
    <div class="thumb">${img?`<img src="${esc(img)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',textContent:'No Image'}))">`:`<div class="fallback">${esc(c.cardName)}</div>`}</div>
    <div class="body">
      <h3>${esc(c.cardName)}</h3>
      <p class="meta">${esc(c.cardNumber)}<br>${esc(c.setName)} • ${esc(yearOf(c)||"No year")} • ${esc(c.rarity||"No rarity")}</p>
      <div class="chips">
        <span class="chip ${isOwned(c)?'owned':'need'}">${isOwned(c)?'Owned':'Need'}</span>
        <span class="chip">Qty ${Number(c.quantity)||0}</span>
        ${dupes(c)?`<span class="chip dupe">Dupes ${Number(c.duplicateCount)||Math.max(0,(Number(c.quantity)||0)-1)}</span>`:""}
        ${c.wishlist?'<span class="chip">Wishlist</span>':""}
      </div>
    </div>
  </article>`;
}

function setMap(){
  const map={};
  for(const c of cards){
    const key=c.setId;
    if(!map[key]) map[key]={id:c.setId,name:c.setName,sheetName:c.sheetName,releaseDate:c.releaseDate,year:yearOf(c),total:0,owned:0,missing:0,dupes:0,rarities:{}};
    map[key].total++;
    if(isOwned(c)) map[key].owned++;
    if(dupes(c)) map[key].dupes += Number(c.duplicateCount)||Math.max(0,(Number(c.quantity)||0)-1);
    const r=c.rarity||"Unknown";
    map[key].rarities[r]=(map[key].rarities[r]||0)+1;
  }
  Object.values(map).forEach(s=>s.missing=s.total-s.owned);
  return map;
}

function renderHome(){
  const map=setMap();
  let sets=Object.values(map);
  const y=yearFilter.value, term=clean(searchInput.value).toLowerCase(), set=setFilter.value;
  if(y) sets=sets.filter(s=>s.year===y);
  if(set) sets=sets.filter(s=>s.id===set);
  if(term) sets=sets.filter(s=>(s.name+' '+s.sheetName+' '+s.releaseDate+' '+s.year).toLowerCase().includes(term));
  sets.sort((a,b)=>(a.year||'').localeCompare(b.year||'') || a.name.localeCompare(b.name));
  const grouped={};
  for(const s of sets){ const key=s.year||'No Year'; (grouped[key] ||= []).push(s); }
  content.innerHTML=`<section class="homePanel">
    <h2>Sets</h2>
    <p class="homeIntro">Choose a set to collect, filter by year, then export a checklist for only that set. Example: <b>Rainbow Box 1</b> — <b>Release Date: June 2021</b>.</p>
    ${Object.entries(grouped).map(([year,arr])=>`<div class="yearGroup"><h3>${esc(year)}</h3><div class="setList">${arr.map(setCard).join("")}</div></div>`).join("")}
  </section>`;
  document.querySelectorAll("[data-setpick]").forEach(btn=>btn.onclick=()=>{setFilter.value=btn.dataset.setpick; view='collection'; document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view==='collection')); render();});
  document.querySelectorAll("[data-setcsv]").forEach(btn=>btn.onclick=(e)=>{e.stopPropagation(); exportSetCsv(btn.dataset.setcsv);});
}
function setCard(s){
  const pct=s.total?Math.round(s.owned/s.total*100):0;
  return `<article class="setCard homeSet"><b>${esc(s.name)}</b><p>${esc(s.releaseDate||'Release date unknown')}</p><p>${s.owned}/${s.total} owned • ${s.missing} missing • ${s.dupes} dupes</p><div class="bar small"><i style="width:${pct}%"></i></div><p class="rarityLine">${Object.entries(s.rarities).slice(0,10).map(([r,n])=>`${esc(r)} ${n}`).join(' • ')}</p><div class="setActions"><button data-setpick="${esc(s.id)}">Open Set</button><button data-setcsv="${esc(s.id)}">Export Set Checklist</button></div></article>`;
}
function renderSets(){
  const map=setMap();
  const list=getFiltered();
  // keep filters but show matching set stats
  const matchingIds=new Set(list.map(c=>c.setId));
  const sets=Object.values(map).filter(s=>matchingIds.has(s.id)).sort((a,b)=>(a.year||'').localeCompare(b.year||'') || a.name.localeCompare(b.name));
  content.innerHTML=`<section class="listPanel"><h2>Set Stats</h2><div class="setList">${sets.map(setCard).join("")}</div></section>`;
  document.querySelectorAll("[data-setpick]").forEach(btn=>btn.onclick=()=>{setFilter.value=btn.dataset.setpick; view='collection'; document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view==='collection')); render();});
  document.querySelectorAll("[data-setcsv]").forEach(btn=>btn.onclick=(e)=>{e.stopPropagation(); exportSetCsv(btn.dataset.setcsv);});
}

function renderRarities(){
  const list=getFiltered();
  const map={};
  for(const c of list){
    const r=c.rarity||"Unknown";
    if(!map[r]) map[r]={total:0,owned:0};
    map[r].total++;
    if(isOwned(c)) map[r].owned++;
  }
  content.innerHTML=`<section class="guidePanel"><h2>Rarities</h2><div class="setList">${Object.entries(map).sort().map(([r,m])=>`<div class="setCard"><b>${esc(r)}</b><p>${m.owned}/${m.total} owned</p></div>`).join("")}</div></section>`;
}

function renderInfo(){
  content.innerHTML=`<section class="infoPanel">
    <h2>About This Project</h2>
    <p>This project was designed by <b>Bow</b>. I hope to be able to update this project in the future as time goes on.</p>
    <p><b>Important:</b> Please make sure to export regularly in case a future update breaks or resets the local database. If you export often, you can easily import your saved collection again.</p>
    <p>A huge thanks to <b>Goda</b>. They created the <b>MLP All Kayou Sets Collector Checklist</b> that was found on Reddit. Please show them some love. Their checklist made this project much easier.</p>
    <p><b>Reddit post:</b><br><a href="https://www.reddit.com/r/mylittlepony/comments/1tmfljg/updated_complete_checklists_of_every_kayous_mlp/" target="_blank" rel="noopener">https://www.reddit.com/r/mylittlepony/comments/1tmfljg/updated_complete_checklists_of_every_kayous_mlp/</a></p>
    <p>I am working on updates for photos. At the moment, you can upload image URLs for the cards, which saves local space. About 90% of this site runs local in your browser.</p>
  </section>`;
}

function openCard(id){
  const c=cards.find(x=>x.id===id);
  if(!c) return;
  editId.value=c.id;
  for(const f of fields){ if($(f)) $(f).value=c[f]??""; }
  for(const f of checks){ if($(f)) $(f).checked=!!c[f]; }
  detailTitle.textContent = `${c.cardNumber} • ${c.cardName}`;
  bigImage.innerHTML = getImg(c)?`<img src="${esc(getImg(c))}">`:"No Image";
  findImageBtn.onclick = () => window.open(searchUrl(c), "_blank");
  cardDialog.showModal();
}

function collect(){
  const c={...(cards.find(x=>x.id===editId.value)||{})};
  for(const f of fields){ if($(f)) c[f]=$(f).value; }
  for(const f of checks){ if($(f)) c[f]=$(f).checked; }
  c.chineseQty=Number(c.chineseQty)||0;
  c.englishQty=Number(c.englishQty)||0;
  c.quantity=Number(c.quantity)||c.chineseQty+c.englishQty||0;
  c.duplicateCount=Number(c.duplicateCount)||Math.max(0,c.quantity-1);
  c.owned=c.quantity>0||c.chineseQty>0||c.englishQty>0;
  c.year=yearOf(c);
  c.lastUpdated=new Date().toISOString().slice(0,10);
  return c;
}

cardForm.onsubmit=e=>{
  e.preventDefault();
  const c=collect();
  const i=cards.findIndex(x=>x.id===c.id);
  if(i>=0) cards[i]=c;
  save();
  fillFilters();
  render();
  cardDialog.close();
};
plusEnglishBtn.onclick=()=>{englishQty.value=Number(englishQty.value||0)+1; quantity.value=Number(quantity.value||0)+1; owned.checked=true; duplicateCount.value=Math.max(0,Number(quantity.value)-1);};
plusChineseBtn.onclick=()=>{chineseQty.value=Number(chineseQty.value||0)+1; quantity.value=Number(quantity.value||0)+1; owned.checked=true; duplicateCount.value=Math.max(0,Number(quantity.value)-1);};
plusDupeBtn.onclick=()=>{quantity.value=Math.max(2,Number(quantity.value||0)+1); duplicateCount.value=Number(duplicateCount.value||0)+1; owned.checked=true;};
markNeedBtn.onclick=()=>{chineseQty.value=0; englishQty.value=0; quantity.value=0; duplicateCount.value=0; owned.checked=false;};

closeDialog.onclick=()=>cardDialog.close();
document.querySelectorAll(".tabs button").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  view=btn.dataset.view;
  render();
});
searchInput.oninput=render;
yearFilter.oninput=render;
setFilter.oninput=render;
rarityFilter.oninput=render;
clearBtn.onclick=()=>{searchInput.value="";yearFilter.value="";setFilter.value="";rarityFilter.value="";render();};

function toCsv(list){
  const rows=[["Owned","Year","Release Date","Set","Rarity","Printed Code","Card Name","Chinese Qty","English Qty","Total Qty","Dupes","Wishlist","Image","Notes"]];
  list.forEach(c=>rows.push([isOwned(c)?"YES":"NO",yearOf(c),c.releaseDate,c.setName,c.rarity,c.cardNumber,c.cardName,c.chineseQty,c.englishQty,c.quantity,c.duplicateCount,c.wishlist?"YES":"NO",c.image,c.notes]));
  return rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
}
function download(name,content,type="text/plain"){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSetCsv(setId){
  const id=setId || setFilter.value;
  const list=id ? cards.filter(c=>c.setId===id) : getFiltered();
  const name=id ? (list[0]?.setName || id).replace(/[^a-z0-9]+/gi,'-') : 'showing-cards';
  download(`MLP-${name}-checklist.csv`,toCsv(list),"text/csv");
}
exportCsvBtn.onclick=()=>download("MLP-showing-cards.csv",toCsv(getFiltered()),"text/csv");
exportSetCsvBtn.onclick=()=>exportSetCsv(setFilter.value);
neededCsvBtn.onclick=()=>download("MLP-missing-cards.csv",toCsv(cards.filter(c=>!isOwned(c))),"text/csv");
dupesCsvBtn.onclick=()=>download("MLP-duplicates.csv",toCsv(cards.filter(dupes)),"text/csv");
exportJsonBtn.onclick=()=>download("MLP-collection.json",JSON.stringify({cards},null,2),"application/json");
backupBtn.onclick=()=>download("MLP-collection-backup.json",JSON.stringify({version:"10",exportedAt:new Date().toISOString(),cards},null,2),"application/json");
importBackup.onchange=async e=>{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text());cards=Array.isArray(data)?data:(data.cards||[]);cards.forEach(c=>{ if(!c.year) c.year=yearOf(c); });save();fillFilters();render();};
resetBtn.onclick=()=>{if(confirm("Reset all local saves and return to spreadsheet defaults?")){localStorage.removeItem(saveKey);load();}};
load();
