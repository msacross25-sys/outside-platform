import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {issueAuthToken} from "@/lib/authTokens";
import {sendPasswordResetEmail} from "@/lib/email";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 const login=String(body?.login??"").trim().toLowerCase();
 if(!login)return NextResponse.json({ok:true});

 const limit=await checkAuthRateLimit({action:"PASSWORD_RESET_REQUEST",identifier:login,request,limit:3,windowMs:30*60*1000,blockMs:60*60*1000});
 if(!limit.allowed)return NextResponse.json({ok:true},{headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const user=await db.user.findFirst({where:{OR:[{email:login},{username:login}]},select:{id:true,email:true,status:true}});
 if(!user||user.status!=="ACTIVE")return NextResponse.json({ok:true});

 const {token}=await issueAuthToken(user.id,"PASSWORD_RESET",30*60*1000);
 try{
  await sendPasswordResetEmail(user.email,token);
  await recordAuthEvent(request,"PASSWORD_RESET_SENT",user.id);
 }catch(error){
  console.error("Password reset email delivery failed",error);
  await recordAuthEvent(request,"PASSWORD_RESET_DELIVERY_FAILED",user.id);
 }
 return NextResponse.json({ok:true});
}
