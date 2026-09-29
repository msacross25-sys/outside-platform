import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentAuth,destroySession,revokeOtherSessions,revokeSessionForUser} from "@/lib/session";
import {recordAuthEvent} from "@/lib/authEvents";

export async function GET(){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const sessions=await db.session.findMany({
  where:{userId:auth.user.id,expiresAt:{gt:new Date()}},
  orderBy:{lastSeenAt:"desc"},
  select:{id:true,createdAt:true,lastSeenAt:true,expiresAt:true,userAgent:true,mfaVerifiedAt:true}
 });
 return NextResponse.json({sessions:sessions.map(s=>({...s,current:s.id===auth.session.id,mfaVerified:Boolean(s.mfaVerifiedAt)}))});
}

export async function POST(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 if(body?.action!=="REVOKE_OTHERS")return NextResponse.json({error:"Unsupported session action."},{status:400});
 const result=await revokeOtherSessions(auth.user.id,auth.session.id);
 await recordAuthEvent(request,"OTHER_SESSIONS_REVOKED",auth.user.id,{count:result.count});
 return NextResponse.json({revoked:result.count});
}

export async function DELETE(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json().catch(()=>null);
 const sessionId=String(body?.sessionId??"");
 if(!sessionId)return NextResponse.json({error:"Session required."},{status:400});

 if(sessionId===auth.session.id){
  await recordAuthEvent(request,"CURRENT_SESSION_REVOKED",auth.user.id);
  await destroySession();
  return NextResponse.json({revoked:true,current:true});
 }
 const result=await revokeSessionForUser(auth.user.id,sessionId);
 if(!result.count)return NextResponse.json({error:"Session not found."},{status:404});
 await recordAuthEvent(request,"SESSION_REVOKED",auth.user.id,{sessionId});
 return NextResponse.json({revoked:true,current:false});
}
