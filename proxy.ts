import {NextRequest,NextResponse} from "next/server";

const SAFE_METHODS=new Set(["GET","HEAD","OPTIONS"]);
const WEBHOOK_PREFIX="/api/webhooks/";

function expectedOrigin(request:NextRequest){
 const configured=process.env.NEXT_PUBLIC_APP_URL;
 if(configured){
  try{return new URL(configured).origin}catch{}
 }
 return request.nextUrl.origin;
}

export function proxy(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(!path.startsWith("/api/")||SAFE_METHODS.has(request.method)){
  return NextResponse.next();
 }

 if(path.startsWith(WEBHOOK_PREFIX)){
  return NextResponse.next();
 }

 const fetchSite=(request.headers.get("sec-fetch-site")??"").toLowerCase();
 if(fetchSite==="cross-site"){
  return NextResponse.json({error:"Cross-site request rejected."},{status:403});
 }

 const origin=request.headers.get("origin");
 if(origin&&origin!==expectedOrigin(request)){
  return NextResponse.json({error:"Request origin rejected."},{status:403});
 }

 const length=Number(request.headers.get("content-length")??0);
 if(Number.isFinite(length)&&length>1024*1024){
  return NextResponse.json({error:"Request body too large."},{status:413});
 }

 return NextResponse.next();
}

export const config={
 matcher:"/api/:path*"
};
