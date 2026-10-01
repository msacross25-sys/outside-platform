import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";

export type StoredPushSubscription={
 endpoint:string;
 keys:{p256dh:string;auth:string};
};

function key(){
 const raw=process.env.PUSH_ENCRYPTION_KEY;
 if(raw){
  if(/^[0-9a-f]{64}$/i.test(raw))return Buffer.from(raw,"hex");
  const decoded=Buffer.from(raw,"base64");
  if(decoded.length===32)return decoded;
 }
 if(process.env.NODE_ENV==="production"){
  throw new Error("PUSH_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
 }
 return createHash("sha256").update(process.env.AUTH_SECRET||"outside-development-push-key").digest();
}

export function pushEndpointHash(endpoint:string){
 return createHash("sha256").update(endpoint).digest("hex");
}

export function encryptPushSubscription(value:StoredPushSubscription){
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",key(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
 const tag=cipher.getAuthTag();
 return [iv,tag,encrypted].map(x=>x.toString("base64url")).join(".");
}

export function decryptPushSubscription(value:string):StoredPushSubscription{
 const [ivRaw,tagRaw,dataRaw]=value.split(".");
 if(!ivRaw||!tagRaw||!dataRaw)throw new Error("Invalid encrypted push subscription.");
 const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivRaw,"base64url"));
 decipher.setAuthTag(Buffer.from(tagRaw,"base64url"));
 const raw=Buffer.concat([
  decipher.update(Buffer.from(dataRaw,"base64url")),
  decipher.final()
 ]).toString("utf8");
 const parsed=JSON.parse(raw) as StoredPushSubscription;
 if(!parsed.endpoint||!parsed.keys?.p256dh||!parsed.keys?.auth){
  throw new Error("Invalid stored push subscription.");
 }
 return parsed;
}
