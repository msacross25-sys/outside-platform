import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";
import {getLiveMemberAccess} from "@/lib/porchAccess";

export const dynamic="force-dynamic";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const access=await getLiveMemberAccess(slug,me.id);
 if(!access)return NextResponse.json({error:"Live room access required."},{status:403});
 return NextResponse.json({role:access.member?.role??"LISTENER",roomId:access.room.id},{
  headers:{"Cache-Control":"no-store"}
 });
}
