import {createHmac} from "node:crypto";

function secret(){
 const value=process.env.AUTH_SECRET;
 if(value)return value;
 if(process.env.NODE_ENV==="production")throw new Error("AUTH_SECRET is required in production.");
 return "outside-development-only-auth-secret";
}

export function requestSecurityMeta(request:Request){
 const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
 const ip=forwarded||request.headers.get("x-real-ip")?.trim()||"unknown";
 const userAgent=(request.headers.get("user-agent")||"unknown").slice(0,500);
 const ipHash=createHmac("sha256",secret()).update(ip).digest("hex");
 return {ipHash,userAgent};
}

export function securityDigest(value:string){
 return createHmac("sha256",secret()).update(value).digest("hex");
}
