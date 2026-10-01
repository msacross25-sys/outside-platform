import {NextResponse} from "next/server";
import {db} from "@/lib/db";

export async function GET(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const guild=await db.battleGuild.findUnique({
  where:{slug},
  include:{
   owner:{select:{username:true,displayName:true}},
   members:{
    orderBy:{joinedAt:"asc"},
    include:{user:{select:{username:true,displayName:true,avatarUrl:true,battleProfile:{select:{rankTitle:true,rankingPoints:true,wins:true}}}}}
   },
   territories:true
  }
 });
 if(!guild)return NextResponse.json({error:"Guild not found."},{status:404});
 return NextResponse.json({
  guild:{
   ...guild,
   members:guild.members.map(member=>({
    ...member,
    user:{
     ...member.user,
     battleProfile:member.user.battleProfile?{
      ...member.user.battleProfile,
      rankingPoints:member.user.battleProfile.rankingPoints.toString()
     }:null
    }
   }))
  }
 });
}
