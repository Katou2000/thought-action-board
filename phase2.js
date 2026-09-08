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

  function pruneQuickTaskLog(){
    const cutoff=Date.now()-14*86400000;
    data.quickTaskLog=data.quickTaskLog.filter(item=>Date.parse(item.completedAt)>=cutoff)
  }
  function addQuickTask(){
    const input=get("homeQuickTaskInput"),title=input.value.trim();if(!title)return;
    const before=snapshot(QUICK_KEYS);
    data.quickTasks.unshift({id:uid(),title,createdAt:Date.now(),completed:false});
    input.value="";save();pushHistory("軽量タスクを追加",QUICK_KEYS,before);renderQuickTasks();input.focus()
  }
  function completeQuickTask(id){
    const item=data.quickTasks.find(task=>task.id===id);if(!item)return;
    const before=snapshot(QUICK_KEYS);
    data.quickTasks=data.quickTasks.filter(task=>task.id!==id);
    data.quickTaskLog.unshift({id:item.id,title:item.title,completedAt:new Date().toISOString()});pruneQuickTaskLog();
    save();pushHistory("軽量タスクを完了",QUICK_KEYS,before);renderQuickTasks();standardAction("軽量タスク完了",item.title,"complete")
  }
  function deleteQuickTask(id){
    const item=data.quickTasks.find(task=>task.id===id);if(!item)return;
    const before=snapshot(QUICK_KEYS);data.quickTasks=data.quickTasks.filter(task=>task.id!==id);
    save();pushHistory("軽量タスクを削除",QUICK_KEYS,before);renderQuickTasks()
  }
  function renderQuickTasks(){
    const list=get("homeQuickTaskList"),count=get("homeQuickTaskCount");if(!list||!count)return;
    count.textContent=String(data.quickTasks.length);list.innerHTML="";
    data.quickTasks.forEach(task=>{
      const row=document.createElement("div");row.className="home-quick-task-item";
      const done=document.createElement("button");done.type="button";done.className="quick-task-check";done.setAttribute("aria-label",`${task.title}を完了`);done.textContent="□";done.onclick=()=>completeQuickTask(task.id);
      const title=document.createElement("span");title.textContent=task.title;
      const remove=document.createElement("button");remove.type="button";remove.className="quick-task-delete";remove.setAttribute("aria-label",`${task.title}を削除`);remove.textContent="×";remove.onclick=()=>deleteQuickTask(task.id);
      row.append(done,title,remove);list.appendChild(row)
    })
  }

  const baseRenderHome=renderHome;
  renderHome=function(){baseRenderHome();renderQuickTasks()};

  saveCard=wrapMutation(saveCard,"タスクを保存",TASK_KEYS);E.saveCardButton.onclick=saveCard;
  quickTaskSave=wrapMutation(quickTaskSave,"タスクを追加",TASK_KEYS);E.saveQuickTaskButton.onclick=quickTaskSave;
  deleteCard=wrapMutation(deleteCard,"タスクを削除",TASK_DELETE_KEYS);
  completeCards=wrapMutation(completeCards,"タスクの完了状態を変更",TASK_COMPLETE_KEYS);
  dropSection=wrapMutation(dropSection,"タスクを移動",TASK_KEYS);
  dropCard=wrapMutation(dropCard,"タスクを並び替え",TASK_KEYS);
  window.restoreArchive=wrapMutation(window.restoreArchive,"タスクの完了を解除",TASK_COMPLETE_KEYS);
  window.toggleRoutineDone=wrapMutation(window.toggleRoutineDone,"ルーティンタスクの完了状態を変更",ROUTINE_KEYS);
  window.toggleRoutinePin=wrapMutation(window.toggleRoutinePin,"ルーティンタスクのピンを変更",ROUTINE_KEYS);
  addBlock=wrapMutation(addBlock,"目標ブロックを追加",GOAL_KEYS);E.addBlockButton.onclick=addBlock;

  const baseRenderCard=renderCard;
  renderCard=function(card,sectionId){
    const element=baseRenderCard(card,sectionId),pin=element.querySelector(".pin-card-button");
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

  get("homeQuickTaskForm").onsubmit=event=>{event.preventDefault();addQuickTask()};
  get("undoButton").onclick=undoHistory;get("redoButton").onclick=redoHistory;

  function typingTarget(target){return!!target.closest("input, textarea, select, [contenteditable='true']")}
  function closePanels(){
    ["cardModal","quickTaskModal","freeItemModal","routineModal","settingsModal","helpModal","globalSearchModal"].forEach(closeModal);
    get("sidebarGlobalSearchClose")?.click();document.querySelectorAll("details[open]").forEach(details=>details.open=false);closeSide()
  }
  function saveVisibleEditor(){
    const candidates=[["cardModal","saveCardButton"],["quickTaskModal","saveQuickTaskButton"],["routineModal","saveRoutineModalButton"],["freeItemModal","saveFreeItemModalButton"]];
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
    if(key==="q"){event.preventDefault();show("home");setTimeout(()=>get("homeQuickTaskInput").focus(),20);return}
    if(event.key==="?"||(event.key==="/"&&event.shiftKey)){event.preventDefault();get("helpButton").click();return}
    if(event.key==="/"){event.preventDefault();E.globalSearchButton.click();return}
    if(event.key==="Escape")closePanels()
  });

  E.importInput.addEventListener("change",()=>{clearHistory();setTimeout(clearHistory,300)});
  const bridge=window.taskKanrinnerCloudBridge;
  if(bridge){const replace=bridge.replaceCloudData.bind(bridge);bridge.replaceCloudData=next=>{const result=replace(next);clearHistory();return result};bridge.replaceData=next=>bridge.replaceCloudData(next)}

  pruneQuickTaskLog();updateHistoryButtons();renderQuickTasks();renderAll()
})();
