
"use strict";

const STORAGE_KEY = "taskKanrinnerV1";
const $ = id => document.getElementById(id);

const ids = [
  "mobileMenuButton","boardNameInput","addBoardButton","boardList",
  "todayButton","homeButton","archiveButton","freeboardButton","memoButton",
  "milestoneButton","achievedGoalsButton","settingsButton",

  "todayView","homeView","boardView","archiveView","freeboardView","memoView",
  "milestoneView","achievedGoalsView",

  "currentBoardTitle","addSectionButton","addCardButton","completeSelectedButton",
  "deleteBoardButton","searchInput","tagFilter","statusFilter","sortSelect",
  "selectionBar","selectionCountText","clearSelectionButton","completeSelectedBarButton",
  "sectionBoard",

  "openTaskCount","todayTaskCount","overdueCount","monthlyDoneCount","upcomingList",
  "todayList","calendarPrevButton","calendarTodayButton","calendarNextButton",
  "calendarMonthLabel","calendarGrid","calendarDayDetail",

  "archiveSearchInput","archiveBoardFilter","archiveList",

  "undoFreeboardButton","redoFreeboardButton","addFreePageButton",
  "renameFreePageButton","addFreeNoteButton","freeImageInput","clearFreeboardButton",
  "freePageTabs","freeCanvas",

  "addQuickMemoButton","quickMemoList","quickMemoTitle","quickMemoContent",
  "quickMemoSavedLabel","deleteQuickMemoButton",

  "addGoalButton","goalTowerList","achievedGoalCount","achievedGoalMonthCount",
  "achievedGoalList",

  "cardModal","settingsModal","cardModalTitle","cardTypeInput","cardSectionInput",
  "cardTitleInput","cardContentInput","cardDueInput","cardTagsInput","cardColorInput",
  "cardImageInput","cardLinkInput","repeatTypeInput","repeatIntervalWrap",
  "repeatIntervalInput","weekdayPickerWrap","imagePreviewWrap","imagePreview",
  "removeImageButton","saveCardButton",

  "themeSelect","accentColorInput","densitySelect","installAppButton","exportButton","importInput"
];

const els = {};
ids.forEach(id => els[id] = $(id));

let editingCardId = null;
let editingImageData = "";
let draggedCardId = null;

let calendarCursor = new Date();
calendarCursor.setDate(1);
let selectedCalendarDate = localDate();

let deferredInstallPrompt = null;

// Freeboard undo/redo is intentionally session-only.
let freeUndo = [];
let freeRedo = [];
let freeHistoryLock = false;

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function localDate(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function deepClone(value){
  return JSON.parse(JSON.stringify(value));
}

function esc(value = ""){
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[ch]));
}

function defaultData(){
  const boardId = uid();
  const sectionId = uid();

  return {
    view:"board",
    selectedBoardId:boardId,
    settings:{
      theme:"normal",
      accent:"#2563eb",
      density:"normal"
    },
    boards:[
      {
        id:boardId,
        name:"今日やること",
        sections:[
          {
            id:sectionId,
            name:"未分類",
            cards:[
              {
                id:uid(),
                type:"task",
                title:"タスク管理ンナーを使ってみる",
                content:"",
                due:localDate(),
                tags:["サンプル"],
                color:"yellow",
                link:"",
                image:"",
                selected:false,
                createdAt:Date.now(),
                repeat:{type:"none", interval:1, weekdays:[]}
              }
            ]
          }
        ]
      }
    ],
    archive:[],
    freePages:[{id:uid(),name:"自由帳1",items:[]}],
    selectedFreePageId:null,
    quickMemos:[],
    selectedQuickMemoId:null,
    goalTowers:[],
    achievedGoals:[]
  };
}

function normalizeData(input){
  const d = input && typeof input === "object" ? input : defaultData();

  d.settings = d.settings || {};
  d.settings.theme = ["normal","cork","dopaboy"].includes(d.settings.theme) ? d.settings.theme : "normal";
  d.settings.accent = d.settings.accent || "#2563eb";
  d.settings.density = ["normal","compact","large"].includes(d.settings.density) ? d.settings.density : "normal";

  if(!Array.isArray(d.boards) || !d.boards.length){
    const fresh = defaultData();
    d.boards = fresh.boards;
    d.selectedBoardId = fresh.selectedBoardId;
  }

  d.boards.forEach(board => {
    board.id = board.id || uid();
    board.name = board.name || "無題のボード";
    if(!Array.isArray(board.sections)) board.sections = [];

    board.sections.forEach(section => {
      section.id = section.id || uid();
      section.name = section.name || "未分類";
      if(!Array.isArray(section.cards)) section.cards = [];

      section.cards.forEach(card => {
        card.id = card.id || uid();
        card.type = card.type || "task";
        card.title = card.title || "無題";
        card.content = card.content || "";
        card.due = card.due || "";
        card.tags = Array.isArray(card.tags) ? card.tags : [];
        card.color = card.color || "yellow";
        card.link = card.link || "";
        card.image = card.image || "";
        card.selected = !!card.selected;
        card.createdAt = card.createdAt || Date.now();
        card.repeat = card.repeat || {type:"none",interval:1,weekdays:[]};
        card.repeat.type = card.repeat.type || "none";
        card.repeat.interval = Math.max(1, Number(card.repeat.interval) || 1);
        card.repeat.weekdays = Array.isArray(card.repeat.weekdays) ? card.repeat.weekdays.map(Number) : [];
      });
    });
  });

  if(!d.boards.some(b => b.id === d.selectedBoardId)){
    d.selectedBoardId = d.boards[0].id;
  }

  if(!Array.isArray(d.archive)) d.archive = [];

  // v1 -> multi-page freeboard migration
  if(!Array.isArray(d.freePages)){
    const page = {
      id:uid(),
      name:"自由帳1",
      items:Array.isArray(d.freeItems) ? d.freeItems : []
    };
    d.freePages = [page];
    d.selectedFreePageId = page.id;
  }
  if(!d.freePages.length){
    d.freePages.push({id:uid(),name:"自由帳1",items:[]});
  }
  d.freePages.forEach(page => {
    page.id = page.id || uid();
    page.name = page.name || "自由帳";
    if(!Array.isArray(page.items)) page.items = [];
    page.items.forEach(item => {
      item.id = item.id || uid();
      item.type = item.type || "note";
      item.content = item.content || "";
      item.x = Number.isFinite(Number(item.x)) ? Number(item.x) : 40;
      item.y = Number.isFinite(Number(item.y)) ? Number(item.y) : 40;
      item.width = Number(item.width) || (item.type === "image" ? 280 : 220);
      item.height = Number(item.height) || (item.type === "image" ? 220 : 150);
    });
  });
  if(!d.freePages.some(p => p.id === d.selectedFreePageId)){
    d.selectedFreePageId = d.freePages[0].id;
  }

  if(!Array.isArray(d.quickMemos)) d.quickMemos = [];
  d.quickMemos.forEach(memo => {
    memo.id = memo.id || uid();
    memo.title = memo.title || "";
    memo.content = memo.content || "";
    memo.updatedAt = memo.updatedAt || Date.now();
  });
  if(d.selectedQuickMemoId && !d.quickMemos.some(m => m.id === d.selectedQuickMemoId)){
    d.selectedQuickMemoId = d.quickMemos[0]?.id || null;
  }

  // v2 milestone -> goal builder migration only once
  if(!Array.isArray(d.goalTowers)){
    d.goalTowers = [];
    if(Array.isArray(d.milestones)){
      d.milestones.forEach(m => {
        d.goalTowers.push({
          id:uid(),
          name:m.name || "目標",
          due:m.end || "",
          note:"",
          blocks:[
            {
              id:uid(),
              title:`進捗 ${Number(m.progress) || 0}%`,
              done:Number(m.progress) >= 100
            }
          ]
        });
      });
    }
  }
  d.goalTowers.forEach(goal => {
    goal.id = goal.id || uid();
    goal.name = goal.name || "目標";
    goal.due = goal.due || "";
    goal.note = goal.note || "";
    if(!Array.isArray(goal.blocks)) goal.blocks = [];
    goal.blocks.forEach(block => {
      block.id = block.id || uid();
      block.title = block.title || "要件";
      block.done = !!block.done;
    });
  });

  if(!Array.isArray(d.achievedGoals)) d.achievedGoals = [];

  const validViews = ["today","home","board","archive","freeboard","memo","milestone","achievedGoals"];
  if(!validViews.includes(d.view)) d.view = "board";

  return d;
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeData(raw ? JSON.parse(raw) : defaultData());
  }catch(error){
    console.error("load failed", error);
    return normalizeData(defaultData());
  }
}

