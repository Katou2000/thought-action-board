"use strict";
const STORAGE_KEY="taskKanrinnerV1", SCHEMA=10;
const DEFAULT_NAV=["todayTasks","routine","calendar","home","shortcuts","archive","templates","freeboard","memo","builder","achievedGoals","trash"];
const $=id=>document.getElementById(id), qa=s=>[...document.querySelectorAll(s)];
const E={};
["mobileMenuButton","settingsButton","sidebarEditHint","mainNav","boardNameInput","addBoardButton","boardList","todayTasksButton","routineButton","calendarButton","homeButton","archiveButton","freeboardButton","memoButton","builderButton","achievedGoalsButton","trashButton","todayTasksView","routineView","calendarView","homeView","boardView","archiveView","freeboardView","memoView","builderView","achievedGoalsView","trashView","todayEyebrow","todayHelper","routineHelp","calendarHelper","homeHelper","freeboardHelp","builderHelp","builderEyebrow","builderPageTitle","goalTemplateHeading","achievedHelp","trashHelp","todayProgressRing","todayProgressPercent","todayProgressText","todayTaskList","routineTodayCount","routineDoneCount","routineProgressPercent","routineStreakMax","routineTitleInput","routineRuleInput","routineSlotInput","routineWeekdaysWrap","addRoutineButton","routineList","routineCalendarSelect","routineCalendarPrevButton","routineCalendarTodayButton","routineCalendarNextButton","routineCalendarMonthLabel","routineCalendarGrid","routineCalendarLegend","routineModal","routineModalTitleInput","routineModalRuleInput","routineModalSlotInput","routineModalWeekdaysWrap","routineModalPinnedInput","routineModalPausedInput","saveRoutineModalButton","deleteRoutineModalButton","calendarPrevButton","calendarTodayButton","calendarNextButton","calendarMonthLabel","calendarGrid","calendarDayDetail","openTaskCount","todayTaskCount","overdueCount","monthlyDoneCount","homeProgressText","homeProgressPercent","homeProgressFill","pinnedList","recentList","clearRecentButton","upcomingList","currentBoardTitle","pinBoardButton","addSectionButton","addCardButton","completeSelectedButton","deleteBoardButton","searchInput","tagFilter","statusFilter","sortSelect","selectionBar","selectionCountText","clearSelectionButton","completeSelectedBarButton","sectionBoard","archiveSearchInput","archiveBoardFilter","archiveList","undoFreeboardButton","redoFreeboardButton","addFreePageButton","renameFreePageButton","addFreeNoteButton","freeImageInput","clearFreeboardButton","freePageTabs","freeCanvas","addQuickMemoButton","quickMemoList","pinQuickMemoButton","quickMemoTitle","quickMemoContent","quickMemoSavedLabel","deleteQuickMemoButton","goalNameInput","addGoalButton","goalList","builderEmpty","builderActive","builderGoalTitle","builderGoalMeta","pinGoalButton","editGoalButton","deleteGoalButton","builderProgressLabel","builderProgressPercent","builderProgressFill","blockTitleInput","addBlockButton","builderBlockList","completeGoalButton","achievedGoalCount","achievedGoalMonthCount","achievedGoalList","emptyTrashButton","trashKindFilter","trashList","quickAddFab","quickAddMenu","cardModal","cardModalTitle","cardTypeInput","cardBoardInput","cardSectionInput","cardPinnedInput","cardTitleInput","cardContentInput","cardStartInput","cardDueInput","cardTagsInput","cardColorInput","cardImageInput","cardLinkInput","repeatTypeInput","repeatIntervalWrap","repeatIntervalInput","weekdayPickerWrap","imagePreviewWrap","imagePreview","removeImageButton","saveCardButton","quickTaskModal","quickTaskTitle","quickTaskBoard","quickTaskSection","quickTaskStart","quickTaskDue","saveQuickTaskButton","freeItemModal","freeItemModalTitle","freeItemTextInput","freeItemImagePreview","deleteFreeItemModalButton","saveFreeItemModalButton","settingsModal","themeSelect","accentColorInput","tagColorInput","densitySelect","dopaMotionToggle","sidebarEditToggle","resetNavOrderButton","storageUsageLabel","storageUsageFill","exportButton","shareBackupButton","importInput","installAppButton","shortcutsButton","templatesButton","shortcutsView","templatesView","shortcutsHelp","templatesHelp","shortcutSummary","shortcutList","saveBoardTemplateButton","boardTemplateCount","goalTemplateCount","boardTemplateList","goalTemplateList","saveGoalTemplateButton","archiveHelper","archiveTotalCount","archiveMonthCount","archiveTodayCount","archiveTagCount","archiveTagFiles","clearArchiveTagButton","archiveTagFilter","archivePeriodFilter","archiveResultCount","archiveShowAllButton","dopaScatterLayer","fontSizeSelect","navPositionSelect","quickAddVisibleToggle","quickAddPositionSelect","hiddenNavDrawer","hiddenNavList","hiddenNavCount","navVisibilityList","resetNavVisibilityButton","dopaFxRoot"].forEach(id=>E[id]=$(id));
let editingCardId=null, editingImageData="", dragCard=null, dragBlock=null, editingFreeItemId=null, editingRoutineId=null, deferredInstall=null;
let calCursor=new Date(); calCursor.setDate(1); let selectedDate=localDate(); let routineCalCursor=new Date(); routineCalCursor.setDate(1);
let freeUndo=[],freeRedo=[],freeLock=false, memoTimer=null;
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function def(){const b=uid(),s=uid(),p=uid();return{schemaVersion:SCHEMA,view:"board",selectedBoardId:b,selectedGoalId:null,settings:{theme:"simple",themeSchemeVersion:3,accent:"#2563eb",tagAccent:"#8f39e5",density:"normal",fontSize:"medium",navPosition:"left",navLayoutVersion:1,quickAddVisible:true,quickAddPosition:"auto",navOrder:[...DEFAULT_NAV],navVisible:Object.fromEntries(DEFAULT_NAV.map(k=>[k,true])),sidebarEditMode:false,dopaMotion:true},boards:[{id:b,name:"今日やること",pinned:false,createdAt:Date.now(),updatedAt:Date.now(),sections:[{id:s,name:"未分類",cards:[]}]}],archive:[],trash:[],recent:[],freePages:[{id:p,name:"自由帳1",items:[]}],selectedFreePageId:p,quickMemos:[],selectedQuickMemoId:null,goalTowers:[],achievedGoals:[],routines:[],selectedRoutineCalendarId:null}}
function normalize(d){d=d&&typeof d==="object"?d:def();d.settings=d.settings||{};if(d.settings.themeSchemeVersion!==3){d.settings.theme=(d.settings.theme==="cork"||d.settings.theme==="dopaboy"||d.settings.theme==="black")?"black":"simple";d.settings.themeSchemeVersion=3}if(!["simple","black","dopaboy"].includes(d.settings.theme))d.settings.theme="simple";d.settings.accent=d.settings.accent||"#2563eb";d.settings.tagAccent=d.settings.tagAccent||"#8f39e5";d.settings.density=["normal","compact","large"].includes(d.settings.density)?d.settings.density:"normal";d.settings.fontSize=["small","medium","large"].includes(d.settings.fontSize)?d.settings.fontSize:"medium";d.settings.navPosition=["left","right","top","bottom"].includes(d.settings.navPosition)?d.settings.navPosition:"left";d.settings.navLayoutVersion=Number(d.settings.navLayoutVersion)||0;if(d.settings.navLayoutVersion<1){d.settings.navPosition="left";d.settings.navLayoutVersion=1}d.settings.quickAddVisible=d.settings.quickAddVisible!==false;d.settings.quickAddPosition=["auto","bottom-right","bottom-left","top-right","top-left"].includes(d.settings.quickAddPosition)?d.settings.quickAddPosition:"auto";d.settings.navVisible=d.settings.navVisible&&typeof d.settings.navVisible==="object"?d.settings.navVisible:{};DEFAULT_NAV.forEach(k=>{if(typeof d.settings.navVisible[k]!=="boolean")d.settings.navVisible[k]=true});d.settings.navOrder=Array.isArray(d.settings.navOrder)?d.settings.navOrder:[...DEFAULT_NAV];d.settings.navOrder=[...d.settings.navOrder.filter(x=>DEFAULT_NAV.includes(x)),...DEFAULT_NAV.filter(x=>!d.settings.navOrder.includes(x))];d.settings.sidebarEditMode=!!d.settings.sidebarEditMode;d.settings.dopaMotion=d.settings.dopaMotion!==false;
if(!Array.isArray(d.boards)||!d.boards.length){const x=def();d.boards=x.boards;d.selectedBoardId=x.selectedBoardId}d.boards.forEach(b=>{b.id=b.id||uid();b.name=b.name||"無題のボード";b.pinned=!!b.pinned;b.updatedAt=b.updatedAt||Date.now();b.sections=Array.isArray(b.sections)?b.sections:[];b.sections.forEach(s=>{s.id=s.id||uid();s.name=s.name||"未分類";s.cards=Array.isArray(s.cards)?s.cards:[];s.cards.forEach(c=>{Object.assign(c,{id:c.id||uid(),type:c.type||"task",title:c.title||"無題",content:c.content||"",start:c.start||"",due:c.due||"",tags:Array.isArray(c.tags)?c.tags:[],color:c.color||"yellow",link:c.link||"",image:c.image||"",selected:!!c.selected,pinned:!!c.pinned,createdAt:c.createdAt||Date.now(),updatedAt:c.updatedAt||c.createdAt||Date.now(),repeat:c.repeat||{type:"none",interval:1,weekdays:[]}});c.repeat.interval=Math.max(1,Number(c.repeat.interval)||1);c.repeat.weekdays=Array.isArray(c.repeat.weekdays)?c.repeat.weekdays.map(Number):[]})})});if(!d.boards.some(b=>b.id===d.selectedBoardId))d.selectedBoardId=d.boards[0].id;
d.archive=Array.isArray(d.archive)?d.archive:[];d.trash=Array.isArray(d.trash)?d.trash:[];d.recent=Array.isArray(d.recent)?d.recent:[];
if(!Array.isArray(d.freePages)){const p={id:uid(),name:"自由帳1",items:Array.isArray(d.freeItems)?d.freeItems:[]};d.freePages=[p];d.selectedFreePageId=p.id}if(!d.freePages.length)d.freePages=[{id:uid(),name:"自由帳1",items:[]}];d.freePages.forEach(p=>{p.id=p.id||uid();p.name=p.name||"自由帳";p.items=Array.isArray(p.items)?p.items:[];p.items.forEach(i=>{i.id=i.id||uid();i.type=i.type||"note";i.content=i.content||"";i.x=Number(i.x)||40;i.y=Number(i.y)||40;i.width=Number(i.width)||(i.type==="image"?280:220);i.height=Number(i.height)||(i.type==="image"?220:150);i.updatedAt=i.updatedAt||Date.now()})});if(!d.freePages.some(p=>p.id===d.selectedFreePageId))d.selectedFreePageId=d.freePages[0].id;
d.quickMemos=Array.isArray(d.quickMemos)?d.quickMemos:[];d.quickMemos.forEach(m=>{m.id=m.id||uid();m.title=m.title||"";m.content=m.content||"";m.pinned=!!m.pinned;m.updatedAt=m.updatedAt||Date.now()});if(d.selectedQuickMemoId&&!d.quickMemos.some(m=>m.id===d.selectedQuickMemoId))d.selectedQuickMemoId=d.quickMemos[0]?.id||null;
d.routines=Array.isArray(d.routines)?d.routines:[];d.routines.forEach(r=>{r.id=r.id||uid();r.title=r.title||"習慣";r.rule=["daily","weekdays","custom"].includes(r.rule)?r.rule:"daily";r.weekdays=Array.isArray(r.weekdays)?r.weekdays.map(Number).filter(n=>n>=0&&n<=6):[];r.slot=["morning","day","night","any"].includes(r.slot)?r.slot:"any";r.paused=!!r.paused;r.createdAt=r.createdAt||Date.now();r.updatedAt=r.updatedAt||r.createdAt||Date.now();r.logs=r.logs&&typeof r.logs==="object"?r.logs:{};Object.keys(r.logs).forEach(k=>r.logs[k]=!!r.logs[k])});if(!d.routines.some(r=>r.id===d.selectedRoutineCalendarId))d.selectedRoutineCalendarId=d.routines[0]?.id||null;
if(!Array.isArray(d.goalTowers)){d.goalTowers=[];if(Array.isArray(d.milestones))d.milestones.forEach(m=>d.goalTowers.push({id:uid(),name:m.name||"目標",due:m.end||"",note:"",pinned:false,updatedAt:Date.now(),blocks:[{id:uid(),title:`進捗 ${Number(m.progress)||0}%`,done:Number(m.progress)>=100}]}))}d.goalTowers.forEach(g=>{g.id=g.id||uid();g.name=g.name||"目標";g.due=g.due||"";g.note=g.note||"";g.pinned=!!g.pinned;g.updatedAt=g.updatedAt||Date.now();g.blocks=Array.isArray(g.blocks)?g.blocks:[];g.blocks.forEach(b=>{b.id=b.id||uid();b.title=b.title||"要件";b.done=!!b.done})});d.achievedGoals=Array.isArray(d.achievedGoals)?d.achievedGoals:[];if(!d.goalTowers.some(g=>g.id===d.selectedGoalId))d.selectedGoalId=d.goalTowers[0]?.id||null;d.view=({today:"calendar",milestone:"builder"}[d.view]||d.view);if(!["todayTasks","routine","calendar","home","shortcuts","board","archive","templates","freeboard","memo","builder","achievedGoals","trash"].includes(d.view))d.view="board";d.schemaVersion=SCHEMA;return d}
function load(){try{return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"))}catch(e){console.error(e);return normalize(def())}}
let data=load();
function ensureCurrentData(){
  data.templates=Array.isArray(data.templates)?data.templates:[];
  data.templates.forEach(t=>{t.id=t.id||uid();t.type=t.type||"board";t.name=t.name||"テンプレート";t.createdAt=t.createdAt||Date.now()});
  data.settings.navOrder=[...data.settings.navOrder.filter(x=>DEFAULT_NAV.includes(x)),...DEFAULT_NAV.filter(x=>!data.settings.navOrder.includes(x))];
  data.schemaVersion=SCHEMA;
}
ensureCurrentData();
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));storageUsage()}catch(e){alert("保存容量がいっぱいの可能性があります。画像やゴミ箱を整理してください。")}}
const board=()=>data.boards.find(b=>b.id===data.selectedBoardId)||data.boards[0], freePage=()=>data.freePages.find(p=>p.id===data.selectedFreePageId)||data.freePages[0], memo=()=>data.quickMemos.find(m=>m.id===data.selectedQuickMemoId)||data.quickMemos[0], goal=()=>data.goalTowers.find(g=>g.id===data.selectedGoalId)||null;
function cards(){return data.boards.flatMap(b=>b.sections.flatMap(s=>s.cards.map(c=>({...c,boardId:b.id,boardName:b.name,sectionId:s.id,sectionName:s.name}))))}
function findCard(id){for(const b of data.boards)for(const s of b.sections){const c=s.cards.find(x=>x.id===id);if(c)return{b,s,c}}return null}
const overdue=c=>!!c.due&&c.due<localDate();
function beforeStart(c){return!!c.start&&c.start>localDate()}
function activeToday(c){
  const t=localDate();
  if(c.start&&c.due)return c.start<=t&&t<=c.due;
  if(c.start&&!c.due)return c.start<=t;
  if(!c.start&&c.due)return c.due===t;
  return false;
}
function periodLabel(c){
  const fmt=d=>d?d.slice(5).replace("-","/"):"";
  if(c.start&&c.due)return `${fmt(c.start)} ～ ${fmt(c.due)}〆`;
  if(c.start)return `${fmt(c.start)}～`;
  if(c.due)return `${fmt(c.due)}〆`;
  return "";
}
function completedOnLocalDate(item,dateKey){
  return !!item.completedAt&&localDate(new Date(item.completedAt))===dateKey;
}
function recent(kind,id,label,detail="",boardId=""){const key=`${kind}:${id}`;data.recent=[{key,kind,id,label,detail,boardId,ts:Date.now()},...data.recent.filter(x=>x.key!==key)].slice(0,18)}
function touchBoard(b){b.updatedAt=Date.now();recent("board",b.id,b.name,"ボード")}
function touchCard(x){x.c.updatedAt=Date.now();x.b.updatedAt=Date.now();recent("card",x.c.id,x.c.title,`${x.b.name} / ${x.s.name}`,x.b.id)}
function touchMemo(m){m.updatedAt=Date.now();recent("memo",m.id,m.title||"無題","メモ")}
function builderDisplayName(){return data.settings.theme==="dopaboy"?"ブロックビルドブレイカー":"目標設計"}
function touchGoal(g){g.updatedAt=Date.now();recent("goal",g.id,g.name,builderDisplayName())}
function routineRuleLabel(r){if(r.rule==="daily")return "毎日";if(r.rule==="weekdays")return "平日";if(r.rule==="custom")return "毎週 "+(r.weekdays||[]).map(x=>["日","月","火","水","木","金","土"][x]).join("・");return "毎日"}
function routineSlotLabel(slot){return({morning:"朝",day:"昼",night:"夜",any:"いつでも"}[slot]||"いつでも")}
function routineCreatedKey(r){return localDate(new Date(r.createdAt||Date.now()))}
function routineScheduledOn(r,dateKey=localDate()){if(dateKey<routineCreatedKey(r))return false;const day=new Date(dateKey+"T00:00:00").getDay();if(r.rule==="daily")return true;if(r.rule==="weekdays")return day>=1&&day<=5;if(r.rule==="custom")return (r.weekdays||[]).includes(day);return true}
function routineApplicable(r,dateKey=localDate()){return !r.paused&&routineScheduledOn(r,dateKey)}
function routineDoneOn(r,dateKey=localDate()){return !!(r.logs&&r.logs[dateKey])}
function routineMark(r,done,dateKey=localDate()){r.logs=r.logs||{};if(done)r.logs[dateKey]=true;else delete r.logs[dateKey];r.updatedAt=Date.now()}
function routineWeekStats(r,anchor=new Date()){const x=new Date(anchor);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);let total=0,done=0;for(let i=0;i<7;i++){const d=new Date(x);d.setDate(x.getDate()+i);const k=localDate(d);if(routineScheduledOn(r,k)){total++;if(routineDoneOn(r,k))done++}}return{done,total}}
function routineStreak(r){let streak=0;const d=new Date();for(let i=0;i<365;i++){const x=new Date(d);x.setDate(d.getDate()-i);const k=localDate(x);if(!routineScheduledOn(r,k))continue;if(routineDoneOn(r,k))streak++;else break}return streak}
function routineStats(dateKey=localDate()){const applicable=data.routines.filter(r=>routineApplicable(r,dateKey));const done=applicable.filter(r=>routineDoneOn(r,dateKey));const allTracked=data.routines.filter(r=>!r.paused);return{applicable,done,total:applicable.length,percent:applicable.length?Math.round(done.length/applicable.length*100):0,maxStreak:allTracked.length?Math.max(...allTracked.map(r=>routineStreak(r)),0):0}}
function toggleRoutineRuleUI(){E.routineWeekdaysWrap.classList.toggle("hidden",E.routineRuleInput.value!=="custom")}
function toggleRoutineModalRuleUI(){E.routineModalWeekdaysWrap.classList.toggle("hidden",E.routineModalRuleInput.value!=="custom")}
function touchRoutine(r){r.updatedAt=Date.now();recent("routine",r.id,r.title,"ルーティンタスク")}

