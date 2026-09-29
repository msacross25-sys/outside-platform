import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {getPorchAccess} from "@/lib/porchAccess";

export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getPorchAccess(slug,me.id);
 const room=access.room;
 if(!room||["SCHEDULED","ENDED","CANCELLED"].includes(room.status))return NextResponse.json({error:"Room is not live."},{status:404});
 if(access.banned)return NextResponse.json({error:"You are banned from this room."},{status:403});
 if(!access.allowed)return NextResponse.json({error:room.visibility==="PRIVATE"?"This live is private.":"This live is for followers only."},{status:403});
 await db.porchMember.upsert({where:{roomId_userId:{roomId:room.id,userId:me.id}},create:{roomId:room.id,userId:me.id,role:"LISTENER"},update:{}});
 return NextResponse.json({joined:true});
}
