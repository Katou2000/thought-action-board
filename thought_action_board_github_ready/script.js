
const STORAGE_KEY = "katoBoardCompleteV1";

const $ = (id) => document.getElementById(id);
const els = {
  boardNameInput:$("boardNameInput"), addBoardButton:$("addBoardButton"), boardList:$("boardList"),
  homeButton:$("homeButton"), archiveButton:$("archiveButton"), freeboardButton:$("freeboardButton"),
  settingsButton:$("settingsButton"), homeView:$("homeView"), boardView:$("boardView"),
  archiveView:$("archiveView"), freeboardView:$("freeboardView"), currentBoardTitle:$("currentBoardTitle"),
  addSectionButton:$("addSectionButton"), addCardButton:$("addCardButton"), deleteBoardButton:$("deleteBoardButton"),
  searchInput:$("searchInput"), tagFilter:$("tagFilter"), statusFilter:$("statusFilter"), sortSelect:$("sortSelect"),
  sectionBoard:$("sectionBoard"), openTaskCount:$("openTaskCount"), overdueCount:$("overdueCount"),
  monthlyDoneCount:$("monthlyDoneCount"), boardCount:$("boardCount"), upcomingList:$("upcomingList"),
  archiveSearchInput:$("archiveSearchInput"), archiveBoardFilter:$("archiveBoardFilter"), archiveList:$("archiveList"),
  freeCanvas:$("freeCanvas"), addFreeNoteButton:$("addFreeNoteButton"), freeImageInput:$("freeImageInput"),
  clearFreeboardButton:$("clearFreeboardButton"), cardModal:$("cardModal"), settingsModal:$("settingsModal"),
  cardModalTitle:$("cardModalTitle"), cardTypeInput:$("cardTypeInput"), cardSectionInput:$("cardSectionInput"),
  cardTitleInput:$("cardTitleInput"), cardContentInput:$("cardContentInput"), cardDueInput:$("cardDueInput"),
  cardTagsInput:$("cardTagsInput"), cardColorInput:$("cardColorInput"), cardImageInput:$("cardImageInput"),
  cardLinkInput:$("cardLinkInput"), imagePreviewWrap:$("imagePreviewWrap"), imagePreview:$("imagePreview"),
  removeImageButton:$("removeImageButton"), saveCardButton:$("saveCardButton"), themeSelect:$("themeSelect"),
  accentColorInput:$("accentColorInput"), densitySelect:$("densitySelect"), exportButton:$("exportButton"),
  importInput:$("importInput"), mobileMenuButton:$("mobileMenuButton"), installAppButton:$("installAppButton")
};

let editingCardId = null;
let editingImageData = "";
let draggedCardId = null;
let draggedFromSectionId = null;

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function defaultData(){
  const boardId=uid(), sectionId=uid();
  return {
    view:"board", selectedBoardId:boardId,
    settings:{theme:"minimal",accent:"#2563eb",density:"normal"},
    boards:[{id:boardId,name:"今日やること",sections:[
      {id:sectionId,name:"未分類",cards:[{
        id:uid(),type:"task",title:"最初のカード",content:"編集・期限・タグ・画像・ドラッグ移動が使えます。",
        due:"",tags:["サンプル"],color:"yellow",link:"",image:"",completed:false,createdAt:Date.now()
      }]}
    ]},{id:uid(),name:"就職活動",sections:[{id:uid(),name:"応募・準備",cards:[]}]},
    {id:uid(),name:"AI制作",sections:[{id:uid(),name:"作りたいもの",cards:[]}]}],
    archive:[], freeItems:[]
  };
}
function load(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultData();
    const d=JSON.parse(raw);
    return d && Array.isArray(d.boards) ? d : defaultData();
  }catch(e){ console.error(e); return defaultData(); }
}
let data=load();
function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
function selectedBoard(){ return data.boards.find(b=>b.id===data.selectedBoardId) || data.boards[0]; }
function allCards(){ return data.boards.flatMap(b=>b.sections.flatMap(s=>s.cards.map(c=>({...c,boardId:b.id,boardName:b.name,sectionId:s.id,sectionName:s.name})))); }
function findCard(cardId){
  for(const b of data.boards) for(const s of b.sections){ const c=s.cards.find(x=>x.id===cardId); if(c) return {board:b,section:s,card:c}; }
  return null;
}
function escapeHtml(v=""){ return v.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function icon(type){ return ({task:"☑",memo:"📝",idea:"💡",link:"🔗",image:"🖼"}[type]||"📝"); }
function isOverdue(c){ return c.due && !c.completed && c.due < todayISO(); }
function showView(view){
  data.view=view; save();
  ["home","board","archive","freeboard"].forEach(v=>{
    els[v+"View"].classList.toggle("hidden",v!==view);
    const btn=els[v+"Button"]; if(btn) btn.classList.toggle("active",v===view);
  });
  
let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  els.installAppButton.classList.remove("hidden");
});
window.addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  els.installAppButton.classList.add("hidden");
});
els.installAppButton.onclick=async()=>{
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  els.installAppButton.classList.add("hidden");
};

