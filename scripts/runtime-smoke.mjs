import {createHash,createHmac} from "node:crypto";
import {PrismaClient} from "@prisma/client";

const db=new PrismaClient();
const base=process.env.SMOKE_BASE_URL??"http://127.0.0.1:3000";
const suffix=Date.now().toString(36).slice(-7);
const password="RuntimeSmoke123!";
const resetPassword="RuntimeSmoke456!";
const BASE32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function fail(message,detail){
 console.error("\nSMOKE FAILURE:",message);
 if(detail!==undefined)console.error(detail);
 process.exitCode=1;
 throw new Error(message);
}

function expect(condition,message,detail){
 if(!condition)fail(message,detail);
}

async function request(path,{method="GET",body,cookie}={}){
 const headers={};
 if(body!==undefined)headers["content-type"]="application/json";
 if(cookie)headers.cookie=cookie;
 const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
 const raw=await response.text();
 let data=null;
 try{data=raw?JSON.parse(raw):null}catch{data=raw}
 return {response,data,setCookie:response.headers.get("set-cookie")};
}

function sessionCookie(setCookie){
 expect(Boolean(setCookie),"Login did not return a session cookie.");
 return setCookie.split(";")[0];
}

function sha256(value){
 return createHash("sha256").update(value).digest("hex");
}

function base32Decode(input){
 const clean=input.toUpperCase().replace(/=+$/,"").replace(/[^A-Z2-7]/g,"");
 let bits=0,value=0;
 const out=[];
 for(const char of clean){
  const index=BASE32.indexOf(char);
  if(index<0)continue;
  value=(value<<5)|index;
  bits+=5;
  if(bits>=8){
   out.push((value>>>(bits-8))&255);
   bits-=8;
  }
 }
 return Buffer.from(out);
}

function totp(secret){
 const counter=Math.floor(Date.now()/30000);
 const buffer=Buffer.alloc(8);
 buffer.writeBigUInt64BE(BigInt(counter));
 const digest=createHmac("sha1",base32Decode(secret)).update(buffer).digest();
 const offset=digest[digest.length-1]&15;
 const binary=((digest[offset]&0x7f)<<24)|(digest[offset+1]<<16)|(digest[offset+2]<<8)|digest[offset+3];
 return String(binary%1_000_000).padStart(6,"0");
}

async function signup(username,displayName){
 const email=username+"@smoke.test";
 const r=await request("/api/users",{method:"POST",body:{email,username,displayName,password}});
 expect(r.response.status===201,"Signup failed",{status:r.response.status,data:r.data});
 expect(r.data?.verificationRequired===true,"Signup did not require verification",r.data);
 return {id:r.data.user.id,username,email,displayName};
}

async function verifyEmail(user){
 const raw="verify-"+suffix+"-"+user.username;
 await db.authToken.deleteMany({where:{userId:user.id,type:"EMAIL_VERIFY"}});
 await db.authToken.create({
  data:{userId:user.id,type:"EMAIL_VERIFY",tokenHash:sha256(raw),expiresAt:new Date(Date.now()+60*60*1000)}
 });
 const r=await request("/api/auth/verify-email",{method:"POST",body:{token:raw}});
 expect(r.response.status===200&&r.data?.verified===true,"Email verification failed",{user:user.username,status:r.response.status,data:r.data});
}

async function login(username,pw=password){
 const r=await request("/api/auth/login",{method:"POST",body:{login:username,password:pw}});
 expect(r.response.status===200,"Login failed",{username,status:r.response.status,data:r.data});
 return {cookie:sessionCookie(r.setCookie),data:r.data};
}

