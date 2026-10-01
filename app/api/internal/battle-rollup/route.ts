import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {runBattleRollups} from "@/lib/battleRollups";

function authorized(request:Request){
 const expected=process.env.BATTLE_CRON_SECRET??"";
 if(expected.length<32)return false;
 const header=request.headers.get("authorization")??"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return false;
 const a=Buffer.from(token);
 const b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(request:Request){
 if(!authorized(request))return NextResponse.json({error:"Unauthorized."},{status:401});
 const result=await runBattleRollups(new Date());
 return NextResponse.json({ok:true,result});
}
