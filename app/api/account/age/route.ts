import {NextResponse} from "next/server";
import {currentAuth} from "@/lib/session";
import {db} from "@/lib/db";
import {isAtLeast18} from "@/lib/age";
import {recordAuthEvent} from "@/lib/authEvents";

export async function POST(request:Request){
 const auth=await currentAuth();
 if(!auth)return NextResponse.json({error:"Sign in required."},{status:401});

 if(auth.user.dateOfBirth){
  if(!isAtLeast18(auth.user.dateOfBirth)){
   return NextResponse.json({error:"OUTSiiDE is for adults age 18 and older."},{status:403});
  }
  return NextResponse.json({verified:true});
 }

 const body=await request.json().catch(()=>null);
 const raw=String(body?.dateOfBirth??"").trim();
 const dateOfBirth=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+"T00:00:00.000Z"):null;

 if(!dateOfBirth||Number.isNaN(dateOfBirth.getTime())){
  return NextResponse.json({error:"Enter a valid date of birth."},{status:400});
 }
 if(!isAtLeast18(dateOfBirth)){
  await recordAuthEvent(request,"AGE_VERIFICATION_REJECTED",auth.user.id);
  return NextResponse.json({error:"OUTSiiDE is for adults age 18 and older."},{status:403});
 }

 const updated=await db.user.updateMany({
  where:{id:auth.user.id,dateOfBirth:null},
  data:{dateOfBirth}
 });
 if(updated.count===0){
  const user=await db.user.findUnique({where:{id:auth.user.id},select:{dateOfBirth:true}});
  if(!user?.dateOfBirth||!isAtLeast18(user.dateOfBirth)){
   return NextResponse.json({error:"Age verification could not be completed."},{status:409});
  }
 }

 await recordAuthEvent(request,"AGE_VERIFIED_18_PLUS",auth.user.id);
 return NextResponse.json({verified:true});
}
