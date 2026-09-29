import {PrismaClient} from "@prisma/client";

const db=new PrismaClient();
const base=process.env.SMOKE_BASE_URL??"http://127.0.0.1:3000";
const suffix=Date.now().toString(36).slice(-7);
const password="RuntimeSmoke123!";

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

async function signup(username,displayName){
 const email=username+"@smoke.test";
 const r=await request("/api/users",{method:"POST",body:{email,username,displayName,password}});
 expect(r.response.status===201,"Signup failed",{status:r.response.status,data:r.data});
 return {id:r.data.user.id,username,email,displayName};
}

async function login(username){
 const r=await request("/api/auth/login",{method:"POST",body:{login:username,password}});
 expect(r.response.status===200,"Login failed",{username,status:r.response.status,data:r.data});
 return sessionCookie(r.setCookie);
}

async function main(){
 console.log("1. health");
 const health=await request("/api/health");
 expect(health.response.status===200&&health.data?.ok===true,"Health endpoint failed",health);

 const alice=await signup("smokea"+suffix,"Smoke Alice");
 const bob=await signup("smokeb"+suffix,"Smoke Bob");
 const charlie=await signup("smokec"+suffix,"Smoke Charlie");
 const host=await signup("smokeh"+suffix,"Smoke Host");

 const dup=await request("/api/users",{method:"POST",body:{email:alice.email,username:alice.username,displayName:"Duplicate",password}});
 expect(dup.response.status===409,"Duplicate signup should be rejected",dup.data);

 const badLogin=await request("/api/auth/login",{method:"POST",body:{login:alice.username,password:"wrong-password"}});
 expect(badLogin.response.status===401,"Bad password should be rejected",badLogin.data);

 const [aliceCookie,bobCookie,charlieCookie,hostCookie]=await Promise.all([
  login(alice.username),login(bob.username),login(charlie.username),login(host.username)
 ]);

 console.log("2. session and profile privacy");
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

 console.log("3. private follow request and approval");
 const followRequest=await request("/api/follows/"+bob.username,{method:"POST",cookie:aliceCookie});
 expect(followRequest.response.status===202&&followRequest.data?.requested===true,"Private follow should create a request",followRequest.data);

 const requests=await request("/api/follow-requests",{cookie:bobCookie});
 const pending=requests.data?.requests?.find(x=>x.requester?.username===alice.username);
 expect(requests.response.status===200&&Boolean(pending),"Pending follow request not visible to target",requests.data);

 const approve=await request("/api/follow-requests",{method:"PATCH",cookie:bobCookie,body:{id:pending.id,decision:"APPROVE"}});
 expect(approve.response.status===200&&approve.data?.approved===true,"Follow approval failed",approve.data);

 console.log("4. post visibility, comments, likes and saves");
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

 console.log("5. direct messaging and block enforcement");
 const conversation=await request("/api/messages/conversations",{method:"POST",cookie:aliceCookie,body:{username:bob.username}});
 expect([200,201].includes(conversation.response.status)&&conversation.data?.conversationId,"Conversation creation failed",conversation.data);
 const conversationId=conversation.data.conversationId;

 const sent=await request("/api/messages/"+conversationId,{method:"POST",cookie:aliceCookie,body:{body:"Smoke message"}});
 expect(sent.response.status===201,"Message send failed",sent.data);
 const read=await request("/api/messages/"+conversationId,{cookie:bobCookie});
 expect(read.response.status===200&&read.data?.messages?.some(x=>x.body==="Smoke message"),"Message read failed",read.data);

 console.log("6. age-gated gifts and block-safe gifting");
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

 console.log("7. host eligibility, Live lifecycle and room bans");
 const followerUsers=Array.from({length:2500},(_,i)=>({
  id:`smoke-follower-${suffix}-${i}`,
  email:`smoke-follower-${suffix}-${i}@example.test`,
  username:(`sf${suffix}${i}`).slice(0,30),
  displayName:"Smoke Follower "+i,
  passwordHash:"unused"
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

 const ban=await request("/api/porch/"+slug+"/moderate",{method:"POST",cookie:hostCookie,body:{userId:charlie.id,action:"BAN"}});
 expect(ban.response.status===200&&ban.data?.banned===true,"Host ban failed",ban.data);

 const rejoinDenied=await request("/api/porch/"+slug+"/join",{method:"POST",cookie:charlieCookie});
 expect(rejoinDenied.response.status===403,"Banned viewer was able to rejoin",rejoinDenied.data);

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
