import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({ok:true,service:"outside-web",time:new Date().toISOString()});}
