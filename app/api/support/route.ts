import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const CATEGORIES=["ACCOUNT","LIVE","BATTLE","PAYMENTS","SAFETY","OTHER"] as const;

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const tickets=await db.supportTicket.findMany({
  where:{userId:me.id},
  orderBy:{createdAt:"desc"},
  take:50
 });
 return NextResponse.json({tickets});
}

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const category=String(body?.category??"OTHER").toUpperCase();
 const subject=String(body?.subject??"").trim().slice(0,120);
 const message=String(body?.body??"").trim().slice(0,3000);

 if(!(CATEGORIES as readonly string[]).includes(category)){
  return NextResponse.json({error:"Choose a valid support category."},{status:400});
 }
 if(subject.length<4)return NextResponse.json({error:"Support subject must be at least 4 characters."},{status:400});
 if(message.length<10)return NextResponse.json({error:"Support message must be at least 10 characters."},{status:400});

 const [profile,pass]=await Promise.all([
  db.battleProfile.findUnique({where:{userId:me.id},select:{vipUntil:true}}),
  db.battlePassProgress.findUnique({where:{userId:me.id},select:{premiumActive:true}})
 ]);
 const vipActive=Boolean((profile?.vipUntil&&profile.vipUntil>new Date())||pass?.premiumActive);

 const ticket=await db.supportTicket.create({
  data:{
   userId:me.id,
   category,
   subject,
   body:message,
   priority:vipActive?"VIP":"STANDARD"
  }
 });
 return NextResponse.json({ticket},{status:201});
}