const DOPA_TODAY_WORDS=["DOPAMINE","ADRENALINE","MAXIMUM","HYPER","SUPER","OVERDRIVE","RUSH","BURST"];
const DOPA_STICKER_WORDS=["LEVEL UP","DOPAMINE","ADRENALINE","MAX","MAXIMUM","SUPER","HYPER","RUSH","BURST","OVERDRIVE","CHARGE"];
const DOPA_SYMBOLS=["★","✦","✧","⚡","🔥","💎","💥","☄","✹","✸","◆","♥","×","▲","●","🦀","✨","✚","❖"];
const sessionDopaWord=DOPA_TODAY_WORDS[Math.floor(Math.random()*DOPA_TODAY_WORDS.length)];
function dopaSpreadPoints(count,minDist,avoid=[],avoidDist=0){
  const pts=[];
  const farEnough=(p,q,d)=>{
    const dx=(p.x-q.x)*1.45,dy=p.y-q.y;
    return Math.hypot(dx,dy)>=d;
  };
  let tries=0,maxTries=Math.max(3000,count*500);
  while(pts.length<count&&tries<maxTries){
    tries++;
    const p={x:2.5+Math.random()*95,y:2.5+Math.random()*95};
    if(pts.every(q=>farEnough(p,q,minDist))&&avoid.every(q=>farEnough(p,q,avoidDist)))pts.push(p);
  }
  if(pts.length<count){
    const cols=Math.ceil(Math.sqrt(count*1.8)),rows=Math.ceil(count/cols*1.8),cells=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)cells.push({x:(x+.5)/cols*100,y:(y+.5)/rows*100});
    cells.sort(()=>Math.random()-.5);
    for(const c of cells){
      if(pts.length>=count)break;
      const p={x:Math.max(2.5,Math.min(97.5,c.x+(Math.random()-.5)*(60/cols))),y:Math.max(2.5,Math.min(97.5,c.y+(Math.random()-.5)*(60/rows)))};
      if(pts.every(q=>farEnough(p,q,minDist*.72))&&avoid.every(q=>farEnough(p,q,avoidDist*.72)))pts.push(p);
    }
  }
  return pts;
}
function layoutDopaLegacyStickers(){
  const stickers=qa("#dopaStickerLayer .dopa-sticker");
  if(!stickers.length)return;
  const pts=dopaSpreadPoints(stickers.length,12.5);
  stickers.forEach((s,i)=>{
    const p=pts[i]||{x:5+Math.random()*90,y:5+Math.random()*90};
    s.style.left=`${p.x.toFixed(1)}%`;s.style.top=`${p.y.toFixed(1)}%`;s.style.right="auto";s.style.bottom="auto";
  });
}
function buildDopaScatter(){
  const layer=E.dopaScatterLayer,main=document.querySelector(".main-content");if(!layer||!main)return;
  if(layer.parentNode!==main)main.prepend(layer);
  layer.innerHTML="";
  const wordPoints=dopaSpreadPoints(innerWidth<=820?18:30,11.5);
  const symbolPoints=dopaSpreadPoints(innerWidth<=820?82:132,4.8,wordPoints,5.2);
  const add=(cls,text,i,p)=>{const s=document.createElement("span");s.className=`dopa-scatter ${cls}`;s.textContent=text;s.style.setProperty("--x",`${p.x.toFixed(1)}%`);s.style.setProperty("--y",`${p.y.toFixed(1)}%`);s.style.setProperty("--r",`${Math.round(Math.random()*50-25)}deg`);s.style.setProperty("--scale",`${(0.68+Math.random()*.70).toFixed(2)}`);s.style.setProperty("--op",`${(0.25+Math.random()*.34).toFixed(2)}`);s.style.setProperty("--delay",`${(Math.random()*-7).toFixed(2)}s`);if(cls.includes("word"))s.classList.add(`word-v${i%6}`);layer.appendChild(s)};
  symbolPoints.forEach((p,i)=>add("dopa-scatter-symbol",DOPA_SYMBOLS[Math.floor(Math.random()*DOPA_SYMBOLS.length)],i,p));
  wordPoints.forEach((p,i)=>add("dopa-scatter-word",DOPA_STICKER_WORDS[Math.floor(Math.random()*DOPA_STICKER_WORDS.length)],i,p));
  layoutDopaLegacyStickers();
}
function syncColorPalettes(){
  const sync=(id,value)=>{
    qa(`#${id} .color-swatch`).forEach(b=>b.classList.toggle("selected",b.dataset.color.toLowerCase()===String(value).toLowerCase()));
  };
  sync("accentPalette",data.settings.accent);
  sync("tagPalette",data.settings.tagAccent||"#8f39e5");
}
function bindColorPalette(id,settingKey,input){
  qa(`#${id} .color-swatch`).forEach(b=>{
    b.onclick=()=>{
      data.settings[settingKey]=b.dataset.color;
      input.value=b.dataset.color;
      save();
      applyTheme();
      renderView();
    };
  });
}
function resolvedQuickAddPosition(){
  const pref=data.settings.quickAddPosition||"auto";
  if(pref!=="auto")return pref;
  if(innerWidth<=820)return "bottom-right";
  return({left:"bottom-right",right:"bottom-left",top:"bottom-right",bottom:"top-right"}[data.settings.navPosition]||"bottom-right");
}
function applyNavPosition(position,{persist=false}={}){
  const next=["left","right","top","bottom"].includes(position)?position:"left";
  data.settings.navPosition=next;
  document.body.dataset.navPosition=next;
  E.navPositionSelect.value=next;
  applyQuickAddLayout();
  if(persist)save();
  return next;
}
function applyQuickAddLayout(){
  const visible=data.settings.quickAddVisible!==false;
  document.body.dataset.quickFabPosition=resolvedQuickAddPosition();
  E.quickAddFab.classList.toggle("hidden",!visible);
  if(!visible)E.quickAddMenu.classList.add("hidden");
  E.quickAddVisibleToggle.checked=visible;
  E.quickAddPositionSelect.value=data.settings.quickAddPosition||"auto";
  E.quickAddPositionSelect.disabled=!visible;
}
function applyTheme(){
  document.body.dataset.theme=data.settings.theme;
  document.body.dataset.density=data.settings.density;
  document.body.dataset.fontSize=data.settings.fontSize||"medium";
  applyNavPosition(data.settings.navPosition||"left");
  document.body.dataset.dopaMotion=data.settings.dopaMotion?"on":"off";
  document.documentElement.style.setProperty("--accent",data.settings.accent);
  document.documentElement.style.setProperty("--tag-accent",data.settings.tagAccent||"#8f39e5");
  E.themeSelect.value=data.settings.theme;E.accentColorInput.value=data.settings.accent;E.tagColorInput.value=data.settings.tagAccent||"#8f39e5";syncColorPalettes();
  E.densitySelect.value=data.settings.density;E.fontSizeSelect.value=data.settings.fontSize||"medium";E.navPositionSelect.value=data.settings.navPosition||"left";applyQuickAddLayout();E.dopaMotionToggle.checked=data.settings.dopaMotion;E.sidebarEditToggle.checked=data.settings.sidebarEditMode;
  const d=data.settings.theme==="dopaboy";
  const normal={
    todayHelper:"今日のタスクを確認。",
    routineHelp:"毎日・平日・曜日指定の習慣的なタスクの管理。",
    calendarHelper:"期限付きタスクを日付で確認。",
    homeHelper:"全体の状況と最近触ったものを確認。",
    shortcutsHelp:"ピン留めしたボード・カード・メモ・目標だけをまとめて開く。",
    templatesHelp:"よく使うボード構成やブロックの型を使い回す。",
    archiveHelper:"日々の小さい完了タスクも振り返れます。",
    freeboardHelp:"PCでは自由配置。スマホでは5列のブロック表示になり、タップで編集できます。",
    builderHelp:"目標までの道筋作り。",
    achievedHelp:"達成した目標をアチーブメント化。",
    trashHelp:"消したものを一旦ここへ。必要なら戻せます。"
  };
  const dopa={...normal,
    todayHelper:"今日すべきことがここに！",
    routineHelp:"毎日の習慣がお前をGIGACHADにする。",
    calendarHelper:"",
    homeHelper:"",
    templatesHelp:"これそんな使う？有用なら教えて。",
    archiveHelper:"ちっちゃいことでもできてすごい！！",
    freeboardHelp:"思考が止まらないドパボーイのための自由帳！！",
    builderHelp:"目標までの過程を積んで壊す。お前だけの創造と破壊を見せてくれ。",
    achievedHelp:"目標を達成できたお前はまた一つGIGACHADに。",
    trashHelp:"ゴミ箱入れたらちゃんとゴミ出しまでするんやで。"
  };
  Object.entries(d?dopa:normal).forEach(([k,v])=>{if(E[k])E[k].textContent=v});
  if(E.todayEyebrow)E.todayEyebrow.textContent=d?`TODAY // ${sessionDopaWord}`:"TODAY";
  if(E.builderPageTitle)E.builderPageTitle.textContent=d?"ブロックビルドブレイカー":"目標設計";
  if(E.builderEyebrow)E.builderEyebrow.textContent=d?"BLOCK BUILD BREAKER":"GOAL DESIGN";
  if(E.goalTemplateHeading)E.goalTemplateHeading.textContent=d?"🧱 ブレイカーテンプレート":"🧭 目標テンプレート";
  const nav=d?{todayTasks:"⚡ 今日やること",routine:"🧪 ルーティンタスク",calendar:"✦ カレンダー",home:"💎 ホーム",shortcuts:"⭐ よく使う",archive:"💥 完了したこと",templates:"🧩 テンプレート",freeboard:"🧠 自由帳",memo:"🎮 メモ",builder:"🧱 ブロックビルドブレイカー",achievedGoals:"🏆 達成した目標",trash:"☠️ ゴミ箱"}:{todayTasks:"☀ 今日やること",routine:"🔁 ルーティンタスク",calendar:"📅 カレンダー",home:"🏠 ホーム",shortcuts:"⭐ よく使う",archive:"✅ 完了したこと",templates:"🧩 テンプレート",freeboard:"🗒 自由帳",memo:"📝 メモ",builder:"🧭 目標設計",achievedGoals:"🏆 達成した目標",trash:"🗑 ゴミ箱"};
  Object.entries(nav).forEach(([k,v])=>{const b=E.mainNav.querySelector(`[data-nav-key="${k}"]`);if(b)b.textContent=v});
  renderNav();editMode();
}
const views=["todayTasks","routine","calendar","home","shortcuts","board","archive","templates","freeboard","memo","builder","achievedGoals","trash"];
function show(view){data.view=view;save();views.forEach(v=>{E[v+"View"]?.classList.toggle("hidden",v!==view);E[v+"Button"]?.classList.toggle("active",v===view)});renderSidebar();renderView()}
function renderView(){({todayTasks:renderToday,routine:renderRoutine,calendar:renderCalendar,home:renderHome,shortcuts:renderShortcuts,board:renderBoard,archive:renderArchive,templates:renderTemplates,freeboard:renderFreeboard,memo:renderMemos,builder:renderBuilder,achievedGoals:renderAchieved,trash:renderTrash}[data.view]||(()=>{}))()}
function renderAll(){applyTheme();renderNav();renderSidebar();views.forEach(v=>{E[v+"View"]?.classList.toggle("hidden",v!==data.view);E[v+"Button"]?.classList.toggle("active",v===data.view)});renderView()}
function navVisible(k){return data.settings.navVisible?.[k]!==false}
function renderHiddenNav(){
  const hidden=data.settings.navOrder.filter(k=>!navVisible(k));
  E.hiddenNavCount.textContent=hidden.length;
  E.hiddenNavDrawer.classList.toggle("hidden",!hidden.length);
  E.hiddenNavList.innerHTML="";
  hidden.forEach(k=>{const source=E.mainNav.querySelector(`[data-nav-key="${k}"]`);if(!source)return;const b=document.createElement("button");b.type="button";b.className="hidden-nav-button";b.textContent=source.textContent;b.onclick=()=>{show(k);closeSide()};E.hiddenNavList.appendChild(b)});
}
function renderNavVisibilitySettings(){
  if(!E.navVisibilityList)return;
  E.navVisibilityList.innerHTML=data.settings.navOrder.map(k=>{const b=E.mainNav.querySelector(`[data-nav-key="${k}"]`),label=b?.textContent||k;return `<label class="nav-visibility-row"><span>${esc(label)}</span><input class="nav-visibility-checkbox" data-nav-vis-key="${k}" type="checkbox" ${navVisible(k)?"checked":""}></label>`}).join("");
  qa(".nav-visibility-checkbox").forEach(x=>x.onchange=()=>{data.settings.navVisible[x.dataset.navVisKey]=x.checked;save();renderNav()});
}
function renderNav(){data.settings.navOrder.forEach(k=>{const b=E.mainNav.querySelector(`[data-nav-key="${k}"]`);if(b){E.mainNav.appendChild(b);b.classList.toggle("nav-user-hidden",!navVisible(k))}});renderHiddenNav();renderNavVisibilitySettings()}