els.mobileMenuButton.onclick=()=>document.body.classList.toggle("sidebar-open");
document.addEventListener("click",event=>{
  if(window.innerWidth>900) return;
  const insideSidebar=event.target.closest(".sidebar");
  const menuButton=event.target.closest("#mobileMenuButton");
  if(!insideSidebar&&!menuButton) document.body.classList.remove("sidebar-open");
});
document.querySelectorAll(".nav-button").forEach(button=>{
  button.addEventListener("click",()=>document.body.classList.remove("sidebar-open"));
});

renderAll();
}
function renderAll(){
  applySettings(); renderSidebar();
  if(data.view==="home") renderHome();
  if(data.view==="board") renderBoard();
  if(data.view==="archive") renderArchive();
  if(data.view==="freeboard") renderFreeboard();
}
function applySettings(){
  document.body.dataset.theme=data.settings.theme;
  document.body.dataset.density=data.settings.density;
  document.documentElement.style.setProperty("--accent",data.settings.accent);
  els.themeSelect.value=data.settings.theme; els.accentColorInput.value=data.settings.accent; els.densitySelect.value=data.settings.density;
}
function renderSidebar(){
  els.boardList.innerHTML="";
  data.boards.forEach(b=>{
    const btn=document.createElement("button");
    btn.className="board-list-button"+(b.id===data.selectedBoardId&&data.view==="board"?" selected":"");
    btn.textContent="📁 "+b.name; btn.onclick=()=>{data.selectedBoardId=b.id;showView("board");};
    els.boardList.appendChild(btn);
  });
}
function renderHome(){
  const cards=allCards(), now=new Date(), month=now.toISOString().slice(0,7);
  els.openTaskCount.textContent=cards.filter(c=>!c.completed).length;
  els.overdueCount.textContent=cards.filter(isOverdue).length;
  els.monthlyDoneCount.textContent=data.archive.filter(a=>(a.completedAt||"").startsWith(month)).length;
  els.boardCount.textContent=data.boards.length;
  const upcoming=cards.filter(c=>c.due&&!c.completed).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);
  els.upcomingList.innerHTML=upcoming.length?upcoming.map(c=>`<div class="upcoming-item"><span><strong>${escapeHtml(c.title)}</strong><br><small>${escapeHtml(c.boardName)} / ${escapeHtml(c.sectionName)}</small></span><span class="${isOverdue(c)?"due-chip overdue":"due-chip"}">${c.due}</span></div>`).join(""):`<p>期限付きカードはありません。</p>`;
}
function renderBoard(){
  const b=selectedBoard(); if(!b) return;
  els.currentBoardTitle.textContent=b.name;
  const allTags=[...new Set(b.sections.flatMap(s=>s.cards.flatMap(c=>c.tags||[])))].sort();
  const currentTag=els.tagFilter.value;
  els.tagFilter.innerHTML=`<option value="">すべてのタグ</option>`+allTags.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  els.tagFilter.value=allTags.includes(currentTag)?currentTag:"";
  els.sectionBoard.innerHTML="";
  b.sections.forEach(section=>els.sectionBoard.appendChild(renderSection(section)));
  if(!b.sections.length) els.sectionBoard.innerHTML=`<div class="empty-section">小項目を追加してください。</div>`;
}
function filteredCards(cards){
  const q=els.searchInput.value.trim().toLowerCase(), tag=els.tagFilter.value, status=els.statusFilter.value;
  let out=cards.filter(c=>{
    const hay=[c.title,c.content,c.link,...(c.tags||[])].join(" ").toLowerCase();
    if(q&&!hay.includes(q)) return false;
    if(tag&&!(c.tags||[]).includes(tag)) return false;
    if(status==="open"&&c.completed) return false;
    if(status==="done"&&!c.completed) return false;
    if(status==="overdue"&&!isOverdue(c)) return false;
    return true;
  });
  const sort=els.sortSelect.value;
  if(sort==="dueAsc") out.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  if(sort==="dueDesc") out.sort((a,b)=>(b.due||"0000").localeCompare(a.due||"0000"));
  if(sort==="createdDesc") out.sort((a,b)=>b.createdAt-a.createdAt);
  if(sort==="createdAsc") out.sort((a,b)=>a.createdAt-b.createdAt);
  return out;
}
function renderSection(section){
  const wrap=document.createElement("section"); wrap.className="board-section"; wrap.dataset.sectionId=section.id;
  const header=document.createElement("div"); header.className="section-header";
  const title=document.createElement("h3"); title.className="section-title"; title.textContent=section.name; title.contentEditable="true";
  title.onblur=()=>{const v=title.textContent.trim(); if(v){section.name=v;save();}else title.textContent=section.name;};
  const acts=document.createElement("div"); acts.className="section-actions";
  const add=document.createElement("button"); add.textContent="＋ カード"; add.onclick=()=>openCardModal(null,section.id);
  const del=document.createElement("button"); del.textContent="削除"; del.onclick=()=>deleteSection(section.id);
  acts.append(add,del); header.append(title,acts);
  const grid=document.createElement("div"); grid.className="card-grid"; grid.dataset.sectionId=section.id;
  grid.addEventListener("dragover",e=>e.preventDefault());
  grid.addEventListener("drop",e=>dropIntoSection(e,section.id));
  const cards=filteredCards([...section.cards]);
  if(cards.length) cards.forEach(c=>grid.appendChild(renderCard(c,section.id))); else grid.innerHTML=`<div class="empty-section">ここにカードを置けます。</div>`;
  wrap.append(header,grid); return wrap;
}
function renderCard(card,sectionId){
  const article=document.createElement("article"); article.className=`memo-card ${card.color||"white"}${card.completed?" completed":""}`; article.draggable=true; article.dataset.cardId=card.id;
  article.addEventListener("dragstart",()=>{draggedCardId=card.id;draggedFromSectionId=sectionId;article.classList.add("dragging");});
  article.addEventListener("dragend",()=>article.classList.remove("dragging"));
  article.addEventListener("dragover",e=>{e.preventDefault();article.classList.add("drag-over");});
  article.addEventListener("dragleave",()=>article.classList.remove("drag-over"));
  article.addEventListener("drop",e=>dropOnCard(e,sectionId,card.id));
  const head=document.createElement("div"); head.className="card-head";
  if(card.type==="task"){
    const check=document.createElement("input"); check.type="checkbox"; check.className="card-check"; check.checked=!!card.completed;
    check.onchange=()=>completeCard(card.id,check.checked); head.appendChild(check);
  } else { const type=document.createElement("span"); type.className="card-type"; type.textContent=icon(card.type); head.appendChild(type); }
  const title=document.createElement("h3"); title.className="card-title"; title.textContent=card.title||"無題"; head.appendChild(title);
  article.appendChild(head);
  if(card.image){ const img=document.createElement("img"); img.className="card-image"; img.src=card.image; img.alt=card.title||"添付画像"; article.appendChild(img); }
  if(card.content){ const p=document.createElement("div"); p.className="card-content"; p.textContent=card.content; article.appendChild(p); }
  if(card.link){ const a=document.createElement("a"); a.className="card-link"; a.href=card.link; a.target="_blank"; a.rel="noopener noreferrer"; a.textContent=card.link; article.appendChild(a); }
  const meta=document.createElement("div"); meta.className="meta-row";
  if(card.due){ const due=document.createElement("span"); due.className="due-chip"+(isOverdue(card)?" overdue":""); due.textContent="期限 "+card.due; meta.appendChild(due); }
  if(meta.childNodes.length) article.appendChild(meta);
  if((card.tags||[]).length){ const tags=document.createElement("div"); tags.className="tag-row"; card.tags.forEach(t=>{const s=document.createElement("span");s.className="tag-chip";s.textContent="#"+t;tags.appendChild(s);});article.appendChild(tags); }
  const footer=document.createElement("div"); footer.className="card-footer";
  const edit=document.createElement("button"); edit.textContent="編集"; edit.onclick=()=>openCardModal(card.id,sectionId);
  const del=document.createElement("button"); del.textContent="削除"; del.className="delete-card"; del.onclick=()=>deleteCard(card.id);
  footer.append(edit,del); article.appendChild(footer); return article;
}
function addBoard(){
  const name=els.boardNameInput.value.trim(); if(!name) return;
  const id=uid(); data.boards.push({id,name,sections:[{id:uid(),name:"未分類",cards:[]}]}); data.selectedBoardId=id; els.boardNameInput.value=""; save(); showView("board");
}
function deleteBoard(){
  const b=selectedBoard(); if(!b||data.boards.length===1){alert("最後のボードは削除できません。");return;}
  if(!confirm(`「${b.name}」を削除しますか？`)) return;
  data.boards=data.boards.filter(x=>x.id!==b.id);data.selectedBoardId=data.boards[0].id;save();renderAll();
}
function addSection(){
  const b=selectedBoard(); const name=prompt("小項目名を入力してください。","新しい小項目"); if(!name||!name.trim()) return;
  b.sections.push({id:uid(),name:name.trim(),cards:[]});save();renderBoard();
}
function deleteSection(id){
  const b=selectedBoard(), s=b.sections.find(x=>x.id===id); if(!s) return;
  if(s.cards.length&&!confirm(`「${s.name}」と中のカードを削除しますか？`)) return;
  b.sections=b.sections.filter(x=>x.id!==id);save();renderBoard();
}
function openCardModal(cardId=null,sectionId=null){
  editingCardId=cardId; editingImageData="";
  const b=selectedBoard(); els.cardSectionInput.innerHTML=b.sections.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  if(!b.sections.length){alert("先に小項目を追加してください。");return;}
  if(cardId){
    const found=findCard(cardId); if(!found)return; const c=found.card;
    els.cardModalTitle.textContent="カードを編集";els.cardTypeInput.value=c.type;els.cardSectionInput.value=found.section.id;els.cardTitleInput.value=c.title||"";
    els.cardContentInput.value=c.content||"";els.cardDueInput.value=c.due||"";els.cardTagsInput.value=(c.tags||[]).join(", ");
    els.cardColorInput.value=c.color||"yellow";els.cardLinkInput.value=c.link||"";editingImageData=c.image||"";
  }else{
    els.cardModalTitle.textContent="カードを追加";els.cardTypeInput.value="task";els.cardSectionInput.value=sectionId||b.sections[0].id;els.cardTitleInput.value="";
    els.cardContentInput.value="";els.cardDueInput.value="";els.cardTagsInput.value="";els.cardColorInput.value="yellow";els.cardLinkInput.value="";
  }
  updatePreview();els.cardImageInput.value="";els.cardModal.classList.remove("hidden");els.cardTitleInput.focus();
}
function saveCard(){
  const b=selectedBoard(), title=els.cardTitleInput.value.trim(), content=els.cardContentInput.value.trim();
  if(!title&&!content&&!editingImageData){alert("タイトル・内容・画像のどれかを入れてください。");return;}
  const cardData={type:els.cardTypeInput.value,title:title||"無題",content,due:els.cardDueInput.value,tags:els.cardTagsInput.value.split(",").map(x=>x.trim()).filter(Boolean),color:els.cardColorInput.value,link:els.cardLinkInput.value.trim(),image:editingImageData};
  if(editingCardId){
    const found=findCard(editingCardId); if(!found)return; Object.assign(found.card,cardData);
    if(found.section.id!==els.cardSectionInput.value){
      found.section.cards=found.section.cards.filter(c=>c.id!==editingCardId);
      b.sections.find(s=>s.id===els.cardSectionInput.value).cards.push(found.card);
    }
  }else{
    b.sections.find(s=>s.id===els.cardSectionInput.value).cards.push({id:uid(),...cardData,completed:false,createdAt:Date.now()});
  }
  save();closeModal("cardModal");renderBoard();
}
function deleteCard(id){
  const f=findCard(id); if(!f||!confirm(`「${f.card.title}」を削除しますか？`)) return;
  f.section.cards=f.section.cards.filter(c=>c.id!==id);save();renderBoard();
}
function completeCard(id,done){
  const f=findCard(id);
  if(!f) return;

  if(!done){
    f.card.completed=false;
    save();
    renderBoard();
    return;
  }

  const cardElement=document.querySelector(`[data-card-id="${id}"]`);
  if(cardElement){
    cardElement.classList.add("completed","completing");
    const checkbox=cardElement.querySelector(".card-check");
    if(checkbox) checkbox.disabled=true;
  }

  showCompletionToast(f.card.title);

  setTimeout(()=>{
    const latest=findCard(id);
    if(!latest) return;

    latest.card.completed=true;
    data.archive.unshift({
      ...latest.card,
      boardId:latest.board.id,
      boardName:latest.board.name,
      sectionName:latest.section.name,
      completedAt:new Date().toISOString()
    });

    latest.section.cards=latest.section.cards.filter(card=>card.id!==id);
    save();
    renderBoard();

    if(data.view==="home") renderHome();
  },850);
}