let data = load();

function save(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }catch(error){
    console.error("save failed", error);
    alert("保存容量がいっぱいの可能性があります。画像を減らすかバックアップを取ってください。");
  }
}

function selectedBoard(){
  return data.boards.find(board => board.id === data.selectedBoardId) || data.boards[0];
}

function selectedFreePage(){
  return data.freePages.find(page => page.id === data.selectedFreePageId) || data.freePages[0];
}

function selectedQuickMemo(){
  return data.quickMemos.find(memo => memo.id === data.selectedQuickMemoId) || data.quickMemos[0] || null;
}

function allCards(){
  return data.boards.flatMap(board =>
    board.sections.flatMap(section =>
      section.cards.map(card => ({
        ...card,
        boardId:board.id,
        boardName:board.name,
        sectionId:section.id,
        sectionName:section.name
      }))
    )
  );
}

function findCard(id){
  for(const board of data.boards){
    for(const section of board.sections){
      const card = section.cards.find(item => item.id === id);
      if(card) return {board,section,card};
    }
  }
  return null;
}

function overdue(card){
  return !!card.due && card.due < localDate();
}

function applySettings(){
  document.body.dataset.theme = data.settings.theme;
  document.body.dataset.density = data.settings.density;
  document.documentElement.style.setProperty("--accent", data.settings.accent);

  if(els.themeSelect) els.themeSelect.value = data.settings.theme;
  if(els.accentColorInput) els.accentColorInput.value = data.settings.accent;
  if(els.densitySelect) els.densitySelect.value = data.settings.density;
}

const viewNames = ["today","home","board","archive","freeboard","memo","milestone","achievedGoals"];

function showView(view){
  data.view = view;
  save();

  viewNames.forEach(name => {
    els[name + "View"]?.classList.toggle("hidden", name !== view);
    els[name + "Button"]?.classList.toggle("active", name === view);
  });

  renderSidebar();
  renderCurrentView();
}

function renderCurrentView(){
  if(data.view === "today") renderToday();
  if(data.view === "home") renderHome();
  if(data.view === "board") renderBoard();
  if(data.view === "archive") renderArchive();
  if(data.view === "freeboard") renderFreeboard();
  if(data.view === "memo") renderQuickMemos();
  if(data.view === "milestone") renderGoalTowers();
  if(data.view === "achievedGoals") renderAchievedGoals();
}

function renderAll(){
  applySettings();
  renderSidebar();
  viewNames.forEach(name => {
    els[name + "View"]?.classList.toggle("hidden", name !== data.view);
    els[name + "Button"]?.classList.toggle("active", name === data.view);
  });
  renderCurrentView();
}

function renderSidebar(){
  if(!els.boardList) return;

  els.boardList.innerHTML = "";

  data.boards.forEach(board => {
    const button = document.createElement("button");
    button.className = "board-list-button" +
      (data.view === "board" && board.id === data.selectedBoardId ? " selected" : "");
    button.textContent = "📁 " + board.name;
    button.onclick = () => {
      data.selectedBoardId = board.id;
      showView("board");
      closeMobileSidebar();
    };
    els.boardList.appendChild(button);
  });
}

/* =========================
   HOME / TODAY / CALENDAR
========================= */

function renderHome(){
  const cards = allCards().filter(card => card.type === "task");
  const month = new Date().toISOString().slice(0,7);

  if(els.openTaskCount) els.openTaskCount.textContent = cards.length;
  if(els.todayTaskCount) els.todayTaskCount.textContent = cards.filter(c => c.due === localDate()).length;
  if(els.overdueCount) els.overdueCount.textContent = cards.filter(overdue).length;
  if(els.monthlyDoneCount){
    els.monthlyDoneCount.textContent = data.archive.filter(item => (item.completedAt || "").startsWith(month)).length;
  }

  const upcoming = cards
    .filter(card => card.due)
    .sort((a,b) => a.due.localeCompare(b.due))
    .slice(0,8);

  if(els.upcomingList){
    els.upcomingList.innerHTML = upcoming.length
      ? upcoming.map(card => `
        <div class="upcoming-item">
          <span>
            <strong>${esc(card.title)}</strong><br>
            <small>${esc(card.boardName)} / ${esc(card.sectionName)}</small>
          </span>
          <span class="${overdue(card) ? "due-chip overdue" : "due-chip"}">${card.due}</span>
        </div>
      `).join("")
      : "<p>期限付きタスクはありません。</p>";
  }
}

function renderToday(){
  const cards = allCards()
    .filter(card => card.type === "task" && card.due === localDate())
    .sort((a,b) => a.createdAt - b.createdAt);

  if(els.todayList){
    els.todayList.innerHTML = cards.length
      ? cards.map(card => `
        <article class="today-card">
          <span>
            <strong>${esc(card.title)}</strong><br>
            <small>${esc(card.boardName)} / ${esc(card.sectionName)}</small>
          </span>
          <button class="success-button" onclick="completeOneFromToday('${card.id}')">完了</button>
        </article>
      `).join("")
      : "<p>今日のタスクはありません。</p>";
  }

  renderCalendar();
}

window.completeOneFromToday = id => completeCards([id]);

function renderCalendar(){
  if(!els.calendarGrid) return;

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year,month,1);
  const gridStart = new Date(year,month,1 - first.getDay());

  if(els.calendarMonthLabel){
    els.calendarMonthLabel.textContent = `${year}年 ${month + 1}月`;
  }

  const byDate = new Map();
  allCards()
    .filter(card => card.type === "task" && card.due)
    .forEach(card => {
      if(!byDate.has(card.due)) byDate.set(card.due,[]);
      byDate.get(card.due).push(card);
    });

  els.calendarGrid.innerHTML = "";

  for(let i=0;i<42;i++){
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);

    const key = localDate(date);
    const tasks = byDate.get(key) || [];

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day";

    if(date.getMonth() !== month) cell.classList.add("outside");
    if(key === localDate()) cell.classList.add("today");
    if(key === selectedCalendarDate) cell.classList.add("selected");

    const preview = tasks.slice(0,3)
      .map(card => `<span class="calendar-task-dot">${esc(card.title)}</span>`)
      .join("");

    cell.innerHTML = `
      <span class="calendar-date-number">${date.getDate()}</span>
      ${preview}
      ${tasks.length > 3 ? `<span class="calendar-more">+${tasks.length - 3}</span>` : ""}
    `;

    cell.onclick = () => {
      selectedCalendarDate = key;
      renderCalendar();
    };

    els.calendarGrid.appendChild(cell);
  }

  renderCalendarDayDetail(selectedCalendarDate);
}

function renderCalendarDayDetail(dateKey){
  if(!els.calendarDayDetail) return;

  const tasks = allCards().filter(card => card.type === "task" && card.due === dateKey);

  els.calendarDayDetail.innerHTML = `
    <h4>${dateKey}</h4>
    ${
      tasks.length
        ? tasks.map(card => `
          <div class="calendar-detail-item">
            <span>
              <strong>${esc(card.title)}</strong><br>
              <small>${esc(card.boardName)} / ${esc(card.sectionName)}</small>
            </span>
            <button class="success-button" onclick="completeOneFromToday('${card.id}')">完了</button>
          </div>
        `).join("")
        : "<p>この日のタスクはありません。</p>"
    }
  `;
}

