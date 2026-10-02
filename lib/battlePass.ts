export function battleSeasonKey(date=new Date()){
 const quarter=Math.floor(date.getUTCMonth()/3)+1;
 return date.getUTCFullYear()+"-Q"+quarter;
}

export function battlePassPriceCents(){
 const configured=Number(process.env.BATTLE_PASS_PRICE_CENTS??999);
 if(!Number.isInteger(configured)||configured<99||configured>100000)return 999;
 return configured;
}