function showCompletionToast(cardTitle){
  document.querySelectorAll(".completion-toast").forEach(item=>item.remove());

  const toast=document.createElement("div");
  toast.className="completion-toast";

  if(data.settings.theme==="dopamine"){
    toast.innerHTML=`CLEAR!<small>${escapeHtml(cardTitle)} を「できたこと」に保存</small>`;
  }else{
    toast.innerHTML=`✓ タスク完了<small>「できたこと」に保存しました</small>`;
  }

  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),1400);
}
function dropIntoSection(e,targetSectionId){
  e.preventDefault(); if(!draggedCardId)return;
  const f=findCard(draggedCardId), target=selectedBoard().sections.find(s=>s.id===targetSectionId); if(!f||!target)return;
  f.section.cards=f.section.cards.filter(c=>c.id!==draggedCardId);target.cards.push(f.card);save();renderBoard();
}
function dropOnCard(e,targetSectionId,targetCardId){
  e.preventDefault();e.stopPropagation(); if(!draggedCardId||draggedCardId===targetCardId)return;
  const f=findCard(draggedCardId), target=selectedBoard().sections.find(s=>s.id===targetSectionId); if(!f||!target)return;
  f.section.cards=f.section.cards.filter(c=>c.id!==draggedCardId);
  const idx=target.cards.findIndex(c=>c.id===targetCardId);target.cards.splice(idx,0,f.card);save();renderBoard();
}
function renderArchive(){
  const q=els.archiveSearchInput.value.trim().toLowerCase(), filter=els.archiveBoardFilter.value;
  els.archiveBoardFilter.innerHTML=`<option value="">すべてのボード</option>`+data.boards.map(b=>`<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
  els.archiveBoardFilter.value=filter;
  const items=data.archive.filter(a=>(!q||[a.title,a.content,a.boardName,...(a.tags||[])].join(" ").toLowerCase().includes(q))&&(!filter||a.boardId===filter));
  els.archiveList.innerHTML=items.length?items.map(a=>`<article class="archive-card"><h3>🏆 ${escapeHtml(a.title)}</h3><p>${escapeHtml(a.content||"")}</p><div class="tag-row">${(a.tags||[]).map(t=>`<span class="tag-chip">#${escapeHtml(t)}</span>`).join("")}</div><p><small>${escapeHtml(a.boardName||"")} / ${escapeHtml(a.sectionName||"")}<br>${new Date(a.completedAt).toLocaleString("ja-JP")}</small></p><div class="archive-actions"><button class="secondary-button" onclick="restoreArchive('${a.id}')">戻す</button><button class="danger-outline-button" onclick="deleteArchive('${a.id}')">削除</button></div></article>`).join(""):`<p>達成記録はまだありません。</p>`;
}
window.restoreArchive=function(id){
  const a=data.archive.find(x=>x.id===id); if(!a)return;
  let b=data.boards.find(x=>x.id===a.boardId)||data.boards[0], s=b.sections.find(x=>x.name===a.sectionName)||b.sections[0];
  if(!s){s={id:uid(),name:"未分類",cards:[]};b.sections.push(s);}
  const restored={...a,completed:false};delete restored.boardId;delete restored.boardName;delete restored.sectionName;delete restored.completedAt;s.cards.push(restored);
  data.archive=data.archive.filter(x=>x.id!==id);save();renderArchive();
};
window.deleteArchive=function(id){if(confirm("この達成記録を削除しますか？")){data.archive=data.archive.filter(x=>x.id!==id);save();renderArchive();}};
function renderFreeboard(){
  els.freeCanvas.innerHTML="";
  data.freeItems.forEach(item=>{
    const el=document.createElement("div");el.className=`free-item ${item.type==="image"?"free-image":"free-note"}`;el.style.left=item.x+"px";el.style.top=item.y+"px";el.dataset.id=item.id;
    if(item.type==="image"){el.innerHTML=`<img src="${item.content}" alt="自由帳画像">`;}
    else{el.textContent=item.content;el.ondblclick=()=>{const v=prompt("付箋を編集",item.content);if(v!==null){item.content=v;save();renderFreeboard();}};}
    const del=document.createElement("button");del.className="free-delete";del.textContent="×";del.onclick=e=>{e.stopPropagation();data.freeItems=data.freeItems.filter(x=>x.id!==item.id);save();renderFreeboard();};el.appendChild(del);
    makeDraggable(el,item);els.freeCanvas.appendChild(el);
  });
}
function makeDraggable(el,item){
  let sx=0,sy=0,ox=0,oy=0,drag=false;
  el.addEventListener("pointerdown",e=>{if(e.target.tagName==="BUTTON")return;drag=true;sx=e.clientX;sy=e.clientY;ox=item.x;oy=item.y;el.setPointerCapture(e.pointerId);});
  el.addEventListener("pointermove",e=>{if(!drag)return;item.x=Math.max(0,ox+e.clientX-sx);item.y=Math.max(0,oy+e.clientY-sy);el.style.left=item.x+"px";el.style.top=item.y+"px";});
  el.addEventListener("pointerup",()=>{drag=false;save();});
}
function addFreeNote(){const text=prompt("付箋に書く内容");if(!text)return;data.freeItems.push({id:uid(),type:"note",content:text,x:30+Math.random()*120,y:30+Math.random()*100});save();renderFreeboard();}
function readImage(file,callback){
  if(!file)return;if(file.size>2_000_000){alert("画像は2MB以下がおすすめです。");}
  const r=new FileReader();r.onload=()=>callback(r.result);r.readAsDataURL(file);
}
function updatePreview(){els.imagePreviewWrap.classList.toggle("hidden",!editingImageData);if(editingImageData)els.imagePreview.src=editingImageData;}
function closeModal(id){$(id).classList.add("hidden");}
function exportData(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`kato-board-backup-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);
}

