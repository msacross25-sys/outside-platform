export const MAX_IMAGE_BYTES=15*1024*1024;
export const MAX_VIDEO_BYTES=500*1024*1024;

export const IMAGE_TYPES=["image/jpeg","image/png","image/webp","image/heic"] as const;
export const VIDEO_TYPES=["video/mp4","video/quicktime","video/webm"] as const;

export function mediaKind(type:string):"IMAGE"|"VIDEO"|null{
 if((IMAGE_TYPES as readonly string[]).includes(type))return "IMAGE";
 if((VIDEO_TYPES as readonly string[]).includes(type))return "VIDEO";
 return null;
}

export function mediaAllowed(type:string,size:number){
 if(!Number.isFinite(size)||size<=0)return false;
 const kind=mediaKind(type);
 if(!kind)return false;
 return size<=(kind==="IMAGE"?MAX_IMAGE_BYTES:MAX_VIDEO_BYTES);
}