/* =========================
   BOARDS / CARDS
========================= */

function addBoard(){
  const name = els.boardNameInput?.value.trim();
  if(!name) return;

  const id = uid();
  data.boards.push({
    id,
    name,
    sections:[{id:uid(),name:"未分類",cards:[]}]
  });

  data.selectedBoardId = id;
  els.boardNameInput.value = "";
  save();
  showView("board");
}

function deleteBoard(){
  const board = selectedBoard();
  if(!board) return;

  if(data.boards.length === 1){
    alert("最後のボードは削除できません。");
    return;
  }

  if(!confirm(`「${board.name}」を削除しますか？`)) return;

  data.boards = data.boards.filter(item => item.id !== board.id);
  data.selectedBoardId = data.boards[0].id;
  save();
  renderAll();
}

function addSection(){
  const board = selectedBoard();
  if(!board) return;

  const name = prompt("小項目名","新しい小項目");
  if(!name?.trim()) return;

  board.sections.push({id:uid(),name:name.trim(),cards:[]});
  save();
  renderBoard();
}

function deleteSection(id){
  const board = selectedBoard();
  const section = board?.sections.find(item => item.id === id);
  if(!section) return;

  if(section.cards.length && !confirm(`「${section.name}」と中のカードを削除しますか？`)){
    return;
  }

  board.sections = board.sections.filter(item => item.id !== id);
  save();
  renderBoard();
}

function filteredCards(cards){
  const query = (els.searchInput?.value || "").trim().toLowerCase();
  const tag = els.tagFilter?.value || "";
  const status = els.statusFilter?.value || "all";

  const output = cards.filter(card => {
    const haystack = [card.title,card.content,card.link,...(card.tags || [])]
      .join(" ")
      .toLowerCase();

    if(query && !haystack.includes(query)) return false;
    if(tag && !(card.tags || []).includes(tag)) return false;
    if(status === "open" && card.selected) return false;
    if(status === "selected" && !card.selected) return false;
    if(status === "overdue" && !overdue(card)) return false;
    return true;
  });

  const sort = els.sortSelect?.value || "manual";

  if(sort === "dueAsc"){
    output.sort((a,b) => (a.due || "9999").localeCompare(b.due || "9999"));
  }else if(sort === "dueDesc"){
    output.sort((a,b) => (b.due || "0000").localeCompare(a.due || "0000"));
  }else if(sort === "createdDesc"){
    output.sort((a,b) => b.createdAt - a.createdAt);
  }else if(sort === "createdAsc"){
    output.sort((a,b) => a.createdAt - b.createdAt);
  }

  return output;
}

function renderBoard(){
  const board = selectedBoard();
  if(!board || !els.sectionBoard) return;

  if(els.currentBoardTitle) els.currentBoardTitle.textContent = board.name;

  const allTags = [...new Set(
    board.sections.flatMap(section => section.cards.flatMap(card => card.tags || []))
  )].sort();

  if(els.tagFilter){
    const current = els.tagFilter.value;
    els.tagFilter.innerHTML =
      `<option value="">すべてのタグ</option>` +
      allTags.map(tag => `<option value="${esc(tag)}">${esc(tag)}</option>`).join("");
    els.tagFilter.value = allTags.includes(current) ? current : "";
  }

  els.sectionBoard.innerHTML = "";

  if(!board.sections.length){
    els.sectionBoard.innerHTML = `<div class="empty-section">小項目を追加してください。</div>`;
  }else{
    board.sections.forEach(section => {
      els.sectionBoard.appendChild(renderSection(section));
    });
  }

  updateSelectionUI();
}

function renderSection(section){
  const wrap = document.createElement("section");
  wrap.className = "board-section";

  const header = document.createElement("div");
  header.className = "section-header";

  const title = document.createElement("h3");
  title.className = "section-title";
  title.textContent = section.name;
  title.contentEditable = "true";
  title.onblur = () => {
    const value = title.textContent.trim();
    if(value){
      section.name = value;
      save();
    }else{
      title.textContent = section.name;
    }
  };

  const actions = document.createElement("div");
  actions.className = "section-actions";

  const add = document.createElement("button");
  add.textContent = "＋ カード";
  add.onclick = () => openCardModal(null,section.id);

  const del = document.createElement("button");
  del.textContent = "削除";
  del.onclick = () => deleteSection(section.id);

  actions.append(add,del);
  header.append(title,actions);

  const grid = document.createElement("div");
  grid.className = "card-grid";
  grid.dataset.sectionId = section.id;
  grid.ondragover = event => event.preventDefault();
  grid.ondrop = event => dropIntoSection(event,section.id);

  const cards = filteredCards([...section.cards]);

  if(cards.length){
    cards.forEach(card => grid.appendChild(renderCard(card,section.id)));
  }else{
    grid.innerHTML = `<div class="empty-section">ここにカードを置けます。</div>`;
  }

  wrap.append(header,grid);
  return wrap;
}

function renderCard(card,sectionId){
  const article = document.createElement("article");
  article.className = `memo-card ${card.color || "white"}${card.selected ? " selected" : ""}`;
  article.draggable = true;
  article.dataset.cardId = card.id;

  article.ondragstart = () => {
    draggedCardId = card.id;
    article.classList.add("dragging");
  };
  article.ondragend = () => {
    draggedCardId = null;
    article.classList.remove("dragging");
  };
  article.ondragover = event => {
    event.preventDefault();
    article.classList.add("drag-over");
  };
  article.ondragleave = () => article.classList.remove("drag-over");
  article.ondrop = event => dropOnCard(event,sectionId,card.id);

  const head = document.createElement("div");
  head.className = "card-head";

  if(card.type === "task"){
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "card-select";
    check.checked = !!card.selected;
    check.onchange = () => {
      card.selected = check.checked;
      save();
      renderBoard();
    };
    head.appendChild(check);
  }else{
    const icon = document.createElement("span");
    icon.className = "card-type";
    icon.textContent = ({memo:"📝",idea:"💡",link:"🔗",image:"🖼"}[card.type] || "📝");
    head.appendChild(icon);
  }

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = card.title || "無題";
  head.appendChild(title);
  article.appendChild(head);

  if(card.image){
    const image = document.createElement("img");
    image.className = "card-image";
    image.src = card.image;
    image.alt = card.title || "";
    article.appendChild(image);
  }

  if(card.content){
    const content = document.createElement("div");
    content.className = "card-content";
    content.textContent = card.content;
    article.appendChild(content);
  }

  if(card.link){
    const link = document.createElement("a");
    link.className = "card-link";
    link.href = card.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = card.link;
    article.appendChild(link);
  }

  const meta = document.createElement("div");
  meta.className = "meta-row";

  if(card.due){
    const due = document.createElement("span");
    due.className = "due-chip" + (overdue(card) ? " overdue" : "");
    due.textContent = "期限 " + card.due;
    meta.appendChild(due);
  }

  if(card.repeat?.type && card.repeat.type !== "none"){
    const repeat = document.createElement("span");
    repeat.className = "repeat-chip";
    repeat.textContent = repeatLabel(card.repeat);
    meta.appendChild(repeat);
  }

  if(meta.childNodes.length) article.appendChild(meta);

  if((card.tags || []).length){
    const tags = document.createElement("div");
    tags.className = "tag-row";
    card.tags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = "#" + tag;
      tags.appendChild(chip);
    });
    article.appendChild(tags);
  }

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const edit = document.createElement("button");
  edit.textContent = "編集";
  edit.onclick = () => openCardModal(card.id,sectionId);

  const del = document.createElement("button");
  del.textContent = "削除";
  del.className = "delete-card";
  del.onclick = () => deleteCard(card.id);

  footer.append(edit,del);
  article.appendChild(footer);

  return article;
}

