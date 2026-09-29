import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentStaff} from "@/lib/hq";

function allowed(role:string){
 return ["OWNER","CO_OWNER","EXECUTIVE_ADMIN","TRUST_SAFETY"].includes(role);
}

export async function GET(_:Request,{params}:{params:Promise<{userId:string}>}){
 const {userId}=await params;
 const access=await currentStaff();
 if(!access||!allowed(access.staff.role))return NextResponse.json({error:"Trust & Safety permission required."},{status:403});
 const [user,cases,actions,appeals,reports]=await Promise.all([
  db.user.findUnique({where:{id:userId},select:{id:true,username:true,displayName:true,status:true,createdAt:true}}),
  db.trustCase.findMany({where:{targetUserId:userId},orderBy:{openedAt:"desc"},include:{events:{orderBy:{createdAt:"asc"}}}}),
  db.moderationActionLog.findMany({where:{targetUserId:userId},orderBy:{createdAt:"desc"}}),
  db.appeal.findMany({where:{userId},orderBy:{createdAt:"desc"}}),
  db.report.findMany({where:{reportedUserId:userId},orderBy:{createdAt:"desc"}})
 ]);
 if(!user)return NextResponse.json({error:"User not found."},{status:404});
 return NextResponse.json({user,cases,actions,appeals,reports});
}
