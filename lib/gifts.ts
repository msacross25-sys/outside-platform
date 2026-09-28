export const COINS_PER_DOLLAR=65;
export const CREATOR_SHARE_PERCENT=30;
export const PLATFORM_SHARE_PERCENT=70;
export const MINIMUM_PAYOUT_CENTS=6500;

export const GIFTS=[
 {key:"star",name:"Star",coins:65,valueCents:100,premium:false},
 {key:"rose",name:"Rose",coins:130,valueCents:200,premium:false},
 {key:"coffee",name:"Coffee",coins:325,valueCents:500,premium:false},
 {key:"cookie",name:"Cookie",coins:650,valueCents:1000,premium:false},
 {key:"flower",name:"Flower",coins:1625,valueCents:2500,premium:false},
 {key:"balloon",name:"Balloon",coins:3250,valueCents:5000,premium:false},
 {key:"teddy",name:"Teddy",coins:4875,valueCents:7500,premium:false},
 {key:"pizza",name:"Pizza",coins:6500,valueCents:10000,premium:false},
 {key:"campfire",name:"Campfire",coins:9750,valueCents:15000,premium:false},
 {key:"tent",name:"Tent",coins:16250,valueCents:25000,premium:false},
 {key:"compass",name:"Compass",coins:32500,valueCents:50000,premium:true},
 {key:"wave",name:"Wave",coins:48750,valueCents:75000,premium:true},
 {key:"sunset",name:"Sunset",coins:65000,valueCents:100000,premium:true},
 {key:"mountain",name:"Mountain",coins:162500,valueCents:250000,premium:true},
 {key:"lightning",name:"Lightning",coins:325000,valueCents:500000,premium:true},
 {key:"rocket",name:"Rocket",coins:487500,valueCents:750000,premium:true},
 {key:"rainbow",name:"Rainbow",coins:650000,valueCents:1000000,premium:true},
 {key:"diamond",name:"Diamond",coins:1625000,valueCents:2500000,premium:true},
 {key:"crown",name:"Crown",coins:3250000,valueCents:5000000,premium:true},
 {key:"outsiide-galaxy",name:"OUTSiiDE Galaxy",coins:6500000,valueCents:10000000,premium:true}
] as const;

export function giftByKey(key:string){return GIFTS.find(g=>g.key===key)}
export function splitGift(valueCents:number){return {creatorShareCents:Math.floor(valueCents*CREATOR_SHARE_PERCENT/100),platformShareCents:valueCents-Math.floor(valueCents*CREATOR_SHARE_PERCENT/100)}}
