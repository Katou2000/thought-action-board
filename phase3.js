/* Focused UI refinements: boards, scheduled lightweight tasks, utility controls, and routines. */
(()=>{
  "use strict";
  const get=id=>document.getElementById(id);
  const history=window.taskKanrinnerHistory;
  const BOARD_HISTORY_KEYS=["boards","recent","selectedBoardId"],BOARD_DELETE_HISTORY_KEYS=[...BOARD_HISTORY_KEYS,"quickTasks","quickTaskLog","view"];
  let boardFilter="all",routineFilter="all",draggedBoardId=null,createContext={};

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

  function closeCreateMenu(){const menu=get("quickAddMenu");menu.classList.add("hidden");menu.classList.remove("utility-origin","board-task-origin");menu.style.removeProperty("--menu-top");menu.style.removeProperty("--menu-right");createContext={}}
  function openCreateMenu(origin,event,context={}){
    event?.stopPropagation();const menu=get("quickAddMenu"),opening=menu.classList.contains("hidden")||menu.dataset.origin!==origin;
    closeCreateMenu();if(!opening)return;menu.dataset.origin=origin;createContext={...context};menu.classList.toggle("board-task-origin",context.taskOnly===true);
    const anchor=event?.currentTarget||(origin==="utility"?get("utilityAddButton"):null);menu.classList.remove("hidden");
    if(anchor&&origin!=="fab"){const rect=anchor.getBoundingClientRect();menu.classList.add("utility-origin");menu.style.setProperty("--menu-top",`${Math.max(12,Math.min(innerHeight-menu.offsetHeight-12,rect.bottom+8))}px`);menu.style.setProperty("--menu-right",`${Math.max(12,innerWidth-rect.right)}px`)}
  }
  function runCreateAction(action){
    const context={...createContext};closeCreateMenu();
    if(action==="light"){window.openLightTask(context.boardId||data.selectedBoardId,context.plannedDate||localDate(),context.requireBoard===true);return}
    if(action==="routine"){show("routine");get("routineCreatePanel").classList.remove("hidden");setTimeout(()=>E.routineTitleInput.focus(),20);return}
    if(action==="task"&&(context.boardId||context.plannedDate)){if(context.plannedDate)window.openScheduledTask("date",context.plannedDate,context.boardId||null);else openCardModal(null,context.boardId);return}
    quickAction(action)
  }
  E.quickAddFab.onclick=event=>openCreateMenu("fab",event);
  E.utilityAddButton.onclick=event=>openCreateMenu("utility",event);
  qa("[data-quick-action]").forEach(button=>button.onclick=event=>{event.stopPropagation();runCreateAction(button.dataset.quickAction)});
  window.openSharedCreateMenu=(event,context={})=>openCreateMenu(`context-${context.source||"page"}`,event,context);
  window.openCalendarCreateMenu=(event,date)=>{selectedDate=date;openCreateMenu("calendar-detail",event,{source:"calendar-detail",plannedDate:date})};

  function boardTaskCount(boardValue){
    const normal=boardValue.sections.reduce((sum,section)=>sum+section.cards.filter(card=>card.type==="task").length,0);
    return normal+data.quickTasks.filter(task=>task.boardId===boardValue.id&&!task.completed).length
  }
  function quickCompletedToday(task){if(!task.completedAt)return false;const date=new Date(task.completedAt);return !Number.isNaN(date.getTime())&&localDate(date)===localDate()}
  function quickVisibleOnBoard(task){return !task.completed||task.plannedDate>=localDate()||quickCompletedToday(task)}
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
  function renameBoardFromOverview(id){
    const boardValue=data.boards.find(item=>item.id===id),name=boardValue&&prompt("ボード名",boardValue.name);if(!boardValue||!name?.trim()||name.trim()===boardValue.name)return;
    const before=boardHistoryBefore();boardValue.name=name.trim();boardValue.updatedAt=Date.now();data.recent.forEach(item=>{if(item.kind==="board"&&item.id===id)item.label=boardValue.name;if(item.boardId===id)item.detail=String(item.detail||"").replace(/^[^/]+/,boardValue.name)});finishBoardHistory("ボード名を変更",before)
  }
  function deleteBoardSafely(id){
    const target=data.boards.find(item=>item.id===id);if(!target)return;if(data.boards.length===1)return alert("最後のボードは削除できません。");
    if(!confirm(`「${target.name}」を削除します。\n中のタスクは削除されず、未分類へ移動します。`))return;
    const before=history?.snapshot(BOARD_DELETE_HISTORY_KEYS),fallback=data.boards.find(item=>item.id!==id),normal=window.boardDefaultSection?.(fallback)||fallback.sections.find(section=>section.name==="未分類")||fallback.sections[0];
    target.sections.forEach(section=>normal.cards.push(...section.cards));fallback.updatedAt=Date.now();
    data.quickTasks.forEach(task=>{if(task.boardId===id)task.boardId=fallback.id});data.quickTaskLog.forEach(task=>{if(task.boardId===id)task.boardId=fallback.id});
    data.recent.forEach(item=>{if(item.boardId===id)item.boardId=fallback.id});data.recent=data.recent.filter(item=>!(item.kind==="board"&&item.id===id));
    data.boards=data.boards.filter(item=>item.id!==id);if(data.selectedBoardId===id){data.selectedBoardId=fallback.id;data.view="boards";boardFilter="all"}else if(boardFilter===id)boardFilter="all";
    save();renderAll();history?.pushHistory("ボードを削除",BOARD_DELETE_HISTORY_KEYS,before);feedbackAction("ボードを削除",`${target.name} のタスクを ${fallback.name} / 未分類へ移動`,"delete")
  }
  function renderBoardOverviewTasks(){
    if(boardFilter!=="all"&&!data.boards.some(b=>b.id===boardFilter))boardFilter="all";
    const list=get("boardOverviewTaskList"),query=get("boardOverviewSearch").value.trim().toLocaleLowerCase("ja"),status=get("boardOverviewStatus").value;
    const normal=cards().filter(card=>card.type==="task"&&(boardFilter==="all"||card.boardId===boardFilter)).map(card=>({kind:"normal",id:card.id,title:card.title,boardId:card.boardId,boardName:card.boardName,sectionName:card.sectionName,date:card.plannedDate||card.due||"",plannedDate:card.plannedDate||"",due:card.due||"",pinned:card.pinned,selected:card.selected,color:["yellow","blue","green","pink","purple","orange","white"].includes(card.color)?card.color:"white",tags:card.tags||[],content:card.content||""}));
    const light=data.quickTasks.filter(task=>quickVisibleOnBoard(task)&&(boardFilter==="all"||task.boardId===boardFilter)).map(task=>{const boardValue=data.boards.find(b=>b.id===task.boardId);return{kind:"light",id:task.id,title:task.title,boardId:task.boardId,boardName:boardValue?.name||"ボードなし",sectionName:"軽量タスク",date:task.plannedDate,plannedDate:task.plannedDate,pinned:false,completed:task.completed}});
    let items=[...normal,...light];if(query)items=items.filter(item=>[item.title,item.content,item.boardName,item.sectionName,...(item.tags||[])].join(" ").toLocaleLowerCase("ja").includes(query));if(status==="pinned")items=items.filter(item=>item.pinned);if(status==="scheduled")items=items.filter(item=>item.date);if(status==="light")items=items.filter(item=>item.kind==="light");items.sort((a,b)=>(a.date||"9999-99-99").localeCompare(b.date||"9999-99-99")||a.title.localeCompare(b.title,"ja"));list.innerHTML="";
    items.forEach(item=>{const checked=item.kind==="light"?item.completed:item.selected,row=document.createElement("article");row.className=`board-task-row ${item.kind}${checked?" completed":""}${item.kind==="normal"?` task-color-${item.color}`:""}`;const done=document.createElement("button");done.type="button";done.className="board-task-check";done.textContent=checked?"☑":"□";done.setAttribute("aria-label",`${item.title}を${checked?"未完了に戻す":"チェック"}`);done.onclick=()=>item.kind==="light"?window.completeLightTask(item.id):window.toggleTaskSelected(item.id,!item.selected);const main=document.createElement(item.kind==="light"?"span":"button");if(item.kind!=="light")main.type="button";main.className="board-task-main";const tags=(item.tags||[]).slice(0,2).map(tag=>`<span class="tag-chip">${esc(tag)}</span>`).join("");main.innerHTML=`<strong>${item.pinned?"📌 ":""}${esc(item.title)}</strong><small>${boardFilter==="all"?`${esc(item.boardName)} / `:""}${esc(item.sectionName)}</small>${tags?`<span class="board-task-tags">${tags}</span>`:""}<span class="board-task-dates">${item.plannedDate?`<small>● ${esc(item.plannedDate.slice(5).replace("-","/"))}予定</small>`:""}${item.due?`<small>〆 ${esc(item.due.slice(5).replace("-","/"))}</small>`:""}</span>`;if(item.kind!=="light")main.onclick=()=>openCardModal(item.id);const actions=document.createElement("div");actions.className="board-task-actions";const kind=document.createElement("span");kind.className="board-task-kind";kind.textContent=item.kind==="light"?"軽量":"タスク";actions.appendChild(kind);if(item.kind==="normal"&&item.selected){const complete=document.createElement("button");complete.type="button";complete.className="success-button board-task-complete";complete.textContent="完了";complete.onclick=()=>window.completeOne(item.id);actions.appendChild(complete)}row.append(done,main,actions);list.appendChild(row)});
    if(!items.length)list.innerHTML='<p class="board-overview-empty">未完了タスクはありません。</p>'
  }
  renderBoards=function(){
    E.boardList.innerHTML="";
    const all=document.createElement("button");all.type="button";all.className=`board-switch-button${boardFilter==="all"?" active":""}`;all.innerHTML=`<strong>すべて</strong><small>${cards().filter(card=>card.type==="task").length+data.quickTasks.filter(task=>!task.completed).length}</small>`;all.onclick=()=>{boardFilter="all";renderBoards()};E.boardList.appendChild(all);
    data.boards.forEach((boardValue,index)=>{
      const row=document.createElement("article");row.className=`board-overview-row${boardFilter===boardValue.id?" active":""}`;row.dataset.boardId=boardValue.id;row.draggable=innerWidth>820;
      row.ondragstart=event=>{if(event.target.closest("button,details,summary"))return event.preventDefault();draggedBoardId=boardValue.id;event.dataTransfer.effectAllowed="move";row.classList.add("dragging")};row.ondragend=()=>{draggedBoardId=null;row.classList.remove("dragging")};row.ondragover=event=>{if(draggedBoardId)event.preventDefault()};row.ondrop=event=>{event.preventDefault();reorderBoard(draggedBoardId,boardValue.id)};
      const main=document.createElement("button");main.type="button";main.className="board-overview-main";main.innerHTML=`<strong>${esc(boardValue.name)}</strong><small>${boardTaskCount(boardValue)}</small>`;main.onclick=()=>{boardFilter=boardValue.id;data.selectedBoardId=boardValue.id;renderBoards()};
      const pin=document.createElement("button");pin.type="button";pin.className=`board-pin-button${boardValue.pinned?" pinned":""}`;pin.textContent=boardValue.pinned?"★":"☆";pin.setAttribute("aria-label",`${boardValue.name}を${boardValue.pinned?"ピン留め解除":"ピン留め"}`);pin.onclick=event=>{event.stopPropagation();const before=boardHistoryBefore();boardValue.pinned=!boardValue.pinned;boardValue.updatedAt=Date.now();finishBoardHistory("ボードのピンを変更",before)};
      const controls=document.createElement("div");controls.className="board-order-controls";controls.innerHTML=`<button type="button" aria-label="${esc(boardValue.name)}を上へ" ${index===0?"disabled":""}>↑</button><button type="button" aria-label="${esc(boardValue.name)}を下へ" ${index===data.boards.length-1?"disabled":""}>↓</button>`;const [up,down]=controls.querySelectorAll("button");up.onclick=event=>{event.stopPropagation();moveBoard(boardValue.id,-1)};down.onclick=event=>{event.stopPropagation();moveBoard(boardValue.id,1)};
      const actions=document.createElement("details");actions.className="board-row-actions";actions.innerHTML=`<summary aria-label="${esc(boardValue.name)}の操作">…</summary><div class="board-row-actions-panel"><button type="button" data-board-action="rename">名前変更</button><button type="button" class="danger" data-board-action="delete">削除</button></div>`;actions.ontoggle=()=>{if(!actions.open)return;const rect=actions.querySelector("summary").getBoundingClientRect(),width=132;actions.style.setProperty("--board-menu-top",`${rect.bottom+5}px`);actions.style.setProperty("--board-menu-left",`${Math.max(8,Math.min(innerWidth-width-8,rect.right-width))}px`)};actions.onclick=event=>{event.stopPropagation();const action=event.target.closest("[data-board-action]")?.dataset.boardAction;if(!action)return;event.preventDefault();actions.open=false;if(action==="rename")renameBoardFromOverview(boardValue.id);if(action==="delete")deleteBoardSafely(boardValue.id)};
      row.append(main,pin,actions,controls);E.boardList.appendChild(row)
    });renderBoardOverviewTasks()
  };
  deleteBoard=()=>deleteBoardSafely(data.selectedBoardId);E.deleteBoardButton.onclick=deleteBoard;
  get("boardOverviewSearch").addEventListener("input",renderBoardOverviewTasks);get("boardOverviewStatus").addEventListener("change",renderBoardOverviewTasks);
  get("boardCreateTaskButton").onclick=event=>openCreateMenu("boards",event,{source:"boards",boardId:boardFilter==="all"?null:boardFilter,requireBoard:boardFilter==="all",taskOnly:true});
  E.addCardButton.onclick=event=>openCreateMenu("board-detail",event,{source:"board",boardId:data.selectedBoardId,taskOnly:true});
  get("calendarTaskMenuButton").onclick=event=>openCreateMenu("calendar",event,{source:"calendar",plannedDate:selectedDate||localDate()});

  function renderBoardLightTasks(){
    const panel=get("boardLightTaskPanel"),list=get("boardLightTaskList"),items=data.quickTasks.filter(task=>task.boardId===data.selectedBoardId&&quickVisibleOnBoard(task)).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate));
    panel.classList.toggle("hidden",!items.length);get("boardLightTaskCount").textContent=String(items.length);list.innerHTML=items.map(task=>`<article class="board-task-row light${task.completed?" completed":""}"><button class="board-task-check" type="button" onclick="completeLightTask('${task.id}')" aria-label="${esc(task.title)}を${task.completed?"未完了に戻す":"完了"}">${task.completed?"☑":"□"}</button><span class="board-task-main"><strong>${esc(task.title)}</strong><small>${esc(task.plannedDate.slice(5).replace("-","/"))}予定</small></span><button class="quick-task-delete" type="button" onclick="deleteLightTask('${task.id}')" aria-label="${esc(task.title)}を削除">×</button></article>`).join("")
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
  get("closeRoutineCreateButton").onclick=()=>get("routineCreatePanel").classList.add("hidden");
  routineReflectionDate=getRoutineLogicalDate();routineCalCursor=new Date(routineReflectionDate+"T12:00:00");routineCalCursor.setDate(1);
  E.routineCalendarTodayButton.onclick=()=>{routineReflectionDate=getRoutineLogicalDate();routineCalCursor=new Date(routineReflectionDate+"T12:00:00");routineCalCursor.setDate(1);renderRoutineCalendar()};

  const baseRenderHome=renderHome;
  renderHome=function(){baseRenderHome();const key=getRoutineLogicalDate(),stats=routineStats(key),items=[...stats.applicable].sort((a,b)=>({morning:0,day:1,night:2,any:3}[a.slot]??9)-({morning:0,day:1,night:2,any:3}[b.slot]??9)||(b.pinned-a.pinned));get("homeRoutineCount").textContent=`${stats.done.length} / ${stats.total}`;get("homeRoutineList").innerHTML=items.length?items.map(r=>`<label class="home-routine-item"><input type="checkbox" ${routineDoneOn(r,key)?"checked":""} onchange="toggleRoutineDone('${r.id}')"><span><strong>${r.pinned?"📌 ":""}${esc(r.title)}</strong><small>${esc(routineSlotLabel(r.slot))}</small></span></label>`).join(""):'<div class="now-task-empty home-routine-empty"><strong>今日のルーティンはありません</strong><span>今日が対象のルーティンだけを表示します。</span></div>'};

  const baseApplyTheme=applyTheme;
  applyTheme=function(){baseApplyTheme();applyUtilitySettings()};
  addEventListener("resize",()=>{if(data.view==="boards")renderBoards();applyUtilitySettings()});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeCreateMenu();get("routineCreatePanel").classList.add("hidden")}});

  applyUtilitySettings();renderAll()
})();
