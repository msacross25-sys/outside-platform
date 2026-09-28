import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentStaff } from "@/lib/hq";
export async function GET(){const access=await currentStaff();if(!access)return NextResponse.json({error:"Staff access required."},{status:403});const since=new Date(Date.now()-86400000);const [users,newUsers,posts,openReports,livePorch]=await Promise.all([db.user.count(),db.user.count({where:{createdAt:{gte:since}}}),db.post.count({where:{createdAt:{gte:since}}}),db.report.count({where:{status:{in:["OPEN","REVIEWING"]}}}),db.porchRoom.count({where:{status:"LIVE"}})]);return NextResponse.json({users,newUsers,postsToday:posts,openReports,livePorch,role:access.staff.role});}
