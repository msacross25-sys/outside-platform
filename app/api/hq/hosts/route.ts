import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentStaff,canManageHosts } from "@/lib/hq";

export async function GET(){
 const access=await currentStaff();
 if(!access||!canManageHosts(access.staff.role))return NextResponse.json({error:"Host management access required."},{status:403});
 const applications=await db.hostApplication.findMany({orderBy:{appliedAt:"asc"},take:100,include:{user:{select:{username:true,displayName:true,status:true,viewingProgress:{select:{verifiedSeconds:true}},_count:{select:{followers:true}}}}}});
 const reviewerIds=[...new Set(applications.map(a=>a.reviewedById).filter((id):id is string=>!!id))];
 const reviewers=reviewerIds.length?await db.user.findMany({where:{id:{in:reviewerIds}},select:{id:true,username:true,displayName:true}}):[];
 const reviewerMap=new Map(reviewers.map(r=>[r.id,r]));
 const approvedHosts=await db.hostApplication.count({where:{status:"APPROVED"}}); return NextResponse.json({approvedHosts,firstHundredPhase:approvedHosts<100,applications:applications.map(a=>({...a,verifiedViewingHours:Number(a.user.viewingProgress?.verifiedSeconds??0n)/3600,reviewedBy:a.reviewedById?reviewerMap.get(a.reviewedById)??null:null}))});
}
export async function POST(request:Request){
 const access=await currentStaff();
 if(!access||!canManageHosts(access.staff.role))return NextResponse.json({error:"Host management access required."},{status:403});
 const body=await request.json().catch(()=>null);
 const id=String(body?.id??"");
 const action=String(body?.action??"");
 if(!id||!["APPROVED","REJECTED","REMOVED"].includes(action))return NextResponse.json({error:"Application and valid action are required."},{status:400});
 const application=await db.hostApplication.findUnique({where:{id},include:{user:{select:{status:true,viewingProgress:{select:{verifiedSeconds:true}},_count:{select:{followers:true}}}}}});
 if(!application)return NextResponse.json({error:"Host application not found."},{status:404});
 if(action==="APPROVED"&&application.status!=="PENDING")return NextResponse.json({error:"Only pending applications can be approved."},{status:409});
 const viewingHours=Number(application.user.viewingProgress?.verifiedSeconds??0n)/3600;if(action==="APPROVED"&&(application.user.status!=="ACTIVE"||application.user._count.followers<2500||viewingHours<3000))return NextResponse.json({error:"Host approval requires 2,500+ followers, 3,000 verified viewing hours, and good account standing."},{status:409});
 const updated=await db.$transaction(async tx=>{
  const result=await tx.hostApplication.update({where:{id},data:{status:action as "APPROVED"|"REJECTED"|"REMOVED",reviewedAt:new Date(),reviewedById:access.user.id}});
  await tx.auditLog.create({data:{actorId:access.user.id,action:"HOST_"+action,resourceType:"HOST_APPLICATION",resourceId:id,reason:"Host application review"}});
  return result;
 });
 return NextResponse.json({application:updated});
}