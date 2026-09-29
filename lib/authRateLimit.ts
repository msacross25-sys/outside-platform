import {db} from "@/lib/db";
import {requestSecurityMeta,securityDigest} from "@/lib/requestSecurity";

type Options={
 action:string;
 identifier:string;
 request:Request;
 limit:number;
 windowMs:number;
 blockMs:number;
};

function isWriteConflict(error:unknown){
 return typeof error==="object"&&error!==null&&"code" in error&&(error as {code?:string}).code==="P2034";
}

async function sleep(ms:number){
 await new Promise(resolve=>setTimeout(resolve,ms));
}

export async function checkAuthRateLimit(options:Options){
 const {ipHash}=requestSecurityMeta(options.request);
 const keyHash=securityDigest([options.action,options.identifier.toLowerCase(),ipHash].join("|"));

 for(let attempt=0;attempt<4;attempt++){
  const now=new Date();
  try{
   return await db.$transaction(async tx=>{
    const row=await tx.authRateLimit.findUnique({where:{keyHash}});
    if(row?.blockedUntil&&row.blockedUntil>now){
     return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((row.blockedUntil.getTime()-now.getTime())/1000))};
    }

    const expired=!row||now.getTime()-row.windowStartedAt.getTime()>=options.windowMs;
    if(expired){
     await tx.authRateLimit.upsert({
      where:{keyHash},
      create:{keyHash,action:options.action,count:1,windowStartedAt:now},
      update:{action:options.action,count:1,windowStartedAt:now,blockedUntil:null}
     });
     return {allowed:true,retryAfterSeconds:0};
    }

    const next=row.count+1;
    if(next>options.limit){
     const blockedUntil=new Date(now.getTime()+options.blockMs);
     await tx.authRateLimit.update({where:{keyHash},data:{count:next,blockedUntil}});
     return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil(options.blockMs/1000))};
    }

    await tx.authRateLimit.update({where:{keyHash},data:{count:next}});
    return {allowed:true,retryAfterSeconds:0};
   },{isolationLevel:"Serializable"});
  }catch(error){
   if(!isWriteConflict(error)||attempt===3)throw error;
   await sleep(15*(attempt+1));
  }
 }

 return {allowed:false,retryAfterSeconds:1};
}

export async function clearAuthRateLimit(action:string,identifier:string,request:Request){
 const {ipHash}=requestSecurityMeta(request);
 const keyHash=securityDigest([action,identifier.toLowerCase(),ipHash].join("|"));
 await db.authRateLimit.deleteMany({where:{keyHash}});
}