function editMode(){document.querySelector(".sidebar").classList.toggle("nav-editing",data.settings.sidebarEditMode);E.sidebarEditHint.classList.toggle("hidden",!data.settings.sidebarEditMode);qa("#mainNav .nav-button").forEach(b=>b.draggable=data.settings.sidebarEditMode)}
function bindNavDrag(){qa("#mainNav .nav-button").forEach(b=>{b.ondragstart=()=>{if(!data.settings.sidebarEditMode)return false;b.classList.add("dragging");dragBlock=b.dataset.navKey};b.ondragend=()=>{b.classList.remove("dragging");dragBlock=null};b.ondragover=e=>{if(data.settings.sidebarEditMode)e.preventDefault()};b.ondrop=e=>{if(!data.settings.sidebarEditMode||!dragBlock)return;e.preventDefault();const target=b.dataset.navKey;if(target===dragBlock)return;const a=[...data.settings.navOrder],from=a.indexOf(dragBlock),to=a.indexOf(target);a.splice(from,1);a.splice(to,0,dragBlock);data.settings.navOrder=a;save();renderNav();editMode();bindNavDrag()}})}
function renderSidebar(){
  E.boardList.innerHTML="";
  data.boards.forEach(b=>{
    const row=document.createElement("div"); row.className="board-list-row";
    const main=document.createElement("button");
    main.className="board-main-button"+(data.view==="board"&&b.id===data.selectedBoardId?" active":"");
    main.textContent=(b.pinned?"📌 ":"📁 ")+b.name;
    main.onclick=()=>{data.selectedBoardId=b.id;touchBoard(b);save();show("board");closeSide()};
    const pin=document.createElement("button"); pin.className="board-pin-button"+(b.pinned?" pinned":""); pin.textContent=b.pinned?"★":"☆";
    pin.onclick=e=>{e.stopPropagation();b.pinned=!b.pinned;b.updatedAt=Date.now();save();renderSidebar();if(data.view==="board")updateBoardPin();if(data.view==="shortcuts")renderShortcuts()};
    row.append(main,pin);E.boardList.appendChild(row);
  });
  renderNav();editMode();
}
function addBoard(){const name=E.boardNameInput.value.trim();if(!name)return;const b={id:uid(),name,pinned:false,updatedAt:Date.now(),sections:[{id:uid(),name:"未分類",cards:[]}]};data.boards.push(b);data.selectedBoardId=b.id;E.boardNameInput.value="";touchBoard(b);save();show("board");dopaAction("BOARD BUILD!!",name);standardAction("ボードを追加",name,"save")}
function updateBoardPin(){const b=board();E.pinBoardButton.textContent=b?.pinned?"★ ピン留め中":"☆ ボードをピン"}
function todayStats(){
  const t=localDate();
  const open=cards().filter(c=>c.type==="task"&&activeToday(c));
  const done=data.archive.filter(x=>x.type==="task"&&completedOnLocalDate(x,t));
  const total=open.length+done.length;
  return{open,done,total,percent:total?Math.round(done.length/total*100):0}
}
function renderToday(){
  const s=todayStats();
  E.todayProgressRing.style.setProperty("--progress",s.percent);
  E.todayProgressPercent.textContent=s.percent+"%";
  E.todayProgressText.textContent=`${s.done.length} / ${s.total} 完了`;
  E.todayTaskList.innerHTML=s.open.length?s.open.map(c=>`<article class="today-card"><span class="item-main"><strong>${c.pinned?"📌 ":""}${esc(c.title)}</strong><small>${esc(c.boardName)} / ${esc(c.sectionName)}${periodLabel(c)?` / ${esc(periodLabel(c))}`:""}</small></span><div class="header-actions"><button class="secondary-button" onclick="openCardAny('${c.id}')">開く</button><button class="success-button" onclick="completeOne('${c.id}')">完了</button></div></article>`).join(""):`<section class="panel"><p>今日のタスクはありません。</p></section>`
}
function renderRoutine(){
  const s=routineStats(),slotOrder=["morning","day","night","any"],slotIcons={morning:"☀",day:"🕛",night:"🌙",any:"✨"};
  E.routineTodayCount.textContent=s.total;
  E.routineDoneCount.textContent=s.done.length;
  E.routineProgressPercent.textContent=s.percent+"%";
  E.routineStreakMax.textContent=s.maxStreak+"日";
  const groups=[];
  slotOrder.forEach(slot=>{
    const items=data.routines.filter(r=>r.slot===slot&&!r.paused);
    if(!items.length)return;
    groups.push(`<section class="panel routine-group"><div class="panel-heading"><h3>${slotIcons[slot]} ${routineSlotLabel(slot)}</h3><span class="count-badge">${items.length}</span></div><div class="routine-card-stack">${items.map(r=>renderRoutineCard(r)).join("")}</div></section>`);
  });
  const paused=data.routines.filter(r=>r.paused);
  if(paused.length)groups.push(`<section class="panel routine-group routine-paused-group"><div class="panel-heading"><h3>⏸ 休止中</h3><span class="count-badge">${paused.length}</span></div><div class="routine-card-stack">${paused.map(r=>renderRoutineCard(r)).join("")}</div></section>`);
  E.routineList.innerHTML=groups.length?groups.join(""):`<section class="panel"><p>ルーティンタスクはまだありません。毎日やりたいことを追加してみよう。</p></section>`;
  renderRoutineCalendar();
}
function renderRoutineCard(r){
  const today=localDate(),done=routineDoneOn(r,today),active=routineApplicable(r,today),week=routineWeekStats(r),streak=routineStreak(r),status=r.paused?"休止中":done?"今日クリア":active?"今日の対象":"今日は対象外";
  const chips=[`<span class="tag-chip">${esc(routineRuleLabel(r))}</span>`,`<span class="tag-chip">${esc(routineSlotLabel(r.slot))}</span>`,`<span class="tag-chip">今週 ${week.done}/${week.total||0}</span>`,`<span class="tag-chip">連続 ${streak}日</span>`].join("");
  return `<article class="routine-card${done?" done":""}${r.paused?" paused":""}" data-routine-id="${r.id}"><div class="routine-card-head"><div class="item-main"><strong>${esc(r.title)}</strong><small>${status}</small></div><div class="routine-card-actions"><button class="pin-card-button${r.pinned?" pinned":""}" onclick="toggleRoutinePin('${r.id}')">${r.pinned?"★ ピン":"☆ ピン"}</button><button class="secondary-button" onclick="editRoutine('${r.id}')">編集</button><button class="secondary-button" onclick="toggleRoutinePause('${r.id}')">${r.paused?"再開":"休止"}</button><button class="danger-outline-button" onclick="deleteRoutine('${r.id}')">削除</button></div></div><div class="tag-row">${chips}</div><div class="routine-card-foot"><button class="${done?"secondary-button":"success-button"}" ${r.paused||!active&&!done?"disabled":""} onclick="toggleRoutineDone('${r.id}')">${done?"今日の完了を戻す":"今日の完了"}</button></div></article>`
}
function renderRoutineCalendar(){
  const routines=[...data.routines];
  if(!routines.some(r=>r.id===data.selectedRoutineCalendarId))data.selectedRoutineCalendarId=routines[0]?.id||null;
  const old=E.routineCalendarSelect.value;
  E.routineCalendarSelect.innerHTML=routines.length?routines.map(r=>`<option value="${r.id}">${esc(r.title)}</option>`).join(""):'<option value="">ルーティンタスクなし</option>';
  if(data.selectedRoutineCalendarId)E.routineCalendarSelect.value=data.selectedRoutineCalendarId;
  const r=routines.find(x=>x.id===data.selectedRoutineCalendarId);
  const y=routineCalCursor.getFullYear(),m=routineCalCursor.getMonth();
  E.routineCalendarMonthLabel.textContent=`${y}年 ${m+1}月`;
  E.routineCalendarGrid.innerHTML="";
  if(!r){E.routineCalendarGrid.innerHTML='<div class="routine-calendar-empty">ルーティンタスクを追加すると、ここに実績カレンダーが出ます。</div>';return}
  const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=localDate();
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const k=localDate(d),inMonth=d.getMonth()===m,scheduled=routineScheduledOn(r,k),done=routineDoneOn(r,k),future=k>today;
    const cell=document.createElement("div");
    cell.className="routine-calendar-day"+(inMonth?"":" outside")+(k===today?" today":"")+(done?" done":scheduled?" target":" off")+(future?" future":"");
    cell.innerHTML=`<span class="routine-calendar-date">${d.getDate()}</span><span class="routine-calendar-mark">${done?"✓":scheduled&&!future?"•":scheduled?"○":""}</span>`;
    cell.title=done?`${k}：できた`:scheduled?`${k}：対象日`:`${k}：対象外`;
    E.routineCalendarGrid.appendChild(cell)
  }
}
function openRoutineModal(id){
  const r=data.routines.find(x=>x.id===id);if(!r)return;editingRoutineId=id;
  E.routineModalTitleInput.value=r.title;E.routineModalRuleInput.value=r.rule;E.routineModalSlotInput.value=r.slot;E.routineModalPinnedInput.value=String(!!r.pinned);E.routineModalPausedInput.value=String(!!r.paused);
  qa(".routine-modal-weekday-input").forEach(x=>x.checked=(r.weekdays||[]).includes(Number(x.value)));toggleRoutineModalRuleUI();E.routineModal.classList.remove("hidden");setTimeout(()=>E.routineModalTitleInput.focus(),30)
}
function saveRoutineModal(){
  const r=data.routines.find(x=>x.id===editingRoutineId);if(!r)return;const title=E.routineModalTitleInput.value.trim();if(!title)return alert("名前を入力してください。");
  const rule=E.routineModalRuleInput.value,weekdays=qa(".routine-modal-weekday-input:checked").map(x=>Number(x.value));if(rule==="custom"&&!weekdays.length)return alert("曜日指定の時は1つ以上曜日を選んでください。");
  r.title=title;r.rule=rule;r.weekdays=weekdays;r.slot=E.routineModalSlotInput.value;r.pinned=E.routineModalPinnedInput.value==="true";r.paused=E.routineModalPausedInput.value==="true";touchRoutine(r);data.selectedRoutineCalendarId=r.id;save();closeModal("routineModal");renderRoutine();renderPinned();if(data.view==="shortcuts")renderShortcuts();standardAction("ルーティンタスクを更新",r.title,"save")
}
function deleteRoutineFromModal(){const id=editingRoutineId;if(!id)return;closeModal("routineModal");window.deleteRoutine(id)}

