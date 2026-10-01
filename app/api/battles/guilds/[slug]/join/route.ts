import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

export async function POST(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [guild,host,current]=await Promise.all([
  db.battleGuild.findUnique({where:{slug}}),
  db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}}),
  db.battleGuildMember.findUnique({where:{userId:me.id}})
 ]);
 if(!guild)return NextResponse.json({error:"Guild not found."},{status:404});
 if(host?.status!=="APPROVED")return NextResponse.json({error:"Approved Host status is required to join a battle guild."},{status:403});
 if(current){
  if(current.guildId===guild.id)return NextResponse.json({ok:true,alreadyMember:true});
  return NextResponse.json({error:"You already belong to another battle guild."},{status:409});
 }

 const membership=await db.battleGuildMember.create({data:{guildId:guild.id,userId:me.id}});
 return NextResponse.json({membership},{status:201});
}

export async function DELETE(_:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 const guild=await db.battleGuild.findUnique({where:{slug}});
 if(!guild)return NextResponse.json({error:"Guild not found."},{status:404});
 if(guild.ownerId===me.id)return NextResponse.json({error:"Guild owner must transfer or dissolve the guild before leaving."},{status:409});
 await db.battleGuildMember.deleteMany({where:{guildId:guild.id,userId:me.id}});
 return NextResponse.json({ok:true});
}
