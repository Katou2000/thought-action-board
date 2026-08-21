"use strict";

(()=>{
  const META_KEY="taskKanrinnerCloudMetaV1";
  const config=window.TASK_KANRINNER_SUPABASE_CONFIG||{};
  const bridge=window.taskKanrinnerCloudBridge;
  const elements={
    email:document.getElementById("cloudEmailInput"),
    password:document.getElementById("cloudPasswordInput"),
    signUp:document.getElementById("cloudSignUpButton"),
    login:document.getElementById("cloudLoginButton"),
    logout:document.getElementById("cloudLogoutButton"),
    upload:document.getElementById("cloudUploadButton"),
    download:document.getElementById("cloudDownloadButton"),
    loginStatus:document.getElementById("cloudLoginStatus"),
    lastSync:document.getElementById("cloudLastSyncLabel"),
    message:document.getElementById("cloudSyncMessage")
  };

  let client=null;
  let currentUser=null;
  let busy=false;
  let ready=false;

  function configured(){
    return typeof config.projectUrl==="string"&&/^https?:\/\//.test(config.projectUrl)&&
      typeof config.publishableKey==="string"&&config.publishableKey.length>20&&
      !/YOUR_|ここに|example/i.test(config.projectUrl+config.publishableKey);
  }

  function readMeta(){
    try{return JSON.parse(localStorage.getItem(META_KEY)||"null")}catch{return null}
  }

  function writeMeta(direction,row){
    const meta={direction,syncedAt:new Date().toISOString(),remoteUpdatedAt:row.updated_at||null,revision:row.revision??null};
    try{localStorage.setItem(META_KEY,JSON.stringify(meta))}catch(error){console.warn("最終同期情報を保存できませんでした。",error)}
    renderLastSync(meta);
  }

  function renderLastSync(meta=readMeta()){
    if(!elements.lastSync)return;
    if(!meta?.syncedAt){elements.lastSync.textContent="未同期";return}
    const label=meta.direction==="upload"?"クラウドへ保存":"クラウドから取得";
    const revision=meta.revision==null?"":` / rev ${meta.revision}`;
    elements.lastSync.textContent=`${new Date(meta.syncedAt).toLocaleString("ja-JP")}（${label}${revision}）`;
  }

  function setMessage(message,tone="info"){
    if(!elements.message)return;
    elements.message.textContent=message;
    elements.message.dataset.tone=tone;
  }

  function setSession(session){
    currentUser=session?.user||null;
    if(elements.loginStatus)elements.loginStatus.textContent=currentUser?`ログイン中：${currentUser.email||currentUser.id}`:"未ログイン";
    if(currentUser?.email&&!elements.email.value)elements.email.value=currentUser.email;
    updateControls();
  }

  function updateControls(){
    const authDisabled=!ready||busy;
    const syncDisabled=authDisabled||!currentUser;
    elements.signUp.disabled=authDisabled;
    elements.login.disabled=authDisabled;
    elements.logout.disabled=syncDisabled;
    elements.upload.disabled=syncDisabled;
    elements.download.disabled=syncDisabled;
    elements.email.disabled=busy;
    elements.password.disabled=busy;
  }

  function credentials(){
    const email=elements.email.value.trim();
    const password=elements.password.value;
    if(!email||!elements.email.checkValidity())throw new Error("正しいメールアドレスを入力してください。");
    if(password.length<6)throw new Error("パスワードは6文字以上で入力してください。");
    return{email,password}
  }

  function errorMessage(error){
    return error?.message?`エラー：${error.message}`:"処理に失敗しました。";
  }

  async function runBusy(task){
    if(busy)return;
    busy=true;updateControls();
    try{await task()}catch(error){console.error(error);setMessage(errorMessage(error),"error");alert(errorMessage(error))}
    finally{busy=false;updateControls()}
  }

  async function signUp(){
    await runBusy(async()=>{
      const values=credentials();
      setMessage("新規登録中です…");
      const{data:result,error}=await client.auth.signUp(values);
      if(error)throw error;
      elements.password.value="";
      if(result.session){setSession(result.session);setMessage("登録してログインしました。同期はボタン操作時のみ実行されます。","success");alert("新規登録してログインしました。")}
      else{setMessage("確認メールを送信しました。メール確認後にログインしてください。","success");alert("確認メールを送信しました。メール確認後にログインしてください。")}
    })
  }

  async function login(){
    await runBusy(async()=>{
      const values=credentials();
      setMessage("ログイン中です…");
      const{data:result,error}=await client.auth.signInWithPassword(values);
      if(error)throw error;
      elements.password.value="";
      setSession(result.session);
      setMessage("ログインしました。同期はボタン操作時のみ実行されます。","success");
    })
  }

  async function logout(){
    await runBusy(async()=>{
      setMessage("ログアウト中です…");
      const{error}=await client.auth.signOut({scope:"local"});
      if(error)throw error;
      elements.password.value="";
      setSession(null);
      setMessage("この端末からログアウトしました。ローカルデータは変更されていません。","success");
    })
  }

  async function upload(){
    if(!currentUser)return setMessage("先にログインしてください。","error");
    if(!confirm("現在のローカルデータ全体をクラウドへ保存します。クラウド側に既存データがある場合は上書きします。続けますか？"))return;
    await runBusy(async()=>{
      setMessage("クラウドへ保存中です…");
      const{data:existing,error:readError}=await client.from("app_state").select("revision").eq("user_id",currentUser.id).maybeSingle();
      if(readError)throw readError;
      const payload=bridge.getData();
      const updatedAt=new Date().toISOString();
      let saved;
      if(existing){
        let nextRevision;
        try{nextRevision=(BigInt(existing.revision??0)+1n).toString()}catch{throw new Error("クラウドのrevisionが正しくありません。保存を中止しました。")}
        let query=client.from("app_state").update({data:payload,revision:nextRevision,updated_at:updatedAt}).eq("user_id",currentUser.id);
        query=existing.revision==null?query.is("revision",null):query.eq("revision",existing.revision);
        const{data:updated,error:updateError}=await query.select("revision,updated_at").maybeSingle();
        if(updateError)throw updateError;
        if(!updated)throw new Error("保存中にクラウド側のデータが更新されました。もう一度内容を確認してから保存してください。");
        saved=updated;
      }else{
        const{data:inserted,error:insertError}=await client.from("app_state").insert({user_id:currentUser.id,data:payload,revision:1,updated_at:updatedAt}).select("revision,updated_at").single();
        if(insertError)throw insertError;
        saved=inserted;
      }
      writeMeta("upload",saved);
      setMessage(`クラウドへ保存しました（revision ${saved.revision}）。`,"success");
      alert("クラウドへ保存しました。")
    })
  }

  async function download(){
    if(!currentUser)return setMessage("先にログインしてください。","error");
    const makeBackup=confirm("クラウドから取得する前に、現在のローカルデータをJSONバックアップしますか？\n\nOK：バックアップして続ける\nキャンセル：バックアップしない");
    if(makeBackup)bridge.downloadLocalBackup();
    else if(!confirm("バックアップを作成せずにクラウドから取得しますか？"))return;
    await runBusy(async()=>{
      setMessage("クラウドデータを取得中です…");
      const{data:remote,error}=await client.from("app_state").select("data,revision,updated_at").eq("user_id",currentUser.id).maybeSingle();
      if(error)throw error;
      if(!remote){setMessage("クラウドに保存済みデータがありません。","error");alert("クラウドに保存済みデータがありません。");return}
      if(!remote.data||typeof remote.data!=="object"||Array.isArray(remote.data))throw new Error("クラウドデータの形式が正しくありません。ローカルデータは変更していません。");
      const ok=confirm(`クラウドのデータ（revision ${remote.revision}）で、この端末の taskKanrinnerV1 を上書きします。\nこの操作は自動マージされません。本当に続けますか？`);
      if(!ok){setMessage("クラウドデータの適用をキャンセルしました。ローカルデータは変更していません。");return}
      bridge.replaceData(remote.data);
      writeMeta("download",remote);
      setMessage(`クラウドから取得し、ローカルへ保存しました（revision ${remote.revision}）。`,"success");
      alert("クラウドデータをこの端末へ保存しました。")
    })
  }

  async function initialize(){
    renderLastSync();
    updateControls();
    if(!bridge){if(elements.loginStatus)elements.loginStatus.textContent="同期機能の読込エラー";setMessage("同期ブリッジを読み込めませんでした。","error");return}
    if(!configured()){if(elements.loginStatus)elements.loginStatus.textContent="Supabase未設定";setMessage("supabase-config.js にProject URLとPublishable keyを設定してください。","error");return}
    if(!window.supabase?.createClient){if(elements.loginStatus)elements.loginStatus.textContent="Supabase JS読込エラー";setMessage("Supabase JS v2を読み込めませんでした。オンラインで再読み込みしてください。","error");return}
    try{
      client=window.supabase.createClient(config.projectUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      ready=true;updateControls();
      const{data:sessionData,error}=await client.auth.getSession();
      if(error)throw error;
      setSession(sessionData.session);
      setMessage(sessionData.session?"ログイン済みです。同期はボタン操作時のみ実行されます。":"メールアドレスとパスワードでログインしてください。");
      client.auth.onAuthStateChange((_event,session)=>setSession(session));
    }catch(error){ready=false;updateControls();if(elements.loginStatus)elements.loginStatus.textContent="初期化エラー";setMessage(errorMessage(error),"error");console.error(error)}
  }

  elements.signUp?.addEventListener("click",signUp);
  elements.login?.addEventListener("click",login);
  elements.logout?.addEventListener("click",logout);
  elements.upload?.addEventListener("click",upload);
  elements.download?.addEventListener("click",download);
  elements.password?.addEventListener("keydown",event=>{if(event.key==="Enter"&&!elements.login.disabled)login()});
  initialize();
})();