function renderHome(){
  const all=cards().filter(c=>c.type==="task"),s=todayStats(),month=localDate().slice(0,7);
  E.openTaskCount.textContent=all.length;E.todayTaskCount.textContent=s.open.length;E.overdueCount.textContent=all.filter(overdue).length;
  E.monthlyDoneCount.textContent=data.archive.filter(x=>x.completedAt&&localDate(new Date(x.completedAt)).startsWith(month)).length;
  E.homeProgressText.textContent=`${s.done.length} / ${s.total}`;E.homeProgressPercent.textContent=s.percent+"%";E.homeProgressFill.style.width=s.percent+"%";
  renderPinned();renderRecent();
  const up=all.filter(c=>c.start||c.due).sort((a,b)=>(a.due||a.start||"9999").localeCompare(b.due||b.start||"9999")).slice(0,9);
  E.upcomingList.innerHTML=up.length?up.map(c=>`<div class="upcoming-item"><span class="item-main"><strong>${c.pinned?"📌 ":""}${esc(c.title)}</strong><small>${esc(c.boardName)} / ${esc(c.sectionName)}</small></span><span class="due-chip${overdue(c)?" overdue":""}${beforeStart(c)?" upcoming":""}">${esc(periodLabel(c))}</span></div>`).join(""):"<p>期間付きタスクはありません。</p>"
}
function renderPinned(){const a=[];data.boards.filter(x=>x.pinned).forEach(x=>a.push({kind:"board",id:x.id,label:x.name,detail:"ボード",ts:x.updatedAt}));cards().filter(x=>x.pinned).forEach(x=>a.push({kind:"card",id:x.id,label:x.title,detail:`${x.boardName} / ${x.sectionName}`,boardId:x.boardId,ts:x.updatedAt}));data.quickMemos.filter(x=>x.pinned).forEach(x=>a.push({kind:"memo",id:x.id,label:x.title||"無題",detail:"メモ",ts:x.updatedAt}));data.goalTowers.filter(x=>x.pinned).forEach(x=>a.push({kind:"goal",id:x.id,label:x.name,detail:builderDisplayName(),ts:x.updatedAt}));data.routines.filter(x=>x.pinned).forEach(x=>a.push({kind:"routine",id:x.id,label:x.title,detail:"ルーティンタスク",ts:x.updatedAt}));a.sort((x,y)=>(y.ts||0)-(x.ts||0));E.pinnedList.innerHTML=a.length?a.slice(0,12).map(x=>`<div class="pinned-item"><span class="item-main"><strong>📌 ${esc(x.label)}</strong><small>${esc(x.detail)}</small></span><button onclick='openRef(${JSON.stringify(JSON.stringify(x))})'>開く</button></div>`).join(""):"<p>ピン留めはまだありません。</p>"}
function renderRecent(){const a=[...data.recent].sort((x,y)=>y.ts-x.ts).slice(0,12);E.recentList.innerHTML=a.length?a.map(x=>`<div class="recent-item"><span class="item-main"><strong>${esc(x.label)}</strong><small>${esc(x.detail)}</small></span><button onclick='openRef(${JSON.stringify(JSON.stringify(x))})'>開く</button></div>`).join(""):"<p>最近の履歴はまだありません。</p>"}
window.openRef=s=>{const x=JSON.parse(s);if(x.kind==="board"){const b=data.boards.find(b=>b.id===x.id);if(b){data.selectedBoardId=b.id;touchBoard(b);save();show("board")}}if(x.kind==="card")openCardAny(x.id);if(x.kind==="memo"){const m=data.quickMemos.find(m=>m.id===x.id);if(m){data.selectedQuickMemoId=m.id;touchMemo(m);save();show("memo")}}if(x.kind==="goal"){const g=data.goalTowers.find(g=>g.id===x.id);if(g){data.selectedGoalId=g.id;touchGoal(g);save();show("builder")}}if(x.kind==="routine"){const r=data.routines.find(r=>r.id===x.id);if(r){touchRoutine(r);save();show("routine");setTimeout(()=>document.querySelector(`[data-routine-id="${CSS.escape(x.id)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50)}}}
function renderCalendar(){
  const y=calCursor.getFullYear(),m=calCursor.getMonth(),first=new Date(y,m,1),gridStart=new Date(y,m,1-first.getDay());
  E.calendarMonthLabel.textContent=`${y}年 ${m+1}月`;
  const map=new Map();
  cards().filter(c=>c.type==="task"&&(c.start||c.due)).forEach(c=>{
    const add=(date,type)=>{if(!date)return;if(!map.has(date))map.set(date,[]);map.get(date).push({c,type})};
    add(c.start,"start");add(c.due,"due")
  });
  E.calendarGrid.innerHTML="";
  for(let i=0;i<42;i++){
    const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);
    const k=localDate(d),events=map.get(k)||[],b=document.createElement("button");
    b.type="button";
    b.className="calendar-day"+(d.getMonth()!==m?" outside":"")+(k===localDate()?" today":"")+(k===selectedDate?" selected":"")+(events.length?" has-events":"");
    b.innerHTML=`<span class="calendar-date-number">${d.getDate()}</span>${events.slice(0,3).map(x=>`<span class="calendar-task-dot">${x.type==="start"?"▶ ":"〆 "}${esc(x.c.title)}</span>`).join("")}${events.length>3?`<span class="calendar-more">+${events.length-3}</span>`:""}`;
    b.onclick=()=>{selectedDate=k;renderCalendar()};E.calendarGrid.appendChild(b)
  }
  renderDay(selectedDate)
}
function renderDay(k){
  const a=cards().filter(c=>c.type==="task"&&(c.start===k||c.due===k));
  E.calendarDayDetail.innerHTML=`<h4>${k}</h4>${a.length?a.map(c=>`<div class="calendar-detail-item"><span class="item-main"><strong>${c.pinned?"📌 ":""}${esc(c.title)}</strong><small>${c.start===k&&c.due===k?"▶ 開始 / 〆":c.start===k?"▶ 開始":"〆 期限"} / ${esc(c.boardName)} / ${esc(c.sectionName)} / ${esc(periodLabel(c))}</small></span><div class="header-actions"><button class="secondary-button" onclick="openCardAny('${c.id}')">開く</button><button class="success-button" onclick="completeOne('${c.id}')">完了</button></div></div>`).join(""):"<p>この日の開始・期限タスクはありません。</p>"}`
}
function addSection(){const b=board(),name=prompt("小項目名","新しい小項目");if(!b||!name?.trim())return;b.sections.push({id:uid(),name:name.trim(),cards:[]});touchBoard(b);save();renderBoard();dopaAction("AREA BUILD!!",name.trim());standardAction("小項目を追加",name.trim(),"save")}
function deleteSection(id){const b=board(),s=b?.sections.find(x=>x.id===id);if(!s)return;if(s.cards.length&&!confirm(`「${s.name}」のカードもゴミ箱へ移動しますか？`))return;const label=s.name;s.cards.forEach(c=>trashAdd("card",c,{boardId:b.id,boardName:b.name,sectionId:s.id,sectionName:s.name},c.title));b.sections=b.sections.filter(x=>x.id!==id);touchBoard(b);save();renderBoard();feedbackAction("小項目を削除",label,"delete")}
function deleteBoard(){const b=board();if(!b)return;if(data.boards.length===1)return alert("最後のボードは削除できません。");if(!confirm(`「${b.name}」をゴミ箱へ移動しますか？`))return;const label=b.name;trashAdd("board",b,{},b.name);data.boards=data.boards.filter(x=>x.id!==b.id);data.selectedBoardId=data.boards[0].id;save();renderAll();feedbackAction("ボードを削除",`${label} をゴミ箱へ移動`,"delete")}
function filterCards(a){const q=E.searchInput.value.trim().toLowerCase(),tag=E.tagFilter.value,status=E.statusFilter.value;let o=a.filter(c=>{const h=[c.title,c.content,c.link,...c.tags].join(" ").toLowerCase();return(!q||h.includes(q))&&(!tag||c.tags.includes(tag))&&(status!=="open"||!c.selected)&&(status!=="selected"||c.selected)&&(status!=="overdue"||overdue(c))&&(status!=="pinned"||c.pinned)});const s=E.sortSelect.value;if(s==="dueAsc")o.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));if(s==="dueDesc")o.sort((a,b)=>(b.due||"0000").localeCompare(a.due||"0000"));if(s==="createdDesc")o.sort((a,b)=>b.createdAt-a.createdAt);if(s==="createdAsc")o.sort((a,b)=>a.createdAt-b.createdAt);return o}
function renderBoard(){const b=board();if(!b)return;E.currentBoardTitle.textContent=b.name;updateBoardPin();const tags=[...new Set(b.sections.flatMap(s=>s.cards.flatMap(c=>c.tags)))].sort(),old=E.tagFilter.value;E.tagFilter.innerHTML='<option value="">すべてのタグ</option>'+tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");if(tags.includes(old))E.tagFilter.value=old;E.sectionBoard.innerHTML="";if(!b.sections.length)E.sectionBoard.innerHTML='<div class="empty-section">小項目を追加してください。</div>';else b.sections.forEach(s=>E.sectionBoard.appendChild(renderSection(s)));selectionUI()}
function renderSection(s){const wrap=document.createElement("section");wrap.className="board-section";const head=document.createElement("div");head.className="section-header";const h=document.createElement("h3");h.className="section-title";h.contentEditable="true";h.textContent=s.name;h.onblur=()=>{const v=h.textContent.trim();if(v&&v!==s.name){s.name=v;touchBoard(board());save()}else h.textContent=s.name};const acts=document.createElement("div");acts.className="section-actions";const add=document.createElement("button");add.textContent="＋ カード";add.onclick=()=>openCardModal(null,board().id,s.id);const del=document.createElement("button");del.textContent="削除";del.onclick=()=>deleteSection(s.id);acts.append(add,del);head.append(h,acts);const grid=document.createElement("div");grid.className="card-grid";grid.ondragover=e=>e.preventDefault();grid.ondrop=e=>dropSection(e,s.id);const a=filterCards([...s.cards]);if(a.length)a.forEach(c=>grid.appendChild(renderCard(c,s.id)));else grid.innerHTML='<div class="empty-section">ここにカードを置けます。</div>';wrap.append(head,grid);return wrap}
function renderCard(c,sid){const el=document.createElement("article");el.className=`memo-card ${c.color||"white"}${c.selected?" selected":""}`;el.draggable=true;el.dataset.cardId=c.id;el.ondragstart=()=>dragCard=c.id;el.ondragend=()=>dragCard=null;el.ondragover=e=>e.preventDefault();el.ondrop=e=>dropCard(e,sid,c.id);const head=document.createElement("div");head.className="card-head";if(c.type==="task"){const chk=document.createElement("input");chk.type="checkbox";chk.checked=c.selected;chk.className="card-select";chk.onchange=()=>{c.selected=chk.checked;c.updatedAt=Date.now();save();renderBoard()};head.appendChild(chk)}else{const i=document.createElement("span");i.className="card-type";i.textContent=({memo:"📝",idea:"💡",link:"🔗",image:"🖼"}[c.type]||"📝");head.appendChild(i)}const title=document.createElement("h3");title.className="card-title";title.textContent=(c.pinned?"📌 ":"")+(c.title||"無題");head.appendChild(title);el.appendChild(head);if(c.image){const img=document.createElement("img");img.className="card-image";img.src=c.image;el.appendChild(img)}if(c.content){const d=document.createElement("div");d.className="card-content";d.textContent=c.content;el.appendChild(d)}if(c.link){const a=document.createElement("a");a.className="card-link";a.href=c.link;a.target="_blank";a.rel="noopener";a.textContent=c.link;el.appendChild(a)}const meta=document.createElement("div");meta.className="meta-row";if(c.start||c.due){const d=document.createElement("span");d.className="due-chip"+(overdue(c)?" overdue":"")+(beforeStart(c)?" upcoming":"");d.textContent=periodLabel(c);meta.appendChild(d)}if(c.repeat?.type&&c.repeat.type!=="none"){const r=document.createElement("span");r.className="repeat-chip";r.textContent=repeatLabel(c.repeat);meta.appendChild(r)}if(meta.childNodes.length)el.appendChild(meta);if(c.tags.length){const t=document.createElement("div");t.className="tag-row";c.tags.forEach(x=>{const s=document.createElement("span");s.className="tag-chip";s.textContent="#"+x;t.appendChild(s)});el.appendChild(t)}const foot=document.createElement("div");foot.className="card-footer";const pin=document.createElement("button");pin.className="pin-card-button"+(c.pinned?" pinned":"");pin.textContent=c.pinned?"★ ピン":"☆ ピン";pin.onclick=()=>{c.pinned=!c.pinned;c.updatedAt=Date.now();touchBoard(board());save();renderBoard()};const edit=document.createElement("button");edit.textContent="編集 / 移動";edit.onclick=()=>openCardModal(c.id);const del=document.createElement("button");del.className="delete-card";del.textContent="削除";del.onclick=()=>deleteCard(c.id);foot.append(pin,edit,del);el.appendChild(foot);return el}
function dropSection(e,sid){e.preventDefault();if(!dragCard)return;const f=findCard(dragCard),target=board().sections.find(s=>s.id===sid);if(!f||!target)return;f.s.cards=f.s.cards.filter(c=>c.id!==dragCard);target.cards.push(f.c);f.c.updatedAt=Date.now();touchBoard(board());save();renderBoard()}
function dropCard(e,sid,targetId){e.preventDefault();e.stopPropagation();if(!dragCard||dragCard===targetId)return;const f=findCard(dragCard),t=board().sections.find(s=>s.id===sid);if(!f||!t)return;f.s.cards=f.s.cards.filter(c=>c.id!==dragCard);const i=t.cards.findIndex(c=>c.id===targetId);t.cards.splice(Math.max(0,i),0,f.c);f.c.updatedAt=Date.now();touchBoard(board());save();renderBoard()}
function deleteCard(id){const f=findCard(id);if(!f||!confirm(`「${f.c.title}」をゴミ箱へ移動しますか？`))return;const label=f.c.title;trashAdd("card",f.c,{boardId:f.b.id,boardName:f.b.name,sectionId:f.s.id,sectionName:f.s.name},f.c.title);f.s.cards=f.s.cards.filter(c=>c.id!==id);touchBoard(f.b);save();renderBoard();feedbackAction("カードを削除",`${label} をゴミ箱へ移動`,"delete")}
function selectionUI(){const a=cards().filter(c=>c.type==="task"&&c.selected);E.selectionBar.classList.toggle("hidden",!a.length);E.completeSelectedButton.classList.toggle("hidden",!a.length);E.selectionCountText.textContent=`${a.length}件選択中`}
function clearSelection(){data.boards.forEach(b=>b.sections.forEach(s=>s.cards.forEach(c=>{if(c.type==="task")c.selected=false})));save();renderBoard()}
function completeSelected(){completeCards(cards().filter(c=>c.type==="task"&&c.selected).map(c=>c.id))}
function completeCards(ids){
  if(!ids.length)return;let n=0;
  ids.forEach(id=>{const f=findCard(id);if(!f)return;const snap={...clone(f.c),selected:false,boardId:f.b.id,boardName:f.b.name,sectionId:f.s.id,sectionName:f.s.name,completedAt:new Date().toISOString()};data.archive.unshift(snap);const next=nextRepeat(f.c);f.s.cards=f.s.cards.filter(c=>c.id!==id);if(next)f.s.cards.push(next);touchBoard(f.b);n++});
  save();
  if(data.settings.theme==="dopaboy")dopaBlast("CLEAR!!",`${n}件 完了！！`,"task");else standardAction("タスク完了",`${n}件を「完了したこと」に保存`,"complete");
  renderAll()
}
function nextRepeat(c){
  if(!c.repeat||c.repeat.type==="none")return null;
  const base=c.due||c.start||localDate(),next=nextDue(base,c.repeat);
  let start=c.start||"",due=c.due?next:"";
  if(c.start&&c.due){
    const span=Math.round((new Date(c.due+"T00:00:00")-new Date(c.start+"T00:00:00"))/86400000);
    const d=new Date(next+"T00:00:00");d.setDate(d.getDate()-span);start=localDate(d)
  }else if(c.start&&!c.due){start=next}
  return{...clone(c),id:uid(),start,due,selected:false,createdAt:Date.now(),updatedAt:Date.now()}
}
function nextDue(date,r){const b=new Date(date+"T00:00:00"),i=Math.max(1,Number(r.interval)||1);if(r.type==="daily")b.setDate(b.getDate()+i);else if(r.type==="weekly")b.setDate(b.getDate()+7*i);else if(r.type==="monthly")b.setMonth(b.getMonth()+i);else if(r.type==="weekdays"){for(let o=1;o<=14;o++){const c=new Date(b);c.setDate(b.getDate()+o);if((r.weekdays||[]).map(Number).includes(c.getDay()))return localDate(c)}}return localDate(b)}
function repeatLabel(r){const i=Math.max(1,Number(r.interval)||1);if(r.type==="daily")return i===1?"毎日":`${i}日ごと`;if(r.type==="weekly")return i===1?"毎週":`${i}週ごと`;if(r.type==="monthly")return i===1?"毎月":`${i}か月ごと`;if(r.type==="weekdays")return"毎週 "+(r.weekdays||[]).map(x=>["日","月","火","水","木","金","土"][x]).join("・");return""}
function toast(s){const [a,b]=s.split("|");const t=document.createElement("div");t.innerHTML=`${esc(a)}<small style="display:block;margin-top:4px">${esc(b||"")}</small>`;Object.assign(t.style,{position:"fixed",left:"50%",top:"25px",transform:"translateX(-50%)",zIndex:999,padding:"12px 18px",borderRadius:"10px",background:"var(--panel)",color:"var(--text)",border:"2px solid var(--accent)",boxShadow:"var(--shadow)",fontWeight:900});document.body.appendChild(t);setTimeout(()=>t.remove(),1600)}
function dopaBlast(title,sub="",level="task"){
  if(data.settings.theme!=="dopaboy"||!data.settings.dopaMotion){toast(`${title}|${sub}`);return}
  document.querySelectorAll(".dopa-fx").forEach(x=>x.remove());
  const root=document.createElement("div");root.className=`dopa-fx dopa-fx-${level}`;
  root.innerHTML=`<div class="dopa-impact-ring r1"></div><div class="dopa-impact-ring r2"></div><div class="dopa-fx-copy"><div class="dopa-fx-kicker">DOPA-BOY // RESULT</div><div class="dopa-fx-title">${esc(title)}</div><div class="dopa-fx-sub">${esc(sub)}</div></div>`;
  const count=level==="goal"?90:level==="block"?36:64;
  for(let i=0;i<count;i++){const p=document.createElement("i");p.className="dopa-particle";p.style.setProperty("--x",`${Math.round((Math.random()-.5)*130)}vw`);p.style.setProperty("--y",`${Math.round((Math.random()-.5)*110)}vh`);p.style.setProperty("--r",`${Math.round(Math.random()*760-380)}deg`);p.style.setProperty("--delay",`${(Math.random()*.18).toFixed(2)}s`);p.style.setProperty("--h",`${Math.round(Math.random()*360)}`);root.appendChild(p)}
  document.body.appendChild(root);document.body.classList.remove("dopa-screen-shake");void document.body.offsetWidth;document.body.classList.add("dopa-screen-shake");
  setTimeout(()=>{root.remove();document.body.classList.remove("dopa-screen-shake")},level==="goal"?2200:1800)
}
window.completeOne=id=>completeCards([id]);window.openCardAny=id=>{const f=findCard(id);if(!f)return;data.selectedBoardId=f.b.id;touchCard(f);save();show("board");setTimeout(()=>document.querySelector(`[data-card-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50)}

function standardAction(title,sub="",kind="action"){
  if(data.settings.theme==="dopaboy")return;
  document.querySelectorAll(".standard-action-fx").forEach(x=>x.remove());
  const icon={complete:"✓",done:"✓",delete:"🗑",restore:"↩",save:"＋",undo:"↶",action:"●"}[kind]||"●";
  const root=document.createElement("div");
  root.className=`standard-action-fx standard-${kind}`;
  root.innerHTML=`<div class="standard-action-card"><span class="standard-action-icon">${icon}</span><div><strong>${esc(title)}</strong><small>${esc(sub)}</small></div></div><div class="standard-action-ripple"></div>`;
  document.body.appendChild(root);setTimeout(()=>root.remove(),1400)
}
function feedbackAction(title,sub="",kind="action"){
  if(data.settings.theme==="dopaboy")dopaAction(title,sub,kind);else standardAction(title,sub,kind);
}

function builderBreakBlast(title,sub="",level="block"){
  if(data.settings.theme!=="dopaboy"||!data.settings.dopaMotion){
    standardAction(level==="goal"?"目標達成":"ブロック完了",sub||title,"complete");
    return;
  }

  document.querySelectorAll(".builder-break-fx").forEach(x=>x.remove());

  const isGoal=level==="goal";
  const root=document.createElement("div");
  root.className=`builder-break-fx builder-break-${level}`;

  const flash=document.createElement("div");
  flash.className="builder-break-flash";

  const shock=document.createElement("div");
  shock.className="builder-break-shock";

  const wall=document.createElement("div");
  wall.className="builder-break-wall";

  const core=document.createElement("div");
  core.className="builder-break-core";

  const copy=document.createElement("div");
  copy.className="builder-break-copy";
  copy.innerHTML=`
    <div class="builder-break-kicker">${isGoal?"TARGET ANNIHILATED":"BREAK CONFIRMED"}</div>
    <div class="builder-break-title">${esc(title)}</div>
    <div class="builder-break-sub">${esc(sub)}</div>
  `;

  const slash=document.createElement("div");
  slash.className="builder-break-scribble";
  slash.innerHTML=isGoal
    ? '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>'
    : '<i></i><i></i><i></i><i></i><i></i>';

  root.append(flash,shock,wall,core,slash,copy);

  // Block = literally one block. Goal = many blocks.
  const brickCount=isGoal?42:1;
  for(let i=0;i<brickCount;i++){
    const brick=document.createElement("i");
    brick.className="builder-break-brick";
    brick.style.setProperty("--bx",`${Math.round((Math.random()-.5)*(isGoal?175:118))}vw`);
    brick.style.setProperty("--by",`${Math.round((Math.random()-.5)*(isGoal?136:96))}vh`);
    brick.style.setProperty("--br",`${Math.round(Math.random()*(isGoal?1900:1250)-(isGoal?950:625))}deg`);
    brick.style.setProperty("--bd",`${(Math.random()*(isGoal?.08:.035)).toFixed(3)}s`);
    brick.style.setProperty("--bs",`${((isGoal?1.0:.95)+Math.random()*(isGoal?0.95:0.55)).toFixed(2)}`);
    wall.appendChild(brick);
  }

  const symbols=isGoal?["◆","✦","✹","★","×","✧","▰","▱","⚡","💥","✸"]:["◆","✦","★","×","⚡","✧"];
  const bits=isGoal?110:34;
  for(let i=0;i<bits;i++){
    const p=document.createElement("span");
    p.className="builder-break-bit";
    p.textContent=symbols[Math.floor(Math.random()*symbols.length)];
    p.style.setProperty("--px",`${Math.round((Math.random()-.5)*(isGoal?190:120))}vw`);
    p.style.setProperty("--py",`${Math.round((Math.random()-.5)*(isGoal?155:95))}vh`);
    p.style.setProperty("--pr",`${Math.round(Math.random()*(isGoal?1800:1200)-(isGoal?900:600))}deg`);
    p.style.setProperty("--pd",`${(Math.random()*(isGoal?.13:.08)).toFixed(3)}s`);
    p.style.setProperty("--ph",`${Math.round(Math.random()*360)}`);
    p.style.setProperty("--ps",`${((isGoal?1.25:.8)+Math.random()*(isGoal?2.25:1.0)).toFixed(2)}`);
    root.appendChild(p);
  }

  const streaks=isGoal?34:12;
  for(let i=0;i<streaks;i++){
    const s=document.createElement("b");
    s.className="builder-break-streak";
    s.style.setProperty("--sa",`${Math.round(Math.random()*360)}deg`);
    s.style.setProperty("--sl",`${Math.round((isGoal?26:14)+Math.random()*(isGoal?40:26))}vw`);
    s.style.setProperty("--sd",`${(Math.random()*(isGoal?.10:.06)).toFixed(3)}s`);
    root.appendChild(s);
  }

  if(isGoal){
    const shock2=document.createElement("div");
    shock2.className="builder-break-shock builder-break-shock-2";
    const flash2=document.createElement("div");
    flash2.className="builder-break-flash builder-break-flash-2";
    const aura=document.createElement("div");
    aura.className="builder-break-aura";
    root.append(shock2,flash2,aura);
  }

  document.body.appendChild(root);

  document.body.classList.remove("builder-break-screen-shake","builder-goal-break-screen-shake");
  void document.body.offsetWidth;
  document.body.classList.add(isGoal?"builder-goal-break-screen-shake":"builder-break-screen-shake");

  setTimeout(()=>{
    root.remove();
    document.body.classList.remove("builder-break-screen-shake","builder-goal-break-screen-shake");
  },isGoal?2950:1600);
}

function dopaAction(title,sub="",kind="action"){
  if(data.settings.theme!=="dopaboy"||!data.settings.dopaMotion)return;
  document.querySelectorAll(".dopa-action-fx").forEach(x=>x.remove());
  const icon={complete:"✓",done:"✓",delete:"🗑",restore:"↩",save:"＋",undo:"↶",action:"⚡"}[kind]||"⚡";
  const root=document.createElement("div");
  root.className=`dopa-action-fx dopa-action-${kind}`;
  root.innerHTML=`<div class="dopa-action-stamp"><span class="dopa-action-kind-icon">${icon}</span><span class="dopa-action-title">${esc(title)}</span><small>${esc(sub)}</small></div><div class="dopa-action-ring"></div>`;
  for(let i=0;i<18;i++){
    const p=document.createElement("i");p.className="dopa-action-particle";
    p.style.setProperty("--ax",`${Math.round((Math.random()-.5)*62)}vw`);p.style.setProperty("--ay",`${Math.round((Math.random()-.5)*48)}vh`);p.style.setProperty("--ar",`${Math.round(Math.random()*520-260)}deg`);p.style.setProperty("--ah",`${Math.round(Math.random()*360)}`);root.appendChild(p)
  }
  document.body.appendChild(root);setTimeout(()=>root.remove(),900);
}

function refreshCardBoards(id){E.cardBoardInput.innerHTML=data.boards.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join("");E.cardBoardInput.value=id||data.selectedBoardId;refreshCardSections()}
function refreshCardSections(){const b=data.boards.find(b=>b.id===E.cardBoardInput.value)||board();E.cardSectionInput.innerHTML=(b?.sections||[]).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}
function openCardModal(id=null,bid=null,sid=null){
  const b=data.boards.find(b=>b.id===(bid||data.selectedBoardId))||board();if(!b)return;
  if(!b.sections.length)return alert("先に小項目を追加してください。");
  editingCardId=id;editingImageData="";qa(".weekday-input").forEach(x=>x.checked=false);
  if(id){
    const f=findCard(id);if(!f)return;touchCard(f);const c=f.c;
    E.cardModalTitle.textContent="カードを編集 / 移動";refreshCardBoards(f.b.id);E.cardSectionInput.value=f.s.id;
    E.cardTypeInput.value=c.type;E.cardPinnedInput.value=String(c.pinned);E.cardTitleInput.value=c.title;E.cardContentInput.value=c.content;
    E.cardStartInput.value=c.start||"";E.cardDueInput.value=c.due||"";E.cardTagsInput.value=c.tags.join(", ");E.cardColorInput.value=c.color;E.cardLinkInput.value=c.link;
    editingImageData=c.image;E.repeatTypeInput.value=c.repeat?.type||"none";E.repeatIntervalInput.value=c.repeat?.interval||1;
    qa(".weekday-input").forEach(x=>x.checked=(c.repeat?.weekdays||[]).map(Number).includes(Number(x.value)))
  }else{
    E.cardModalTitle.textContent="カードを追加";refreshCardBoards(b.id);if(sid)E.cardSectionInput.value=sid;
    E.cardTypeInput.value="task";E.cardPinnedInput.value="false";E.cardTitleInput.value="";E.cardContentInput.value="";
    E.cardStartInput.value="";E.cardDueInput.value="";E.cardTagsInput.value="";E.cardColorInput.value="yellow";E.cardLinkInput.value="";
    E.repeatTypeInput.value="none";E.repeatIntervalInput.value=1
  }
  repeatUI();imagePreview();E.cardImageInput.value="";save();E.cardModal.classList.remove("hidden")
}
function repeatUI(){const t=E.repeatTypeInput.value;E.repeatIntervalWrap.classList.toggle("hidden",t==="none"||t==="weekdays");E.weekdayPickerWrap.classList.toggle("hidden",t!=="weekdays")}
function saveCard(){
  const wasEdit=!!editingCardId,title=E.cardTitleInput.value.trim(),content=E.cardContentInput.value.trim();
  if(!title&&!content&&!editingImageData)return alert("タイトル・内容・画像のどれかを入れてください。");
  const b=data.boards.find(b=>b.id===E.cardBoardInput.value),s=b?.sections.find(s=>s.id===E.cardSectionInput.value);
  if(!b||!s)return alert("移動先を選び直してください。");
  const values={type:E.cardTypeInput.value,title:title||"無題",content,start:E.cardStartInput.value,due:E.cardDueInput.value,tags:E.cardTagsInput.value.split(",").map(x=>x.trim()).filter(Boolean),color:E.cardColorInput.value,link:E.cardLinkInput.value.trim(),image:editingImageData,pinned:E.cardPinnedInput.value==="true",repeat:{type:E.repeatTypeInput.value,interval:Math.max(1,Number(E.repeatIntervalInput.value)||1),weekdays:qa(".weekday-input:checked").map(x=>Number(x.value))},updatedAt:Date.now()};
  if(values.start&&values.due&&values.start>values.due)return alert("着手可能日は期限日より前にしてください。");
  if(editingCardId){
    const f=findCard(editingCardId);if(!f)return;Object.assign(f.c,values);
    if(f.b.id!==b.id||f.s.id!==s.id){f.s.cards=f.s.cards.filter(c=>c.id!==editingCardId);s.cards.push(f.c);f.b.updatedAt=Date.now()}
    b.updatedAt=Date.now();recent("card",f.c.id,f.c.title,`${b.name} / ${s.name}`,b.id)
  }else{
    const c={id:uid(),...values,selected:false,createdAt:Date.now()};s.cards.push(c);b.updatedAt=Date.now();recent("card",c.id,c.title,`${b.name} / ${s.name}`,b.id)
  }
  data.selectedBoardId=b.id;save();closeModal("cardModal");renderAll();
  dopaAction(wasEdit?"CARD UPDATE!!":"CARD SET!!",values.title);standardAction(wasEdit?"カードを更新":"カードを追加",values.title,"save")
}
function closeModal(id){$(id)?.classList.add("hidden")}
function readImage(file,cb){if(!file)return;if(file.size>2000000)alert("画像が大きめです。保存容量を圧迫する可能性があります。");const r=new FileReader();r.onload=()=>cb(r.result);r.readAsDataURL(file)}
function imagePreview(){E.imagePreviewWrap.classList.toggle("hidden",!editingImageData);if(editingImageData)E.imagePreview.src=editingImageData}
function renderArchive(){
  const q=E.archiveSearchInput.value.trim().toLowerCase();
  const boardFilter=E.archiveBoardFilter.value;
  const tagFilter=E.archiveTagFilter.value;
  const period=E.archivePeriodFilter.value||"all";
  const now=new Date(),today=localDate(),month=now.toISOString().slice(0,7),year=String(now.getFullYear());
  E.archiveTotalCount.textContent=data.archive.length;
  E.archiveMonthCount.textContent=data.archive.filter(x=>(x.completedAt||"").startsWith(month)).length;
  E.archiveTodayCount.textContent=data.archive.filter(x=>localDate(new Date(x.completedAt))===today).length;
  const tagMap=new Map();
  data.archive.forEach(x=>{const tags=(x.tags&&x.tags.length)?x.tags:["タグなし"];tags.forEach(t=>{const a=tagMap.get(t)||[];a.push(x);tagMap.set(t,a)})});
  E.archiveTagCount.textContent=tagMap.size;
  E.archiveTagFiles.innerHTML=tagMap.size?[...tagMap.entries()].sort((a,b)=>b[1].length-a[1].length).map(([tag,items])=>{
    const monthly=items.filter(x=>(x.completedAt||"").startsWith(month)).length;
    return `<button class="archive-tag-file${tagFilter===tag?" active":""}" data-archive-tag="${esc(tag)}"><span class="archive-folder-icon">📁</span><strong>${esc(tag)}</strong><small>累計 ${items.length}件 / 今月 ${monthly}件</small></button>`;
  }).join(""):"<p>タグ付きの完了タスクが増えると、ここにファイルができます。</p>";
  document.querySelectorAll("[data-archive-tag]").forEach(b=>b.onclick=()=>{E.archiveTagFilter.value=b.dataset.archiveTag;renderArchive()});
  const opts=[...new Map(data.archive.filter(x=>x.boardId&&x.boardName).map(x=>[x.boardId,x.boardName]))];
  E.archiveBoardFilter.innerHTML='<option value="">すべてのボード</option>'+opts.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join("");E.archiveBoardFilter.value=boardFilter;
  const tagOptions=[...tagMap.keys()].sort();
  E.archiveTagFilter.innerHTML='<option value="">すべてのタグ</option>'+tagOptions.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");E.archiveTagFilter.value=tagFilter;
  const periodOk=x=>{const iso=x.completedAt||"";if(period==="today")return localDate(new Date(iso))===today;if(period==="month")return iso.startsWith(month);if(period==="year")return iso.startsWith(year);return true};
  let a=data.archive.filter(x=>(!q||[x.title,x.content,x.boardName,...(x.tags||[])].join(" ").toLowerCase().includes(q))&&(!boardFilter||x.boardId===boardFilter)&&(!tagFilter||((tagFilter==="タグなし"?!(x.tags||[]).length:(x.tags||[]).includes(tagFilter))))&&periodOk(x));
  a.sort((x,y)=>new Date(y.completedAt)-new Date(x.completedAt));
  E.archiveResultCount.textContent=`${a.length}件`;
  const showAll=E.archiveShowAllButton.dataset.all==="true";
  E.archiveShowAllButton.classList.toggle("hidden",a.length<=30);
  E.archiveShowAllButton.textContent=showAll?"最近30件に戻す":"すべて表示";
  const shown=showAll?a:a.slice(0,30);
  E.archiveList.innerHTML=shown.length?shown.map(x=>`<article class="archive-card"><h3>✅ ${esc(x.title)}</h3><div class="tag-row">${(x.tags||[]).map(t=>`<span class="tag-chip">#${esc(t)}</span>`).join("")}</div><p>${esc(x.content||"")}</p><p><small>${esc(x.boardName||"")} / ${esc(x.sectionName||"")}<br>${new Date(x.completedAt).toLocaleString("ja-JP")}</small></p><div class="archive-actions"><button class="secondary-button" onclick="restoreArchive('${x.id}')">タスクに戻す</button><button class="danger-outline-button" onclick="trashArchive('${x.id}')">ゴミ箱へ</button></div></article>`).join(""):"<p>条件に合う完了タスクはありません。</p>";
}
window.restoreArchive=id=>{const x=data.archive.find(x=>x.id===id);if(!x)return;const label=x.title;let b=data.boards.find(b=>b.id===x.boardId)||data.boards[0],s=b.sections.find(s=>s.id===x.sectionId)||b.sections.find(s=>s.name===x.sectionName)||b.sections[0];if(!s){s={id:uid(),name:"未分類",cards:[]};b.sections.push(s)}const c=clone(x);["boardId","boardName","sectionId","sectionName","completedAt"].forEach(k=>delete c[k]);c.selected=false;c.updatedAt=Date.now();s.cards.push(c);b.updatedAt=Date.now();data.archive=data.archive.filter(x=>x.id!==id);save();renderArchive();feedbackAction("完了記録をタスクに戻した",label,"restore")}
window.trashArchive=id=>{const x=data.archive.find(x=>x.id===id);if(!x)return;const label=x.title;trashAdd("archive",x,{},"完了: "+x.title);data.archive=data.archive.filter(x=>x.id!==id);save();renderArchive();feedbackAction("完了記録をゴミ箱へ移動",label,"delete")}
function freeSnap(){return clone({freePages:data.freePages,selectedFreePageId:data.selectedFreePageId,trash:data.trash})}
function freeRecord(before){if(freeLock||!before)return;const now=freeSnap();if(JSON.stringify(before)===JSON.stringify(now))return;freeUndo.push(before);if(freeUndo.length>40)freeUndo.shift();freeRedo=[];freeButtons()}
function freeRestore(s){freeLock=true;data.freePages=clone(s.freePages);data.selectedFreePageId=s.selectedFreePageId;data.trash=clone(s.trash||data.trash);save();renderFreeboard();freeLock=false;freeButtons()}
function freeButtons(){E.undoFreeboardButton.classList.toggle("free-history-disabled",!freeUndo.length);E.redoFreeboardButton.classList.toggle("free-history-disabled",!freeRedo.length)}
function undoFree(){if(!freeUndo.length)return;const cur=freeSnap(),prev=freeUndo.pop();freeRedo.push(cur);freeRestore(prev)}
function redoFree(){if(!freeRedo.length)return;const cur=freeSnap(),next=freeRedo.pop();freeUndo.push(cur);freeRestore(next)}
const mobileFree=()=>matchMedia("(max-width:700px)").matches;
function freeBringFront(i,card){
  const p=freePage();
  if(!p)return false;
  const idx=p.items.findIndex(x=>x.id===i.id);
  if(idx<0||idx===p.items.length-1)return false;
  const [item]=p.items.splice(idx,1);
  p.items.push(item);
  if(card?.parentNode)card.parentNode.appendChild(card);
  return true;
}
function renderFreeboard(){
  const p=freePage();if(!p)return;freeButtons();E.freePageTabs.innerHTML="";
  data.freePages.forEach(pg=>{const b=document.createElement("button");b.className="free-page-tab"+(pg.id===p.id?" active":"");b.textContent=pg.name;b.onclick=()=>{data.selectedFreePageId=pg.id;save();renderFreeboard()};E.freePageTabs.appendChild(b)});
  E.freeCanvas.innerHTML="";
  p.items.forEach(i=>{
    const card=document.createElement("div");card.className=`free-item ${i.type==="image"?"free-image":"free-note"}`;card.dataset.freeItemId=i.id;
    if(!mobileFree()){card.style.left=i.x+"px";card.style.top=i.y+"px";card.style.width=i.width+"px";card.style.height=i.height+"px"}
    const bar=document.createElement("div");bar.className="free-item-toolbar";
    const label=document.createElement("span");label.className="free-drag-label";label.textContent=i.type==="image"?"画像":"付箋";
    const acts=document.createElement("div");acts.className="free-toolbar-actions";
    const resize=document.createElement("button");resize.className="free-resize-button";resize.textContent="↘";resize.title="右下をつかんでサイズ変更";
    const del=document.createElement("button");del.className="free-delete";del.textContent="×";del.title="ゴミ箱へ";
    del.onclick=e=>{e.stopPropagation();const before=freeSnap();trashAdd("freeItem",i,{pageId:p.id,pageName:p.name},i.type==="image"?"自由帳の画像":String(i.content).slice(0,24));p.items=p.items.filter(x=>x.id!==i.id);save();freeRecord(before);renderFreeboard()};
    acts.append(del);bar.append(label,acts);
    const body=document.createElement("div");body.className="free-item-body";
    if(i.type==="image"){const img=document.createElement("img");img.src=i.content;body.appendChild(img)}else body.textContent=i.content;
    card.append(bar,body);
    if(mobileFree())card.onclick=()=>openFreeModal(i.id);else{card.appendChild(resize);body.ondblclick=()=>{if(i.type!=="note")return;const n=prompt("付箋を編集",i.content);if(n!==null&&n!==i.content){const before=freeSnap();i.content=n;i.updatedAt=Date.now();save();freeRecord(before);renderFreeboard()}};bindFreeDrag(card,bar,i);bindFreeResize(card,i,resize)}
    E.freeCanvas.appendChild(card)
  })
}
function bindFreeDrag(card,bar,i){
  let active=false,sx=0,sy=0,ox=0,oy=0,before=null;
  bar.onpointerdown=e=>{
    if(e.target.closest("button"))return;
    active=true;
    before=freeSnap();
    freeBringFront(i,card);
    sx=e.clientX;sy=e.clientY;ox=i.x;oy=i.y;
    try{bar.setPointerCapture(e.pointerId)}catch{}
  };
  bar.onpointermove=e=>{
    if(!active)return;
    i.x=Math.max(0,ox+e.clientX-sx);
    i.y=Math.max(0,oy+e.clientY-sy);
    card.style.left=i.x+"px";
    card.style.top=i.y+"px";
  };
  bar.onpointerup=()=>{
    if(!active)return;
    active=false;
    i.updatedAt=Date.now();
    save();
    freeRecord(before);
  };
}
function bindFreeResize(card,i,h){
  let active=false,sx=0,sy=0,ow=0,oh=0,before=null,oldZ="";
  h.onpointerdown=e=>{
    e.preventDefault();
    e.stopPropagation();
    active=true;
    before=freeSnap();
    freeBringFront(i,card);
    sx=e.clientX;sy=e.clientY;ow=i.width;oh=i.height;
    oldZ=card.style.zIndex;
    card.style.zIndex="25";
    card.classList.add("is-resizing");
    try{h.setPointerCapture(e.pointerId)}catch{}
  };
  h.onpointermove=e=>{
    if(!active)return;
    i.width=Math.max(150,ow+e.clientX-sx);
    i.height=Math.max(100,oh+e.clientY-sy);
    card.style.width=i.width+"px";
    card.style.height=i.height+"px";
  };
  h.onpointerup=()=>{
    if(!active)return;
    active=false;
    i.updatedAt=Date.now();
    card.style.zIndex=oldZ;
    card.classList.remove("is-resizing");
    save();
    freeRecord(before);
  };
}
function openFreeModal(id){const p=freePage(),i=p?.items.find(x=>x.id===id);if(!i)return;editingFreeItemId=id;E.freeItemModalTitle.textContent=i.type==="image"?"画像":"付箋";E.freeItemTextInput.classList.toggle("hidden",i.type!=="note");E.freeItemImagePreview.classList.toggle("hidden",i.type!=="image");if(i.type==="note")E.freeItemTextInput.value=i.content;else E.freeItemImagePreview.src=i.content;E.freeItemModal.classList.remove("hidden")}
function saveFreeModal(){const p=freePage(),i=p?.items.find(x=>x.id===editingFreeItemId);if(!i)return;if(i.type==="note"){const before=freeSnap();i.content=E.freeItemTextInput.value;i.updatedAt=Date.now();save();freeRecord(before)}closeModal("freeItemModal");renderFreeboard()}
function deleteFreeModal(){const p=freePage(),i=p?.items.find(x=>x.id===editingFreeItemId);if(!i)return;const before=freeSnap();trashAdd("freeItem",i,{pageId:p.id,pageName:p.name},i.type==="image"?"自由帳の画像":String(i.content).slice(0,24));p.items=p.items.filter(x=>x.id!==i.id);save();freeRecord(before);closeModal("freeItemModal");renderFreeboard()}
function ensureMemo(){if(data.quickMemos.length)return;const m={id:uid(),title:"",content:"",pinned:false,updatedAt:Date.now()};data.quickMemos.push(m);data.selectedQuickMemoId=m.id;save()}
function renderMemos(){ensureMemo();const cur=memo();E.quickMemoList.innerHTML="";[...data.quickMemos].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt).forEach(m=>{const b=document.createElement("button");b.className="quick-memo-list-item"+(m.id===cur.id?" active":"");b.innerHTML=`<strong>${esc(m.title||"無題")}</strong><small>${new Date(m.updatedAt).toLocaleString("ja-JP")}</small>${m.pinned?'<span class="quick-memo-list-pin">★</span>':""}`;b.onclick=()=>{data.selectedQuickMemoId=m.id;touchMemo(m);save();renderMemos()};E.quickMemoList.appendChild(b)});E.quickMemoTitle.value=cur.title;E.quickMemoContent.value=cur.content;E.quickMemoSavedLabel.textContent="自動保存";E.pinQuickMemoButton.textContent=cur.pinned?"★ ピン留め中":"☆ ピン留め"}
function saveMemo(){const m=memo();if(!m)return;m.title=E.quickMemoTitle.value;m.content=E.quickMemoContent.value;touchMemo(m);save();E.quickMemoSavedLabel.textContent="保存しました";clearTimeout(memoTimer);memoTimer=setTimeout(()=>E.quickMemoSavedLabel.textContent="自動保存",900)}
function trashMemo(){const m=memo();if(!m||!confirm("このメモをゴミ箱へ移動しますか？"))return;const label=m.title||"無題";trashAdd("memo",m,{},label);data.quickMemos=data.quickMemos.filter(x=>x.id!==m.id);data.selectedQuickMemoId=data.quickMemos[0]?.id||null;save();renderMemos();feedbackAction("メモを削除",`${label} をゴミ箱へ移動`,"delete")}
function renderBuilder(){renderGoalList();const g=goal(),has=!!g;E.builderEmpty.classList.toggle("hidden",has);E.builderActive.classList.toggle("hidden",!has);if(!g)return;E.builderGoalTitle.textContent=g.name;E.builderGoalMeta.textContent=`${g.due?`期限 ${g.due}`:"期限なし"}${g.note?` / ${g.note}`:""}`;E.pinGoalButton.textContent=g.pinned?"★ ピン留め中":"☆ ピン留め";const total=g.blocks.length,done=g.blocks.filter(b=>b.done).length,percent=total?Math.round(done/total*100):0;E.builderProgressLabel.textContent=`${done} / ${total} ブロック`;E.builderProgressPercent.textContent=percent+"%";E.builderProgressFill.style.width=percent+"%";E.completeGoalButton.disabled=!(total&&done===total);E.builderBlockList.innerHTML="";if(!total)E.builderBlockList.innerHTML='<div class="empty-section">必要なブロックを積んでいこう。</div>';else g.blocks.forEach((b,i)=>E.builderBlockList.appendChild(renderBlock(g,b,i)))}
function renderGoalList(){
  E.goalList.innerHTML="";
  data.goalTowers.forEach(g=>{
    const row=document.createElement("div");row.className="goal-list-row";
    const main=document.createElement("button");main.className="goal-list-button"+(g.id===data.selectedGoalId?" active":"");main.textContent=g.name;
    main.onclick=()=>{data.selectedGoalId=g.id;touchGoal(g);save();renderBuilder()};
    const pin=document.createElement("button");pin.className="goal-list-pin"+(g.pinned?" pinned":"");pin.textContent=g.pinned?"★":"☆";
    pin.onclick=e=>{e.stopPropagation();g.pinned=!g.pinned;g.updatedAt=Date.now();save();renderBuilder();if(data.view==="shortcuts")renderShortcuts()};
    row.append(main,pin);E.goalList.appendChild(row)
  })
}
function addGoal(){const name=E.goalNameInput.value.trim();if(!name)return;const g={id:uid(),name,due:"",note:"",pinned:false,updatedAt:Date.now(),blocks:[]};data.goalTowers.push(g);data.selectedGoalId=g.id;E.goalNameInput.value="";touchGoal(g);save();renderBuilder();dopaAction("TARGET SET!!",name);standardAction("目標を追加",name,"save")}
function editGoal(){const g=goal();if(!g)return;const n=prompt("目標名",g.name);if(n===null)return;const due=prompt("期限（任意 / YYYY-MM-DD）",g.due||"");if(due===null)return;const note=prompt("補足（任意）",g.note||"");if(note===null)return;if(n.trim())g.name=n.trim();g.due=/^\d{4}-\d{2}-\d{2}$/.test(due)?due:"";g.note=note.trim();touchGoal(g);save();renderBuilder()}
function deleteGoal(){const g=goal();if(!g||!confirm(`「${g.name}」をゴミ箱へ移動しますか？`))return;const label=g.name;trashAdd("goal",g,{},g.name);data.goalTowers=data.goalTowers.filter(x=>x.id!==g.id);data.selectedGoalId=data.goalTowers[0]?.id||null;save();renderBuilder();feedbackAction("目標を削除",`${label} をゴミ箱へ移動`,"delete")}
function addBlock(){const g=goal(),title=E.blockTitleInput.value.trim();if(!g||!title)return;g.blocks.push({id:uid(),title,done:false});E.blockTitleInput.value="";touchGoal(g);save();renderBuilder();dopaAction("BLOCK BUILD!!",title);standardAction("ブロックを追加",title,"save")}
function renderBlock(g,b,i){
  const row=document.createElement("div");row.className="builder-block"+(b.done?" broken":"");row.draggable=true;row.dataset.blockId=b.id;
  row.ondragstart=()=>{dragBlock=b.id;row.classList.add("dragging")};row.ondragend=()=>{dragBlock=null;row.classList.remove("dragging")};row.ondragover=e=>{e.preventDefault();row.classList.add("drag-over")};row.ondragleave=()=>row.classList.remove("drag-over");
  row.ondrop=e=>{e.preventDefault();row.classList.remove("drag-over");if(!dragBlock||dragBlock===b.id)return;const from=g.blocks.findIndex(x=>x.id===dragBlock),to=g.blocks.findIndex(x=>x.id===b.id);const[m]=g.blocks.splice(from,1);g.blocks.splice(to,0,m);touchGoal(g);save();renderBuilder()};
  const breaker=document.createElement("button");breaker.className="break-block-button";breaker.textContent=b.done?"💥":String(i+1);
  breaker.onclick=()=>{b.done=!b.done;touchGoal(g);save();if(b.done)builderBreakBlast("BLOCK BREAK!!",b.title,"block");renderBuilder()};
  const title=document.createElement("div");title.className="builder-block-title";title.textContent=b.title;
  const acts=document.createElement("div");acts.className="builder-block-actions";
  const edit=document.createElement("button");edit.textContent="✎";edit.onclick=()=>{const n=prompt("ブロック内容",b.title);if(n?.trim()){b.title=n.trim();touchGoal(g);save();renderBuilder()}};
  const del=document.createElement("button");del.textContent="×";del.onclick=()=>{if(confirm("このブロックを削除しますか？")){g.blocks=g.blocks.filter(x=>x.id!==b.id);touchGoal(g);save();renderBuilder()}};
  acts.append(edit,del);row.append(breaker,title,acts);return row
}
function completeGoal(){
  const g=goal();if(!g||!g.blocks.length||!g.blocks.every(b=>b.done))return alert("全部のブロックを壊してから達成にできます。");if(!confirm(`「${g.name}」を達成した目標へ移しますか？`))return;
  data.achievedGoals.unshift({...clone(g),achievedAt:new Date().toISOString()});data.goalTowers=data.goalTowers.filter(x=>x.id!==g.id);data.selectedGoalId=data.goalTowers[0]?.id||null;save();
  builderBreakBlast("GOAL CLEAR!!",`${g.name} 達成！！`,"goal");renderBuilder()
}
function renderAchieved(){const a=[...data.achievedGoals].sort((x,y)=>new Date(y.achievedAt)-new Date(x.achievedAt)),month=new Date().toISOString().slice(0,7);E.achievedGoalCount.textContent=a.length;E.achievedGoalMonthCount.textContent=a.filter(x=>(x.achievedAt||"").startsWith(month)).length;E.achievedGoalList.innerHTML=a.length?a.map(x=>`<article class="achieved-goal-card"><h3>🏆 ${esc(x.name)}</h3><div class="achieved-goal-meta">${x.due?`設定期限：${x.due}<br>`:""}達成日：${new Date(x.achievedAt).toLocaleString("ja-JP")}${x.note?`<br>${esc(x.note)}`:""}</div><div class="achieved-goal-blocks">${(x.blocks||[]).map(b=>`<span class="achieved-goal-block">💥 ${esc(b.title)}</span>`).join("")}</div><div class="achieved-goal-actions"><button class="secondary-button" onclick="restoreAchieved('${x.id}')">ブレイカーに戻す</button><button class="danger-outline-button" onclick="trashAchieved('${x.id}')">ゴミ箱へ</button></div></article>`).join(""):'<section class="panel"><p>達成した目標はまだありません。</p></section>'}
window.restoreAchieved=id=>{const x=data.achievedGoals.find(g=>g.id===id);if(!x)return;const label=x.name,g=clone(x);delete g.achievedAt;g.updatedAt=Date.now();data.goalTowers.push(g);data.selectedGoalId=g.id;data.achievedGoals=data.achievedGoals.filter(x=>x.id!==id);save();renderAchieved();feedbackAction("達成目標をブレイカーに戻した",label,"restore")};window.trashAchieved=id=>{const x=data.achievedGoals.find(g=>g.id===id);if(!x)return;const label=x.name;trashAdd("achievedGoal",x,{},"達成: "+x.name);data.achievedGoals=data.achievedGoals.filter(x=>x.id!==id);save();renderAchieved();feedbackAction("達成目標をゴミ箱へ移動",label,"delete")}
function trashAdd(kind,payload,origin={},label=""){data.trash.unshift({trashId:uid(),kind,label:label||payload.title||payload.name||"削除したもの",payload:clone(payload),origin:clone(origin),deletedAt:new Date().toISOString()})}
const kindLabel=k=>({card:"カード",board:"ボード",memo:"メモ",routine:"ルーティンタスク",freeItem:"自由帳",goal:"目標",archive:"完了記録",achievedGoal:"達成目標"}[k]||k);
function renderTrash(){const f=E.trashKindFilter.value,a=data.trash.filter(x=>!f||x.kind===f);E.trashList.innerHTML=a.length?a.map(x=>`<article class="trash-card"><div class="item-main"><strong>${esc(x.label)}</strong><small>${kindLabel(x.kind)} / ${new Date(x.deletedAt).toLocaleString("ja-JP")}</small></div><div class="trash-card-actions"><button class="secondary-button" onclick="restoreTrash('${x.trashId}')">戻す</button><button class="danger-outline-button" onclick="deleteForever('${x.trashId}')">完全削除</button></div></article>`).join(""):'<section class="panel"><p>ゴミ箱は空です。</p></section>'}
window.restoreTrash=id=>{const x=data.trash.find(t=>t.trashId===id);if(!x)return;const p=clone(x.payload);if(x.kind==="card"){let b=data.boards.find(b=>b.id===x.origin.boardId)||data.boards[0],s=b.sections.find(s=>s.id===x.origin.sectionId)||b.sections[0];if(!s){s={id:uid(),name:x.origin.sectionName||"未分類",cards:[]};b.sections.push(s)}if(findCard(p.id))p.id=uid();s.cards.push(p);b.updatedAt=Date.now()}if(x.kind==="board"){if(data.boards.some(b=>b.id===p.id))p.id=uid();data.boards.push(p)}if(x.kind==="memo"){if(data.quickMemos.some(m=>m.id===p.id))p.id=uid();data.quickMemos.push(p)}if(x.kind==="routine"){if(data.routines.some(r=>r.id===p.id))p.id=uid();data.routines.push(p)}if(x.kind==="freeItem"){let pg=data.freePages.find(pg=>pg.id===x.origin.pageId)||data.freePages[0];if(pg.items.some(i=>i.id===p.id))p.id=uid();pg.items.push(p)}if(x.kind==="goal"){if(data.goalTowers.some(g=>g.id===p.id))p.id=uid();data.goalTowers.push(p)}if(x.kind==="archive"){if(data.archive.some(a=>a.id===p.id))p.id=uid();data.archive.push(p)}if(x.kind==="achievedGoal"){if(data.achievedGoals.some(g=>g.id===p.id))p.id=uid();data.achievedGoals.push(p)}data.trash=data.trash.filter(t=>t.trashId!==id);save();renderTrash();feedbackAction("ゴミ箱から戻した",x.label||kindLabel(x.kind),"restore")};window.deleteForever=id=>{const x=data.trash.find(t=>t.trashId===id);if(!x)return;if(confirm("完全に削除します。元に戻せません。")){const label=x.label||kindLabel(x.kind);data.trash=data.trash.filter(t=>t.trashId!==id);save();renderTrash();feedbackAction("完全削除",label,"delete")}}
function quickMenu(){E.quickAddMenu.classList.toggle("hidden")}
function quickAction(a){E.quickAddMenu.classList.add("hidden");if(a==="task"){quickTaskOpen();return}if(a==="routine"){show("routine");setTimeout(()=>E.routineTitleInput.focus(),30);return}if(a==="memo"){const m={id:uid(),title:"",content:"",pinned:false,updatedAt:Date.now()};data.quickMemos.push(m);data.selectedQuickMemoId=m.id;touchMemo(m);save();show("memo");setTimeout(()=>E.quickMemoTitle.focus(),30);return}if(a==="free"){const p=freePage(),t=prompt("付箋に書く内容");if(!p||!t)return;const before=freeSnap();p.items.push({id:uid(),type:"note",content:t,x:40,y:40,width:220,height:150,updatedAt:Date.now()});save();freeRecord(before);show("freeboard");dopaAction("BRAIN DROP!!","付箋を追加");standardAction("付箋を追加","自由帳","save");return}if(a==="template"){show("templates");return}if(a==="goal"){const n=prompt("新しい目標");if(!n?.trim())return;const g={id:uid(),name:n.trim(),due:"",note:"",pinned:false,updatedAt:Date.now(),blocks:[]};data.goalTowers.push(g);data.selectedGoalId=g.id;touchGoal(g);save();show("builder")}}
function quickTaskOpen(){E.quickTaskBoard.innerHTML=data.boards.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join("");E.quickTaskBoard.value=data.selectedBoardId;quickTaskSections();E.quickTaskTitle.value="";E.quickTaskStart.value="";E.quickTaskDue.value=localDate();E.quickTaskModal.classList.remove("hidden");setTimeout(()=>E.quickTaskTitle.focus(),20)}
function quickTaskSections(){const b=data.boards.find(b=>b.id===E.quickTaskBoard.value)||board();E.quickTaskSection.innerHTML=(b?.sections||[]).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}
function quickTaskSave(){
  const title=E.quickTaskTitle.value.trim(),b=data.boards.find(b=>b.id===E.quickTaskBoard.value),s=b?.sections.find(s=>s.id===E.quickTaskSection.value);
  if(!title||!b||!s)return;
  if(E.quickTaskStart.value&&E.quickTaskDue.value&&E.quickTaskStart.value>E.quickTaskDue.value)return alert("着手可能日は期限日より前にしてください。");
  const c={id:uid(),type:"task",title,content:"",start:E.quickTaskStart.value,due:E.quickTaskDue.value,tags:[],color:"yellow",link:"",image:"",selected:false,pinned:false,createdAt:Date.now(),updatedAt:Date.now(),repeat:{type:"none",interval:1,weekdays:[]}};
  s.cards.push(c);b.updatedAt=Date.now();recent("card",c.id,c.title,`${b.name} / ${s.name}`,b.id);save();closeModal("quickTaskModal");
  if(data.view==="todayTasks")renderToday();if(data.view==="home")renderHome();if(data.view==="calendar")renderCalendar();
  dopaAction("TASK LOADED!!",title);standardAction("タスクを追加",title,"save")
}

function pinnedItems(){
  const items=[];
  data.boards.filter(x=>x.pinned).forEach(x=>items.push({kind:"board",id:x.id,label:x.name,detail:"ボード",ts:x.updatedAt}));
  cards().filter(x=>x.pinned).forEach(x=>items.push({kind:"card",id:x.id,label:x.title,detail:`${x.boardName} / ${x.sectionName}`,boardId:x.boardId,ts:x.updatedAt}));
  data.quickMemos.filter(x=>x.pinned).forEach(x=>items.push({kind:"memo",id:x.id,label:x.title||"無題",detail:"メモ",ts:x.updatedAt}));
  data.goalTowers.filter(x=>x.pinned).forEach(x=>items.push({kind:"goal",id:x.id,label:x.name,detail:builderDisplayName(),ts:x.updatedAt}));
  data.routines.filter(x=>x.pinned).forEach(x=>items.push({kind:"routine",id:x.id,label:x.title,detail:"ルーティンタスク",ts:x.updatedAt}));
  return items.sort((a,b)=>(b.ts||0)-(a.ts||0));
}
function renderShortcuts(){
  const items=pinnedItems();
  const counts={board:0,card:0,memo:0,goal:0,routine:0};items.forEach(x=>counts[x.kind]=(counts[x.kind]||0)+1);
  E.shortcutSummary.innerHTML=`<span>📁 ${counts.board}</span><span>🗂 ${counts.card}</span><span>📝 ${counts.memo}</span><span>🧱 ${counts.goal}</span><span>🔁 ${counts.routine}</span>`;
  E.shortcutList.innerHTML=items.length?items.map(x=>`<article class="shortcut-card"><div class="shortcut-icon">${x.kind==="board"?"📁":x.kind==="card"?"🗂":x.kind==="memo"?"📝":x.kind==="routine"?"🔁":"🧱"}</div><div class="item-main"><strong>${esc(x.label)}</strong><small>${esc(x.detail||"")}</small></div><div class="shortcut-actions"><button class="primary-button" onclick='openRef(${JSON.stringify(JSON.stringify(x))})'>開く</button><button class="secondary-button" onclick="unpinRef('${x.kind}','${x.id}')">☆ 外す</button></div></article>`).join(""):`<section class="panel"><p>ピン留めしたものがここに集まります。左のボード一覧はもう勝手に並び替わりません。</p></section>`;
}
window.unpinRef=(kind,id)=>{
  if(kind==="board"){const x=data.boards.find(x=>x.id===id);if(x)x.pinned=false}
  if(kind==="card"){const f=findCard(id);if(f)f.c.pinned=false}
  if(kind==="memo"){const x=data.quickMemos.find(x=>x.id===id);if(x)x.pinned=false}
  if(kind==="goal"){const x=data.goalTowers.find(x=>x.id===id);if(x)x.pinned=false}
  if(kind==="routine"){const x=data.routines.find(x=>x.id===id);if(x)x.pinned=false}
  save();renderShortcuts();renderSidebar();
};
function saveBoardTemplate(){
  const b=board();if(!b)return;const name=prompt("テンプレート名",b.name);if(!name?.trim())return;
  const sections=clone(b.sections).map(s=>({...s,cards:(s.cards||[]).map(c=>({...c,image:"",due:"",selected:false,pinned:false}))}));data.templates.push({id:uid(),type:"board",name:name.trim(),createdAt:Date.now(),payload:{sections}});save();toast(`🧩 テンプレート保存|${name.trim()}`);
}
function saveGoalTemplate(){
  const g=goal();if(!g)return;const name=prompt("テンプレート名",g.name);if(!name?.trim())return;
  data.templates.push({id:uid(),type:"goal",name:name.trim(),createdAt:Date.now(),payload:{note:g.note||"",blocks:clone(g.blocks).map(b=>({...b,done:false}))}});save();toast(`🧩 テンプレート保存|${name.trim()}`);
}
function renderTemplates(){
  const boards=data.templates.filter(t=>t.type==="board"),goals=data.templates.filter(t=>t.type==="goal");
  E.boardTemplateCount.textContent=boards.length;E.goalTemplateCount.textContent=goals.length;
  E.boardTemplateList.innerHTML=boards.length?boards.map(t=>`<article class="template-card"><div><strong>${esc(t.name)}</strong><small>${t.payload?.sections?.length||0} 小項目</small></div><div><button class="primary-button" onclick="useTemplate('${t.id}')">使う</button><button class="danger-outline-button" onclick="deleteTemplate('${t.id}')">削除</button></div></article>`).join(""):"<p>ボードの「🧩 型を保存」から追加できます。</p>";
  E.goalTemplateList.innerHTML=goals.length?goals.map(t=>`<article class="template-card"><div><strong>${esc(t.name)}</strong><small>${t.payload?.blocks?.length||0} ブロック</small></div><div><button class="primary-button" onclick="useTemplate('${t.id}')">使う</button><button class="danger-outline-button" onclick="deleteTemplate('${t.id}')">削除</button></div></article>`).join(""):`<p>${esc(builderDisplayName())}の「🧩 型を保存」から追加できます。</p>`;
}
window.deleteTemplate=id=>{if(!confirm("このテンプレートを削除しますか？"))return;data.templates=data.templates.filter(t=>t.id!==id);save();renderTemplates()};
window.useTemplate=id=>{
  const t=data.templates.find(t=>t.id===id);if(!t)return;
  if(t.type==="board"){
    const name=prompt("新しいボード名",t.name);if(!name?.trim())return;
    const b={id:uid(),name:name.trim(),pinned:false,createdAt:Date.now(),updatedAt:Date.now(),sections:clone(t.payload.sections||[]).map(s=>({id:uid(),name:s.name,cards:(s.cards||[]).map(c=>({...clone(c),id:uid(),due:"",selected:false,pinned:false,createdAt:Date.now(),updatedAt:Date.now()}))}))};
    if(!b.sections.length)b.sections=[{id:uid(),name:"未分類",cards:[]}];data.boards.push(b);data.selectedBoardId=b.id;touchBoard(b);save();show("board");return;
  }
  const name=prompt("新しい目標名",t.name);if(!name?.trim())return;
  const g={id:uid(),name:name.trim(),due:"",note:t.payload.note||"",pinned:false,updatedAt:Date.now(),blocks:(t.payload.blocks||[]).map(b=>({id:uid(),title:b.title,done:false}))};data.goalTowers.push(g);data.selectedGoalId=g.id;touchGoal(g);save();show("builder")
};

function addRoutine(){const title=E.routineTitleInput.value.trim();if(!title)return;const rule=E.routineRuleInput.value,slot=E.routineSlotInput.value,weekdays=qa(".routine-weekday-input:checked").map(x=>Number(x.value));if(rule==="custom"&&!weekdays.length)return alert("曜日指定の時は1つ以上曜日を選んでください。");const r={id:uid(),title,rule,weekdays,slot,paused:false,pinned:false,createdAt:Date.now(),updatedAt:Date.now(),logs:{}};data.routines.unshift(r);data.selectedRoutineCalendarId=r.id;touchRoutine(r);E.routineTitleInput.value="";E.routineRuleInput.value="daily";E.routineSlotInput.value="morning";qa(".routine-weekday-input").forEach(x=>x.checked=false);toggleRoutineRuleUI();save();renderRoutine();renderPinned();if(data.view==="shortcuts")renderShortcuts();dopaAction("ROUTINE CHARGE!!",title);standardAction("ルーティンタスクを追加",title,"save")}
window.toggleRoutineDone=id=>{const r=data.routines.find(x=>x.id===id);if(!r)return;const today=localDate(),nowDone=!routineDoneOn(r,today);routineMark(r,nowDone,today);touchRoutine(r);save();renderRoutine();renderPinned();if(data.view==="home")renderHome();if(data.view==="shortcuts")renderShortcuts();if(nowDone){dopaAction("DAILY CLEAR!!",r.title,"done");standardAction("ルーティンタスク完了",r.title,"done")}else feedbackAction("ルーティンタスクを未完了に戻す",r.title,"undo")};
window.toggleRoutinePause=id=>{const r=data.routines.find(x=>x.id===id);if(!r)return;r.paused=!r.paused;touchRoutine(r);save();renderRoutine();renderPinned();if(data.view==="shortcuts")renderShortcuts()};
window.toggleRoutinePin=id=>{const r=data.routines.find(x=>x.id===id);if(!r)return;r.pinned=!r.pinned;touchRoutine(r);save();renderRoutine();renderPinned();if(data.view==="shortcuts")renderShortcuts()};
window.editRoutine=id=>openRoutineModal(id);
window.deleteRoutine=id=>{const r=data.routines.find(x=>x.id===id);if(!r||!confirm(`「${r.title}」をゴミ箱へ移動しますか？`))return;const label=r.title;trashAdd("routine",r,{},r.title);data.routines=data.routines.filter(x=>x.id!==id);if(data.selectedRoutineCalendarId===id)data.selectedRoutineCalendarId=data.routines[0]?.id||null;save();renderRoutine();renderPinned();if(data.view==="shortcuts")renderShortcuts();feedbackAction("ルーティンタスクを削除",`${label} をゴミ箱へ移動`,"delete")};
function storageBytes(){try{return new Blob([JSON.stringify(data)]).size}catch{return 0}}
function fmtBytes(x){return x<1024?`${x} B`:x<1048576?`${(x/1024).toFixed(1)} KB`:`${(x/1048576).toFixed(2)} MB`}
function storageUsage(){if(!E.storageUsageLabel)return;const b=storageBytes();E.storageUsageLabel.textContent=fmtBytes(b);E.storageUsageFill.style.width=Math.min(100,Math.round(b/(5*1024*1024)*100))+"%"}
function backupFile(){return new File([JSON.stringify(data,null,2)],`task-kanrinner-${localDate()}.json`,{type:"application/json"})}
function exportData(){const f=backupFile(),u=URL.createObjectURL(f),a=document.createElement("a");a.href=u;a.download=f.name;a.click();URL.revokeObjectURL(u)}
async function shareData(){const f=backupFile();try{if(navigator.share&&navigator.canShare?.({files:[f]}))await navigator.share({files:[f],title:"タスク管理ンナー バックアップ",text:"画像込みデータ"});else{exportData();alert("共有シートが使えないため、バックアップを保存しました。")}}catch(e){if(e.name!=="AbortError")console.error(e)}}
function railWheel(e){
  if(innerWidth<=820||!["top","bottom"].includes(data.settings.navPosition))return;
  const el=e.currentTarget;
  if(el.scrollWidth<=el.clientWidth+2)return;
  if(Math.abs(e.deltaY)>=Math.abs(e.deltaX)){e.preventDefault();el.scrollLeft+=e.deltaY}
}
function closeSide(){document.querySelector(".sidebar")?.classList.remove("open")}
function bind(){const map={todayTasksButton:"todayTasks",routineButton:"routine",calendarButton:"calendar",homeButton:"home",shortcutsButton:"shortcuts",archiveButton:"archive",templatesButton:"templates",freeboardButton:"freeboard",memoButton:"memo",builderButton:"builder",achievedGoalsButton:"achievedGoals",trashButton:"trash"};Object.entries(map).forEach(([id,v])=>E[id].onclick=()=>{if(data.settings.sidebarEditMode)return;show(v);closeSide()});bindNavDrag();E.addBoardButton.onclick=addBoard;E.addRoutineButton.onclick=addRoutine;E.routineTitleInput.onkeydown=e=>{if(e.key==="Enter")addRoutine()};E.routineRuleInput.onchange=toggleRoutineRuleUI;E.routineCalendarSelect.onchange=()=>{data.selectedRoutineCalendarId=E.routineCalendarSelect.value||null;save();renderRoutineCalendar()};E.routineCalendarPrevButton.onclick=()=>{routineCalCursor.setMonth(routineCalCursor.getMonth()-1);renderRoutineCalendar()};E.routineCalendarNextButton.onclick=()=>{routineCalCursor.setMonth(routineCalCursor.getMonth()+1);renderRoutineCalendar()};E.routineCalendarTodayButton.onclick=()=>{routineCalCursor=new Date();routineCalCursor.setDate(1);renderRoutineCalendar()};E.routineModalRuleInput.onchange=toggleRoutineModalRuleUI;E.saveRoutineModalButton.onclick=saveRoutineModal;E.deleteRoutineModalButton.onclick=deleteRoutineFromModal;E.boardNameInput.onkeydown=e=>{if(e.key==="Enter")addBoard()};E.settingsButton.onclick=()=>{storageUsage();E.settingsModal.classList.remove("hidden")};E.pinBoardButton.onclick=()=>{const b=board();b.pinned=!b.pinned;b.updatedAt=Date.now();save();updateBoardPin();renderSidebar();if(data.view==="shortcuts")renderShortcuts()};E.saveBoardTemplateButton.onclick=saveBoardTemplate;E.addSectionButton.onclick=addSection;E.addCardButton.onclick=()=>openCardModal(null,data.selectedBoardId);E.completeSelectedButton.onclick=completeSelected;E.completeSelectedBarButton.onclick=completeSelected;E.clearSelectionButton.onclick=clearSelection;E.deleteBoardButton.onclick=deleteBoard;E.currentBoardTitle.onblur=()=>{const b=board(),v=E.currentBoardTitle.textContent.trim();if(v&&v!==b.name){b.name=v;touchBoard(b);save();renderSidebar()}else E.currentBoardTitle.textContent=b.name};[E.searchInput,E.tagFilter,E.statusFilter,E.sortSelect].forEach(x=>x.addEventListener("input",renderBoard));[E.archiveSearchInput,E.archiveBoardFilter,E.archiveTagFilter,E.archivePeriodFilter].forEach(x=>x.addEventListener("input",renderArchive));E.clearArchiveTagButton.onclick=()=>{E.archiveTagFilter.value="";renderArchive()};E.archiveShowAllButton.onclick=()=>{E.archiveShowAllButton.dataset.all=E.archiveShowAllButton.dataset.all==="true"?"false":"true";renderArchive()};E.calendarPrevButton.onclick=()=>{calCursor.setMonth(calCursor.getMonth()-1);renderCalendar()};E.calendarNextButton.onclick=()=>{calCursor.setMonth(calCursor.getMonth()+1);renderCalendar()};E.calendarTodayButton.onclick=()=>{calCursor=new Date();calCursor.setDate(1);selectedDate=localDate();renderCalendar()};E.clearRecentButton.onclick=()=>{data.recent=[];save();renderRecent()};E.cardBoardInput.onchange=refreshCardSections;E.saveCardButton.onclick=saveCard;E.repeatTypeInput.onchange=repeatUI;E.cardImageInput.onchange=e=>readImage(e.target.files[0],d=>{editingImageData=d;imagePreview()});E.removeImageButton.onclick=()=>{editingImageData="";imagePreview()};qa("[data-close]").forEach(x=>x.onclick=()=>closeModal(x.dataset.close));E.undoFreeboardButton.onclick=undoFree;E.redoFreeboardButton.onclick=redoFree;E.addFreePageButton.onclick=()=>{const n=prompt("新しい自由帳のページ名","自由帳"+(data.freePages.length+1));if(!n?.trim())return;const before=freeSnap(),p={id:uid(),name:n.trim(),items:[]};data.freePages.push(p);data.selectedFreePageId=p.id;save();freeRecord(before);renderFreeboard()};E.renameFreePageButton.onclick=()=>{const p=freePage(),n=prompt("ページ名",p.name);if(n?.trim()&&n.trim()!==p.name){const before=freeSnap();p.name=n.trim();save();freeRecord(before);renderFreeboard()}};E.addFreeNoteButton.onclick=()=>{const t=prompt("付箋に書く内容");if(!t)return;const before=freeSnap();freePage().items.push({id:uid(),type:"note",content:t,x:40,y:40,width:220,height:150,updatedAt:Date.now()});save();freeRecord(before);renderFreeboard()};E.freeImageInput.onchange=e=>readImage(e.target.files[0],d=>{const before=freeSnap();freePage().items.push({id:uid(),type:"image",content:d,x:60,y:60,width:280,height:220,updatedAt:Date.now()});save();freeRecord(before);renderFreeboard();e.target.value=""});E.clearFreeboardButton.onclick=()=>{const p=freePage();if(!p.items.length||!confirm(`「${p.name}」の中身をすべてゴミ箱へ移動しますか？`))return;const before=freeSnap();p.items.forEach(i=>trashAdd("freeItem",i,{pageId:p.id,pageName:p.name},i.type==="image"?"自由帳の画像":String(i.content).slice(0,24)));p.items=[];save();freeRecord(before);renderFreeboard()};E.saveFreeItemModalButton.onclick=saveFreeModal;E.deleteFreeItemModalButton.onclick=deleteFreeModal;E.addQuickMemoButton.onclick=()=>{const m={id:uid(),title:"",content:"",pinned:false,updatedAt:Date.now()};data.quickMemos.push(m);data.selectedQuickMemoId=m.id;touchMemo(m);save();renderMemos();E.quickMemoTitle.focus()};E.quickMemoTitle.addEventListener("input",saveMemo);E.quickMemoContent.addEventListener("input",saveMemo);E.pinQuickMemoButton.onclick=()=>{const m=memo();m.pinned=!m.pinned;touchMemo(m);save();renderMemos()};E.deleteQuickMemoButton.onclick=trashMemo;E.addGoalButton.onclick=addGoal;E.goalNameInput.onkeydown=e=>{if(e.key==="Enter")addGoal()};E.pinGoalButton.onclick=()=>{const g=goal();g.pinned=!g.pinned;g.updatedAt=Date.now();save();renderBuilder();if(data.view==="shortcuts")renderShortcuts()};E.saveGoalTemplateButton.onclick=saveGoalTemplate;E.editGoalButton.onclick=editGoal;E.deleteGoalButton.onclick=deleteGoal;E.addBlockButton.onclick=addBlock;E.blockTitleInput.onkeydown=e=>{if(e.key==="Enter")addBlock()};E.completeGoalButton.onclick=completeGoal;E.emptyTrashButton.onclick=()=>{if(data.trash.length&&confirm(`ゴミ箱の${data.trash.length}件を完全削除しますか？`)){data.trash=[];save();renderTrash()}};E.trashKindFilter.onchange=renderTrash;E.quickAddFab.onclick=quickMenu;qa("[data-quick-action]").forEach(b=>b.onclick=()=>quickAction(b.dataset.quickAction));E.quickTaskBoard.onchange=quickTaskSections;E.saveQuickTaskButton.onclick=quickTaskSave;bindColorPalette("accentPalette","accent",E.accentColorInput);bindColorPalette("tagPalette","tagAccent",E.tagColorInput);E.themeSelect.onchange=()=>{data.settings.theme=E.themeSelect.value;save();applyTheme();renderView()};E.accentColorInput.oninput=()=>{data.settings.accent=E.accentColorInput.value;save();applyTheme();renderView()};E.tagColorInput.oninput=()=>{data.settings.tagAccent=E.tagColorInput.value;save();applyTheme();renderView()};E.densitySelect.onchange=()=>{data.settings.density=E.densitySelect.value;save();applyTheme()};E.fontSizeSelect.onchange=()=>{data.settings.fontSize=E.fontSizeSelect.value;save();applyTheme()};E.navPositionSelect.onchange=()=>{applyNavPosition(E.navPositionSelect.value,{persist:true});applyTheme();closeSide()};E.quickAddVisibleToggle.onchange=()=>{data.settings.quickAddVisible=E.quickAddVisibleToggle.checked;save();applyQuickAddLayout()};E.quickAddPositionSelect.onchange=()=>{data.settings.quickAddPosition=E.quickAddPositionSelect.value;save();applyQuickAddLayout()};E.mainNav.onwheel=railWheel;E.boardList.onwheel=railWheel;E.dopaMotionToggle.onchange=()=>{data.settings.dopaMotion=E.dopaMotionToggle.checked;save();applyTheme()};E.sidebarEditToggle.onchange=()=>{data.settings.sidebarEditMode=E.sidebarEditToggle.checked;save();editMode();bindNavDrag()};E.resetNavOrderButton.onclick=()=>{data.settings.navOrder=[...DEFAULT_NAV];save();renderNav();bindNavDrag()};E.resetNavVisibilityButton.onclick=()=>{DEFAULT_NAV.forEach(k=>data.settings.navVisible[k]=true);save();renderNav()};E.exportButton.onclick=exportData;E.shareBackupButton.onclick=shareData;E.importInput.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=normalize(JSON.parse(r.result));ensureCurrentData();freeUndo=[];freeRedo=[];save();renderAll();toggleRoutineRuleUI();alert("読み込みました。") }catch(err){console.error(err);alert("読み込めないファイルです。")}};r.readAsText(f)};E.mobileMenuButton.onclick=()=>document.querySelector(".sidebar")?.classList.toggle("open");document.addEventListener("click",e=>{if(innerWidth<=820&&!e.target.closest(".sidebar")&&!e.target.closest("#mobileMenuButton"))closeSide();if(!e.target.closest("#quickAddFab")&&!e.target.closest("#quickAddMenu"))E.quickAddMenu.classList.add("hidden")});document.addEventListener("keydown",e=>{if(e.key==="Escape"){["cardModal","quickTaskModal","freeItemModal","routineModal","settingsModal"].forEach(closeModal);closeSide()}});addEventListener("resize",()=>{applyQuickAddLayout();if(data.view==="freeboard")renderFreeboard()})}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;E.installAppButton.classList.remove("hidden")});addEventListener("appinstalled",()=>{deferredInstall=null;E.installAppButton.classList.add("hidden")});E.installAppButton.onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;E.installAppButton.classList.add("hidden")};
buildDopaScatter();bind();save();renderAll();toggleRoutineRuleUI();