import {createHmac,timingSafeEqual} from "node:crypto";

export type MediaReceiptStage="UPLOAD"|"COMPLETE";

export type MediaReceiptPayload={
 v:1;
 stage:MediaReceiptStage;
 userId:string;
 key:string;
 kind:"IMAGE"|"VIDEO";
 contentType:string;
 size:number;
 url:string;
 exp:number;
};

function signingSecret(){
 const value=process.env.MEDIA_SIGNING_SECRET||process.env.AUTH_SECRET;
 if(value)return value;
 if(process.env.NODE_ENV==="production")throw new Error("MEDIA_SIGNING_SECRET is required in production.");
 return "outside-development-media-signing-secret";
}

function signature(body:string){
 return createHmac("sha256",signingSecret()).update(body).digest("base64url");
}

export function signMediaReceipt(payload:MediaReceiptPayload){
 const body=Buffer.from(JSON.stringify(payload),"utf8").toString("base64url");
 return body+"."+signature(body);
}

export function readMediaReceipt(token:string,stage?:MediaReceiptStage){
 const [body,sig,extra]=token.split(".");
 if(!body||!sig||extra)return null;
 const expected=signature(body);
 const a=Buffer.from(sig);
 const b=Buffer.from(expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))return null;
 try{
  const payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as MediaReceiptPayload;
  if(payload.v!==1||!payload.userId||!payload.key||!payload.url||!payload.contentType)return null;
  if(payload.kind!=="IMAGE"&&payload.kind!=="VIDEO")return null;
  if(!Number.isFinite(payload.size)||payload.size<=0)return null;
  if(!Number.isFinite(payload.exp)||payload.exp<=Date.now())return null;
  if(stage&&payload.stage!==stage)return null;
  return payload;
 }catch{
  return null;
 }
}