async function main(){
 console.log("1. health and account verification");
 const health=await request("/api/health");
 expect(health.response.status===200&&health.data?.ok===true,"Health endpoint failed",health);

 const ready=await request("/api/ready");
 expect(ready.response.status===200&&ready.data?.ready===true,"Runtime readiness endpoint failed",ready.data);

 const alice=await signup("smokea"+suffix,"Smoke Alice");
 const bob=await signup("smokeb"+suffix,"Smoke Bob");
 const charlie=await signup("smokec"+suffix,"Smoke Charlie");
 const host=await signup("smokeh"+suffix,"Smoke Host");
 const resetUser=await signup("smoker"+suffix,"Smoke Reset");

 const unverified=await request("/api/auth/login",{method:"POST",body:{login:alice.username,password}});
 expect(unverified.response.status===403&&unverified.data?.code==="EMAIL_VERIFICATION_REQUIRED","Unverified account was allowed to sign in",unverified.data);

 const resend=await request("/api/auth/verify-email/request",{method:"POST",body:{login:alice.username}});
 expect(resend.response.status===200,"Verification resend endpoint failed",resend.data);

 await Promise.all([verifyEmail(alice),verifyEmail(bob),verifyEmail(charlie),verifyEmail(host),verifyEmail(resetUser)]);

 const dup=await request("/api/users",{method:"POST",body:{email:alice.email,username:alice.username,displayName:"Duplicate",password}});
 expect(dup.response.status===409,"Duplicate signup should be rejected",dup.data);

 const badLogin=await request("/api/auth/login",{method:"POST",body:{login:alice.username,password:"wrong-password"}});
 expect(badLogin.response.status===401,"Bad password should be rejected",badLogin.data);

 let [{cookie:aliceCookie},{cookie:bobCookie},{cookie:charlieCookie},{cookie:hostCookie},{cookie:resetCookie}]=await Promise.all([
  login(alice.username),login(bob.username),login(charlie.username),login(host.username),login(resetUser.username)
 ]);

 console.log("2. password reset and session invalidation");
 const rawReset="reset-"+suffix+"-"+resetUser.username;
 await db.authToken.deleteMany({where:{userId:resetUser.id,type:"PASSWORD_RESET"}});
 await db.authToken.create({
  data:{userId:resetUser.id,type:"PASSWORD_RESET",tokenHash:sha256(rawReset),expiresAt:new Date(Date.now()+30*60*1000)}
 });
 const reset=await request("/api/auth/password-reset/confirm",{method:"POST",body:{token:rawReset,password:resetPassword}});
 expect(reset.response.status===200&&reset.data?.reset===true,"Password reset failed",reset.data);
 const oldSession=await request("/api/auth/me",{cookie:resetCookie});
 expect(oldSession.response.status===200&&!oldSession.data?.user,"Password reset did not revoke old sessions",oldSession.data);
 const oldPassword=await request("/api/auth/login",{method:"POST",body:{login:resetUser.username,password}});
 expect(oldPassword.response.status===401,"Old password still worked after reset",oldPassword.data);
 const newPasswordLogin=await login(resetUser.username,resetPassword);
 resetCookie=newPasswordLogin.cookie;

 console.log("3. brute-force throttling");
 const rateLogin="missing-rate-"+suffix;
 for(let i=0;i<8;i++){
  const r=await request("/api/auth/login",{method:"POST",body:{login:rateLogin,password:"bad-password"}});
  expect(r.response.status===401,"Unexpected response before login throttle",{attempt:i+1,status:r.response.status,data:r.data});
 }
 const throttled=await request("/api/auth/login",{method:"POST",body:{login:rateLogin,password:"bad-password"}});
 expect(throttled.response.status===429,"Login throttle did not activate",throttled.data);

 console.log("4. session management");
 const secondAlice=await login(alice.username);
 const sessionList=await request("/api/security/sessions",{cookie:aliceCookie});
 expect(sessionList.response.status===200&&sessionList.data?.sessions?.length>=2,"Multiple sessions were not listed",sessionList.data);
 const revokeOthers=await request("/api/security/sessions",{method:"POST",cookie:aliceCookie,body:{action:"REVOKE_OTHERS"}});
 expect(revokeOthers.response.status===200&&revokeOthers.data?.revoked>=1,"Other sessions were not revoked",revokeOthers.data);
 const revokedCheck=await request("/api/auth/me",{cookie:secondAlice.cookie});
 expect(revokedCheck.response.status===200&&!revokedCheck.data?.user,"Revoked session still authenticated",revokedCheck.data);
 const securityEvents=await request("/api/security/events",{cookie:aliceCookie});
 expect(securityEvents.response.status===200&&securityEvents.data?.events?.some(x=>x.kind==="OTHER_SESSIONS_REVOKED"),"Security event history missed session revocation",securityEvents.data);

 console.log("5. staff MFA and HQ enforcement");
 await db.staffProfile.create({data:{userId:host.id,role:"OWNER",mfaRequired:true}});
 const hqBefore=await request("/api/hq/overview",{cookie:hostCookie});
 expect(hqBefore.response.status===403,"HQ was accessible before required MFA setup",hqBefore.data);
 const staffBefore=await request("/api/hq/staff",{cookie:hostCookie});
 expect(staffBefore.response.status===403,"Main Owner staff controls bypassed MFA",staffBefore.data);
 const healthBefore=await request("/api/hq/system/health",{cookie:hostCookie});
 expect(healthBefore.response.status===403,"Detailed system health bypassed Owner MFA",healthBefore.data);

 const setup=await request("/api/security/mfa/setup",{method:"POST",cookie:hostCookie});
 expect(setup.response.status===200&&setup.data?.secret,"MFA setup failed",setup.data);
 const firstCode=totp(setup.data.secret);
 const enabled=await request("/api/security/mfa/enable",{method:"POST",cookie:hostCookie,body:{code:firstCode}});
 expect(enabled.response.status===200&&enabled.data?.enabled===true&&enabled.data?.recoveryCodes?.length===10,"MFA enrollment failed",enabled.data);

 const hqAfter=await request("/api/hq/overview",{cookie:hostCookie});
 expect(hqAfter.response.status===200,"HQ remained blocked after MFA enrollment",hqAfter.data);
 const staffAfter=await request("/api/hq/staff",{cookie:hostCookie});
 expect(staffAfter.response.status===200,"Main Owner staff controls remained blocked after MFA",staffAfter.data);
 const healthAfter=await request("/api/hq/system/health",{cookie:hostCookie});
 expect(healthAfter.response.status===200&&healthAfter.data?.ready===true,"Owner system health did not report ready after MFA",healthAfter.data);
 expect(Object.values(healthAfter.data?.checks??{}).every(check=>check?.ok===true),"One or more readiness checks failed in CI",healthAfter.data);

 const secondHost=await login(host.username);
 expect(secondHost.data?.mfaRequired===true,"MFA-enabled login did not request a second factor",secondHost.data);
 const hqUnverified=await request("/api/hq/overview",{cookie:secondHost.cookie});
 expect(hqUnverified.response.status===403,"New staff session accessed HQ before MFA challenge",hqUnverified.data);
 const challenge=await request("/api/auth/mfa/verify",{method:"POST",cookie:secondHost.cookie,body:{code:totp(setup.data.secret)}});
 expect(challenge.response.status===200&&challenge.data?.verified===true,"MFA login challenge failed",challenge.data);
 const hqVerified=await request("/api/hq/overview",{cookie:secondHost.cookie});
 expect(hqVerified.response.status===200,"MFA-verified staff session could not access HQ",hqVerified.data);
 hostCookie=secondHost.cookie;

 console.log("6. profile privacy");
 const me=await request("/api/auth/me",{cookie:aliceCookie});
 expect(me.response.status===200&&me.data?.user?.id===alice.id,"Session lookup failed",me.data);

 const privateProfile=await request("/api/profile",{
  method:"PATCH",
  cookie:bobCookie,
  body:{
   displayName:bob.displayName,
   bio:"Private smoke profile",
   privacy:"PRIVATE",
   messagePrivacy:"EVERYONE",
   commentPrivacy:"FOLLOWERS",
   mentionPrivacy:"EVERYONE",
   liveInvitePrivacy:"EVERYONE",
   hideActivity:true,
   hideConnections:true
  }
 });
 expect(privateProfile.response.status===200&&privateProfile.data?.user?.privacy==="PRIVATE","Private profile update failed",privateProfile.data);

 console.log("6b. signed media upload and private delivery");
 const uploadAuth=await request("/api/media/upload-request",{
  method:"POST",
  cookie:aliceCookie,
  body:{type:"image/jpeg",size:4,name:"smoke.jpg"}
 });
 expect(uploadAuth.response.status===200&&uploadAuth.data?.ready===true&&uploadAuth.data?.uploadToken,"Media upload authorization failed",uploadAuth.data);

 const uploadTarget=String(uploadAuth.data.uploadUrl).startsWith("http")
  ?String(uploadAuth.data.uploadUrl)
  :base+String(uploadAuth.data.uploadUrl);
 const uploadPut=await fetch(uploadTarget,{
  method:"PUT",
  headers:{...(uploadAuth.data.headers??{}),cookie:aliceCookie},
  body:Buffer.from([1,2,3,4]),
  redirect:"manual"
 });
 expect(uploadPut.status===204||uploadPut.ok,"Media upload target failed",{status:uploadPut.status});

 const completed=await request("/api/media/complete",{
  method:"POST",
  cookie:aliceCookie,
  body:{uploadToken:uploadAuth.data.uploadToken}
 });
 expect(completed.response.status===200&&completed.data?.media?.receipt,"Media completion failed",completed.data);
 expect(String(completed.data.media.url).startsWith("/api/media/content/"),"Media did not receive private delivery URL",completed.data);

 const forgedMedia=await request("/api/posts",{
  method:"POST",
  cookie:aliceCookie,
  body:{caption:"forged media",media:[{type:"IMAGE",url:"https://example.test/not-owned.jpg"}]}
 });
 expect(forgedMedia.response.status===400,"Arbitrary external media URL was accepted",forgedMedia.data);

 const receipt=String(completed.data.media.receipt);
 const tamperedReceipt=receipt.slice(0,-1)+(receipt.endsWith("A")?"B":"A");
 const tamperedPost=await request("/api/posts",{
  method:"POST",
  cookie:aliceCookie,
  body:{caption:"tampered media",media:[{receipt:tamperedReceipt}]}
 });
 expect(tamperedPost.response.status===400,"Tampered media receipt was accepted",tamperedPost.data);

 const mediaPost=await request("/api/posts",{
  method:"POST",
  cookie:aliceCookie,
  body:{caption:"Runtime media post",media:[{receipt}]}
 });
 expect(mediaPost.response.status===201&&mediaPost.data?.post?.id,"Signed media post failed",mediaPost.data);
 const mediaRow=await db.media.findFirst({where:{postId:mediaPost.data.post.id}});
 expect(Boolean(mediaRow)&&String(mediaRow.url).startsWith("/api/media/content/"),"Published media row was not private-delivery backed",mediaRow);

 await db.post.update({where:{id:mediaPost.data.post.id},data:{visibility:"FOLLOWERS"}});

 const mediaRead=await request(String(mediaRow.url),{cookie:aliceCookie});
 expect(mediaRead.response.status===307,"Media owner did not receive short-lived storage redirect",{status:mediaRead.response.status,data:mediaRead.data});

 const mediaDenied=await request(String(mediaRow.url),{cookie:charlieCookie});
 expect(mediaDenied.response.status===404,"Non-follower accessed followers-only media",{status:mediaDenied.response.status,data:mediaDenied.data});

 const mediaAnonymous=await request(String(mediaRow.url));
 expect(mediaAnonymous.response.status===404,"Anonymous viewer accessed followers-only media",{status:mediaAnonymous.response.status,data:mediaAnonymous.data});

 const attachedDiscard=await request("/api/media/discard",{
  method:"DELETE",
  cookie:aliceCookie,
  body:{token:receipt}
 });
 expect(attachedDiscard.response.status===409,"Published media could be discarded",attachedDiscard.data);

 const deleteMediaPost=await request("/api/posts/"+mediaPost.data.post.id,{
  method:"DELETE",
  cookie:aliceCookie
 });
 expect(deleteMediaPost.response.status===200&&deleteMediaPost.data?.deleted===true,"Media post deletion failed",deleteMediaPost.data);
 const deletedMediaRead=await request(String(mediaRow.url),{cookie:aliceCookie});
 expect(deletedMediaRead.response.status===404,"Deleted post media remained accessible",{status:deletedMediaRead.response.status,data:deletedMediaRead.data});

 const orphanAuth=await request("/api/media/upload-request",{
  method:"POST",
  cookie:aliceCookie,
  body:{type:"image/jpeg",size:4,name:"orphan.jpg"}
 });
 expect(orphanAuth.response.status===200&&orphanAuth.data?.uploadToken,"Orphan upload authorization failed",orphanAuth.data);
 const orphanTarget=String(orphanAuth.data.uploadUrl).startsWith("http")
  ?String(orphanAuth.data.uploadUrl)
  :base+String(orphanAuth.data.uploadUrl);
 const orphanPut=await fetch(orphanTarget,{
  method:"PUT",
  headers:{...(orphanAuth.data.headers??{}),cookie:aliceCookie},
  body:Buffer.from([5,6,7,8]),
  redirect:"manual"
 });
 expect(orphanPut.status===204||orphanPut.ok,"Orphan media upload target failed",{status:orphanPut.status});
 const orphanComplete=await request("/api/media/complete",{
  method:"POST",
  cookie:aliceCookie,
  body:{uploadToken:orphanAuth.data.uploadToken}
 });
 expect(orphanComplete.response.status===200&&orphanComplete.data?.media?.receipt,"Orphan media completion failed",orphanComplete.data);
 const orphanDiscard=await request("/api/media/discard",{
  method:"DELETE",
  cookie:aliceCookie,
  body:{token:orphanComplete.data.media.receipt}
 });
 expect(orphanDiscard.response.status===200&&orphanDiscard.data?.deleted===true,"Abandoned media cleanup failed",orphanDiscard.data);

 console.log("7. private follow request and approval");
 const followRequest=await request("/api/follows/"+bob.username,{method:"POST",cookie:aliceCookie});
 expect(followRequest.response.status===202&&followRequest.data?.requested===true,"Private follow should create a request",followRequest.data);

 const requests=await request("/api/follow-requests",{cookie:bobCookie});
 const pending=requests.data?.requests?.find(x=>x.requester?.username===alice.username);
 expect(requests.response.status===200&&Boolean(pending),"Pending follow request not visible to target",requests.data);

 const approve=await request("/api/follow-requests",{method:"PATCH",cookie:bobCookie,body:{id:pending.id,decision:"APPROVE"}});
 expect(approve.response.status===200&&approve.data?.approved===true,"Follow approval failed",approve.data);

 console.log("8. post visibility, comments, likes and saves");
 const followersPost=await db.post.create({data:{authorId:bob.id,caption:"Followers only smoke post",visibility:"FOLLOWERS"}});

 for(const [path,method,body] of [
  [`/api/posts/${followersPost.id}/like`,"POST",undefined],
  [`/api/posts/${followersPost.id}/save`,"POST",undefined],
  [`/api/posts/${followersPost.id}/comments`,"POST",{body:"Should not be allowed"}]
 ]){
  const denied=await request(path,{method,cookie:charlieCookie,body});
  expect(denied.response.status===404,"Non-follower accessed followers-only post",{path,status:denied.response.status,data:denied.data});
 }

 const like=await request(`/api/posts/${followersPost.id}/like`,{method:"POST",cookie:aliceCookie});
 expect(like.response.status===200&&like.data?.liked===true,"Follower could not like followers-only post",like.data);
 const save=await request(`/api/posts/${followersPost.id}/save`,{method:"POST",cookie:aliceCookie});
 expect(save.response.status===200&&save.data?.saved===true,"Follower could not save followers-only post",save.data);
 const comment=await request(`/api/posts/${followersPost.id}/comments`,{method:"POST",cookie:aliceCookie,body:{body:"Follower comment"}});
 expect(comment.response.status===201,"Follower comment failed",comment.data);

 console.log("9. direct messaging and block enforcement");
 const conversation=await request("/api/messages/conversations",{method:"POST",cookie:aliceCookie,body:{username:bob.username}});
 expect([200,201].includes(conversation.response.status)&&conversation.data?.conversationId,"Conversation creation failed",conversation.data);
 const conversationId=conversation.data.conversationId;

 const sent=await request("/api/messages/"+conversationId,{method:"POST",cookie:aliceCookie,body:{body:"Smoke message"}});
 expect(sent.response.status===201,"Message send failed",sent.data);
 const read=await request("/api/messages/"+conversationId,{cookie:bobCookie});
 expect(read.response.status===200&&read.data?.messages?.some(x=>x.body==="Smoke message"),"Message read failed",read.data);

 console.log("10. age-gated gifts and block-safe gifting");
 await db.user.update({where:{id:alice.id},data:{dateOfBirth:new Date("1990-01-01T00:00:00.000Z")}});
 await db.coinWallet.create({data:{userId:alice.id,balanceCoins:500n}});
 const gift=await request("/api/profile-gifts/"+bob.username,{method:"POST",cookie:aliceCookie,body:{giftKey:"star"}});
 expect(gift.response.status===200,"Eligible profile gift failed",gift.data);

 const underageGift=await request("/api/profile-gifts/"+bob.username,{method:"POST",cookie:charlieCookie,body:{giftKey:"star"}});
 expect(underageGift.response.status===403,"Gift without verified adult age should be rejected",underageGift.data);

 const block=await request("/api/safety/block/"+alice.username,{method:"POST",cookie:bobCookie});
 expect(block.response.status===200&&block.data?.blocked===true,"Block failed",block.data);

 const blockedFollow=await request("/api/follows/"+bob.username,{method:"POST",cookie:aliceCookie});
 expect(blockedFollow.response.status===403,"Blocked follow was not rejected",blockedFollow.data);
 const blockedMessage=await request("/api/messages/"+conversationId,{method:"POST",cookie:aliceCookie,body:{body:"Should fail"}});
 expect(blockedMessage.response.status===403,"Blocked message was not rejected",blockedMessage.data);
 const blockedGift=await request("/api/profile-gifts/"+bob.username,{method:"POST",cookie:aliceCookie,body:{giftKey:"star"}});
 expect(blockedGift.response.status===403,"Blocked gift was not rejected",blockedGift.data);
 const blockedProfile=await request("/api/profiles/"+bob.username,{cookie:aliceCookie});
 expect(blockedProfile.response.status===404,"Blocked profile remained visible",blockedProfile.data);

 const notificationList=await request("/api/notifications",{cookie:bobCookie});
 expect(notificationList.response.status===200,"Notification list failed",notificationList.data);
 expect(!notificationList.data?.notifications?.some(x=>x.actor?.username===alice.username),"Blocked actor remained in notification list",notificationList.data);

 console.log("11. host eligibility, Live lifecycle and room bans");
 const followerUsers=Array.from({length:2500},(_,i)=>({
  id:`smoke-follower-${suffix}-${i}`,
  email:`smoke-follower-${suffix}-${i}@example.test`,
  username:(`sf${suffix}${i}`).slice(0,30),
  displayName:"Smoke Follower "+i,
  passwordHash:"unused",
  emailVerifiedAt:new Date()
 }));
 await db.user.createMany({data:followerUsers});
 await db.follow.createMany({data:followerUsers.map(u=>({followerId:u.id,followingId:host.id}))});
 await db.viewingProgress.upsert({
  where:{userId:host.id},
  create:{userId:host.id,verifiedSeconds:BigInt(3000*3600)},
  update:{verifiedSeconds:BigInt(3000*3600)}
 });
 await db.hostApplication.upsert({
  where:{userId:host.id},
  create:{userId:host.id,status:"APPROVED",agreementAcceptedAt:new Date(),reviewedAt:new Date()},
  update:{status:"APPROVED",agreementAcceptedAt:new Date(),reviewedAt:new Date()}
 });

 const roomCreate=await request("/api/porch",{method:"POST",cookie:hostCookie,body:{title:"Runtime Smoke Live",description:"Automated runtime validation",visibility:"PUBLIC",roomType:"VIDEO",stageSize:5}});
 expect(roomCreate.response.status===201&&roomCreate.data?.room?.slug,"Host could not create room",roomCreate.data);
 const slug=roomCreate.data.room.slug;

 const start=await request("/api/porch/"+slug+"/lifecycle",{method:"POST",cookie:hostCookie,body:{action:"START"}});
 expect(start.response.status===200&&start.data?.status==="LIVE","Live start failed",start.data);

 const discover=await request("/api/porch");
 expect(discover.response.status===200&&discover.data?.rooms?.some(x=>x.slug===slug),"Public Live was not discoverable",discover.data);

 const join=await request("/api/porch/"+slug+"/join",{method:"POST",cookie:charlieCookie});
 expect(join.response.status===200&&join.data?.joined===true,"Viewer could not join public Live",join.data);

 const provider=await request("/api/live/provider",{cookie:charlieCookie});
 expect(provider.response.status===200&&provider.data?.provider==="livekit"&&provider.data?.ready===true,"LiveKit provider was not ready",provider.data);

 const hostLiveToken=await request("/api/porch/"+slug+"/livekit-token",{method:"POST",cookie:hostCookie});
 expect(hostLiveToken.response.status===200&&hostLiveToken.data?.canPublish===true&&hostLiveToken.data?.canSubscribe===true,"Host LiveKit token did not receive publish permission",hostLiveToken.data);

 const listenerToken=await request("/api/porch/"+slug+"/livekit-token",{method:"POST",cookie:charlieCookie});
 expect(listenerToken.response.status===200&&listenerToken.data?.canPublish===false&&listenerToken.data?.canSubscribe===true,"Listener LiveKit token received incorrect permissions",listenerToken.data);

 const stageRequest=await request("/api/porch/"+slug+"/stage",{method:"POST",cookie:charlieCookie});
 expect(stageRequest.response.status===201,"Listener could not request stage",stageRequest.data);

 const stageApprove=await request("/api/porch/"+slug+"/stage",{method:"PATCH",cookie:hostCookie,body:{userId:charlie.id,action:"APPROVE"}});
 expect(stageApprove.response.status===200&&stageApprove.data?.role==="SPEAKER","Host could not approve stage request",stageApprove.data);

 const speakerToken=await request("/api/porch/"+slug+"/livekit-token",{method:"POST",cookie:charlieCookie});
 expect(speakerToken.response.status===200&&speakerToken.data?.canPublish===true,"Approved speaker did not receive LiveKit publish permission",speakerToken.data);

 const stageRemove=await request("/api/porch/"+slug+"/stage",{method:"PATCH",cookie:hostCookie,body:{userId:charlie.id,action:"REMOVE"}});
 expect(stageRemove.response.status===200&&stageRemove.data?.role==="LISTENER","Host could not remove speaker from stage",stageRemove.data);

 const listenerTokenAgain=await request("/api/porch/"+slug+"/livekit-token",{method:"POST",cookie:charlieCookie});
 expect(listenerTokenAgain.response.status===200&&listenerTokenAgain.data?.canPublish===false,"Removed speaker retained LiveKit publish permission",listenerTokenAgain.data);

 const ban=await request("/api/porch/"+slug+"/moderate",{method:"POST",cookie:hostCookie,body:{userId:charlie.id,action:"BAN"}});
 expect(ban.response.status===200&&ban.data?.banned===true,"Host ban failed",ban.data);

 const rejoinDenied=await request("/api/porch/"+slug+"/join",{method:"POST",cookie:charlieCookie});
 expect(rejoinDenied.response.status===403,"Banned viewer was able to rejoin",rejoinDenied.data);

 const bannedToken=await request("/api/porch/"+slug+"/livekit-token",{method:"POST",cookie:charlieCookie});
 expect(bannedToken.response.status===403,"Banned viewer received a new LiveKit token",bannedToken.data);

 const bans=await request("/api/porch/"+slug+"/bans",{cookie:hostCookie});
 expect(bans.response.status===200&&bans.data?.banned?.some(x=>x.userId===charlie.id),"Host ban list missing banned viewer",bans.data);

 const unban=await request("/api/porch/"+slug+"/bans",{method:"DELETE",cookie:hostCookie,body:{userId:charlie.id}});
 expect(unban.response.status===200&&unban.data?.ok===true,"Unban failed",unban.data);

 const rejoin=await request("/api/porch/"+slug+"/join",{method:"POST",cookie:charlieCookie});
 expect(rejoin.response.status===200&&rejoin.data?.joined===true,"Unbanned viewer could not rejoin",rejoin.data);

 const end=await request("/api/porch/"+slug+"/lifecycle",{method:"POST",cookie:hostCookie,body:{action:"END"}});
 expect(end.response.status===200&&end.data?.status==="ENDED","Live end failed",end.data);
 const replay=await db.liveReplay.findUnique({where:{roomId:roomCreate.data.room.id}});
 expect(Boolean(replay),"Ending Live did not create replay metadata.");

 console.log("\nOUTSiiDE runtime smoke test passed.");
}

try{
 await main();
}catch(error){
 if(!process.exitCode)process.exitCode=1;
 console.error(error);
}finally{
 await db.$disconnect();
}
