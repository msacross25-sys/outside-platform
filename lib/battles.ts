export const BATTLE_DURATIONS=[5,10,20] as const;export const MAX_BATTLE_TEAM_SIZE=5;
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
export function validBattleDuration(n:number){return (BATTLE_DURATIONS as readonly number[]).includes(n)}