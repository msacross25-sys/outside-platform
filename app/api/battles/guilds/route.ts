import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);

export async function GET(){
 const guilds=await db.battleGuild.findMany({
  orderBy:{createdAt:"desc"},
  take:50,
  include:{
   owner:{select:{username:true,displayName:true}},
   _count:{select:{members:true,territories:true}}
  }
 });
 return NextResponse.json({guilds});
}

export async function POST(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [host,currentMembership,user]=await Promise.all([
  db.hostApplication.findUnique({where:{userId:me.id},select:{status:true}}),
  db.battleGuildMember.findUnique({where:{userId:me.id}}),
  db.user.findUnique({where:{id:me.id},select:{regionCode:true}})
 ]);
 if(host?.status!=="APPROVED")return NextResponse.json({error:"Approved Host status is required to create a guild."},{status:403});
 if(currentMembership)return NextResponse.json({error:"Leave your current guild before creating another."},{status:409});

 const body=await request.json().catch(()=>null);
 const name=String(body?.name??"").trim().slice(0,60);
 const description=String(body?.description??"").trim().slice(0,240);
 const requestedRegion=String(body?.regionCode??user?.regionCode??"").trim().toUpperCase();
 const regionCode=requestedRegion&&/^[A-Z0-9-]{2,12}$/.test(requestedRegion)?requestedRegion:null;
 if(name.length<3)return NextResponse.json({error:"Guild name must be at least 3 characters."},{status:400});
 if(requestedRegion&&!regionCode)return NextResponse.json({error:"Region code must use 2–12 letters, numbers, or hyphens."},{status:400});

 const slug=slugify(name)+"-"+Date.now().toString(36);
 const guild=await db.battleGuild.create({
  data:{
   slug,
   name,
   description:description||null,
   regionCode,
   ownerId:me.id,
   members:{create:{userId:me.id,role:"OWNER"}}
  },
  include:{members:true}
 });
 return NextResponse.json({guild},{status:201});
}
