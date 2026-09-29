import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentAuth} from "@/lib/session";

export async function GET(){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const events=await db.authEvent.findMany({
  where:{userId:auth.user.id},
  orderBy:{createdAt:"desc"},
  take:50,
  select:{id:true,kind:true,userAgent:true,createdAt:true}
 });
 return NextResponse.json({events});
}
