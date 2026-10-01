import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function PATCH(request:Request){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

 const displayName=String(body.displayName??"").trim().slice(0,60);
 const bio=String(body.bio??"").trim().slice(0,160);
 const privacy=body.privacy==="PRIVATE"?"PRIVATE":"PUBLIC";
 const allowed=["EVERYONE","FOLLOWERS","FRIENDS","NOBODY"];
 const messagePrivacy=allowed.includes(body.messagePrivacy)?body.messagePrivacy:"EVERYONE";
 const commentPrivacy=allowed.includes(body.commentPrivacy)?body.commentPrivacy:"EVERYONE";
 const mentionPrivacy=allowed.includes(body.mentionPrivacy)?body.mentionPrivacy:"EVERYONE";
 const liveInvitePrivacy=allowed.includes(body.liveInvitePrivacy)?body.liveInvitePrivacy:"EVERYONE";
 const regionRaw=String(body.regionCode??"").trim().toUpperCase();
 const regionCode=regionRaw&&/^[A-Z0-9-]{2,12}$/.test(regionRaw)?regionRaw:null;
 if(regionRaw&&!regionCode)return NextResponse.json({error:"Region code must use 2–12 letters, numbers, or hyphens."},{status:400});

 if(!displayName)return NextResponse.json({error:"Display name is required."},{status:400});

 const updated=await db.user.update({
  where:{id:user.id},
  data:{
   displayName,
   bio,
   regionCode,
   privacy,
   messagePrivacy,
   commentPrivacy,
   mentionPrivacy,
   liveInvitePrivacy,
   hideActivity:body.hideActivity===true,
   hideConnections:body.hideConnections===true
  },
  select:{
   id:true,
   username:true,
   displayName:true,
   bio:true,
   avatarUrl:true,
   profileVideoUrl:true,
   regionCode:true,
   privacy:true,
   messagePrivacy:true,
   commentPrivacy:true,
   mentionPrivacy:true,
   liveInvitePrivacy:true,
   hideActivity:true,
   hideConnections:true
  }
 });

 return NextResponse.json({user:updated});
}
