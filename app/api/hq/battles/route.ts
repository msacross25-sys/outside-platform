import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";
import {financeStaff} from "@/lib/finance";
import {runBattleRollups} from "@/lib/battleRollups";

export async function GET(){
 const me=await currentUser();
 if(!me||!await financeStaff(me.id))return NextResponse.json({error:"Finance permission required."},{status:403});

 const [liveBattles,pendingEarnings,reserves,recentAwards]=await Promise.all([
  db.battle.count({where:{status:"LIVE"}}),
  db.battleEarning.aggregate({where:{status:"PENDING"},_sum:{amountCents:true},_count:true}),
  db.battleRewardLedger.groupBy({
   by:["kind"],
   where:{status:"RESERVED",kind:{in:["WEEKLY_JACKPOT_RESERVE","SEASON_CHAMPIONSHIP_RESERVE"]}},
   _sum:{amount:true}
  }),
  db.battleRewardLedger.findMany({
   where:{kind:{in:["WEEKLY_JACKPOT_AWARDED","SEASON_CHAMPIONSHIP_AWARDED","MONTHLY_BATTLE_ROLLUP"]}},
   orderBy:{createdAt:"desc"},
   take:12
  })
 ]);

 return NextResponse.json({
  liveBattles,
  pendingBattleEarningsCount:pendingEarnings._count,
  pendingBattleEarningsCents:pendingEarnings._sum.amountCents??0,
  reserves:Object.fromEntries(reserves.map(row=>[row.kind,row._sum.amount??0])),
  recentAwards
 });
}

export async function POST(){
 const me=await currentUser();
 if(!me||!await financeStaff(me.id))return NextResponse.json({error:"Finance permission required."},{status:403});
 const result=await runBattleRollups(new Date());
 return NextResponse.json({result});
}
