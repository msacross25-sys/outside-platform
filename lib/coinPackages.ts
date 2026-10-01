export type CoinPackage={
 key:string;
 label:string;
 amountCents:number;
 coins:bigint;
};

export const COIN_PACKAGES:CoinPackage[]=[
 {key:"starter",label:"Starter",amountCents:499,coins:500n},
 {key:"social",label:"Social",amountCents:999,coins:1050n},
 {key:"supporter",label:"Supporter",amountCents:1999,coins:2200n},
 {key:"creator",label:"Creator",amountCents:4999,coins:5750n},
 {key:"power",label:"Power",amountCents:9999,coins:12000n}
];

export function coinPackageByKey(key:string){
 return COIN_PACKAGES.find(item=>item.key===key)??null;
}
