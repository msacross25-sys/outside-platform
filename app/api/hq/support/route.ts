import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {canSupport,currentStaff} from "@/lib/hq";

export async function GET(){
 const auth=await currentStaff();
 if(!auth||!canSupport(auth.staff.role))return NextResponse.json({error:"Support staff access required."},{status:403});

 const tickets=await db.supportTicket.findMany({
  where:{status:{in:["OPEN","RESPONDED"]}},
  orderBy:[{priority:"desc"},{createdAt:"asc"}],
  take:100,
  include:{user:{select:{id:true,username:true,displayName:true,status:true,battleProfile:{select:{vipUntil:true}},battlePass:{select:{premiumActive:true}}}}}
 });
 return NextResponse.json({tickets});
}
