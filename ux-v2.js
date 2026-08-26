/* UI/UX enhancements layered on the existing schema-10 application. */
(()=>{
  const get=id=>document.getElementById(id);
  const todayKey=()=>localDate();
  const cardColors={yellow:"#f2c94c",blue:"#4f9cff",green:"#45c978",pink:"#ff6fae",purple:"#9b6cff",orange:"#ff914d",white:"#d9e0ea"};
  let schedulePreset=null,tutorialMode="normal",tutorialIndex=0,uxReady=false,previousLocation=null,activeLocation=null;

  data.settings.tabSize=["compact","standard","large"].includes(data.settings.tabSize)?data.settings.tabSize:"standard";
  data.settings.tabWidth=["narrow","standard","wide"].includes(data.settings.tabWidth)?data.settings.tabWidth:"standard";
  data.settings.tutorialCompleted=data.settings.tutorialCompleted===true;
  data.settings.dopaTutorialCompleted=data.settings.dopaTutorialCompleted===true;
  data.settings.navOrder=(data.settings.navOrder||[]).filter(key=>key!=="todayTasks");
  data.settings.navVisible.todayTasks=false;
  if(data.view==="todayTasks")data.view="home";
  data.recent=(Array.isArray(data.recent)?data.recent:[]).filter((item,index,array)=>array.findIndex(x=>(x.key||`${x.kind}:${x.id}`)===(item.key||`${item.kind}:${item.id}`))===index).slice(0,30);
  data.boards.forEach(b=>b.sections.forEach(s=>s.cards.forEach(c=>{c.plannedDate=typeof c.plannedDate==="string"?c.plannedDate:""})));

  function captureLocation(){return{view:data.view,selectedBoardId:data.selectedBoardId,selectedGoalId:data.selectedGoalId,selectedFreePageId:data.selectedFreePageId,selectedQuickMemoId:data.selectedQuickMemoId,selectedRoutineCalendarId:data.selectedRoutineCalendarId,selectedDate,calendarCursor:calCursor.getTime()}}
  function sameLocation(a,b){return a&&b&&a.view===b.view&&a.selectedBoardId===b.selectedBoardId&&a.selectedGoalId===b.selectedGoalId&&a.selectedFreePageId===b.selectedFreePageId&&a.selectedQuickMemoId===b.selectedQuickMemoId&&a.selectedRoutineCalendarId===b.selectedRoutineCalendarId&&a.selectedDate===b.selectedDate&&a.calendarCursor===b.calendarCursor}
  function placeBackButton(){const button=get("appBackButton"),view=E[data.view+"View"];if(view&&button.parentElement!==view)view.insertBefore(button,view.firstChild);button.classList.toggle("hidden",!previousLocation)}
  const baseShow=show,baseShowTransient=showTransient;
  function transition(base,view){const before=activeLocation||captureLocation(),result=base(view==="todayTasks"?"home":view),after=captureLocation();if(!sameLocation(before,after))previousLocation=before;activeLocation=after;placeBackButton();return result}
  show=function(view){return transition(baseShow,view)};
  showTransient=function(view){return transition(baseShowTransient,view)};
  get("appBackButton").onclick=()=>{if(!previousLocation)return;const target=previousLocation;previousLocation=null;data.selectedBoardId=target.selectedBoardId;data.selectedGoalId=target.selectedGoalId;data.selectedFreePageId=target.selectedFreePageId;data.selectedQuickMemoId=target.selectedQuickMemoId;data.selectedRoutineCalendarId=target.selectedRoutineCalendarId;selectedDate=target.selectedDate;calCursor=new Date(target.calendarCursor);baseShow(target.view==="todayTasks"?"home":target.view);activeLocation=captureLocation();placeBackButton()};
  activeLocation=captureLocation();

  recent=function(kind,id,label,detail="",boardId=""){
    const key=`${kind}:${id}`;
    data.recent=[{key,kind,id,label,detail,boardId,ts:Date.now()},...data.recent.filter(x=>x.key!==key)].slice(0,30)
  };
  renderRecent=function(){
    const list=[...data.recent].sort((a,b)=>b.ts-a.ts).slice(0,30);
    E.recentList.innerHTML=list.length?list.map(x=>`<div class="recent-item"><span class="item-main"><strong>${esc(x.label)}</strong><small>${esc(x.detail)}</small></span><button onclick='openRef(${JSON.stringify(JSON.stringify(x))})'>開く</button></div>`).join(""):"<p>最近の履歴はまだありません。</p>"
  };

  function scheduleModeFor(card){return card?.plannedDate?"date":card?.start?"period":"none"}
  function updateScheduleFields(){
    const mode=get("cardScheduleMode").value;
    get("cardPlannedDateWrap").classList.toggle("hidden",mode!=="date");
    get("cardStartDateWrap").classList.toggle("hidden",mode!=="period")
  }
  const baseOpenCardModal=openCardModal;
  openCardModal=function(id=null,bid=null,sid=null){
    baseOpenCardModal(id,bid,sid);
    const found=id?findCard(id):null,card=found?.c;
    const preset=!id?schedulePreset:null;
    get("cardScheduleMode").value=preset?.mode||scheduleModeFor(card);
    get("cardPlannedDateInput").value=preset?.mode==="date"?(preset.date||todayKey()):(card?.plannedDate||"");
    if(preset?.mode==="period")E.cardStartInput.value=preset.date||todayKey();
    schedulePreset=null;updateScheduleFields();
    setTimeout(()=>E.cardTitleInput.focus(),30)
  };
  window.openScheduledTask=(mode,date=todayKey(),bid=null,sid=null)=>{schedulePreset={mode,date};openCardModal(null,bid,sid)};
  function saveCardWithSchedule(){
    const wasEdit=!!editingCardId,title=E.cardTitleInput.value.trim(),content=E.cardContentInput.value.trim(),mode=get("cardScheduleMode").value;
    if(!title&&!content&&!editingImageData)return alert("タイトル・内容・画像のどれかを入れてください。");
    const b=data.boards.find(x=>x.id===E.cardBoardInput.value),s=b?.sections.find(x=>x.id===E.cardSectionInput.value);if(!b||!s)return alert("移動先を選び直してください。");
    const plannedDate=mode==="date"?get("cardPlannedDateInput").value:"",start=mode==="period"?E.cardStartInput.value:"";
    if(mode==="date"&&!plannedDate)return alert("『この日にやる』の予定日を選んでください。");
    const values={type:E.cardTypeInput.value,title:title||"無題",content,start,due:E.cardDueInput.value,plannedDate,tags:E.cardTagsInput.value.split(",").map(x=>x.trim()).filter(Boolean),color:E.cardColorInput.value,link:E.cardLinkInput.value.trim(),image:editingImageData,pinned:E.cardPinnedInput.value==="true",repeat:{type:E.repeatTypeInput.value,interval:Math.max(1,Number(E.repeatIntervalInput.value)||1),weekdays:qa(".weekday-input:checked").map(x=>Number(x.value))},updatedAt:Date.now()};
    if(values.start&&values.due&&values.start>values.due)return alert("期間開始日は期限日より前にしてください。");
    if(editingCardId){const f=findCard(editingCardId);if(!f)return;Object.assign(f.c,values);if(f.b.id!==b.id||f.s.id!==s.id){f.s.cards=f.s.cards.filter(c=>c.id!==editingCardId);s.cards.push(f.c);f.b.updatedAt=Date.now()}b.updatedAt=Date.now();recent("card",f.c.id,f.c.title,`${b.name} / ${s.name}`,b.id)}
    else{const c={id:uid(),...values,selected:false,createdAt:Date.now()};s.cards.push(c);b.updatedAt=Date.now();recent("card",c.id,c.title,`${b.name} / ${s.name}`,b.id)}
    data.selectedBoardId=b.id;save();closeModal("cardModal");renderAll();dopaAction(wasEdit?"CARD UPDATE!!":"CARD SET!!",values.title);standardAction(wasEdit?"カードを更新":"カードを追加",values.title,"save")
  }
  saveCard=saveCardWithSchedule;E.saveCardButton.onclick=saveCardWithSchedule;
  get("cardScheduleMode").onchange=updateScheduleFields;

  const baseNextRepeat=nextRepeat;
  nextRepeat=function(card){const next=baseNextRepeat(card);if(next&&card.plannedDate)next.plannedDate=nextDue(card.plannedDate,card.repeat);return next};

  function nowTaskInfo(card,today=todayKey()){
    if(card.plannedDate){if(card.plannedDate>today)return null;return card.plannedDate<today?{group:0,label:"やり残し",tone:"late",detail:`${card.plannedDate.slice(5).replace("-","/")}予定`}:{group:1,label:"今日指定",tone:"today",detail:"今日やる"}}
    if(card.start&&card.start>today)return null;
    if(card.due&&card.due<today)return{group:0,label:"やり残し",tone:"late",detail:`期限切れ ${card.due.slice(5).replace("-","/")}〆`};
    if(card.start&&( !card.due||today<=card.due))return{group:card.due?2:3,label:"現在期間中",tone:"period",detail:periodLabel(card)};
    if(!card.start&&card.due===today)return{group:2,label:"本日〆",tone:"period",detail:periodLabel(card)};
    return null
  }
  function currentTasks(){return cards().filter(c=>c.type==="task").map(c=>({card:c,info:nowTaskInfo(c)})).filter(x=>x.info).sort((a,b)=>a.info.group-b.info.group||(a.card.due||"9999-99-99").localeCompare(b.card.due||"9999-99-99")||(b.card.pinned-a.card.pinned))}
  function renderNowTasks(){
    const list=currentTasks();
    get("nowTaskList").innerHTML=list.length?list.map(({card,info})=>`<article class="now-task-card ${info.tone}"><div class="now-task-main"><div class="now-task-badges"><span class="now-task-status">${info.label}</span>${card.pinned?'<span class="now-task-pin">📌</span>':""}</div><strong>${esc(card.title)}</strong><small>${esc(card.boardName)} / ${esc(card.sectionName)} ・ ${esc(info.detail)}</small></div><div class="header-actions"><button class="secondary-button" onclick="openCardAny('${card.id}')">開く</button><button class="success-button" onclick="completeOne('${card.id}')">完了</button></div></article>`).join(""):"<div class=\"now-task-empty\"><strong>今やることはありません</strong><span>期間または予定日を設定すると、ここに表示されます。</span></div>"
  }
  function renderHomeRoutines(){
    const stats=routineStats(todayKey()),slotOrder={morning:0,day:1,night:2,any:3},items=[...stats.applicable].sort((a,b)=>(slotOrder[a.slot]??9)-(slotOrder[b.slot]??9)||(b.pinned-a.pinned)||a.title.localeCompare(b.title,"ja"));
    get("homeRoutineCount").textContent=`${stats.done.length} / ${stats.total}`;
    get("homeRoutineList").innerHTML=items.length?items.map(r=>`<label class="home-routine-item"><input type="checkbox" ${routineDoneOn(r,todayKey())?"checked":""} onchange="toggleRoutineDone('${r.id}')"><span><strong>${r.pinned?"📌 ":""}${esc(r.title)}</strong><small>${esc(routineSlotLabel(r.slot))}</small></span></label>`).join(""):'<div class="now-task-empty home-routine-empty"><strong>今日のルーティンはありません</strong><span>今日が対象のルーティンだけを表示します。</span></div>'
  }
  renderHome=function(){
    const all=cards().filter(c=>c.type==="task"),list=currentTasks(),today=todayKey(),done=data.archive.filter(x=>x.type==="task"&&completedOnLocalDate(x,today)),total=list.length+done.length,percent=total?Math.round(done.length/total*100):0,month=today.slice(0,7);
    E.openTaskCount.textContent=all.length;E.todayTaskCount.textContent=list.length;E.overdueCount.textContent=all.filter(c=>overdue(c)||(c.plannedDate&&c.plannedDate<today)).length;E.monthlyDoneCount.textContent=data.archive.filter(x=>x.completedAt&&localDate(new Date(x.completedAt)).startsWith(month)).length;
    E.homeProgressText.textContent=`${done.length} / ${total}`;E.homeProgressPercent.textContent=percent+"%";E.homeProgressFill.style.width=percent+"%";renderNowTasks();renderHomeRoutines();renderPinned();renderRecent();
    const upcoming=all.filter(c=>c.plannedDate||c.start||c.due).sort((a,b)=>(a.plannedDate||a.due||a.start||"9999").localeCompare(b.plannedDate||b.due||b.start||"9999")).slice(0,9);
    E.upcomingList.innerHTML=upcoming.length?upcoming.map(c=>`<div class="upcoming-item"><span class="item-main"><strong>${c.pinned?"📌 ":""}${esc(c.title)}</strong><small>${esc(c.boardName)} / ${esc(c.sectionName)}</small></span><span class="due-chip${overdue(c)?" overdue":""}${beforeStart(c)?" upcoming":""}">${esc(c.plannedDate?`${c.plannedDate.slice(5).replace("-","/")}予定`:periodLabel(c))}</span></div>`).join(""):"<p>予定・期間付きタスクはありません。</p>"
  };
  get("addPeriodTaskButton").onclick=()=>openScheduledTask("period",todayKey());
  get("addPlannedTaskButton").onclick=()=>openScheduledTask("date",todayKey());

  const baseRenderCard=renderCard;
  renderCard=function(card,sectionId){
    const el=baseRenderCard(card,sectionId);el.style.setProperty("--card-user-color",cardColors[card.color]||cardColors.white);
    if(card.type==="task"){const foot=el.querySelector(".card-footer"),button=document.createElement("button");button.type="button";button.className="schedule-card-button";button.textContent="📅 今やる";button.title="今やることの日付・期間を設定";button.onclick=()=>{openCardModal(card.id);setTimeout(()=>get("cardScheduleMode").focus(),30)};foot?.insertBefore(button,foot.firstChild)}
    return el
  };

  renderCalendar=function(){
    const y=calCursor.getFullYear(),m=calCursor.getMonth(),first=new Date(y,m,1),gridStart=new Date(y,m,1-first.getDay()),map=new Map();E.calendarMonthLabel.textContent=`${y}年 ${m+1}月`;
    cards().filter(c=>c.type==="task"&&(c.plannedDate||c.start||c.due)).forEach(c=>{const add=(date,type)=>{if(!date)return;if(!map.has(date))map.set(date,[]);map.get(date).push({c,type})};add(c.plannedDate,"planned");add(c.start,"start");add(c.due,"due")});E.calendarGrid.innerHTML="";
    for(let i=0;i<42;i++){const date=new Date(gridStart);date.setDate(gridStart.getDate()+i);const key=localDate(date),events=map.get(key)||[],cell=document.createElement("div");cell.className="calendar-day"+(date.getMonth()!==m?" outside":"")+(key===todayKey()?" today":"")+(key===selectedDate?" selected":"")+(events.length?" has-events":"");
      const head=document.createElement("div");head.className="calendar-day-head";const number=document.createElement("button");number.type="button";number.className="calendar-date-number";number.textContent=date.getDate();number.title=`${key}の内容を見る`;number.onclick=e=>{e.stopPropagation();selectedDate=key;renderCalendar()};const add=document.createElement("button");add.type="button";add.className="calendar-add-button";add.textContent="＋";add.setAttribute("aria-label",`${key}にタスクを追加`);add.onclick=e=>{e.stopPropagation();selectedDate=key;renderCalendar();openScheduledTask("date",key)};head.append(number,add);cell.appendChild(head);
      events.slice(0,3).forEach(item=>{const event=document.createElement("button");event.type="button";event.className="calendar-task-dot";event.style.setProperty("--event-color",cardColors[item.c.color]||cardColors.white);event.textContent=(item.type==="planned"?"● ":item.type==="start"?"▶ ":"〆 ")+item.c.title;event.onclick=e=>{e.stopPropagation();openCardAny(item.c.id)};cell.appendChild(event)});if(events.length>3){const more=document.createElement("span");more.className="calendar-more";more.textContent=`+${events.length-3}`;cell.appendChild(more)}cell.onclick=()=>{selectedDate=key;renderCalendar()};E.calendarGrid.appendChild(cell)}renderDay(selectedDate);if(data.view==="calendar")activeLocation=captureLocation()
  };
  renderDay=function(key){
    const list=cards().filter(c=>c.type==="task"&&(c.plannedDate===key||c.start===key||c.due===key));
    E.calendarDayDetail.innerHTML=`<div class="calendar-detail-head"><h4>${key}</h4><button class="primary-button" type="button" onclick="openScheduledTask('date','${key}')">＋ この日にタスク追加</button></div>${list.length?list.map(c=>`<div class="calendar-detail-item"><span class="item-main"><strong>${c.pinned?"📌 ":""}${esc(c.title)}</strong><small>${c.plannedDate===key?"● この日にやる":c.start===key&&c.due===key?"▶ 開始 / 〆":c.start===key?"▶ 期間開始":"〆 期限"} / ${esc(c.boardName)} / ${esc(c.sectionName)}</small></span><div class="header-actions"><button class="secondary-button" onclick="openCardAny('${c.id}')">開く</button><button class="success-button" onclick="completeOne('${c.id}')">完了</button></div></div>`).join(""):"<p>この日のタスクはありません。</p>"}`
  };

  function openCreatePanel(panel,input){panel.classList.remove("hidden");setTimeout(()=>input.focus(),20)}
  function closeCreatePanel(panel,input){input.value="";panel.classList.add("hidden")}
  const boardPanel=get("boardCreatePanel"),goalPanel=get("goalCreatePanel");
  E.addBoardButton.onclick=()=>openCreatePanel(boardPanel,E.boardNameInput);
  get("confirmBoardCreateButton").onclick=()=>{if(!E.boardNameInput.value.trim())return;addBoard();closeCreatePanel(boardPanel,E.boardNameInput)};
  get("cancelBoardCreateButton").onclick=()=>closeCreatePanel(boardPanel,E.boardNameInput);
  E.boardNameInput.onkeydown=e=>{if(e.key==="Enter")get("confirmBoardCreateButton").click();if(e.key==="Escape")closeCreatePanel(boardPanel,E.boardNameInput)};
  const boardSearchBox=get("boardSearchBox"),boardSearchToggle=get("boardSearchToggleButton"),boardSearchClose=get("boardSearchCloseButton");
  function closeBoardSearch(){E.searchInput.value="";boardSearchBox.classList.add("hidden");boardSearchToggle.setAttribute("aria-expanded","false");renderBoard();boardSearchToggle.focus()}
  boardSearchToggle.onclick=()=>{boardSearchBox.classList.remove("hidden");boardSearchToggle.setAttribute("aria-expanded","true");setTimeout(()=>E.searchInput.focus(),20)};
  boardSearchClose.onclick=closeBoardSearch;
  E.searchInput.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();closeBoardSearch()}});
  boardSearchToggle.closest("form").onsubmit=event=>event.preventDefault();
  E.addGoalButton.onclick=()=>openCreatePanel(goalPanel,E.goalNameInput);
  get("confirmGoalCreateButton").onclick=()=>{if(!E.goalNameInput.value.trim())return;addGoal();closeCreatePanel(goalPanel,E.goalNameInput)};
  get("cancelGoalCreateButton").onclick=()=>closeCreatePanel(goalPanel,E.goalNameInput);
  E.goalNameInput.onkeydown=e=>{if(e.key==="Enter")get("confirmGoalCreateButton").click();if(e.key==="Escape")closeCreatePanel(goalPanel,E.goalNameInput)};

  const baseRenderSection=renderSection;
  renderSection=function(section){const el=baseRenderSection(section);el.dataset.sectionId=section.id;return el};
  E.sectionBoard.addEventListener("dblclick",event=>{if(innerWidth<=820||dragCard||event.target.closest(".memo-card,button,input,textarea,select,a,[contenteditable='true']"))return;const section=event.target.closest(".board-section"),id=section?.dataset.sectionId;if(id)openCardModal(null,board().id,id)});

  const baseRenderFreeboard=renderFreeboard;
  renderFreeboard=function(){baseRenderFreeboard();if(mobileFree())return;qa(".free-note .free-item-body").forEach(body=>{body.ondblclick=e=>{e.stopPropagation();openFreeModal(body.closest(".free-item").dataset.freeItemId);setTimeout(()=>E.freeItemTextInput.focus(),20)}})};
  E.freeCanvas.addEventListener("dblclick",event=>{if(innerWidth<=820||event.target!==E.freeCanvas)return;const page=freePage();if(!page)return;const before=freeSnap(),rect=E.freeCanvas.getBoundingClientRect(),item={id:uid(),type:"note",content:"",x:Math.max(0,event.clientX-rect.left+E.freeCanvas.scrollLeft-30),y:Math.max(0,event.clientY-rect.top+E.freeCanvas.scrollTop-20),width:220,height:150,updatedAt:Date.now()};page.items.push(item);save();freeRecord(before);renderFreeboard();openFreeModal(item.id);setTimeout(()=>E.freeItemTextInput.focus(),20)});
  const freeTextHistory={undo:[],redo:[],applying:false};
  function resetFreeTextHistory(){freeTextHistory.undo=[];freeTextHistory.redo=[];freeTextHistory.applying=false}
  function applyFreeTextHistory(stack,target){if(!stack.length)return;target.push(E.freeItemTextInput.value);freeTextHistory.applying=true;E.freeItemTextInput.value=stack.pop();freeTextHistory.applying=false;E.freeItemTextInput.focus()}
  E.freeItemTextInput.addEventListener("beforeinput",()=>{if(freeTextHistory.applying)return;const current=E.freeItemTextInput.value;if(freeTextHistory.undo.at(-1)!==current)freeTextHistory.undo.push(current);if(freeTextHistory.undo.length>100)freeTextHistory.undo.shift();freeTextHistory.redo=[]});
  E.freeItemTextInput.addEventListener("keydown",event=>{if(!(event.ctrlKey||event.metaKey))return;const key=event.key.toLowerCase();if(key==="z"){event.preventDefault();applyFreeTextHistory(event.shiftKey?freeTextHistory.redo:freeTextHistory.undo,event.shiftKey?freeTextHistory.undo:freeTextHistory.redo)}else if(key==="y"){event.preventDefault();applyFreeTextHistory(freeTextHistory.redo,freeTextHistory.undo)}});
  get("undoFreeTextButton").onclick=()=>applyFreeTextHistory(freeTextHistory.undo,freeTextHistory.redo);get("redoFreeTextButton").onclick=()=>applyFreeTextHistory(freeTextHistory.redo,freeTextHistory.undo);
  const baseOpenFreeModal=openFreeModal;openFreeModal=function(id){baseOpenFreeModal(id);resetFreeTextHistory();const item=freePage()?.items.find(x=>x.id===id);get("freeTextHistoryActions").classList.toggle("hidden",item?.type!=="note")};

  function navLabel(key){const button=E.mainNav.querySelector(`[data-nav-key="${key}"]`);return button?.textContent||key}
  function commitNavOrder(order){data.settings.navOrder=order.filter(x=>x!=="todayTasks");save();renderNav();bindNavDrag()}
  function moveNav(key,direction){const order=data.settings.navOrder.filter(x=>x!=="todayTasks"),index=order.indexOf(key),next=index+direction;if(index<0||next<0||next>=order.length)return;[order[index],order[next]]=[order[next],order[index]];commitNavOrder(order)}
  function reorderNav(source,target){if(!source||!target||source===target)return;const order=data.settings.navOrder.filter(x=>x!=="todayTasks"),from=order.indexOf(source),to=order.indexOf(target);if(from<0||to<0)return;order.splice(from,1);order.splice(to,0,source);commitNavOrder(order)}
  function clearNavDragClasses(){qa(".nav-order-row").forEach(row=>row.classList.remove("dragging","drag-over"))}
  function bindNavSettingsDrag(){let draggedKey=null,dragTarget=null;const rows=qa(".nav-order-row");qa(".nav-drag-handle").forEach(handle=>{const row=handle.closest(".nav-order-row"),key=row.dataset.navKey;handle.draggable=false;handle.onpointerdown=event=>{draggedKey=key;dragTarget=null;handle.setPointerCapture(event.pointerId);row.classList.add("dragging")};handle.onpointermove=event=>{if(!draggedKey)return;event.preventDefault();const target=document.elementFromPoint(event.clientX,event.clientY)?.closest(".nav-order-row");dragTarget=target?.dataset.navKey||null;rows.forEach(x=>x.classList.toggle("drag-over",x===target))};handle.onpointerup=event=>{if(!draggedKey)return;const source=draggedKey,target=dragTarget;draggedKey=null;dragTarget=null;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);clearNavDragClasses();reorderNav(source,target)};handle.onpointercancel=()=>{draggedKey=null;dragTarget=null;clearNavDragClasses()}})}
  renderNavVisibilitySettings=function(){
    if(!E.navVisibilityList)return;const order=data.settings.navOrder.filter(key=>key!=="todayTasks");
    E.navVisibilityList.innerHTML=order.map((key,index)=>`<div class="nav-order-row" data-nav-key="${key}"><label class="nav-visibility-row"><span>${esc(navLabel(key))}</span><input class="nav-visibility-checkbox" data-nav-vis-key="${key}" type="checkbox" ${navVisible(key)?"checked":""}></label><div class="nav-order-actions"><button class="nav-drag-handle" type="button" aria-label="${esc(navLabel(key))}をドラッグして並び替え">⋮⋮</button><button type="button" data-nav-move="-1" data-nav-key="${key}" aria-label="上へ移動" ${index===0?"disabled":""}>↑</button><button type="button" data-nav-move="1" data-nav-key="${key}" aria-label="下へ移動" ${index===order.length-1?"disabled":""}>↓</button></div></div>`).join("");
    qa(".nav-visibility-checkbox").forEach(input=>input.onchange=()=>{data.settings.navVisible[input.dataset.navVisKey]=input.checked;save();renderNav()});qa("[data-nav-move]").forEach(button=>button.onclick=()=>moveNav(button.dataset.navKey,Number(button.dataset.navMove)));bindNavSettingsDrag()
  };
  const baseRenderNav=renderNav;
  renderNav=function(){data.settings.navOrder=data.settings.navOrder.filter(key=>key!=="todayTasks");baseRenderNav();E.todayTasksButton.classList.add("hidden")};

  const baseApplyTheme=applyTheme;
  applyTheme=function(){baseApplyTheme();document.body.dataset.tabSize=data.settings.tabSize;document.body.dataset.tabWidth=data.settings.tabWidth;const select=get("tabSizeSelect"),widthSelect=get("tabWidthSelect");if(select)select.value=data.settings.tabSize;if(widthSelect)widthSelect.value=data.settings.tabWidth;E.shortcutsButton.textContent="🏷 タグ付け";E.shortcutsHelp.textContent="タグやピンで目印を付けた項目をまとめて確認。";E.homeHelper.textContent="今やることと全体の状況を確認。";E.calendarHelper.textContent="予定日・期間・期限を日付で確認。";get("restartDopaTutorialButton")?.classList.toggle("hidden",data.settings.theme!=="dopaboy");if(uxReady&&data.settings.theme==="dopaboy"&&!data.settings.dopaTutorialCompleted)setTimeout(()=>openTutorial("dopa"),80)};
  get("tabSizeSelect").onchange=e=>{data.settings.tabSize=e.target.value;save();applyTheme()};
  get("tabWidthSelect").onchange=e=>{data.settings.tabWidth=e.target.value;save();applyTheme()};

  function tutorialSteps(){return tutorialMode==="dopa"?(window.DOPA_TUTORIAL_STEPS||[]):(window.TUTORIAL_STEPS||[])}
  function renderTutorial(){const steps=tutorialSteps(),step=steps[tutorialIndex];if(!step)return;const modal=get("tutorialModal");modal.classList.toggle("dopa-tutorial",tutorialMode==="dopa");modal.dataset.target=step.target||"";get("tutorialStepLabel").textContent=`${tutorialIndex+1} / ${steps.length}`;get("tutorialIcon").textContent=step.icon;get("tutorialTitle").textContent=step.title;get("tutorialBody").textContent=step.body;get("tutorialProgress").innerHTML=steps.map((_,i)=>`<i class="${i===tutorialIndex?"active":""}"></i>`).join("");get("tutorialPrevButton").disabled=tutorialIndex===0;get("tutorialNextButton").textContent=tutorialIndex===steps.length-1?"完了":"次へ"}
  function openTutorial(mode){if(!get("tutorialModal").classList.contains("hidden"))return;tutorialMode=mode;tutorialIndex=0;renderTutorial();get("tutorialModal").classList.remove("hidden")}
  function finishTutorial(){if(tutorialMode==="dopa")data.settings.dopaTutorialCompleted=true;else data.settings.tutorialCompleted=true;save();get("tutorialModal").classList.add("hidden");if(tutorialMode==="normal"&&data.settings.theme==="dopaboy"&&!data.settings.dopaTutorialCompleted)setTimeout(()=>openTutorial("dopa"),120)}
  get("tutorialPrevButton").onclick=()=>{if(tutorialIndex>0){tutorialIndex--;renderTutorial()}};get("tutorialNextButton").onclick=()=>{if(tutorialIndex<tutorialSteps().length-1){tutorialIndex++;renderTutorial()}else finishTutorial()};get("tutorialSkipButton").onclick=finishTutorial;get("restartTutorialButton").onclick=()=>{closeModal("settingsModal");openTutorial("normal")};get("restartDopaTutorialButton").onclick=()=>{closeModal("settingsModal");openTutorial("dopa")};

  uxReady=true;applyTheme();renderAll();renderFreeboard();activeLocation=captureLocation();placeBackButton();
  setTimeout(()=>{if(!data.settings.tutorialCompleted)openTutorial("normal");else if(data.settings.theme==="dopaboy"&&!data.settings.dopaTutorialCompleted)openTutorial("dopa")},180)
})();
