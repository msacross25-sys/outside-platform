import {Prisma} from "@prisma/client";
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

type RateRow={
 count:number;
 windowStartedAt:Date;
 blockedUntil:Date|null;
};

export async function checkAuthRateLimit(options:Options){
 const {ipHash}=requestSecurityMeta(options.request);
 const keyHash=securityDigest([options.action,options.identifier.toLowerCase(),ipHash].join("|"));
 const now=new Date();
 const windowThreshold=new Date(now.getTime()-options.windowMs);
 const newBlockedUntil=new Date(now.getTime()+options.blockMs);

 const rows=await db.$queryRaw<RateRow[]>(Prisma.sql`
  INSERT INTO "AuthRateLimit" ("keyHash","action","count","windowStartedAt","blockedUntil","updatedAt")
  VALUES (${keyHash},${options.action},1,${now},NULL,${now})
  ON CONFLICT ("keyHash") DO UPDATE SET
    "action" = EXCLUDED."action",
    "count" = CASE
      WHEN "AuthRateLimit"."blockedUntil" IS NOT NULL AND "AuthRateLimit"."blockedUntil" > ${now}
        THEN "AuthRateLimit"."count"
      WHEN "AuthRateLimit"."windowStartedAt" <= ${windowThreshold}
        THEN 1
      ELSE "AuthRateLimit"."count" + 1
    END,
    "windowStartedAt" = CASE
      WHEN "AuthRateLimit"."blockedUntil" IS NOT NULL AND "AuthRateLimit"."blockedUntil" > ${now}
        THEN "AuthRateLimit"."windowStartedAt"
      WHEN "AuthRateLimit"."windowStartedAt" <= ${windowThreshold}
        THEN ${now}
      ELSE "AuthRateLimit"."windowStartedAt"
    END,
    "blockedUntil" = CASE
      WHEN "AuthRateLimit"."blockedUntil" IS NOT NULL AND "AuthRateLimit"."blockedUntil" > ${now}
        THEN "AuthRateLimit"."blockedUntil"
      WHEN "AuthRateLimit"."windowStartedAt" <= ${windowThreshold}
        THEN NULL
      WHEN "AuthRateLimit"."count" + 1 > ${options.limit}
        THEN ${newBlockedUntil}
      ELSE NULL
    END,
    "updatedAt" = ${now}
  RETURNING "count","windowStartedAt","blockedUntil"
 `);

 const row=rows[0];
 if(!row)return {allowed:false,retryAfterSeconds:1};
 if(row.blockedUntil&&row.blockedUntil>now){
  return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((row.blockedUntil.getTime()-now.getTime())/1000))};
 }
 return {allowed:true,retryAfterSeconds:0};
}

export async function clearAuthRateLimit(action:string,identifier:string,request:Request){
 const {ipHash}=requestSecurityMeta(request);
 const keyHash=securityDigest([action,identifier.toLowerCase(),ipHash].join("|"));
 await db.authRateLimit.deleteMany({where:{keyHash}});
}
