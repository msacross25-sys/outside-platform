import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:"Sign in required."},{status:401});
  const body = await request.json().catch(()=>null);
  if (!body) return NextResponse.json({error:"Invalid request."},{status:400});
  const displayName=String(body.displayName??"").trim().slice(0,60);
  const bio=String(body.bio??"").trim().slice(0,160);
  if(!displayName) return NextResponse.json({error:"Display name is required."},{status:400});
  const updated=await db.user.update({where:{id:user.id},data:{displayName,bio},select:{id:true,username:true,displayName:true,bio:true,avatarUrl:true}});
  return NextResponse.json({user:updated});
}
