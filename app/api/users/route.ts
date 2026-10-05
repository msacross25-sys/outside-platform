import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {hashPassword} from "@/lib/password";
import {normalizeUsername,validPassword,validUsername} from "@/lib/validation";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {issueAuthToken} from "@/lib/authTokens";
import {sendVerificationEmail} from "@/lib/email";
import {recordAuthEvent} from "@/lib/authEvents";
import {isAtLeast18} from "@/lib/age";

export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

 const email=String(body.email??"").trim().toLowerCase();
 const username=normalizeUsername(String(body.username??""));
 const displayName=String(body.displayName??"").trim();
 const password=String(body.password??"");
 const referralCode=String(body.referralCode??"").trim().toUpperCase().slice(0,32);
 const dateOfBirthRaw=String(body.dateOfBirth??"").trim();
 const dateOfBirth=/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthRaw)?new Date(dateOfBirthRaw+"T00:00:00.000Z"):null;

 const limit=await checkAuthRateLimit({action:"SIGNUP",identifier:email||"missing",request,limit:5,windowMs:60*60*1000,blockMs:60*60*1000});
 if(!limit.allowed)return NextResponse.json({error:"Too many account creation attempts. Try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validUsername(username)||!displayName||!validPassword(password)){
  return NextResponse.json({error:"Check email, username, display name and password."},{status:400});
 }
 if(!dateOfBirth||Number.isNaN(dateOfBirth.getTime())||!isAtLeast18(dateOfBirth)){
  return NextResponse.json({error:"OUTSiiDE is for adults age 18 and older."},{status:403});
 }

 let referralOwnerId:string|undefined;
 if(referralCode){
  const referral=await db.referralCode.findUnique({
   where:{code:referralCode},
   include:{owner:{select:{id:true,status:true}}}
  });
  if(!referral||referral.owner.status!=="ACTIVE"){
   return NextResponse.json({error:"Referral code is not valid."},{status:400});
  }
  referralOwnerId=referral.ownerId;
 }

 let user;
 try{
  user=await db.$transaction(async tx=>{
   const created=await tx.user.create({
    data:{email,username,displayName,passwordHash:hashPassword(password),dateOfBirth,emailVerifiedAt:null},
    select:{id:true,email:true,username:true,displayName:true,createdAt:true}
   });
   if(referralOwnerId){
    await tx.referralAttribution.create({
     data:{referredUserId:created.id,referrerId:referralOwnerId}
    });
   }
   return created;
  });
 }catch{
  return NextResponse.json({error:"Email or username is already in use."},{status:409});
 }

 let emailSent=false;
 try{
  const {token}=await issueAuthToken(user.id,"EMAIL_VERIFY",24*60*60*1000);
  await sendVerificationEmail(user.email,token);
  emailSent=true;
 }catch(error){
  console.error("Verification setup or email delivery failed",error);
 }
 await recordAuthEvent(request,"ACCOUNT_CREATED",user.id,{emailSent});
 return NextResponse.json({user:{id:user.id,username:user.username,displayName:user.displayName,createdAt:user.createdAt},verificationRequired:true,emailSent},{status:201});
}
