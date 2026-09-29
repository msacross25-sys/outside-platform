import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {consumeAuthToken} from "@/lib/authTokens";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {securityDigest} from "@/lib/requestSecurity";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 const token=String(body?.token??"");
 if(!token)return NextResponse.json({error:"Verification token required."},{status:400});

 const identifier=securityDigest(token).slice(0,32);
 const limit=await checkAuthRateLimit({action:"VERIFY_EMAIL_CONFIRM",identifier,request,limit:10,windowMs:60*60*1000,blockMs:60*60*1000});
 if(!limit.allowed)return NextResponse.json({error:"Too many verification attempts. Try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 const authToken=await consumeAuthToken(token,"EMAIL_VERIFY");
 if(!authToken)return NextResponse.json({error:"This verification link is invalid or expired."},{status:400});

 await db.user.update({where:{id:authToken.userId},data:{emailVerifiedAt:new Date()}});
 await db.authToken.deleteMany({where:{userId:authToken.userId,type:"EMAIL_VERIFY",usedAt:null}});
 await recordAuthEvent(request,"EMAIL_VERIFIED",authToken.userId);
 return NextResponse.json({verified:true});
}