els.addBoardButton.onclick=addBoard;els.boardNameInput.onkeydown=e=>{if(e.key==="Enter")addBoard();};
els.homeButton.onclick=()=>showView("home");els.archiveButton.onclick=()=>showView("archive");els.freeboardButton.onclick=()=>showView("freeboard");
els.settingsButton.onclick=()=>els.settingsModal.classList.remove("hidden");els.addSectionButton.onclick=addSection;els.addCardButton.onclick=()=>openCardModal();els.deleteBoardButton.onclick=deleteBoard;
els.currentBoardTitle.onblur=()=>{const b=selectedBoard(),v=els.currentBoardTitle.textContent.trim();if(v){b.name=v;save();renderSidebar();}else els.currentBoardTitle.textContent=b.name;};
[els.searchInput,els.tagFilter,els.statusFilter,els.sortSelect].forEach(el=>el.addEventListener("input",renderBoard));
[els.archiveSearchInput,els.archiveBoardFilter].forEach(el=>el.addEventListener("input",renderArchive));
els.saveCardButton.onclick=saveCard;els.cardImageInput.onchange=e=>readImage(e.target.files[0],d=>{editingImageData=d;updatePreview();});els.removeImageButton.onclick=()=>{editingImageData="";updatePreview();};
document.querySelectorAll("[data-close]").forEach(el=>el.onclick=()=>closeModal(el.dataset.close));
els.themeSelect.onchange=()=>{data.settings.theme=els.themeSelect.value;save();applySettings();};els.accentColorInput.oninput=()=>{data.settings.accent=els.accentColorInput.value;save();applySettings();};els.densitySelect.onchange=()=>{data.settings.density=els.densitySelect.value;save();applySettings();};
els.exportButton.onclick=exportData;els.importInput.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.boards))throw new Error();data=d;save();renderAll();alert("読み込みました。");}catch{alert("読み込めないファイルです。");}};r.readAsText(f);};
els.addFreeNoteButton.onclick=addFreeNote;els.freeImageInput.onchange=e=>readImage(e.target.files[0],d=>{data.freeItems.push({id:uid(),type:"image",content:d,x:40+Math.random()*120,y:40+Math.random()*100});save();renderFreeboard();});
els.clearFreeboardButton.onclick=()=>{if(confirm("自由帳をすべて消しますか？")){data.freeItems=[];save();renderFreeboard();}};
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal("cardModal");closeModal("settingsModal");}});
renderAll();
