import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {hashPassword} from "@/lib/password";
import {normalizeUsername,validPassword,validUsername} from "@/lib/validation";
import {checkAuthRateLimit} from "@/lib/authRateLimit";
import {issueAuthToken} from "@/lib/authTokens";
import {sendVerificationEmail} from "@/lib/email";
import {recordAuthEvent} from "@/lib/authEvents";
import {isAtLeast18} from "@/lib/age";
import {POLICY_VERSIONS} from "@/lib/policies";
import {requestSecurityMeta} from "@/lib/requestSecurity";

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
 const confirmAdult=body.confirmAdult===true;
 const confirmSingleAccount=body.confirmSingleAccount===true;
 const acceptTerms=body.acceptTerms===true;
 const acceptPrivacy=body.acceptPrivacy===true;
 const acceptCommunityGuidelines=body.acceptCommunityGuidelines===true;
 const {ipHash,userAgent}=requestSecurityMeta(request);

 const limit=await checkAuthRateLimit({action:"SIGNUP",identifier:email||"missing",request,limit:5,windowMs:60*60*1000,blockMs:60*60*1000});
 if(!limit.allowed)return NextResponse.json({error:"Too many account creation attempts. Try again later."},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});

 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validUsername(username)||!displayName||!validPassword(password)){
  return NextResponse.json({error:"Check email, username, display name and password."},{status:400});
 }
 if(!dateOfBirth||Number.isNaN(dateOfBirth.getTime())||!isAtLeast18(dateOfBirth)||!confirmAdult){
  return NextResponse.json({error:"OUTSiiDE is for adults age 18 and older. Confirm your age to continue."},{status:403});
 }
 if(!confirmSingleAccount){
  return NextResponse.json({error:"Confirm that you are not creating a duplicate account to evade OUTSiiDE rules."},{status:400});
 }
 if(!acceptTerms||!acceptPrivacy||!acceptCommunityGuidelines){
  return NextResponse.json({error:"Accept the Terms, Privacy Policy, and Community Rules to create an account."},{status:400});
 }

 const existingNetwork=await db.signupNetwork.findUnique({where:{ipHash}});
 if(existingNetwork){
  await db.signupNetwork.update({
   where:{ipHash},
   data:{blockedAttempts:{increment:1},lastAttemptAt:new Date()}
  });
  await recordAuthEvent(request,"SIGNUP_BLOCKED_DUPLICATE_NETWORK",null,{firstUserId:existingNetwork.firstUserId});
  return NextResponse.json({
   error:"An OUTSiiDE account has already been created from this network. Contact Support if this is a legitimate shared network.",
   code:"DUPLICATE_NETWORK"
  },{status:409});
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

   await tx.signupNetwork.create({
    data:{ipHash,firstUserId:created.id,lastAttemptAt:new Date()}
   });

   await tx.policyAcceptance.createMany({
    data:[
     {userId:created.id,policyType:"TERMS",policyVersion:POLICY_VERSIONS.TERMS,ipHash,userAgent,metadataJson:JSON.stringify({source:"SIGNUP",adultConfirmed:true,singleAccountConfirmed:true})},
     {userId:created.id,policyType:"PRIVACY",policyVersion:POLICY_VERSIONS.PRIVACY,ipHash,userAgent,metadataJson:JSON.stringify({source:"SIGNUP"})},
     {userId:created.id,policyType:"COMMUNITY_GUIDELINES",policyVersion:POLICY_VERSIONS.COMMUNITY_GUIDELINES,ipHash,userAgent,metadataJson:JSON.stringify({source:"SIGNUP"})}
    ]
   });

   if(referralOwnerId){
    await tx.referralAttribution.create({
     data:{referredUserId:created.id,referrerId:referralOwnerId}
    });
   }
   return created;
  },{isolationLevel:"Serializable"});
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
