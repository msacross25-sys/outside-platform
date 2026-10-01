import {randomInt} from "node:crypto";

export const BATTLE_PASS_REWARDS=[
 {level:2,free:"100 Battle Tokens",premium:"Victory profile frame"},
 {level:5,free:"50 Gems",premium:"Exclusive battle gift animation"},
 {level:10,free:"250 Battle Tokens",premium:"VIP name effect"},
 {level:20,free:"100 Gems",premium:"Advanced battle analytics"},
 {level:30,free:"500 Battle Tokens",premium:"Legend entrance effect"},
 {level:50,free:"Season badge",premium:"Premium season frame"}
] as const;

export const SAFE_WINNER_WHEEL=[
 {key:"TOKENS_100",label:"100 Battle Tokens",weight:3500,currency:"BATTLE_TOKEN",amount:100},
 {key:"GEMS_50",label:"50 Gems",weight:2500,currency:"GEM",amount:50},
 {key:"PASS_XP_500",label:"500 Battle Pass XP",weight:1800,currency:"BATTLE_PASS_XP",amount:500},
 {key:"BONUS_COINS_130",label:"130 Bonus Coins",weight:1200,currency:"BONUS_COIN",amount:130},
 {key:"VICTORY_FRAME",label:"Victory Profile Frame",weight:700,currency:"COSMETIC_VICTORY_FRAME",amount:1},
 {key:"DOUBLE_POINT_CARD",label:"Double-Point Battle Card",weight:300,currency:"CARD_DOUBLE_POINT",amount:1}
] as const;

export function spinWinnerWheel(){
 const total=SAFE_WINNER_WHEEL.reduce((sum,item)=>sum+item.weight,0);
 let roll=randomInt(total);
 for(const item of SAFE_WINNER_WHEEL){
  if(roll<item.weight)return item;
  roll-=item.weight;
 }
 return SAFE_WINNER_WHEEL[0];
}

export function battlePassLevel(freeXp:number){
 return Math.max(1,Math.min(100,1+Math.floor(freeXp/1000)));
}
