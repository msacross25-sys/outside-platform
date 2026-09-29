import {createHash,randomBytes} from "node:crypto";
import type {AuthTokenType} from "@prisma/client";
import {db} from "@/lib/db";

function hashToken(token:string){
 return createHash("sha256").update(token).digest("hex");
}

export async function issueAuthToken(userId:string,type:AuthTokenType,ttlMs:number){
 const token=randomBytes(32).toString("base64url");
 const tokenHash=hashToken(token);
 const expiresAt=new Date(Date.now()+ttlMs);
 await db.$transaction([
  db.authToken.deleteMany({where:{userId,type,usedAt:null}}),
  db.authToken.create({data:{userId,type,tokenHash,expiresAt}})
 ]);
 return {token,expiresAt};
}

export async function consumeAuthToken(token:string,type:AuthTokenType){
 const tokenHash=hashToken(token);
 const now=new Date();
 return db.$transaction(async tx=>{
  const row=await tx.authToken.findUnique({where:{tokenHash}});
  if(!row||row.type!==type||row.usedAt||row.expiresAt<=now)return null;
  await tx.authToken.update({where:{id:row.id},data:{usedAt:now}});
  return row;
 },{isolationLevel:"Serializable"});
}
