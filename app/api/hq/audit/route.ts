import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentStaff } from "@/lib/hq";
export async function GET(){const access=await currentStaff();if(!access||!["OWNER","EXECUTIVE_ADMIN","TRUST_SAFETY"].includes(access.staff.role))return NextResponse.json({error:"Audit access required."},{status:403});const events=await db.auditLog.findMany({orderBy:{createdAt:"desc"},take:100,include:{actor:{select:{username:true,displayName:true}}}});return NextResponse.json({events});}
