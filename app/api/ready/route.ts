import {NextResponse} from "next/server";
import {runtimeReadiness} from "@/lib/runtimeReadiness";

export const dynamic="force-dynamic";

export async function GET(){
 const result=await runtimeReadiness();
 return NextResponse.json({
  ready:result.ready,
  service:"outside-web",
  release:result.release,
  time:new Date().toISOString()
 },{status:result.ready?200:503});
}
