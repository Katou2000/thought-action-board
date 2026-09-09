/* Focused UI refinements: boards, scheduled lightweight tasks, utility controls, and routines. */
(()=>{
  "use strict";
  const get=id=>document.getElementById(id);
  const history=window.taskKanrinnerHistory;
  const BOARD_HISTORY_KEYS=["boards","recent","selectedBoardId"];
  let boardFilter="all",routineFilter="all",draggedBoardId=null;

  data.settings.utilityBarMode=["always","desktop","mobile","hidden"].includes(data.settings.utilityBarMode)?data.settings.utilityBarMode:"always";
  ["utilitySearchVisible","utilityHistoryVisible","utilityHelpVisible","utilityAddVisible"].forEach(key=>{
    if(typeof data.settings[key]!=="boolean")data.settings[key]=true
  });

  function applyUtilitySettings(){
    document.body.dataset.utilityBarMode=data.settings.utilityBarMode;
    get("utilityBarModeSelect").value=data.settings.utilityBarMode;
    const entries=[
      ["utilitySearchVisible","utilitySearchToggle",document.querySelector(".utility-search")],
      ["utilityHistoryVisible","utilityHistoryToggle",null],
      ["utilityHelpVisible","utilityHelpToggle",get("helpButton")],
      ["utilityAddVisible","utilityAddToggle",get("utilityAddButton")]
    ];
    entries.forEach(([key,toggle,element])=>{get(toggle).checked=data.settings[key];if(element)element.classList.toggle("utility-user-hidden",!data.settings[key])});
    [get("undoButton"),get("redoButton")].forEach(button=>button.classList.toggle("utility-user-hidden",!data.settings.utilityHistoryVisible));
    if(!data.settings.utilitySearchVisible)get("sidebarGlobalSearchClose")?.click()
  }
  get("utilityBarModeSelect").onchange=event=>{data.settings.utilityBarMode=event.target.value;save();applyUtilitySettings()};
  [["utilitySearchToggle","utilitySearchVisible"],["utilityHistoryToggle","utilityHistoryVisible"],["utilityHelpToggle","utilityHelpVisible"],["utilityAddToggle","utilityAddVisible"]].forEach(([id,key])=>{
    get(id).onchange=event=>{data.settings[key]=event.target.checked;save();applyUtilitySettings()}
  });

  function closeCreateMenu(){const menu=get("quickAddMenu");menu.classList.add("hidden");menu.classList.remove("utility-origin");menu.style.removeProperty("--menu-top");menu.style.removeProperty("--menu-right")}
  function openCreateMenu(origin,event){
    event?.stopPropagation();const menu=get("quickAddMenu"),opening=menu.classList.contains("hidden")||menu.dataset.origin!==origin;
    closeCreateMenu();if(!opening)return;menu.dataset.origin=origin;
    if(origin==="utility"){const rect=get("utilityAddButton").getBoundingClientRect();menu.classList.add("utility-origin");menu.style.setProperty("--menu-top",`${Math.min(innerHeight-20,rect.bottom+8)}px`);menu.style.setProperty("--menu-right",`${Math.max(12,innerWidth-rect.right)}px`)}
    menu.classList.remove("hidden")
  }
  function runCreateAction(action){
    closeCreateMenu();
    if(action==="light"){window.openLightTask(data.selectedBoardId);return}
    if(action==="routine"){show("routine");get("routineCreatePanel").classList.remove("hidden");setTimeout(()=>E.routineTitleInput.focus(),20);return}
    quickAction(action)
  }
  E.quickAddFab.onclick=event=>openCreateMenu("fab",event);
  E.utilityAddButton.onclick=event=>openCreateMenu("utility",event);
  qa("[data-quick-action]").forEach(button=>button.onclick=event=>{event.stopPropagation();runCreateAction(button.dataset.quickAction)});
  get("addLightTaskButton").onclick=()=>window.openLightTask(data.selectedBoardId);

  function boardTaskCount(boardValue){
    const normal=boardValue.sections.reduce((sum,section)=>sum+section.cards.filter(card=>card.type==="task").length,0);
    return normal+data.quickTasks.filter(task=>task.boardId===boardValue.id&&!task.completed).length
  }
  function boardHistoryBefore(){return history?.snapshot(BOARD_HISTORY_KEYS)}
  function finishBoardHistory(label,before){save();renderBoards();if(data.view==="board")renderBoard();if(data.view==="shortcuts")renderShortcuts();history?.pushHistory(label,BOARD_HISTORY_KEYS,before)}
  function moveBoard(id,direction){
    const index=data.boards.findIndex(boardValue=>boardValue.id===id),next=index+direction;if(index<0||next<0||next>=data.boards.length)return;
    const before=boardHistoryBefore();[data.boards[index],data.boards[next]]=[data.boards[next],data.boards[index]];finishBoardHistory("ボードを並び替え",before)
  }
  function reorderBoard(sourceId,targetId){
    if(!sourceId||!targetId||sourceId===targetId)return;const from=data.boards.findIndex(b=>b.id===sourceId),to=data.boards.findIndex(b=>b.id===targetId);if(from<0||to<0)return;
    const before=boardHistoryBefore(),[moved]=data.boards.splice(from,1);data.boards.splice(to,0,moved);finishBoardHistory("ボードを並び替え",before)
  }
  function renderBoardOverviewTasks(){
    if(boardFilter!=="all"&&!data.boards.some(b=>b.id===boardFilter))boardFilter="all";
    const filters=get("boardOverviewFilters"),list=get("boardOverviewTaskList");filters.innerHTML="";
    [{id:"all",name:"すべて"},...data.boards].forEach(item=>{const button=document.createElement("button");button.type="button";button.className=item.id===boardFilter?"active":"";button.textContent=item.name;button.onclick=()=>{boardFilter=item.id;renderBoardOverviewTasks()};filters.appendChild(button)});
    const normal=cards().filter(card=>card.type==="task"&&(boardFilter==="all"||card.boardId===boardFilter)).map(card=>({kind:"normal",id:card.id,title:card.title,boardId:card.boardId,boardName:card.boardName,sectionName:card.sectionName,date:card.plannedDate||card.due||"",pinned:card.pinned}));
    const light=data.quickTasks.filter(task=>!task.completed&&(boardFilter==="all"||task.boardId===boardFilter)).map(task=>{const boardValue=data.boards.find(b=>b.id===task.boardId);return{kind:"light",id:task.id,title:task.title,boardId:task.boardId,boardName:boardValue?.name||"ボードなし",sectionName:"軽量タスク",date:task.plannedDate,pinned:false}});
    const items=[...normal,...light].sort((a,b)=>(a.date||"9999-99-99").localeCompare(b.date||"9999-99-99")||a.title.localeCompare(b.title,"ja"));list.innerHTML="";
    items.forEach(item=>{const row=document.createElement("article");row.className=`board-task-row ${item.kind}`;const done=document.createElement("button");done.type="button";done.className="board-task-check";done.textContent="□";done.setAttribute("aria-label",`${item.title}を完了`);done.onclick=()=>item.kind==="light"?window.completeLightTask(item.id):window.completeOne(item.id);const main=document.createElement(item.kind==="light"?"span":"button");if(item.kind!=="light")main.type="button";main.className="board-task-main";main.innerHTML=`<strong>${item.pinned?"📌 ":""}${esc(item.title)}</strong><small>${esc(item.boardName)} / ${esc(item.sectionName)}${item.date?` / ${esc(item.date.slice(5).replace("-","/"))}`:""}</small>`;if(item.kind!=="light")main.onclick=()=>window.openCardAny(item.id);const kind=document.createElement("span");kind.className="board-task-kind";kind.textContent=item.kind==="light"?"軽量":"タスク";row.append(done,main,kind);list.appendChild(row)});
    if(!items.length)list.innerHTML='<p class="board-overview-empty">未完了タスクはありません。</p>'
  }
  renderBoards=function(){
    E.boardList.innerHTML="";
    data.boards.forEach((boardValue,index)=>{
      const row=document.createElement("article");row.className="board-overview-row";row.dataset.boardId=boardValue.id;row.draggable=innerWidth>820;
      row.ondragstart=event=>{draggedBoardId=boardValue.id;event.dataTransfer.effectAllowed="move";row.classList.add("dragging")};row.ondragend=()=>{draggedBoardId=null;row.classList.remove("dragging")};row.ondragover=event=>{if(draggedBoardId)event.preventDefault()};row.ondrop=event=>{event.preventDefault();reorderBoard(draggedBoardId,boardValue.id)};
      const main=document.createElement("button");main.type="button";main.className="board-overview-main";main.innerHTML=`<strong>📁 ${esc(boardValue.name)}</strong><small>未完了 ${boardTaskCount(boardValue)}件</small>`;main.onclick=()=>{data.selectedBoardId=boardValue.id;touchBoard(boardValue);save();show("board");closeSide()};
      const pin=document.createElement("button");pin.type="button";pin.className=`board-pin-button${boardValue.pinned?" pinned":""}`;pin.textContent=boardValue.pinned?"★":"☆";pin.setAttribute("aria-label",`${boardValue.name}を${boardValue.pinned?"ピン留め解除":"ピン留め"}`);pin.onclick=event=>{event.stopPropagation();const before=boardHistoryBefore();boardValue.pinned=!boardValue.pinned;boardValue.updatedAt=Date.now();finishBoardHistory("ボードのピンを変更",before)};
      const controls=document.createElement("div");controls.className="board-order-controls";controls.innerHTML=`<button type="button" aria-label="${esc(boardValue.name)}を上へ" ${index===0?"disabled":""}>↑</button><button type="button" aria-label="${esc(boardValue.name)}を下へ" ${index===data.boards.length-1?"disabled":""}>↓</button>`;const [up,down]=controls.querySelectorAll("button");up.onclick=event=>{event.stopPropagation();moveBoard(boardValue.id,-1)};down.onclick=event=>{event.stopPropagation();moveBoard(boardValue.id,1)};
      row.append(main,pin,controls);E.boardList.appendChild(row)
    });renderBoardOverviewTasks()
  };

  function renderBoardLightTasks(){
    const panel=get("boardLightTaskPanel"),list=get("boardLightTaskList"),items=data.quickTasks.filter(task=>task.boardId===data.selectedBoardId&&!task.completed).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate));
    panel.classList.toggle("hidden",!items.length);get("boardLightTaskCount").textContent=String(items.length);list.innerHTML=items.map(task=>`<article class="board-task-row light"><button class="board-task-check" type="button" onclick="completeLightTask('${task.id}')" aria-label="${esc(task.title)}を完了">□</button><span class="board-task-main"><strong>${esc(task.title)}</strong><small>${esc(task.plannedDate.slice(5).replace("-","/"))}予定</small></span><button class="quick-task-delete" type="button" onclick="deleteLightTask('${task.id}')" aria-label="${esc(task.title)}を削除">×</button></article>`).join("")
  }
  const baseRenderBoard=renderBoard;
  renderBoard=function(){baseRenderBoard();renderBoardLightTasks()};

  function filteredRoutines(){if(routineFilter==="paused")return data.routines.filter(r=>r.paused);if(routineFilter==="all")return data.routines;return data.routines.filter(r=>r.rule===routineFilter)}
  function renderRoutineToday(){
    const key=getRoutineLogicalDate(),stats=routineStats(key),items=[...stats.applicable].sort((a,b)=>({morning:0,day:1,night:2,any:3}[a.slot]??9)-({morning:0,day:1,night:2,any:3}[b.slot]??9)||(b.pinned-a.pinned));
    get("routineTodayProgress").textContent=`${stats.done.length} / ${stats.total}`;get("routineTodayList").innerHTML=items.length?items.map(r=>`<label class="routine-today-item"><input type="checkbox" ${routineDoneOn(r,key)?"checked":""} onchange="toggleRoutineDone('${r.id}')"><span><strong>${r.pinned?"📌 ":""}${esc(r.title)}</strong><small>${esc(routineSlotLabel(r.slot))}</small></span></label>`).join(""):'<p class="routine-today-empty">今日対象のルーティンはありません。</p>'
  }
  renderRoutine=function(){
    const stats=routineStats(getRoutineLogicalDate()),items=filteredRoutines();E.routineTodayCount.textContent=stats.total;E.routineDoneCount.textContent=stats.done.length;E.routineProgressPercent.textContent=stats.percent+"%";E.routineStreakMax.textContent=stats.maxStreak+"日";renderRoutineToday();
    qa("[data-routine-filter]").forEach(button=>button.classList.toggle("active",button.dataset.routineFilter===routineFilter));
    E.routineList.innerHTML=items.length?`<section class="panel routine-group"><div class="routine-card-stack">${items.map(r=>renderRoutineCard(r)).join("")}</div></section>`:'<section class="panel"><p>該当するルーティンタスクはありません。</p></section>';renderRoutineCalendar()
  };
  qa("[data-routine-filter]").forEach(button=>button.onclick=()=>{routineFilter=button.dataset.routineFilter;renderRoutine()});
  get("openRoutineCreateButton").onclick=()=>{const panel=get("routineCreatePanel"),opening=panel.classList.contains("hidden");panel.classList.toggle("hidden",!opening);if(opening)setTimeout(()=>E.routineTitleInput.focus(),20)};
  routineReflectionDate=getRoutineLogicalDate();routineCalCursor=new Date(routineReflectionDate+"T12:00:00");routineCalCursor.setDate(1);
  E.routineCalendarTodayButton.onclick=()=>{routineReflectionDate=getRoutineLogicalDate();routineCalCursor=new Date(routineReflectionDate+"T12:00:00");routineCalCursor.setDate(1);renderRoutineCalendar()};

  const baseRenderHome=renderHome;
  renderHome=function(){baseRenderHome();const key=getRoutineLogicalDate(),stats=routineStats(key),items=[...stats.applicable].sort((a,b)=>({morning:0,day:1,night:2,any:3}[a.slot]??9)-({morning:0,day:1,night:2,any:3}[b.slot]??9)||(b.pinned-a.pinned));get("homeRoutineCount").textContent=`${stats.done.length} / ${stats.total}`;get("homeRoutineList").innerHTML=items.length?items.map(r=>`<label class="home-routine-item"><input type="checkbox" ${routineDoneOn(r,key)?"checked":""} onchange="toggleRoutineDone('${r.id}')"><span><strong>${r.pinned?"📌 ":""}${esc(r.title)}</strong><small>${esc(routineSlotLabel(r.slot))}</small></span></label>`).join(""):'<div class="now-task-empty home-routine-empty"><strong>今日のルーティンはありません</strong><span>今日が対象のルーティンだけを表示します。</span></div>'};

  const baseApplyTheme=applyTheme;
  applyTheme=function(){baseApplyTheme();applyUtilitySettings()};
  addEventListener("resize",()=>{if(data.view==="boards")renderBoards();applyUtilitySettings()});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCreateMenu()});

  applyUtilitySettings();renderAll()
})();
