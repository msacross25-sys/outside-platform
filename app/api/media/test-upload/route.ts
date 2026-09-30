import {NextResponse} from "next/server";
import {currentUser} from "@/lib/session";

export async function PUT(){
 if(process.env.MEDIA_STORAGE_MODE!=="test"||process.env.ALLOW_TEST_MEDIA_STORAGE!=="true"){
  return NextResponse.json({error:"Not found."},{status:404});
 }
 const user=await currentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 return new NextResponse(null,{status:204});
}