function deleteCard(id){
  const found = findCard(id);
  if(!found) return;
  if(!confirm(`「${found.card.title}」を削除しますか？`)) return;

  found.section.cards = found.section.cards.filter(card => card.id !== id);
  save();
  renderBoard();
}

function dropIntoSection(event,targetSectionId){
  event.preventDefault();
  if(!draggedCardId) return;

  const found = findCard(draggedCardId);
  const target = selectedBoard()?.sections.find(section => section.id === targetSectionId);
  if(!found || !target) return;

  found.section.cards = found.section.cards.filter(card => card.id !== draggedCardId);
  target.cards.push(found.card);
  save();
  renderBoard();
}

function dropOnCard(event,targetSectionId,targetCardId){
  event.preventDefault();
  event.stopPropagation();

  if(!draggedCardId || draggedCardId === targetCardId) return;

  const found = findCard(draggedCardId);
  const target = selectedBoard()?.sections.find(section => section.id === targetSectionId);
  if(!found || !target) return;

  found.section.cards = found.section.cards.filter(card => card.id !== draggedCardId);

  const index = target.cards.findIndex(card => card.id === targetCardId);
  target.cards.splice(Math.max(0,index),0,found.card);

  save();
  renderBoard();
}

function updateSelectionUI(){
  const selected = allCards().filter(card => card.type === "task" && card.selected);
  const active = selected.length > 0;

  els.selectionBar?.classList.toggle("hidden",!active);
  els.completeSelectedButton?.classList.toggle("hidden",!active);

  if(els.selectionCountText){
    els.selectionCountText.textContent = `${selected.length}件選択中`;
  }
}

function clearSelection(){
  data.boards.forEach(board => {
    board.sections.forEach(section => {
      section.cards.forEach(card => {
        if(card.type === "task") card.selected = false;
      });
    });
  });
  save();
  renderBoard();
}

function completeSelected(){
  const ids = allCards()
    .filter(card => card.type === "task" && card.selected)
    .map(card => card.id);

  completeCards(ids);
}

function completeCards(ids){
  if(!ids.length) return;

  let count = 0;

  ids.forEach(id => {
    const found = findCard(id);
    if(!found) return;

    const snapshot = {
      ...deepClone(found.card),
      selected:false,
      boardId:found.board.id,
      boardName:found.board.name,
      sectionName:found.section.name,
      completedAt:new Date().toISOString()
    };

    data.archive.unshift(snapshot);

    const next = createNextRepeatCard(found.card);

    found.section.cards = found.section.cards.filter(card => card.id !== id);
    if(next) found.section.cards.push(next);

    count++;
  });

  save();
  showCompletionToast(count);
  renderAll();
}

function createNextRepeatCard(card){
  if(!card.repeat || card.repeat.type === "none") return null;

  return {
    ...deepClone(card),
    id:uid(),
    due:nextDue(card.due || localDate(),card.repeat),
    selected:false,
    createdAt:Date.now()
  };
}

function nextDue(date,repeat){
  const base = new Date(date + "T00:00:00");
  const interval = Math.max(1,Number(repeat.interval) || 1);

  if(repeat.type === "daily"){
    base.setDate(base.getDate() + interval);
    return localDate(base);
  }

  if(repeat.type === "weekly"){
    base.setDate(base.getDate() + (7 * interval));
    return localDate(base);
  }

  if(repeat.type === "monthly"){
    base.setMonth(base.getMonth() + interval);
    return localDate(base);
  }

  if(repeat.type === "weekdays"){
    const weekdays = (repeat.weekdays || []).map(Number);
    if(!weekdays.length){
      base.setDate(base.getDate() + 7);
      return localDate(base);
    }

    for(let offset=1;offset<=14;offset++){
      const candidate = new Date(base);
      candidate.setDate(base.getDate() + offset);
      if(weekdays.includes(candidate.getDay())){
        return localDate(candidate);
      }
    }
  }

  return date;
}

function repeatLabel(repeat){
  const interval = Math.max(1,Number(repeat.interval) || 1);

  if(repeat.type === "daily") return interval === 1 ? "毎日" : `${interval}日ごと`;
  if(repeat.type === "weekly") return interval === 1 ? "毎週" : `${interval}週ごと`;
  if(repeat.type === "monthly") return interval === 1 ? "毎月" : `${interval}か月ごと`;

  if(repeat.type === "weekdays"){
    const names = ["日","月","火","水","木","金","土"];
    const days = (repeat.weekdays || []).map(day => names[Number(day)]).join("・");
    return days ? `毎週 ${days}` : "曜日指定";
  }

  return "";
}

function showCompletionToast(count){
  const toast = document.createElement("div");
  toast.className = "completion-toast";
  toast.innerHTML = data.settings.theme === "dopaboy"
    ? `CLEAR!<small>${count}件を「完了したこと」に保存</small>`
    : `✓ タスク完了<small>${count}件を「完了したこと」に保存しました</small>`;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(),1500);
}

/* Card modal */
function openCardModal(cardId = null,sectionId = null){
  const board = selectedBoard();
  if(!board) return;

  if(!board.sections.length){
    alert("先に小項目を追加してください。");
    return;
  }

  editingCardId = cardId;
  editingImageData = "";

  if(els.cardSectionInput){
    els.cardSectionInput.innerHTML = board.sections
      .map(section => `<option value="${section.id}">${esc(section.name)}</option>`)
      .join("");
  }

  document.querySelectorAll(".weekday-input").forEach(input => input.checked = false);

  if(cardId){
    const found = findCard(cardId);
    if(!found) return;

    const card = found.card;

    els.cardModalTitle.textContent = "カードを編集";
    els.cardTypeInput.value = card.type;
    els.cardSectionInput.value = found.section.id;
    els.cardTitleInput.value = card.title || "";
    els.cardContentInput.value = card.content || "";
    els.cardDueInput.value = card.due || "";
    els.cardTagsInput.value = (card.tags || []).join(", ");
    els.cardColorInput.value = card.color || "yellow";
    els.cardLinkInput.value = card.link || "";
    editingImageData = card.image || "";

    const repeat = card.repeat || {type:"none",interval:1,weekdays:[]};
    els.repeatTypeInput.value = repeat.type;
    els.repeatIntervalInput.value = repeat.interval || 1;

    document.querySelectorAll(".weekday-input").forEach(input => {
      input.checked = (repeat.weekdays || []).map(Number).includes(Number(input.value));
    });
  }else{
    els.cardModalTitle.textContent = "カードを追加";
    els.cardTypeInput.value = "task";
    els.cardSectionInput.value = sectionId || board.sections[0].id;
    els.cardTitleInput.value = "";
    els.cardContentInput.value = "";
    els.cardDueInput.value = "";
    els.cardTagsInput.value = "";
    els.cardColorInput.value = "yellow";
    els.cardLinkInput.value = "";
    els.repeatTypeInput.value = "none";
    els.repeatIntervalInput.value = 1;
  }

  updateRepeatUI();
  updateImagePreview();

  if(els.cardImageInput) els.cardImageInput.value = "";
  els.cardModal?.classList.remove("hidden");
}

function updateRepeatUI(){
  const type = els.repeatTypeInput?.value || "none";
  els.repeatIntervalWrap?.classList.toggle("hidden",type === "none" || type === "weekdays");
  els.weekdayPickerWrap?.classList.toggle("hidden",type !== "weekdays");
}

