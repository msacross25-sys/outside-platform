export const CREATOR_LEVELS=[
 {key:"CREATOR",name:"Creator",followers:500,hours:1000,creatorShare:30},
 {key:"CREATOR_PLUS",name:"Creator Plus",followers:1000,hours:1500,creatorShare:30},
 {key:"HOST_ELIGIBLE",name:"Host Eligible",followers:2500,hours:3000,creatorShare:30},
 {key:"ESTABLISHED_HOST",name:"Established Host",followers:5000,hours:4000,creatorShare:40},
 {key:"ADVANCED_HOST",name:"Advanced Host",followers:10000,hours:5000,creatorShare:40},
 {key:"ADVANCED_PLUS",name:"Advanced+",followers:25000,hours:7500,creatorShare:40}
] as const;
export function verifiedHours(seconds:bigint|number|string){return Number(BigInt(seconds))/3600}
export function levelFor(followers:number,hours:number,hostApproved=false){
 const earned=[...CREATOR_LEVELS].reverse().find(x=>followers>=x.followers&&hours>=x.hours&&(!["ESTABLISHED_HOST","ADVANCED_HOST","ADVANCED_PLUS"].includes(x.key)||hostApproved))??null;
 if(hostApproved&&followers>=2500&&hours>=3000&&earned?.key==="HOST_ELIGIBLE")return {...earned,key:"HOST" as const,name:"Host"};
 return earned;
}
export function nextLevel(followers:number,hours:number){return CREATOR_LEVELS.find(x=>followers<x.followers||hours<x.hours)??null}
export function creatorShareFor(followers:number,hours:number,hostApproved=false){return levelFor(followers,hours,hostApproved)?.creatorShare??30}
