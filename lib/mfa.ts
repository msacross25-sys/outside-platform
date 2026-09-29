import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes} from "node:crypto";

const BASE32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(){
 const raw=process.env.MFA_ENCRYPTION_KEY;
 if(raw){
  if(/^[0-9a-f]{64}$/i.test(raw))return Buffer.from(raw,"hex");
  const decoded=Buffer.from(raw,"base64");
  if(decoded.length===32)return decoded;
 }
 if(process.env.NODE_ENV==="production")throw new Error("MFA_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
 return createHash("sha256").update(process.env.AUTH_SECRET||"outside-development-mfa-key").digest();
}

export function encryptMfaSecret(value:string){
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",encryptionKey(),iv);
 const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
 const tag=cipher.getAuthTag();
 return [iv,tag,encrypted].map(x=>x.toString("base64url")).join(".");
}

export function decryptMfaSecret(value:string){
 const [ivRaw,tagRaw,dataRaw]=value.split(".");
 if(!ivRaw||!tagRaw||!dataRaw)throw new Error("Invalid encrypted MFA secret.");
 const decipher=createDecipheriv("aes-256-gcm",encryptionKey(),Buffer.from(ivRaw,"base64url"));
 decipher.setAuthTag(Buffer.from(tagRaw,"base64url"));
 return Buffer.concat([decipher.update(Buffer.from(dataRaw,"base64url")),decipher.final()]).toString("utf8");
}

function base32Encode(data:Buffer){
 let bits=0,value=0,output="";
 for(const byte of data){
  value=(value<<8)|byte;
  bits+=8;
  while(bits>=5){
   output+=BASE32[(value>>>(bits-5))&31];
   bits-=5;
  }
 }
 if(bits>0)output+=BASE32[(value<<(5-bits))&31];
 return output;
}

function base32Decode(input:string){
 const clean=input.toUpperCase().replace(/=+$/,"").replace(/[^A-Z2-7]/g,"");
 let bits=0,value=0;
 const out:number[]=[];
 for(const char of clean){
  const index=BASE32.indexOf(char);
  if(index<0)continue;
  value=(value<<5)|index;
  bits+=5;
  if(bits>=8){
   out.push((value>>>(bits-8))&255);
   bits-=8;
  }
 }
 return Buffer.from(out);
}

export function generateMfaSecret(){
 return base32Encode(randomBytes(20));
}

function codeFor(secret:string,counter:number){
 const buffer=Buffer.alloc(8);
 buffer.writeBigUInt64BE(BigInt(counter));
 const digest=createHmac("sha1",base32Decode(secret)).update(buffer).digest();
 const offset=digest[digest.length-1]&15;
 const binary=((digest[offset]&0x7f)<<24)|(digest[offset+1]<<16)|(digest[offset+2]<<8)|digest[offset+3];
 return String(binary%1_000_000).padStart(6,"0");
}

export function verifyTotp(secret:string,code:string,now=Date.now()){
 if(!/^\d{6}$/.test(code))return false;
 const counter=Math.floor(now/30000);
 for(const drift of [-1,0,1]){
  if(codeFor(secret,counter+drift)===code)return true;
 }
 return false;
}

export function otpAuthUri(email:string,secret:string){
 const label=encodeURIComponent("OUTSiiDE:"+email);
 return "otpauth://totp/"+label+"?secret="+encodeURIComponent(secret)+"&issuer=OUTSiiDE&algorithm=SHA1&digits=6&period=30";
}

export function generateRecoveryCodes(){
 return Array.from({length:10},()=>randomBytes(6).toString("hex").toUpperCase());
}

export function hashRecoveryCode(code:string){
 return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