function saveCard(){
  const board = selectedBoard();
  if(!board) return;

  const title = els.cardTitleInput?.value.trim() || "";
  const content = els.cardContentInput?.value.trim() || "";

  if(!title && !content && !editingImageData){
    alert("タイトル・内容・画像のどれかを入れてください。");
    return;
  }

  const weekdays = [...document.querySelectorAll(".weekday-input:checked")]
    .map(input => Number(input.value));

  const cardData = {
    type:els.cardTypeInput.value,
    title:title || "無題",
    content,
    due:els.cardDueInput.value,
    tags:els.cardTagsInput.value.split(",").map(item => item.trim()).filter(Boolean),
    color:els.cardColorInput.value,
    link:els.cardLinkInput.value.trim(),
    image:editingImageData,
    repeat:{
      type:els.repeatTypeInput.value,
      interval:Math.max(1,Number(els.repeatIntervalInput.value) || 1),
      weekdays
    }
  };

  if(editingCardId){
    const found = findCard(editingCardId);
    if(!found) return;

    Object.assign(found.card,cardData);

    if(found.section.id !== els.cardSectionInput.value){
      found.section.cards = found.section.cards.filter(card => card.id !== editingCardId);
      const target = board.sections.find(section => section.id === els.cardSectionInput.value);
      target?.cards.push(found.card);
    }
  }else{
    const target = board.sections.find(section => section.id === els.cardSectionInput.value);
    target?.cards.push({
      id:uid(),
      ...cardData,
      selected:false,
      createdAt:Date.now()
    });
  }

  save();
  closeModal("cardModal");
  renderBoard();
}

function closeModal(id){
  $(id)?.classList.add("hidden");
}

function readImage(file,callback){
  if(!file) return;

  if(file.size > 2_000_000){
    alert("画像が大きめです。保存容量を圧迫する可能性があります。");
  }

  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function updateImagePreview(){
  els.imagePreviewWrap?.classList.toggle("hidden",!editingImageData);
  if(editingImageData && els.imagePreview){
    els.imagePreview.src = editingImageData;
  }
}

/* =========================
   ARCHIVE
========================= */

function renderArchive(){
  if(!els.archiveList) return;

  const query = (els.archiveSearchInput?.value || "").trim().toLowerCase();
  const currentFilter = els.archiveBoardFilter?.value || "";

  const boardOptions = [...new Map(
    data.archive
      .filter(item => item.boardId && item.boardName)
      .map(item => [item.boardId,item.boardName])
  )];

  if(els.archiveBoardFilter){
    els.archiveBoardFilter.innerHTML =
      `<option value="">すべてのボード</option>` +
      boardOptions.map(([id,name]) => `<option value="${id}">${esc(name)}</option>`).join("");
    els.archiveBoardFilter.value = currentFilter;
  }

  const items = data.archive.filter(item => {
    const haystack = [item.title,item.content,item.boardName,...(item.tags || [])]
      .join(" ")
      .toLowerCase();

    return (!query || haystack.includes(query)) &&
      (!currentFilter || item.boardId === currentFilter);
  });

  els.archiveList.innerHTML = items.length
    ? items.map(item => `
      <article class="archive-card">
        <h3>✅ ${esc(item.title)}</h3>
        <p>${esc(item.content || "")}</p>
        <p>
          <small>
            ${esc(item.boardName || "")} / ${esc(item.sectionName || "")}<br>
            ${new Date(item.completedAt).toLocaleString("ja-JP")}
          </small>
        </p>
        <div class="archive-actions">
          <button class="secondary-button" onclick="restoreArchive('${item.id}')">戻す</button>
          <button class="danger-outline-button" onclick="deleteArchive('${item.id}')">削除</button>
        </div>
      </article>
    `).join("")
    : "<p>完了したタスクはまだありません。</p>";
}

window.restoreArchive = id => {
  const archived = data.archive.find(item => item.id === id);
  if(!archived) return;

  let board = data.boards.find(item => item.id === archived.boardId) || data.boards[0];
  let section = board.sections.find(item => item.name === archived.sectionName) || board.sections[0];

  if(!section){
    section = {id:uid(),name:"未分類",cards:[]};
    board.sections.push(section);
  }

  const restored = deepClone(archived);
  delete restored.boardId;
  delete restored.boardName;
  delete restored.sectionName;
  delete restored.completedAt;
  restored.selected = false;

  section.cards.push(restored);
  data.archive = data.archive.filter(item => item.id !== id);

  save();
  renderArchive();
};

window.deleteArchive = id => {
  if(!confirm("この完了記録を削除しますか？")) return;
  data.archive = data.archive.filter(item => item.id !== id);
  save();
  renderArchive();
};

/* =========================
   FREEBOARD + UNDO/REDO
========================= */

function freeSnapshot(){
  return deepClone({
    freePages:data.freePages,
    selectedFreePageId:data.selectedFreePageId
  });
}

function sameSnapshot(a,b){
  return JSON.stringify(a) === JSON.stringify(b);
}

function recordFree(before){
  if(freeHistoryLock || !before) return;

  const now = freeSnapshot();
  if(sameSnapshot(before,now)) return;

  freeUndo.push(before);
  if(freeUndo.length > 40) freeUndo.shift();
  freeRedo = [];
  updateFreeHistoryButtons();
}

function restoreFree(snapshot){
  freeHistoryLock = true;
  data.freePages = deepClone(snapshot.freePages);
  data.selectedFreePageId = snapshot.selectedFreePageId;
  save();
  renderFreeboard();
  freeHistoryLock = false;
  updateFreeHistoryButtons();
}

function updateFreeHistoryButtons(){
  els.undoFreeboardButton?.classList.toggle("free-history-disabled",!freeUndo.length);
  els.redoFreeboardButton?.classList.toggle("free-history-disabled",!freeRedo.length);
}

function undoFreeboard(){
  if(!freeUndo.length) return;
  const current = freeSnapshot();
  const previous = freeUndo.pop();
  freeRedo.push(current);
  restoreFree(previous);
}

function redoFreeboard(){
  if(!freeRedo.length) return;
  const current = freeSnapshot();
  const next = freeRedo.pop();
  freeUndo.push(current);
  restoreFree(next);
}

function renderFreeboard(){
  const page = selectedFreePage();
  if(!page || !els.freeCanvas) return;

  updateFreeHistoryButtons();

  if(els.freePageTabs){
    els.freePageTabs.innerHTML = "";

    data.freePages.forEach(item => {
      const tab = document.createElement("button");
      tab.className = "free-page-tab" + (item.id === page.id ? " active" : "");
      tab.textContent = item.name;
      tab.onclick = () => {
        data.selectedFreePageId = item.id;
        save();
        renderFreeboard();
      };
      els.freePageTabs.appendChild(tab);
    });
  }

  els.freeCanvas.innerHTML = "";

  page.items.forEach(item => {
    const card = document.createElement("div");
    card.className = `free-item ${item.type === "image" ? "free-image" : "free-note"}`;
    card.style.left = `${item.x}px`;
    card.style.top = `${item.y}px`;
    card.style.width = `${item.width}px`;
    card.style.height = `${item.height}px`;

    const toolbar = document.createElement("div");
    toolbar.className = "free-item-toolbar";

    const label = document.createElement("span");
    label.className = "free-drag-label";
    label.textContent = item.type === "image" ? "画像" : "付箋";

    const del = document.createElement("button");
    del.className = "free-delete";
    del.type = "button";
    del.textContent = "×";
    del.title = "削除";
    del.onclick = event => {
      event.stopPropagation();
      const before = freeSnapshot();
      page.items = page.items.filter(value => value.id !== item.id);
      save();
      recordFree(before);
      renderFreeboard();
    };

    toolbar.append(label,del);

    const body = document.createElement("div");
    body.className = "free-item-body";

    if(item.type === "image"){
      const image = document.createElement("img");
      image.src = item.content;
      image.alt = "";
      body.appendChild(image);
    }else{
      body.textContent = item.content;
      body.ondblclick = event => {
        event.stopPropagation();
        const next = prompt("付箋を編集",item.content);
        if(next !== null && next !== item.content){
          const before = freeSnapshot();
          item.content = next;
          save();
          recordFree(before);
          renderFreeboard();
        }
      };
    }

    card.append(toolbar,body);

    // Drag from toolbar only.
    let dragging = false;
    let sx = 0;
    let sy = 0;
    let ox = 0;
    let oy = 0;
    let dragBefore = null;

    toolbar.addEventListener("pointerdown",event => {
      if(event.target.closest("button")) return;

      dragging = true;
      dragBefore = freeSnapshot();
      sx = event.clientX;
      sy = event.clientY;
      ox = item.x;
      oy = item.y;

      card.style.zIndex = "20";
      try{ toolbar.setPointerCapture(event.pointerId); }catch{}
    });

    toolbar.addEventListener("pointermove",event => {
      if(!dragging) return;

      item.x = Math.max(0,ox + event.clientX - sx);
      item.y = Math.max(0,oy + event.clientY - sy);

      card.style.left = `${item.x}px`;
      card.style.top = `${item.y}px`;
    });

    toolbar.addEventListener("pointerup",() => {
      if(!dragging) return;
      dragging = false;
      card.style.zIndex = "";
      save();
      recordFree(dragBefore);
    });

    // Native CSS resize. Save final size and add one history entry.
    let resizeBefore = null;
    let resizeTimer = null;

    card.addEventListener("pointerdown",event => {
      const rect = card.getBoundingClientRect();
      const nearResizeHandle =
        event.clientX > rect.right - 30 &&
        event.clientY > rect.bottom - 30;

      if(nearResizeHandle){
        resizeBefore = freeSnapshot();

        document.addEventListener("pointerup",() => {
          setTimeout(() => {
            save();
            recordFree(resizeBefore);
            resizeBefore = null;
          },80);
        },{once:true});
      }
    });

    if("ResizeObserver" in window){
      const observer = new ResizeObserver(entries => {
        for(const entry of entries){
          item.width = Math.max(140,Math.round(entry.contentRect.width));
          item.height = Math.max(95,Math.round(entry.contentRect.height));
        }
        save();

        if(resizeBefore){
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => save(),100);
        }
      });

      observer.observe(card);
    }

    els.freeCanvas.appendChild(card);
  });
}

