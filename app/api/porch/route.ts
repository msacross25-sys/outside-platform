import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,52);

export async function GET(){
 const me=await currentUser();
 const rooms=await db.porchRoom.findMany({where:{status:{in:["SCHEDULED","LIVE"]}},orderBy:[{status:"asc"},{scheduledFor:"asc"}],take:50,include:{_count:{select:{members:true}},members:{where:{role:"HOST"},take:1,include:{user:{select:{username:true,displayName:true}}}}}});
 if(!me)return NextResponse.json({rooms:rooms.filter(r=>r.visibility==="PUBLIC")});
 const [following,memberships]=await Promise.all([
  db.follow.findMany({where:{followerId:me.id},select:{followingId:true}}),
  db.porchMember.findMany({where:{userId:me.id,roomId:{in:rooms.map(r=>r.id)}},select:{roomId:true}})
 ]);
 const followingIds=new Set(following.map(f=>f.followingId));
 const memberRoomIds=new Set(memberships.map(m=>m.roomId));
 return NextResponse.json({rooms:rooms.filter(r=>{
  if(r.visibility==="PUBLIC")return true;
  if(memberRoomIds.has(r.id))return true;
  const hostId=r.members[0]?.userId;
  return r.visibility==="FOLLOWERS"&&!!hostId&&followingIds.has(hostId);
 })});
}

export async function POST(request:Request){
 const me=await currentUser();if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const followerCount=await db.follow.count({where:{followingId:me.id}});
 const progress=await db.viewingProgress.findUnique({where:{userId:me.id}});
 const viewingHours=Number(progress?.verifiedSeconds??0n)/3600;
 if(followerCount<2500||viewingHours<3000)return NextResponse.json({error:"Hosting requires 2,500 followers, 3,000 verified viewing hours, and host approval."},{status:403});
 const hostApplication=await db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}});
 if(hostApplication?.status!=="APPROVED")return NextResponse.json({error:"Host approval is required before creating a hosted room."},{status:403});
 const body=await request.json().catch(()=>null);
 const title=String(body?.title??"").trim().slice(0,100),description=String(body?.description??"").trim().slice(0,700);
 const roomType=body?.roomType==="VOICE"?"VOICE":"VIDEO",visibility=["PUBLIC","FOLLOWERS","PRIVATE"].includes(body?.visibility)?body.visibility:"PUBLIC";
 const category=String(body?.category??"").trim().slice(0,80),coverImageUrl=String(body?.coverImageUrl??"").trim().slice(0,1000),defaultEffect=String(body?.defaultEffect??"").trim().slice(0,80),defaultBackdrop=String(body?.defaultBackdrop??"").trim().slice(0,80);
 const stageSize=Number(body?.stageSize??1);
 if(![1,5,7,10].includes(stageSize))return NextResponse.json({error:"Stage size must be 1, 5, 7, or 10."},{status:400});
 if(title.length<3)return NextResponse.json({error:"Room title must be at least 3 characters."},{status:400});
 let scheduledFor:Date|null=null;
 if(body?.scheduledFor){scheduledFor=new Date(body.scheduledFor);if(!Number.isFinite(scheduledFor.getTime()))return NextResponse.json({error:"Enter a valid date and time."},{status:400});if(scheduledFor.getTime()<=Date.now())return NextResponse.json({error:"Scheduled Porch rooms must be set for a future time."},{status:400})}
 const slug=slugify(title)+"-"+Date.now().toString(36);
 try{
  const room=await db.porchRoom.create({data:{title,slug,description:description||null,scheduledFor,roomType,stageSize,category:category||null,visibility,guestRequestsEnabled:body?.guestRequestsEnabled!==false,giftsEnabled:body?.giftsEnabled!==false,chatEnabled:body?.chatEnabled!==false,coverImageUrl:coverImageUrl||null,defaultEffect:defaultEffect||null,defaultBackdrop:defaultBackdrop||null,members:{create:{userId:me.id,role:"HOST"}}},select:{id:true,slug:true,title:true}});
  return NextResponse.json({room},{status:201});
 }catch(error){console.error("Porch room creation failed",error);return NextResponse.json({error:"Unable to create Porch room right now."},{status:500})}
}
