/* Phase 2: quick tasks, bounded local undo/redo, and keyboard shortcuts. */
(()=>{
  "use strict";
  const get=id=>document.getElementById(id);
  const TASK_KEYS=["boards","recent","selectedBoardId"];
  const TASK_DELETE_KEYS=["boards","trash","recent","selectedBoardId"];
  const TASK_COMPLETE_KEYS=["boards","archive","recent","selectedBoardId"];
  const QUICK_KEYS=["quickTasks","quickTaskLog"];
  const FREE_KEYS=["freePages","selectedFreePageId","trash"];
  const GOAL_KEYS=["goalTowers","recent","selectedGoalId"];
  const ROUTINE_KEYS=["routines","recent","selectedRoutineCalendarId"];
  const HISTORY_LIMIT=40,HISTORY_BYTE_LIMIT=12*1024*1024;
  const undoStack=[],redoStack=[];
  let historyApplying=false;

  function snapshot(keys){
    const value={};keys.forEach(key=>value[key]=data[key]);return JSON.stringify(value)
  }
  function historyBytes(){return[...undoStack,...redoStack].reduce((sum,item)=>sum+item.bytes,0)}
  function updateHistoryButtons(){
    const undo=get("undoButton"),redo=get("redoButton");
    undo.disabled=!undoStack.length;redo.disabled=!redoStack.length;
    undo.title=undoStack.length?`元に戻す：${undoStack.at(-1).label}（Ctrl+Z）`:"元に戻す（Ctrl+Z）";
    redo.title=redoStack.length?`やり直す：${redoStack.at(-1).label}（Ctrl+Y）`:"やり直す（Ctrl+Y）"
  }
  function pushHistory(label,keys,before,after=snapshot(keys)){
    if(historyApplying||before===after)return false;
    const entry={label,keys:[...keys],before,after,bytes:before.length+after.length};
    redoStack.length=0;
    if(entry.bytes>HISTORY_BYTE_LIMIT){clearHistory();return false}
    undoStack.push(entry);
    while(undoStack.length>HISTORY_LIMIT)undoStack.shift();
    while(undoStack.length>1&&historyBytes()>HISTORY_BYTE_LIMIT)undoStack.shift();
    updateHistoryButtons();
    offerLightUndo(`${label}しました`,()=>undoHistory());
    return true
  }
  function recordFromObjects(label,keys,beforeObject,afterObject){return pushHistory(label,keys,JSON.stringify(beforeObject),JSON.stringify(afterObject))}
  function restoreHistorySnapshot(serialized){
    const restored=JSON.parse(serialized);Object.keys(restored).forEach(key=>data[key]=restored[key]);
    ensureCurrentData();save();renderAll();toggleRoutineRuleUI();renderQuickTasks()
  }
  function undoHistory(){
    const entry=undoStack.pop();if(!entry)return;
    historyApplying=true;try{restoreHistorySnapshot(entry.before);redoStack.push(entry)}finally{historyApplying=false;updateHistoryButtons()}
    if(!undoRunning)feedbackAction("元に戻しました",entry.label,"undo")
  }
  function redoHistory(){
    const entry=redoStack.pop();if(!entry)return;
    historyApplying=true;try{restoreHistorySnapshot(entry.after);undoStack.push(entry)}finally{historyApplying=false;updateHistoryButtons()}
    feedbackAction("やり直しました",entry.label,"restore")
  }
  function clearHistory(){undoStack.length=0;redoStack.length=0;clearLightUndo();updateHistoryButtons()}
  function wrapMutation(base,label,keys){
    return function(...args){
      const before=snapshot(keys),result=base.apply(this,args);
      if(result&&typeof result.then==="function")return result.then(value=>{pushHistory(label,keys,before);return value});
      pushHistory(label,keys,before);return result
    }
  }

  function openLightTask(defaultBoardId=data.selectedBoardId,plannedDate=localDate(),requireBoard=false){
    const boardSelect=get("lightTaskBoardInput");
    boardSelect.innerHTML=(requireBoard?'<option value="">ボードを選択</option>':"")+data.boards.map(board=>`<option value="${board.id}">${esc(board.name)}</option>`).join("");
    boardSelect.value=requireBoard?"":data.boards.some(board=>board.id===defaultBoardId)?defaultBoardId:data.boards[0]?.id||"";
    get("lightTaskTitleInput").value="";get("lightTaskPlannedDateInput").value=plannedDate||localDate();
    get("lightTaskModal").classList.remove("hidden");setTimeout(()=>get("lightTaskTitleInput").focus(),20)
  }
  function addQuickTask(){
    const title=get("lightTaskTitleInput").value.trim(),boardId=get("lightTaskBoardInput").value,plannedDate=get("lightTaskPlannedDateInput").value;if(!title||!boardId||!plannedDate)return;
    const before=snapshot(QUICK_KEYS);
    data.quickTasks.unshift({id:uid(),title,boardId,plannedDate,createdAt:Date.now(),completed:false,completedAt:""});
    save();pushHistory("軽量タスクを追加",QUICK_KEYS,before);closeModal("lightTaskModal");renderAll()
  }
  function dopaQuickClearFeedback(title,origin){
    if(data.settings.theme!=="dopaboy")return;
    const root=document.createElement("div"),motion=data.settings.dopaMotion!==false,point=origin||{left:innerWidth/2,top:Math.min(innerHeight*.72,innerHeight-90),width:0,height:0};
    root.className=`dopa-quick-clear-fx${motion?"":" motion-off"}`;
    root.style.left=`${Math.max(78,Math.min(innerWidth-78,point.left+point.width/2))}px`;root.style.top=`${Math.max(70,Math.min(innerHeight-70,point.top+point.height/2))}px`;
    root.innerHTML=`<div class="dopa-quick-clear-stamp"><b>✓</b><span>QUICK CLEAR!</span><small>+1</small></div><i class="dopa-quick-energy"></i>`;
    if(motion)for(let i=0;i<7;i++){const spark=document.createElement("i");spark.className="dopa-quick-spark";spark.style.setProperty("--qx",`${Math.round((Math.random()-.5)*120)}px`);spark.style.setProperty("--qy",`${Math.round((Math.random()-.5)*88)}px`);spark.style.setProperty("--qr",`${Math.round(Math.random()*300-150)}deg`);root.appendChild(spark)}
    root.setAttribute("aria-label",`QUICK CLEAR! ${title}`);document.body.appendChild(root);setTimeout(()=>root.remove(),motion?900:700)
  }
  function completeQuickTask(id){
    const item=data.quickTasks.find(task=>task.id===id);if(!item)return;
    const trigger=document.activeElement?.matches?.(".quick-task-check,.board-task-check")?document.activeElement.getBoundingClientRect():null,before=snapshot(QUICK_KEYS),completed=!item.completed;
    item.completed=completed;item.completedAt=completed?new Date().toISOString():"";
    save();pushHistory(`軽量タスクを${completed?"完了":"未完了に変更"}`,QUICK_KEYS,before);renderAll();if(completed){if(data.settings.theme==="dopaboy")dopaQuickClearFeedback(item.title,trigger);else standardAction("軽量タスク完了",item.title,"complete")}
  }
  function deleteQuickTask(id){
    const item=data.quickTasks.find(task=>task.id===id);if(!item)return;
    const before=snapshot(QUICK_KEYS);data.quickTasks=data.quickTasks.filter(task=>task.id!==id);
    save();pushHistory("軽量タスクを削除",QUICK_KEYS,before);renderAll()
  }
  function renderQuickTasks(){
    const list=get("homeQuickTaskList"),count=get("homeQuickTaskCount");if(!list||!count)return;
    const today=localDate(),completedDate=task=>{const date=new Date(task.completedAt);return Number.isNaN(date.getTime())?"":localDate(date)};
    const visible=data.quickTasks.filter(task=>task.completed?(task.plannedDate===today||(task.plannedDate<today&&completedDate(task)===today)):task.plannedDate<=today).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||a.createdAt-b.createdAt);
    count.textContent=String(visible.length);list.innerHTML="";
    visible.forEach(task=>{
      const row=document.createElement("div");row.className=`home-quick-task-item${task.completed?" completed":""}`;
      const done=document.createElement("button");done.type="button";done.className="quick-task-check";done.setAttribute("aria-label",`${task.title}を${task.completed?"未完了に戻す":"完了"}`);done.textContent=task.completed?"☑":"□";done.onclick=()=>completeQuickTask(task.id);
      const title=document.createElement("span"),boardName=data.boards.find(board=>board.id===task.boardId)?.name||"ボードなし";title.innerHTML=`<strong>${esc(task.title)}</strong><small>${esc(boardName)} / ${esc(task.plannedDate.slice(5).replace("-","/"))}予定</small>`;
      const remove=document.createElement("button");remove.type="button";remove.className="quick-task-delete";remove.setAttribute("aria-label",`${task.title}を削除`);remove.textContent="×";remove.onclick=()=>deleteQuickTask(task.id);
      row.append(done,title,remove);list.appendChild(row)
    });if(!visible.length)list.innerHTML='<div class="now-task-empty"><strong>軽量タスクはありません</strong></div>'
  }

  const baseRenderHome=renderHome;
  renderHome=function(){baseRenderHome();renderQuickTasks()};

  function toggleTaskSelection(id,selected){
    const found=findCard(id);if(!found||found.c.type!=="task")return;
    const before=snapshot(TASK_KEYS),next=typeof selected==="boolean"?selected:!found.c.selected;if(found.c.selected===next)return;
    found.c.selected=next;found.c.updatedAt=Date.now();save();renderAll();pushHistory("タスクのチェックを変更",TASK_KEYS,before)
  }
  window.toggleTaskSelected=toggleTaskSelection;

  saveCard=wrapMutation(saveCard,"タスクを保存",TASK_KEYS);E.saveCardButton.onclick=saveCard;
  quickTaskSave=wrapMutation(quickTaskSave,"タスクを追加",TASK_KEYS);E.saveQuickTaskButton.onclick=quickTaskSave;
  deleteCard=wrapMutation(deleteCard,"タスクを削除",TASK_DELETE_KEYS);
  completeCards=wrapMutation(completeCards,"タスクの完了状態を変更",TASK_COMPLETE_KEYS);
  dropSection=wrapMutation(dropSection,"タスクを移動",TASK_KEYS);
  dropCard=wrapMutation(dropCard,"タスクを並び替え",TASK_KEYS);
  addSection=wrapMutation(addSection,"区分を追加",TASK_KEYS);
  updateSection=wrapMutation(updateSection,"区分の設定を変更",TASK_KEYS);
  reorderSection=wrapMutation(reorderSection,"区分を並び替え",TASK_KEYS);
  deleteSection=wrapMutation(deleteSection,"区分を削除",TASK_KEYS);
  window.restoreArchive=wrapMutation(window.restoreArchive,"タスクの完了を解除",TASK_COMPLETE_KEYS);
  window.toggleRoutineDone=wrapMutation(window.toggleRoutineDone,"ルーティンタスクの完了状態を変更",ROUTINE_KEYS);
  window.toggleRoutinePin=wrapMutation(window.toggleRoutinePin,"ルーティンタスクのピンを変更",ROUTINE_KEYS);
  addBlock=wrapMutation(addBlock,"目標ブロックを追加",GOAL_KEYS);E.addBlockButton.onclick=addBlock;

  const baseRenderCard=renderCard;
  renderCard=function(card,sectionId){
    const element=baseRenderCard(card,sectionId),pin=element.querySelector(".pin-card-button"),checkbox=element.querySelector(".card-select");
    if(checkbox)checkbox.onchange=()=>toggleTaskSelection(card.id,checkbox.checked);
    if(pin){const action=pin.onclick;pin.onclick=event=>{const before=snapshot(TASK_KEYS);action.call(pin,event);pushHistory("タスクのピンを変更",TASK_KEYS,before)}}
    return element
  };
  const baseRenderBoards=renderBoards;
  renderBoards=function(){
    baseRenderBoards();get("boardList")?.querySelectorAll(".board-pin-button").forEach(button=>{const action=button.onclick;button.onclick=event=>{const before=snapshot(TASK_KEYS);action.call(button,event);pushHistory("ボードのピンを変更",TASK_KEYS,before)}})
  };
  const baseRenderGoalList=renderGoalList;
  renderGoalList=function(){
    baseRenderGoalList();get("goalList")?.querySelectorAll(".goal-list-pin").forEach(button=>{const action=button.onclick;button.onclick=event=>{const before=snapshot(GOAL_KEYS);action.call(button,event);pushHistory("目標のピンを変更",GOAL_KEYS,before)}})
  };
  const baseRenderBlock=renderBlock;
  renderBlock=function(goalValue,block,index){
    const row=baseRenderBlock(goalValue,block,index),wrap=action=>event=>{const before=snapshot(GOAL_KEYS);action.call(event.currentTarget,event);pushHistory("目標ブロックを変更",GOAL_KEYS,before)};
    const breaker=row.querySelector(".break-block-button"),actions=row.querySelectorAll(".builder-block-actions button");
    if(breaker)breaker.onclick=wrap(breaker.onclick);actions.forEach(button=>button.onclick=wrap(button.onclick));
    const drop=row.ondrop;row.ondrop=event=>{const before=snapshot(GOAL_KEYS);drop.call(row,event);pushHistory("目標ブロックを並び替え",GOAL_KEYS,before)};
    return row
  };
  const baseFreeRecord=freeRecord;
  freeRecord=function(before){
    baseFreeRecord(before);if(!before)return;
    const after={freePages:clone(data.freePages),selectedFreePageId:data.selectedFreePageId,trash:clone(data.trash)};
    recordFromObjects("自由帳を変更",FREE_KEYS,before,after)
  };

  function wrapClick(element,label,keys){
    if(!element)return;const action=element.onclick;element.onclick=event=>{const before=snapshot(keys);action?.call(element,event);pushHistory(label,keys,before)}
  }
  wrapClick(E.pinBoardButton,"ボードのピンを変更",TASK_KEYS);
  wrapClick(E.pinQuickMemoButton,"メモのピンを変更",["quickMemos","recent"]);
  wrapClick(E.pinGoalButton,"目標のピンを変更",GOAL_KEYS);

  get("saveLightTaskButton").onclick=addQuickTask;
  get("lightTaskTitleInput").onkeydown=event=>{if(event.key==="Enter")addQuickTask()};
  window.openLightTask=openLightTask;window.completeLightTask=completeQuickTask;window.deleteLightTask=deleteQuickTask;
  window.taskKanrinnerHistory={snapshot,pushHistory};
  get("undoButton").onclick=undoHistory;get("redoButton").onclick=redoHistory;

  function typingTarget(target){return!!target.closest("input, textarea, select, [contenteditable='true']")}
  function closePanels(){
    ["cardModal","quickTaskModal","lightTaskModal","freeItemModal","routineModal","settingsModal","helpModal","globalSearchModal"].forEach(closeModal);
    get("sidebarGlobalSearchClose")?.click();document.querySelectorAll("details[open]").forEach(details=>details.open=false);closeSide()
  }
  function saveVisibleEditor(){
    const candidates=[["cardModal","saveCardButton"],["quickTaskModal","saveQuickTaskButton"],["lightTaskModal","saveLightTaskButton"],["routineModal","saveRoutineModalButton"],["freeItemModal","saveFreeItemModalButton"]];
    const item=candidates.find(([modal])=>!get(modal).classList.contains("hidden"));if(item)get(item[1]).click()
  }
  document.addEventListener("keydown",event=>{
    const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
    if(command&&event.key==="Enter"){if(typingTarget(event.target)){event.preventDefault();saveVisibleEditor()}return}
    if(typingTarget(event.target))return;
    if(command&&key==="z"){event.preventDefault();event.shiftKey?redoHistory():undoHistory();return}
    if(command&&key==="y"){event.preventDefault();redoHistory();return}
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(key==="n"){event.preventDefault();openCardModal(null,data.selectedBoardId);return}
    if(key==="q"){event.preventDefault();openLightTask();return}
    if(event.key==="?"||(event.key==="/"&&event.shiftKey)){event.preventDefault();get("helpButton").click();return}
    if(event.key==="/"){event.preventDefault();E.globalSearchButton.click();return}
    if(event.key==="Escape")closePanels()
  });

  E.importInput.addEventListener("change",()=>{clearHistory();setTimeout(clearHistory,300)});
  const bridge=window.taskKanrinnerCloudBridge;
  if(bridge){const replace=bridge.replaceCloudData.bind(bridge);bridge.replaceCloudData=next=>{const result=replace(next);clearHistory();return result};bridge.replaceData=next=>bridge.replaceCloudData(next)}

  updateHistoryButtons();renderQuickTasks();renderAll()
})();