/* =========================
   QUICK MEMOS
========================= */

function ensureQuickMemo(){
  if(data.quickMemos.length) return;

  const memo = {id:uid(),title:"",content:"",updatedAt:Date.now()};
  data.quickMemos.push(memo);
  data.selectedQuickMemoId = memo.id;
  save();
}

function renderQuickMemos(){
  ensureQuickMemo();

  const current = selectedQuickMemo();
  if(!current) return;

  if(els.quickMemoList){
    els.quickMemoList.innerHTML = "";

    [...data.quickMemos]
      .sort((a,b) => b.updatedAt - a.updatedAt)
      .forEach(memo => {
        const button = document.createElement("button");
        button.className = "quick-memo-list-item" + (memo.id === current.id ? " active" : "");
        button.innerHTML = `
          <strong>${esc(memo.title || "無題")}</strong>
          <small>${new Date(memo.updatedAt).toLocaleString("ja-JP")}</small>
        `;
        button.onclick = () => {
          data.selectedQuickMemoId = memo.id;
          save();
          renderQuickMemos();
        };
        els.quickMemoList.appendChild(button);
      });
  }

  if(els.quickMemoTitle) els.quickMemoTitle.value = current.title || "";
  if(els.quickMemoContent) els.quickMemoContent.value = current.content || "";
  if(els.quickMemoSavedLabel) els.quickMemoSavedLabel.textContent = "自動保存";
}

let quickMemoSaveTimer = null;

function saveQuickMemoFromEditor(){
  const memo = selectedQuickMemo();
  if(!memo) return;

  memo.title = els.quickMemoTitle?.value || "";
  memo.content = els.quickMemoContent?.value || "";
  memo.updatedAt = Date.now();

  save();

  if(els.quickMemoSavedLabel){
    els.quickMemoSavedLabel.textContent = "保存しました";
    clearTimeout(quickMemoSaveTimer);
    quickMemoSaveTimer = setTimeout(() => {
      els.quickMemoSavedLabel.textContent = "自動保存";
    },900);
  }
}

/* =========================
   GOAL BUILDER
========================= */

function goalProgress(goal){
  const blocks = goal.blocks || [];
  if(!blocks.length) return 0;

  const done = blocks.filter(block => block.done).length;
  return Math.round((done / blocks.length) * 100);
}

function renderGoalTowers(){
  if(!els.goalTowerList) return;

  els.goalTowerList.innerHTML = "";

  if(!data.goalTowers.length){
    els.goalTowerList.innerHTML =
      `<section class="panel"><p>まだ目標がありません。「＋ 目標を作る」から始められます。</p></section>`;
    return;
  }

  data.goalTowers.forEach(goal => {
    const blocks = goal.blocks || [];
    const progress = goalProgress(goal);
    const allDone = blocks.length > 0 && blocks.every(block => block.done);

    const wrap = document.createElement("article");
    wrap.className = "goal-tower";

    wrap.innerHTML = `
      <div class="goal-tower-head">
        <div>
          <h3 class="goal-tower-title">${esc(goal.name)}</h3>
          <div class="goal-meta">
            ${goal.due ? `期限 ${goal.due}` : "期限なし"}
            ${goal.note ? ` / ${esc(goal.note)}` : ""}
          </div>
        </div>
        <div class="goal-head-actions">
          <button type="button" data-goal-edit="${goal.id}" title="目標を編集">✎</button>
          <button type="button" data-goal-delete="${goal.id}" title="目標を削除">×</button>
        </div>
      </div>

      <div class="goal-finish">🏁 ${esc(goal.name)}</div>

      <div class="goal-path">
        ${
          blocks.length
            ? blocks.map((block,index) => `
              <div class="goal-block ${block.done ? "done" : ""}">
                <button
                  type="button"
                  class="goal-block-number"
                  data-block-toggle="${goal.id}:${block.id}"
                  title="完了を切り替え"
                >${block.done ? "✓" : index + 1}</button>

                <div class="goal-block-title">${esc(block.title)}</div>

                <div class="goal-block-actions">
                  <button type="button" data-block-edit="${goal.id}:${block.id}" title="編集">✎</button>
                  <button type="button" data-block-delete="${goal.id}:${block.id}" title="削除">×</button>
                </div>
              </div>
            `).join("")
            : `<div class="goal-empty-blocks">まだブロックがありません。</div>`
        }
      </div>

      <button type="button" class="goal-add-block" data-block-add="${goal.id}">
        ＋ 必要なブロックを積む
      </button>

      <div class="goal-progress-wrap">
        <div class="goal-progress-line">
          <div class="goal-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="goal-progress-label">
          <span>${blocks.filter(block => block.done).length}/${blocks.length} ブロック</span>
          <strong>${progress}%</strong>
        </div>
      </div>

      <button
        type="button"
        class="goal-complete-button"
        data-goal-complete="${goal.id}"
        ${allDone ? "" : "disabled"}
      >🏆 この目標を達成にする</button>

      ${allDone ? "" : `<p class="goal-complete-hint">すべてのブロックを完了すると達成できます</p>`}
    `;

    els.goalTowerList.appendChild(wrap);
  });

  bindGoalActions();
}

