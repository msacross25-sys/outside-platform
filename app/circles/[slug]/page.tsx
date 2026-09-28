import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function CirclePage({params}:{params:{slug:string}}){const circle=await db.circle.findUnique({where:{slug:params.slug},include:{_count:{select:{members:true}},members:{take:12,include:{user:{select:{username:true,displayName:true}}}}}});if(!circle)notFound();return <Shell><section className="page"><span className="eyebrow">Circle</span><h1>{circle.name}</h1><p className="lede">{circle.description||"A community on OUTSiiDE."}</p><p>{circle._count.members} members · {circle.privacy.replace("_"," ").toLowerCase()}</p><h2>Community</h2><div className="circleMembers">{circle.members.map(m=><span key={m.userId}>{m.user.displayName} · {m.role.toLowerCase()}</span>)}</div></section></Shell>}
