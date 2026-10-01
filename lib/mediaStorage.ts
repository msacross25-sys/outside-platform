import {createHash,createHmac,randomBytes} from "node:crypto";
import {mediaKind} from "@/lib/media";
import {signMediaContentToken} from "@/lib/mediaReceipt";

type UploadSpec={key:string;contentType:string;size:number;url:string};
type SignedUpload={uploadUrl:string;headers:Record<string,string>;expiresInSeconds:number};

function mode(){
 return (process.env.MEDIA_STORAGE_MODE||"disabled").toLowerCase();
}

export function mediaStorageReady(){
 const current=mode();
 if(current==="test")return process.env.ALLOW_TEST_MEDIA_STORAGE==="true";
 if(current!=="s3")return false;
 return Boolean(
  process.env.MEDIA_S3_ENDPOINT&&
  process.env.MEDIA_S3_BUCKET&&
  process.env.MEDIA_S3_ACCESS_KEY_ID&&
  process.env.MEDIA_S3_SECRET_ACCESS_KEY
 );
}

function rfc3986(value:string){
 return encodeURIComponent(value).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16).toUpperCase());
}

function encodedPath(path:string){
 return path.split("/").map(rfc3986).join("/");
}

function extension(type:string){
 const map:Record<string,string>={
  "image/jpeg":"jpg",
  "image/png":"png",
  "image/webp":"webp",
  "image/heic":"heic",
  "video/mp4":"mp4",
  "video/quicktime":"mov",
  "video/webm":"webm"
 };
 return map[type]??"bin";
}

export function createMediaObject(userId:string,contentType:string,size:number){
 const kind=mediaKind(contentType);
 if(!kind)throw new Error("Unsupported media type.");
 const now=new Date();
 const date=[
  now.getUTCFullYear(),
  String(now.getUTCMonth()+1).padStart(2,"0"),
  String(now.getUTCDate()).padStart(2,"0")
 ].join("/");
 const key=[
  "uploads",
  userId,
  date,
  randomBytes(18).toString("hex")+"."+extension(contentType)
 ].join("/");
 const contentToken=signMediaContentToken({v:1,key,kind,contentType});
 return {
  key,
  kind,
  url:"/api/media/content/"+contentToken,
  contentType,
  size
 };
}

function s3Config(){
 const endpoint=process.env.MEDIA_S3_ENDPOINT;
 const bucket=process.env.MEDIA_S3_BUCKET;
 const accessKey=process.env.MEDIA_S3_ACCESS_KEY_ID;
 const secretKey=process.env.MEDIA_S3_SECRET_ACCESS_KEY;
 if(!endpoint||!bucket||!accessKey||!secretKey)throw new Error("S3-compatible media storage is not configured.");
 const url=new URL(endpoint);
 return {
  endpoint:url,
  bucket,
  accessKey,
  secretKey,
  region:process.env.MEDIA_S3_REGION||"auto",
  sessionToken:process.env.MEDIA_S3_SESSION_TOKEN||null
 };
}

function sha256(value:string|Buffer){
 return createHash("sha256").update(value).digest("hex");
}

function hmac(key:Buffer|string,value:string){
 return createHmac("sha256",key).update(value).digest();
}

function signingKey(secret:string,date:string,region:string){
 const kDate=hmac("AWS4"+secret,date);
 const kRegion=hmac(kDate,region);
 const kService=hmac(kRegion,"s3");
 return hmac(kService,"aws4_request");
}

function dateParts(now=new Date()){
 const iso=now.toISOString().replace(/[:-]|\.\d{3}/g,"");
 return {amzDate:iso,dateStamp:iso.slice(0,8)};
}

function objectTarget(key:string){
 const cfg=s3Config();
 const prefix=cfg.endpoint.pathname.replace(/\/$/,"");
 const path=(prefix||"")+"/"+encodedPath(cfg.bucket)+"/"+encodedPath(key);
 const url=new URL(cfg.endpoint.origin+path);
 return {cfg,url,canonicalUri:path};
}

function canonicalQuery(params:Record<string,string>){
 return Object.entries(params)
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([key,value])=>rfc3986(key)+"="+rfc3986(value))
  .join("&");
}

