export const BATTLE_PASS_REWARDS=[
 {level:2,free:"100 Battle Tokens",premium:"Victory profile frame"},
 {level:5,free:"50 Gems",premium:"Exclusive battle gift animation"},
 {level:10,free:"250 Battle Tokens",premium:"VIP name effect"},
 {level:20,free:"100 Gems",premium:"Advanced battle analytics"},
 {level:30,free:"500 Battle Tokens",premium:"Legend entrance effect"},
 {level:50,free:"Season badge",premium:"Premium season frame"}
] as const;

export const SAFE_WINNER_WHEEL=[
 {key:"TOKENS_100",label:"100 Battle Tokens",weight:3200,currency:"BATTLE_TOKEN",amount:100},
 {key:"GEMS_50",label:"50 Gems",weight:2200,currency:"GEM",amount:50},
 {key:"DIAMONDS_25",label:"25 Diamonds",weight:900,currency:"DIAMOND",amount:25},
 {key:"PASS_XP_500",label:"500 Battle Pass XP",weight:1600,currency:"BATTLE_PASS_XP",amount:500},
 {key:"BONUS_COINS_130",label:"130 Bonus Coins",weight:1000,currency:"BONUS_COIN",amount:130},
 {key:"VICTORY_FRAME",label:"Victory Profile Frame",weight:500,currency:"COSMETIC_VICTORY_FRAME",amount:1},
 {key:"SPECIAL_EMOJI",label:"Battle Special Emoji Pack",weight:250,currency:"COSMETIC_SPECIAL_EMOJI",amount:1},
 {key:"DOUBLE_POINT_CARD",label:"Double-Point Battle Card",weight:220,currency:"CARD_DOUBLE_POINT",amount:1},
 {key:"SHIELD_CARD",label:"Win-Streak Shield Card",weight:80,currency:"CARD_SHIELD",amount:1},
 {key:"REMATCH_CARD",label:"Rematch Battle Card",weight:50,currency:"CARD_REMATCH",amount:1}
] as const;

export function battlePassLevel(freeXp:number){
 return Math.max(1,Math.min(100,1+Math.floor(freeXp/1000)));
}
