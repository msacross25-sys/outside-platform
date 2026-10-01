import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

const TITLES={
 BATTLE_KING:{name:"Battle King",icon:"👑"},
 QUEEN_OF_BATTLES:{name:"Queen of Battles",icon:"👑"}
} as const;

export async function PATCH(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const profile=await db.battleProfile.findUnique({where:{userId:me.id}});
 if(!profile||profile.wins<25)return NextResponse.json({error:"Royal battle titles unlock after 25 total wins."},{status:409});

 const body=await request.json().catch(()=>null);
 const key=String(body?.title??"");
 if(!(key in TITLES))return NextResponse.json({error:"Choose Battle King or Queen of Battles."},{status:400});
 const selected=TITLES[key as keyof typeof TITLES];

 await db.$transaction([
  db.battleProfile.update({where:{userId:me.id},data:{selectedTitle:key}}),
  db.userBadge.upsert({
   where:{userId_key:{userId:me.id,key}},
   create:{userId:me.id,key,name:selected.name,icon:selected.icon,featured:true},
   update:{name:selected.name,icon:selected.icon,featured:true}
  })
 ]);

 return NextResponse.json({title:key,name:selected.name});
}

export async function DELETE(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});
 await db.battleProfile.updateMany({where:{userId:me.id},data:{selectedTitle:null}});
 return NextResponse.json({ok:true});
}
