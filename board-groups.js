/* Optional board task grouping layered on the existing schema-10 section storage. */
(()=>{
  "use strict";
  const get=id=>document.getElementById(id),HISTORY_KEYS=["boards","recent","selectedBoardId"];
  let draggedGroupId=null;

  function defaultSection(boardValue){
    if(!boardValue)return null;
    boardValue.sections=Array.isArray(boardValue.sections)?boardValue.sections:[];
    const hadDefaultMarker=boardValue.sections.some(item=>item.isDefault===true),hadLaneMarker=boardValue.sections.some(item=>typeof item.isLane==="boolean");
    let section=boardValue.sections.find(item=>item.isDefault===true)||boardValue.sections.find(item=>item.name==="未分類")||boardValue.sections[0];
    if(!section){section={id:uid(),name:"未分類",cards:[],isDefault:true,isLane:false,showOnHome:false};boardValue.sections.push(section)}
    boardValue.sections.forEach(item=>{if(typeof item.isLane!=="boolean")item.isLane=!hadLaneMarker&&hadDefaultMarker&&item!==section;item.isDefault=item===section;item.isLane=item===section?false:item.isLane===true;item.showOnHome=item.isLane&&item.showOnHome===true});
    if(boardValue.sections[0]!==section)boardValue.sections=[section,...boardValue.sections.filter(item=>item!==section)];
    return section
  }
  function prepareBoards(){data.boards.forEach(defaultSection)}
  function historyBefore(){return window.taskKanrinnerHistory?.snapshot(HISTORY_KEYS)||null}
  function finishGroupChange(label,before){const current=board();touchBoard(current);save();renderBoard();renderSidebar();if(data.view==="home")renderHome();if(before)window.taskKanrinnerHistory?.pushHistory(label,HISTORY_KEYS,before)}
  function groupSections(boardValue){defaultSection(boardValue);return boardValue.sections.filter(section=>section.isLane===true)}
  function normalSections(boardValue){defaultSection(boardValue);return boardValue.sections.filter(section=>section.isLane!==true)}
  function clearDragState(){draggedGroupId=null;dragCard=null;document.querySelectorAll(".board-card-group,.board-normal-area,.memo-card").forEach(element=>element.classList.remove("dragging","drag-over"))}

  window.boardDefaultSection=defaultSection;
  prepareBoards();

  addSection=function(){
    const current=board(),name=prompt("区分名","新しい区分");if(!current||!name?.trim())return;
    const before=historyBefore();defaultSection(current);current.sections.push({id:uid(),name:name.trim(),cards:[],isDefault:false,isLane:true,showOnHome:false});
    finishGroupChange("区分を追加",before);standardAction("区分を追加",name.trim(),"save")
  };
  function renameGroup(id){
    const current=board(),section=current?.sections.find(item=>item.id===id);if(!section||section.isLane!==true)return;
    const name=prompt("区分名",section.name);if(!name?.trim()||name.trim()===section.name)return;
    const before=historyBefore();section.name=name.trim();finishGroupChange("区分名を変更",before)
  }
  function toggleGroupHome(id){
    const current=board(),section=current?.sections.find(item=>item.id===id);if(!section||section.isLane!==true)return;
    const before=historyBefore();section.showOnHome=!section.showOnHome;finishGroupChange("区分のホーム表示を変更",before)
  }
  function deleteGroup(id){
    const current=board(),normal=defaultSection(current),section=current?.sections.find(item=>item.id===id);if(!section||section.isLane!==true)return;
    if(!confirm("区分を削除します。\n中のタスクはボードへ戻ります。"))return;
    const before=historyBefore();normal.cards.push(...section.cards);current.sections=current.sections.filter(item=>item!==section);finishGroupChange("区分を削除",before)
  }
  function reorderGroup(sourceId,targetId){
    if(!sourceId||!targetId||sourceId===targetId)return;
    const current=board(),normals=normalSections(current),groups=groupSections(current),from=groups.findIndex(item=>item.id===sourceId),to=groups.findIndex(item=>item.id===targetId);if(from<0||to<0)return;
    const before=historyBefore(),[moved]=groups.splice(from,1);groups.splice(to,0,moved);current.sections=[...normals,...groups];finishGroupChange("区分を並び替え",before)
  }
  function moveGroup(id,direction){
    const current=board(),groups=groupSections(current),index=groups.findIndex(item=>item.id===id),next=index+direction;if(index<0||next<0||next>=groups.length)return;
    reorderGroup(id,groups[next].id)
  }

  function cardGrid(section,{normal=false,sources=[section]}={}){
    const grid=document.createElement("div");grid.className=`card-grid board-group-card-grid${normal?" board-normal-card-grid":""}`;grid.dataset.sectionId=section.id;
    grid.ondragover=event=>{if(!dragCard)return;event.preventDefault();grid.closest(".board-card-group,.board-normal-area")?.classList.add("drag-over")};
    grid.ondragleave=event=>{if(!grid.contains(event.relatedTarget))grid.closest(".board-card-group,.board-normal-area")?.classList.remove("drag-over")};
    grid.ondrop=event=>{grid.closest(".board-card-group,.board-normal-area")?.classList.remove("drag-over");dropSection(event,section.id)};
    const visible=filterCards(sources.flatMap(source=>source.cards));
    if(visible.length)visible.forEach(card=>grid.appendChild(renderCard(card,findCard(card.id)?.s.id||section.id)));
    else{const empty=document.createElement("div");empty.className="board-group-empty";empty.textContent=normal?"カードをここへ戻せます。":"ここへカードを移動できます。";grid.appendChild(empty)}
    return grid
  }

  renderSection=function(section){
    const current=board(),groups=groupSections(current),index=groups.findIndex(item=>item.id===section.id),wrap=document.createElement("section");
    wrap.className="board-card-group";wrap.dataset.sectionId=section.id;
    wrap.ondragover=event=>{if(!draggedGroupId)return;event.preventDefault();wrap.classList.add("drag-over")};wrap.ondragleave=event=>{if(!wrap.contains(event.relatedTarget))wrap.classList.remove("drag-over")};wrap.ondrop=event=>{if(!draggedGroupId)return;event.preventDefault();event.stopPropagation();const source=draggedGroupId;clearDragState();reorderGroup(source,section.id)};
    const header=document.createElement("header");header.className="board-group-header";
    const title=document.createElement("div");title.className="board-group-title";title.innerHTML=`<button class="board-group-drag" type="button" aria-label="${esc(section.name)}をドラッグして並び替え">⋮⋮</button><h3>${esc(section.name)}</h3>${section.showOnHome?'<span class="board-group-home-badge">Home</span>':""}`;const dragHandle=title.querySelector(".board-group-drag");dragHandle.draggable=innerWidth>820;dragHandle.ondragstart=event=>{event.stopPropagation();draggedGroupId=section.id;event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",section.id);wrap.classList.add("dragging")};dragHandle.ondragend=clearDragState;
    const actions=document.createElement("details");actions.className="board-group-actions";actions.innerHTML=`<summary aria-label="${esc(section.name)}の操作">…</summary><div class="board-group-actions-panel"><button type="button" data-group-action="add">＋ タスク</button><button type="button" data-group-action="home">${section.showOnHome?"ホームに表示しない":"ホームに表示"}</button><button type="button" data-group-action="rename">名前変更</button><button type="button" data-group-action="up" ${index===0?"disabled":""}>上へ</button><button type="button" data-group-action="down" ${index===groups.length-1?"disabled":""}>下へ</button><button type="button" class="danger" data-group-action="delete">削除</button></div>`;
    actions.onclick=event=>{const action=event.target.closest("[data-group-action]")?.dataset.groupAction;if(!action)return;event.preventDefault();actions.open=false;if(action==="add")openCardModal(null,current.id,section.id);if(action==="home")toggleGroupHome(section.id);if(action==="rename")renameGroup(section.id);if(action==="up")moveGroup(section.id,-1);if(action==="down")moveGroup(section.id,1);if(action==="delete")deleteGroup(section.id)};
    header.append(title,actions);wrap.append(header,cardGrid(section));
    wrap.ondblclick=event=>{if(innerWidth<=820||dragCard||event.target.closest(".memo-card,button,input,textarea,select,a,details,summary"))return;openCardModal(null,current.id,section.id)};
    return wrap
  };

  renderBoard=function(){
    const current=board();if(!current)return;const normal=defaultSection(current);
    E.currentBoardTitle.textContent=current.name;updateBoardPin();const tags=[...new Set(current.sections.flatMap(section=>section.cards.flatMap(card=>card.tags)))].sort(),old=E.tagFilter.value;E.tagFilter.innerHTML='<option value="">すべてのタグ</option>'+tags.map(tag=>`<option value="${esc(tag)}">${esc(tag)}</option>`).join("");if(tags.includes(old))E.tagFilter.value=old;
    E.sectionBoard.innerHTML="";const normalArea=document.createElement("div");normalArea.className="board-normal-area";normalArea.dataset.sectionId=normal.id;normalArea.appendChild(cardGrid(normal,{normal:true,sources:normalSections(current)}));E.sectionBoard.appendChild(normalArea);
    groupSections(current).forEach(section=>E.sectionBoard.appendChild(renderSection(section)));
    const addRow=document.createElement("div");addRow.className="board-add-group-row";const add=document.createElement("button");add.type="button";add.className="text-button board-add-group-button";add.textContent="＋ 区分";add.onclick=addSection;addRow.appendChild(add);E.sectionBoard.appendChild(addRow);selectionUI()
  };

  dropSection=function(event,sectionId){
    event.preventDefault();if(!dragCard)return;const found=findCard(dragCard),target=board().sections.find(section=>section.id===sectionId);if(!found||!target)return;
    if(found.s===target&&target.cards.at(-1)?.id===found.c.id){clearDragState();return}
    found.s.cards=found.s.cards.filter(card=>card.id!==found.c.id);target.cards.push(found.c);found.c.updatedAt=Date.now();touchBoard(board());clearDragState();save();renderBoard()
  };
  dropCard=function(event,sectionId,targetId){
    event.preventDefault();event.stopPropagation();if(!dragCard||dragCard===targetId)return;const found=findCard(dragCard),target=board().sections.find(section=>section.id===sectionId);if(!found||!target)return;
    found.s.cards=found.s.cards.filter(card=>card.id!==found.c.id);const index=target.cards.findIndex(card=>card.id===targetId);target.cards.splice(index<0?target.cards.length:index,0,found.c);found.c.updatedAt=Date.now();touchBoard(board());clearDragState();save();renderBoard()
  };

  const baseRenderCard=renderCard;
  renderCard=function(card,sectionId){
    const element=baseRenderCard(card,sectionId),manual=E.sortSelect.value==="manual";element.draggable=innerWidth>820&&manual;
    element.ondragstart=event=>{if(!element.draggable){event.preventDefault();return}dragCard=card.id;event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",card.id);element.classList.add("dragging")};element.ondragend=clearDragState;
    element.ondragover=event=>{if(!dragCard||dragCard===card.id)return;event.preventDefault();element.classList.add("drag-over")};element.ondragleave=()=>element.classList.remove("drag-over");element.ondrop=event=>dropCard(event,sectionId,card.id);
    return element
  };

  refreshCardSections=function(){
    const current=data.boards.find(item=>item.id===E.cardBoardInput.value)||board(),normal=defaultSection(current),ordered=[normal,...groupSections(current)];
    E.cardSectionInput.innerHTML=ordered.map(section=>`<option value="${section.id}">${section===normal?"区分なし（通常表示）":esc(section.name)}</option>`).join("")
  };
  const baseOpenCardModal=openCardModal;
  openCardModal=function(id=null,boardId=null,sectionId=null){baseOpenCardModal(id,boardId,sectionId);if(id){const found=findCard(id);if(found&&found.s.isLane!==true)E.cardSectionInput.value=defaultSection(found.b).id}};
  E.addSectionButton.textContent="＋ 区分";E.addSectionButton.onclick=addSection;
})();
