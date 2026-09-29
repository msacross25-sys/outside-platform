import {NextResponse} from "next/server";
import {currentAuth,destroySession} from "@/lib/session";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const auth=await currentAuth();
 if(auth)await recordAuthEvent(request,"LOGOUT",auth.user.id);
 await destroySession();
 return NextResponse.json({ok:true});
}