function bindGoalActions(){
  document.querySelectorAll("[data-goal-edit]").forEach(button => {
    button.onclick = () => editGoal(button.dataset.goalEdit);
  });

  document.querySelectorAll("[data-goal-delete]").forEach(button => {
    button.onclick = () => deleteGoal(button.dataset.goalDelete);
  });

  document.querySelectorAll("[data-block-add]").forEach(button => {
    button.onclick = () => addGoalBlock(button.dataset.blockAdd);
  });

  document.querySelectorAll("[data-block-toggle]").forEach(button => {
    button.onclick = () => {
      const [goalId,blockId] = button.dataset.blockToggle.split(":");
      toggleGoalBlock(goalId,blockId);
    };
  });

  document.querySelectorAll("[data-block-edit]").forEach(button => {
    button.onclick = () => {
      const [goalId,blockId] = button.dataset.blockEdit.split(":");
      editGoalBlock(goalId,blockId);
    };
  });

  document.querySelectorAll("[data-block-delete]").forEach(button => {
    button.onclick = () => {
      const [goalId,blockId] = button.dataset.blockDelete.split(":");
      deleteGoalBlock(goalId,blockId);
    };
  });

  document.querySelectorAll("[data-goal-complete]").forEach(button => {
    button.onclick = () => completeGoal(button.dataset.goalComplete);
  });
}

function addGoal(){
  const name = prompt("目標名");
  if(!name?.trim()) return;

  const due = prompt("期限（任意 / YYYY-MM-DD）","") ?? "";
  const note = prompt("補足（任意）","") ?? "";

  data.goalTowers.push({
    id:uid(),
    name:name.trim(),
    due:/^\d{4}-\d{2}-\d{2}$/.test(due) ? due : "",
    note:note.trim(),
    blocks:[]
  });

  save();
  renderGoalTowers();
}

function editGoal(id){
  const goal = data.goalTowers.find(item => item.id === id);
  if(!goal) return;

  const name = prompt("目標名",goal.name);
  if(name === null) return;

  const due = prompt("期限（任意 / YYYY-MM-DD）",goal.due || "");
  if(due === null) return;

  const note = prompt("補足（任意）",goal.note || "");
  if(note === null) return;

  if(name.trim()) goal.name = name.trim();
  goal.due = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : "";
  goal.note = note.trim();

  save();
  renderGoalTowers();
}

function deleteGoal(id){
  const goal = data.goalTowers.find(item => item.id === id);
  if(!goal) return;

  if(!confirm(`「${goal.name}」を削除しますか？`)) return;

  data.goalTowers = data.goalTowers.filter(item => item.id !== id);
  save();
  renderGoalTowers();
}

function addGoalBlock(goalId){
  const goal = data.goalTowers.find(item => item.id === goalId);
  if(!goal) return;

  const title = prompt("この目標に必要なこと");
  if(!title?.trim()) return;

  goal.blocks.push({id:uid(),title:title.trim(),done:false});
  save();
  renderGoalTowers();
}

function toggleGoalBlock(goalId,blockId){
  const goal = data.goalTowers.find(item => item.id === goalId);
  const block = goal?.blocks.find(item => item.id === blockId);
  if(!block) return;

  block.done = !block.done;
  save();
  renderGoalTowers();
}

function editGoalBlock(goalId,blockId){
  const goal = data.goalTowers.find(item => item.id === goalId);
  const block = goal?.blocks.find(item => item.id === blockId);
  if(!block) return;

  const title = prompt("ブロック内容",block.title);
  if(title?.trim()){
    block.title = title.trim();
    save();
    renderGoalTowers();
  }
}

function deleteGoalBlock(goalId,blockId){
  const goal = data.goalTowers.find(item => item.id === goalId);
  if(!goal) return;

  if(!confirm("このブロックを削除しますか？")) return;

  goal.blocks = goal.blocks.filter(item => item.id !== blockId);
  save();
  renderGoalTowers();
}

function completeGoal(id){
  const goal = data.goalTowers.find(item => item.id === id);
  if(!goal) return;

  const blocks = goal.blocks || [];

  if(!blocks.length || !blocks.every(block => block.done)){
    alert("すべてのブロックを完了してから達成にできます。");
    return;
  }

  if(!confirm(`「${goal.name}」を達成した目標に移しますか？`)) return;

  data.achievedGoals.unshift({
    ...deepClone(goal),
    achievedAt:new Date().toISOString()
  });

  data.goalTowers = data.goalTowers.filter(item => item.id !== id);
  save();

  const toast = document.createElement("div");
  toast.className = "completion-toast";
  toast.innerHTML = data.settings.theme === "dopaboy"
    ? `GOAL CLEAR!<small>${esc(goal.name)} を達成しました</small>`
    : `🏆 目標達成<small>${esc(goal.name)} を「達成した目標」に保存しました</small>`;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(),1700);

  renderGoalTowers();
}

function renderAchievedGoals(){
  if(!els.achievedGoalList) return;

  const items = [...data.achievedGoals]
    .sort((a,b) => new Date(b.achievedAt) - new Date(a.achievedAt));

  const month = new Date().toISOString().slice(0,7);

  if(els.achievedGoalCount) els.achievedGoalCount.textContent = items.length;
  if(els.achievedGoalMonthCount){
    els.achievedGoalMonthCount.textContent =
      items.filter(item => (item.achievedAt || "").startsWith(month)).length;
  }

  els.achievedGoalList.innerHTML = items.length
    ? items.map(item => `
      <article class="achieved-goal-card">
        <h3>🏆 ${esc(item.name)}</h3>
        <div class="achieved-goal-meta">
          ${item.due ? `設定期限：${item.due}<br>` : ""}
          達成日：${new Date(item.achievedAt).toLocaleString("ja-JP")}
          ${item.note ? `<br>${esc(item.note)}` : ""}
        </div>

        <div class="achieved-goal-blocks">
          ${(item.blocks || []).map(block =>
            `<span class="achieved-goal-block">✓ ${esc(block.title)}</span>`
          ).join("")}
        </div>

        <div class="achieved-goal-actions">
          <button class="secondary-button" onclick="restoreAchievedGoal('${item.id}')">目標ビルダーに戻す</button>
          <button class="danger-outline-button" onclick="deleteAchievedGoal('${item.id}')">削除</button>
        </div>
      </article>
    `).join("")
    : `<section class="panel"><p>達成した目標はまだありません。</p></section>`;
}

window.restoreAchievedGoal = id => {
  const item = data.achievedGoals.find(goal => goal.id === id);
  if(!item) return;

  if(!confirm(`「${item.name}」を目標ビルダーに戻しますか？`)) return;

  const restored = deepClone(item);
  delete restored.achievedAt;

  data.goalTowers.push(restored);
  data.achievedGoals = data.achievedGoals.filter(goal => goal.id !== id);
  save();
  renderAchievedGoals();
};

window.deleteAchievedGoal = id => {
  if(!confirm("この達成記録を削除しますか？")) return;

  data.achievedGoals = data.achievedGoals.filter(goal => goal.id !== id);
  save();
  renderAchievedGoals();
};

/* =========================
   BACKUP / SETTINGS / MOBILE
========================= */

