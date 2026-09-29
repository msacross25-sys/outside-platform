import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {issueAuthToken} from "@/lib/authTokens";
import {sendVerificationEmail} from "@/lib/email";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 const login=String(body?.login??body?.email??"").trim().toLowerCase();
 if(!login)return NextResponse.json({ok:true});

 const limit=await checkAuthRateLimit({action:"VERIFY_EMAIL_REQUEST",identifier:login,request,limit:3,windowMs:15*60*1000,blockMs:30*60*1000});
 if(!limit.allowed)return NextResponse.json({ok:true},{headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const user=await db.user.findFirst({where:{OR:[{email:login},{username:login}]},select:{id:true,email:true,emailVerifiedAt:true,status:true}});
 if(!user||user.status!=="ACTIVE"||user.emailVerifiedAt)return NextResponse.json({ok:true});

 const {token}=await issueAuthToken(user.id,"EMAIL_VERIFY",24*60*60*1000);
 try{
  await sendVerificationEmail(user.email,token);
  await recordAuthEvent(request,"EMAIL_VERIFICATION_SENT",user.id);
 }catch(error){
  console.error("Verification email delivery failed",error);
  await recordAuthEvent(request,"EMAIL_VERIFICATION_DELIVERY_FAILED",user.id);
 }
 return NextResponse.json({ok:true});
}