function presign(method:"PUT"|"GET",key:string,expiresInSeconds:number,contentType?:string,responseParams:Record<string,string>={}){
 const {cfg,url,canonicalUri}=objectTarget(key);
 const {amzDate,dateStamp}=dateParts();
 const scope=dateStamp+"/"+cfg.region+"/s3/aws4_request";
 const signedHeaders=contentType?"content-type;host":"host";
 const params:Record<string,string>={
  "X-Amz-Algorithm":"AWS4-HMAC-SHA256",
  "X-Amz-Credential":cfg.accessKey+"/"+scope,
  "X-Amz-Date":amzDate,
  "X-Amz-Expires":String(expiresInSeconds),
  "X-Amz-SignedHeaders":signedHeaders,
  ...responseParams
 };
 if(cfg.sessionToken)params["X-Amz-Security-Token"]=cfg.sessionToken;

 const query=canonicalQuery(params);
 const canonicalHeaders=contentType
  ?"content-type:"+contentType.trim()+"\n"+"host:"+url.host+"\n"
  :"host:"+url.host+"\n";
 const canonicalRequest=[method,canonicalUri,query,canonicalHeaders,signedHeaders,"UNSIGNED-PAYLOAD"].join("\n");
 const stringToSign=["AWS4-HMAC-SHA256",amzDate,scope,sha256(canonicalRequest)].join("\n");
 const signature=createHmac("sha256",signingKey(cfg.secretKey,dateStamp,cfg.region))
  .update(stringToSign)
  .digest("hex");

 return url.toString()+"?"+query+"&X-Amz-Signature="+signature;
}

export function createSignedMediaUpload(spec:UploadSpec):SignedUpload{
 if(mode()==="test"&&process.env.ALLOW_TEST_MEDIA_STORAGE==="true"){
  return {
   uploadUrl:"/api/media/test-upload",
   headers:{"content-type":spec.contentType},
   expiresInSeconds:900
  };
 }
 return {
  uploadUrl:presign("PUT",spec.key,900,spec.contentType),
  headers:{"content-type":spec.contentType},
  expiresInSeconds:900
 };
}

export function createSignedMediaDownload(key:string,options?:{downloadName?:string}){
 if(mode()==="test"&&process.env.ALLOW_TEST_MEDIA_STORAGE==="true"){
  return "https://media.example.test/test-object";
 }
 const responseParams:Record<string,string>={};
 if(options?.downloadName){
  const safe=options.downloadName.replace(/[^a-zA-Z0-9._-]/g,"_");
  responseParams["response-content-disposition"]='attachment; filename="'+safe+'"';
 }
 return presign("GET",key,900,undefined,responseParams);
}

function signedRequest(method:"HEAD"|"DELETE",key:string){
 const {cfg,url,canonicalUri}=objectTarget(key);
 const {amzDate,dateStamp}=dateParts();
 const payloadHash=sha256("");
 const headerMap:Record<string,string>={
  host:url.host,
  "x-amz-content-sha256":payloadHash,
  "x-amz-date":amzDate
 };
 if(cfg.sessionToken)headerMap["x-amz-security-token"]=cfg.sessionToken;

 const headerNames=Object.keys(headerMap).sort();
 const canonicalHeaders=headerNames.map(name=>name+":"+headerMap[name].trim()+"\n").join("");
 const signedHeaders=headerNames.join(";");
 const canonicalRequest=[method,canonicalUri,"",canonicalHeaders,signedHeaders,payloadHash].join("\n");
 const scope=dateStamp+"/"+cfg.region+"/s3/aws4_request";
 const stringToSign=["AWS4-HMAC-SHA256",amzDate,scope,sha256(canonicalRequest)].join("\n");
 const signature=createHmac("sha256",signingKey(cfg.secretKey,dateStamp,cfg.region))
  .update(stringToSign)
  .digest("hex");
 const headers:Record<string,string>={
  "x-amz-content-sha256":payloadHash,
  "x-amz-date":amzDate,
  authorization:"AWS4-HMAC-SHA256 Credential="+cfg.accessKey+"/"+scope+
   ", SignedHeaders="+signedHeaders+
   ", Signature="+signature
 };
 if(cfg.sessionToken)headers["x-amz-security-token"]=cfg.sessionToken;

 return {url:url.toString(),headers};
}

export async function verifyStoredMedia(spec:UploadSpec){
 if(mode()==="test"&&process.env.ALLOW_TEST_MEDIA_STORAGE==="true"){
  return {size:spec.size,contentType:spec.contentType};
 }

 const signed=signedRequest("HEAD",spec.key);
 const response=await fetch(signed.url,{
  method:"HEAD",
  headers:signed.headers,
  cache:"no-store"
 });

 if(!response.ok)throw new Error("Uploaded media object could not be verified.");

 const actualSize=Number(response.headers.get("content-length")||"0");
 const actualType=(response.headers.get("content-type")||"")
  .split(";")[0]
  .trim()
  .toLowerCase();

 if(actualSize!==spec.size)throw new Error("Uploaded media size did not match the authorized file.");
 if(actualType&&actualType!==spec.contentType.toLowerCase()){
  throw new Error("Uploaded media type did not match the authorized file.");
 }

 return {size:actualSize,contentType:actualType||spec.contentType};
}

export async function deleteStoredMedia(key:string){
 if(mode()==="test"&&process.env.ALLOW_TEST_MEDIA_STORAGE==="true")return true;

 const signed=signedRequest("DELETE",key);
 const response=await fetch(signed.url,{
  method:"DELETE",
  headers:signed.headers,
  cache:"no-store"
 });

 if(!response.ok&&response.status!==404)throw new Error("Media object could not be deleted.");
 return true;
}
