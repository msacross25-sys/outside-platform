export const BATTLE_DURATIONS=[5,10,20] as const;
export const MAX_BATTLE_TEAM_SIZE=5;
export const LAST_MINUTE_SURGE_SECONDS=30;
export const LAST_MINUTE_SURGE_MULTIPLIER=2;

export const BATTLE_CREATOR_SHARE_PERCENT=50;
export const BATTLE_PLATFORM_SHARE_PERCENT=35;
export const BATTLE_REWARD_POOL_PERCENT=10;
export const BATTLE_REFERRAL_SHARE_PERCENT=5;
export const BATTLE_WINNER_POINTS_BONUS_PERCENT=10;
export const BATTLE_WINNER_FEATURE_HOURS=24;
export const BATTLE_REWARD_POOL_WINNER_PERCENT=50;
export const BATTLE_REWARD_POOL_WEEKLY_PERCENT=30;
export const BATTLE_REWARD_POOL_SEASON_PERCENT=20;

export const BATTLE_MODES=[
 {key:"ONE_V_ONE",name:"1 vs 1"},
 {key:"TEAM_V_TEAM",name:"Team vs Team"},
 {key:"TOURNAMENT",name:"Tournament"}
] as const;

export const BATTLE_THEMES=[
 {key:"campfire-clash",name:"Campfire Clash",icon:"🔥"},
 {key:"mountain-rush",name:"Mountain Rush",icon:"⛰️"},
 {key:"galaxy-showdown",name:"Galaxy Showdown",icon:"🌌"},
 {key:"wave-war",name:"Wave War",icon:"🌊"},
 {key:"crown-vs-crown",name:"Crown vs Crown",icon:"👑"},
 {key:"neon-night",name:"Neon Night",icon:"✨"},
 {key:"wild-trail",name:"Wild Trail",icon:"🧭"},
 {key:"porch-takeover",name:"Porch Takeover",icon:"🏕️"}
] as const;

export const BATTLE_RANKS=[
 {key:"BRONZE",name:"Bronze",minPoints:0},
 {key:"SILVER",name:"Silver",minPoints:10_000},
 {key:"GOLD",name:"Gold",minPoints:50_000},
 {key:"PLATINUM",name:"Platinum",minPoints:150_000},
 {key:"DIAMOND",name:"Diamond",minPoints:500_000},
 {key:"LEGEND",name:"Legend",minPoints:1_500_000},
 {key:"IMMORTAL",name:"Immortal",minPoints:5_000_000}
] as const;

export const WIN_STREAK_REWARDS=[
 {wins:5,key:"STREAK_5",name:"5 Win Streak",reward:"Bonus coins"},
 {wins:10,key:"STREAK_10",name:"10 Win Streak",reward:"Profile frame"},
 {wins:25,key:"STREAK_25",name:"25 Win Streak",reward:"VIP month"},
 {wins:50,key:"STREAK_50",name:"50 Win Streak",reward:"Legendary badge"},
 {wins:100,key:"HALL_OF_FAME",name:"Hall of Fame",reward:"Hall of Fame"}
] as const;

export function validBattleDuration(n:number){
 return (BATTLE_DURATIONS as readonly number[]).includes(n);
}

export function validBattleMode(mode:string){
 return BATTLE_MODES.some(item=>item.key===mode);
}

export function battleSplit(valueCents:number){
 const creatorShareCents=Math.floor(valueCents*BATTLE_CREATOR_SHARE_PERCENT/100);
 const platformShareCents=Math.floor(valueCents*BATTLE_PLATFORM_SHARE_PERCENT/100);
 const rewardPoolCents=Math.floor(valueCents*BATTLE_REWARD_POOL_PERCENT/100);
 const referralShareCents=valueCents-creatorShareCents-platformShareCents-rewardPoolCents;
 return {creatorShareCents,platformShareCents,rewardPoolCents,referralShareCents};
}

export function battleRankFor(points:number){
 return [...BATTLE_RANKS].reverse().find(rank=>points>=rank.minPoints)??BATTLE_RANKS[0];
}

export function surgeMultiplier(startedAt:Date|null,durationMinutes:number,now=new Date()){
 if(!startedAt)return 1;
 const end=startedAt.getTime()+durationMinutes*60_000;
 const remaining=Math.ceil((end-now.getTime())/1000);
 return remaining>0&&remaining<=LAST_MINUTE_SURGE_SECONDS?LAST_MINUTE_SURGE_MULTIPLIER:1;
}

export function winnerRankingPoints(basePoints:number,won:boolean){
 return won?Math.floor(basePoints*(100+BATTLE_WINNER_POINTS_BONUS_PERCENT)/100):basePoints;
}
