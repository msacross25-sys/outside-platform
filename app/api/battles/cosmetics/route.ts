import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

type Slot="FRAME"|"NAME"|"ENTRANCE"|"VICTORY"|"EMOJI"|"GIFT";

const LABELS:Record<string,string>={
 "victory-frame":"Victory Profile Frame",
 "battle-victory-frame":"Battle Victory Frame",
 "battle-streak-10-frame":"10-Win Streak Frame",
 "battle-premium-season-frame":"Premium Season Frame",
 "battle-vip-name":"VIP Name Effect",
 "battle-legend-entrance":"Legend Entrance Effect",
 "battle-victory-animation":"Battle Victory Animation",
 "battle-special-emoji-pack":"Battle Special Emoji Pack",
 "battle-gift-animation":"Exclusive Battle Gift Animation"
};

function slotFor(effectKey:string):Slot|null{
 if(effectKey.includes("frame"))return "FRAME";
 if(effectKey.includes("vip-name")||effectKey.includes("name-effect"))return "NAME";
 if(effectKey.includes("entrance"))return "ENTRANCE";
 if(effectKey.includes("victory-animation"))return "VICTORY";
 if(effectKey.includes("emoji"))return "EMOJI";
 if(effectKey.includes("gift-animation"))return "GIFT";
 return null;
}

function fieldFor(slot:Slot){
 if(slot==="FRAME")return "frameKey" as const;
 if(slot==="NAME")return "nameEffectKey" as const;
 if(slot==="ENTRANCE")return "entranceKey" as const;
 if(slot==="VICTORY")return "victoryKey" as const;
 if(slot==="EMOJI")return "emojiKey" as const;
 return "giftEffectKey" as const;
}

export async function GET(){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const [cosmetics,selection]=await Promise.all([
  db.hostCosmetic.findMany({where:{userId:me.id},orderBy:{unlockedAt:"desc"}}),
  db.battleCosmeticSelection.findUnique({where:{userId:me.id}})
 ]);

 const unlocked=cosmetics.flatMap(item=>{
  const slot=slotFor(item.effectKey);
  if(!slot)return [];
  return [{
   effectKey:item.effectKey,
   slot,
   label:LABELS[item.effectKey]??item.effectKey.replaceAll("-"," "),
   source:item.source,
   unlockedAt:item.unlockedAt
  }];
 });

 return NextResponse.json({unlocked,selection});
}

export async function PATCH(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const effectKey=String(body?.effectKey??"").trim().slice(0,100);
 if(!effectKey)return NextResponse.json({error:"Cosmetic effect is required."},{status:400});

 const slot=slotFor(effectKey);
 if(!slot)return NextResponse.json({error:"That cosmetic cannot be equipped in a battle slot."},{status:400});

 const unlocked=await db.hostCosmetic.findUnique({
  where:{userId_effectKey:{userId:me.id,effectKey}}
 });
 if(!unlocked)return NextResponse.json({error:"That cosmetic has not been unlocked."},{status:403});

 const field=fieldFor(slot);
 const selection=await db.battleCosmeticSelection.upsert({
  where:{userId:me.id},
  create:{userId:me.id,[field]:effectKey},
  update:{[field]:effectKey}
 });

 return NextResponse.json({selection,slot,effectKey});
}

export async function DELETE(request:Request){
 const me=await currentUser();
 if(!me)return NextResponse.json({error:"Sign in required."},{status:401});

 const body=await request.json().catch(()=>null);
 const slot=String(body?.slot??"").toUpperCase() as Slot;
 if(!["FRAME","NAME","ENTRANCE","VICTORY","EMOJI","GIFT"].includes(slot)){
  return NextResponse.json({error:"Choose a valid cosmetic slot."},{status:400});
 }

 const field=fieldFor(slot);
 const existing=await db.battleCosmeticSelection.findUnique({where:{userId:me.id}});
 if(!existing)return NextResponse.json({ok:true,selection:null});

 const selection=await db.battleCosmeticSelection.update({
  where:{userId:me.id},
  data:{[field]:null}
 });
 return NextResponse.json({ok:true,selection});
}