function exportData(){
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `task-kanrinner-${localDate()}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
}

function closeMobileSidebar(){
  document.querySelector(".sidebar")?.classList.remove("open");
}

function bindEvents(){
  if(els.addBoardButton) els.addBoardButton.onclick = addBoard;
  if(els.boardNameInput){
    els.boardNameInput.onkeydown = event => {
      if(event.key === "Enter") addBoard();
    };
  }

  const viewButtons = {
    todayButton:"today",
    homeButton:"home",
    archiveButton:"archive",
    freeboardButton:"freeboard",
    memoButton:"memo",
    milestoneButton:"milestone",
    achievedGoalsButton:"achievedGoals"
  };

  Object.entries(viewButtons).forEach(([id,view]) => {
    if(els[id]){
      els[id].onclick = () => {
        showView(view);
        closeMobileSidebar();
      };
    }
  });

  if(els.settingsButton){
    els.settingsButton.onclick = () => els.settingsModal?.classList.remove("hidden");
  }

  if(els.addSectionButton) els.addSectionButton.onclick = addSection;
  if(els.addCardButton) els.addCardButton.onclick = () => openCardModal();
  if(els.completeSelectedButton) els.completeSelectedButton.onclick = completeSelected;
  if(els.completeSelectedBarButton) els.completeSelectedBarButton.onclick = completeSelected;
  if(els.clearSelectionButton) els.clearSelectionButton.onclick = clearSelection;
  if(els.deleteBoardButton) els.deleteBoardButton.onclick = deleteBoard;

  if(els.currentBoardTitle){
    els.currentBoardTitle.onblur = () => {
      const board = selectedBoard();
      const value = els.currentBoardTitle.textContent.trim();

      if(board && value){
        board.name = value;
        save();
        renderSidebar();
      }else if(board){
        els.currentBoardTitle.textContent = board.name;
      }
    };
  }

  [els.searchInput,els.tagFilter,els.statusFilter,els.sortSelect]
    .filter(Boolean)
    .forEach(element => element.addEventListener("input",renderBoard));

  [els.archiveSearchInput,els.archiveBoardFilter]
    .filter(Boolean)
    .forEach(element => element.addEventListener("input",renderArchive));

  if(els.calendarPrevButton){
    els.calendarPrevButton.onclick = () => {
      calendarCursor.setMonth(calendarCursor.getMonth() - 1);
      renderCalendar();
    };
  }

  if(els.calendarNextButton){
    els.calendarNextButton.onclick = () => {
      calendarCursor.setMonth(calendarCursor.getMonth() + 1);
      renderCalendar();
    };
  }

  if(els.calendarTodayButton){
    els.calendarTodayButton.onclick = () => {
      calendarCursor = new Date();
      calendarCursor.setDate(1);
      selectedCalendarDate = localDate();
      renderCalendar();
    };
  }

  if(els.saveCardButton) els.saveCardButton.onclick = saveCard;
  if(els.repeatTypeInput) els.repeatTypeInput.onchange = updateRepeatUI;

  if(els.cardImageInput){
    els.cardImageInput.onchange = event => {
      readImage(event.target.files[0],dataUrl => {
        editingImageData = dataUrl;
        updateImagePreview();
      });
    };
  }

  if(els.removeImageButton){
    els.removeImageButton.onclick = () => {
      editingImageData = "";
      updateImagePreview();
    };
  }

  document.querySelectorAll("[data-close]").forEach(element => {
    element.onclick = () => closeModal(element.dataset.close);
  });

  if(els.themeSelect){
    els.themeSelect.onchange = () => {
      data.settings.theme = els.themeSelect.value;
      save();
      applySettings();
      renderCurrentView();
    };
  }

  if(els.accentColorInput){
    els.accentColorInput.oninput = () => {
      data.settings.accent = els.accentColorInput.value;
      save();
      applySettings();
    };
  }

  if(els.densitySelect){
    els.densitySelect.onchange = () => {
      data.settings.density = els.densitySelect.value;
      save();
      applySettings();
    };
  }

  if(els.exportButton) els.exportButton.onclick = exportData;

  if(els.importInput){
    els.importInput.onchange = event => {
      const file = event.target.files[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try{
          const imported = JSON.parse(reader.result);
          data = normalizeData(imported);
          save();

          freeUndo = [];
          freeRedo = [];

          renderAll();
          alert("読み込みました。");
        }catch(error){
          console.error(error);
          alert("読み込めないファイルです。");
        }
      };
      reader.readAsText(file);
    };
  }

  if(els.undoFreeboardButton) els.undoFreeboardButton.onclick = undoFreeboard;
  if(els.redoFreeboardButton) els.redoFreeboardButton.onclick = redoFreeboard;

  if(els.addFreePageButton){
    els.addFreePageButton.onclick = () => {
      const name = prompt("新しい自由帳のページ名","自由帳" + (data.freePages.length + 1));
      if(!name?.trim()) return;

      const before = freeSnapshot();
      const page = {id:uid(),name:name.trim(),items:[]};

      data.freePages.push(page);
      data.selectedFreePageId = page.id;

      save();
      recordFree(before);
      renderFreeboard();
    };
  }

  if(els.renameFreePageButton){
    els.renameFreePageButton.onclick = () => {
      const page = selectedFreePage();
      if(!page) return;

      const name = prompt("ページ名",page.name);
      if(name?.trim() && name.trim() !== page.name){
        const before = freeSnapshot();
        page.name = name.trim();
        save();
        recordFree(before);
        renderFreeboard();
      }
    };
  }

  if(els.addFreeNoteButton){
    els.addFreeNoteButton.onclick = () => {
      const text = prompt("付箋に書く内容");
      if(!text) return;

      const before = freeSnapshot();

      selectedFreePage().items.push({
        id:uid(),
        type:"note",
        content:text,
        x:40,
        y:40,
        width:220,
        height:150
      });

      save();
      recordFree(before);
      renderFreeboard();
    };
  }

  if(els.freeImageInput){
    els.freeImageInput.onchange = event => {
      readImage(event.target.files[0],dataUrl => {
        const before = freeSnapshot();

        selectedFreePage().items.push({
          id:uid(),
          type:"image",
          content:dataUrl,
          x:60,
          y:60,
          width:280,
          height:220
        });

        save();
        recordFree(before);
        renderFreeboard();
        event.target.value = "";
      });
    };
  }

  if(els.clearFreeboardButton){
    els.clearFreeboardButton.onclick = () => {
      const page = selectedFreePage();
      if(!page) return;

      if(confirm(`「${page.name}」の中身をすべて消しますか？`)){
        const before = freeSnapshot();
        page.items = [];
        save();
        recordFree(before);
        renderFreeboard();
      }
    };
  }

  if(els.addQuickMemoButton){
    els.addQuickMemoButton.onclick = () => {
      const memo = {id:uid(),title:"",content:"",updatedAt:Date.now()};
      data.quickMemos.push(memo);
      data.selectedQuickMemoId = memo.id;
      save();
      renderQuickMemos();
      els.quickMemoTitle?.focus();
    };
  }

  els.quickMemoTitle?.addEventListener("input",saveQuickMemoFromEditor);
  els.quickMemoContent?.addEventListener("input",saveQuickMemoFromEditor);

  if(els.deleteQuickMemoButton){
    els.deleteQuickMemoButton.onclick = () => {
      const memo = selectedQuickMemo();
      if(!memo) return;

      if(confirm("このメモを削除しますか？")){
        data.quickMemos = data.quickMemos.filter(item => item.id !== memo.id);
        data.selectedQuickMemoId = data.quickMemos[0]?.id || null;
        save();
        renderQuickMemos();
      }
    };
  }

  if(els.addGoalButton) els.addGoalButton.onclick = addGoal;

  if(els.mobileMenuButton){
    els.mobileMenuButton.onclick = () => {
      document.querySelector(".sidebar")?.classList.toggle("open");
    };
  }

  document.addEventListener("click",event => {
    if(window.innerWidth > 900) return;

    const insideSidebar = event.target.closest(".sidebar");
    const menuButton = event.target.closest("#mobileMenuButton");

    if(!insideSidebar && !menuButton){
      closeMobileSidebar();
    }
  });

  document.addEventListener("keydown",event => {
    if(event.key === "Escape"){
      closeModal("cardModal");
      closeModal("settingsModal");
      closeMobileSidebar();
    }
  });
}

/* PWA install */
window.addEventListener("beforeinstallprompt",event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installAppButton?.classList.remove("hidden");
});

window.addEventListener("appinstalled",() => {
  deferredInstallPrompt = null;
  els.installAppButton?.classList.add("hidden");
});

if(els.installAppButton){
  els.installAppButton.onclick = async () => {
    if(!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;

    deferredInstallPrompt = null;
    els.installAppButton.classList.add("hidden");
  };
}

bindEvents();
save();
renderAll();
