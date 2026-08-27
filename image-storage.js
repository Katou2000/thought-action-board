"use strict";

(()=>{
  const SUPPORTED_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
  const CACHE_MS=50*60*1000;
  const signedUrlCache=new Map();

  function isReference(value){return!!value&&typeof value==="object"&&value.type==="storage"&&value.bucket==="task-images"&&typeof value.path==="string"&&value.path.length>0}
  function key(value){return isReference(value)?`${value.bucket}:${value.path}`:""}
  function validateFile(file){if(!file||!SUPPORTED_TYPES.has(file.type))throw new Error("JPEG・PNG・WebP・GIF画像を選択してください。");return true}
  function cloud(){return window.taskKanrinnerCloudSync}
  function canUpload(){return!!cloud()?.getStorageUserId?.()}

  async function upload(file,area,ownerId){
    validateFile(file);
    const api=cloud();
    if(!api?.getStorageUserId?.())return null;
    return api.uploadImage(file,area,ownerId)
  }

  async function resolve(value){
    if(typeof value==="string")return value;
    if(!isReference(value))return"";
    const cacheKey=key(value),cached=signedUrlCache.get(cacheKey);
    if(cached&&cached.expiresAt>Date.now())return cached.url;
    const url=await cloud()?.createImageUrl?.(value);
    if(!url)throw new Error("Storage画像を表示するにはログインが必要です。");
    signedUrlCache.set(cacheKey,{url,expiresAt:Date.now()+CACHE_MS});
    return url
  }

  async function setElementSource(img,value){
    if(!img)return"";
    const sourceKey=typeof value==="string"?value:key(value);
    img.dataset.imageSourceKey=sourceKey;
    img.classList.remove("storage-image-error");
    if(typeof value==="string"){
      img.classList.remove("storage-image-loading");
      if(value)img.src=value;else img.removeAttribute("src");
      return value
    }
    img.removeAttribute("src");
    if(!isReference(value))return"";
    img.classList.add("storage-image-loading");
    try{
      const url=await resolve(value);
      if(img.dataset.imageSourceKey===sourceKey&&img.isConnected!==false){img.src=url;img.classList.remove("storage-image-loading")}
      return url
    }catch(error){
      if(img.dataset.imageSourceKey===sourceKey){img.classList.remove("storage-image-loading");img.classList.add("storage-image-error")}
      console.warn("Storage画像を表示できませんでした。",error);
      return""
    }
  }

  function referencesIn(value){
    const found=new Map(),seen=new Set();
    const visit=current=>{
      if(!current||typeof current!=="object"||seen.has(current))return;
      seen.add(current);
      if(isReference(current)){found.set(key(current),current);return}
      if(Array.isArray(current))current.forEach(visit);else Object.values(current).forEach(visit)
    };
    visit(value);return[...found.values()]
  }

  async function removeMany(values){
    const refs=referencesIn(values);
    if(!refs.length)return true;
    const api=cloud();
    if(!api?.getStorageUserId?.())throw new Error("Storage画像を削除するにはログインが必要です。");
    await api.deleteImages(refs);
    refs.forEach(ref=>signedUrlCache.delete(key(ref)));
    return true
  }

  window.addEventListener("task-kanrinner-storage-session",()=>signedUrlCache.clear());
  window.TaskImageStorage=Object.freeze({isReference,key,validateFile,canUpload,upload,resolve,setElementSource,referencesIn,removeMany});
})();
