import {randomInt} from "node:crypto";
import {SAFE_WINNER_WHEEL} from "@/lib/battleRewardCatalog";

export function spinWinnerWheel(){
 const total=SAFE_WINNER_WHEEL.reduce((sum,item)=>sum+item.weight,0);
 let roll=randomInt(total);
 for(const item of SAFE_WINNER_WHEEL){
  if(roll<item.weight)return item;
  roll-=item.weight;
 }
 return SAFE_WINNER_WHEEL[0];
}
