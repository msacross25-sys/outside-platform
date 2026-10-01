import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/session";

function seasonKey(date=new Date()){
 return date.getUTCFullYear()+"-Q"+(Math.floor(date.getUTCMonth()/3)+1);
}

export async function GET(){
 const me=await currentUser();
 const season=seasonKey();
 const [territories,guilds,myMembership]=await Promise.all([
  db.battleTerritory.findMany({
   where:{seasonKey:season},
   orderBy:{regionCode:"asc"},
   include:{
    holderGuild:{select:{slug:true,name:true}},
    scores:{
     where:{seasonKey:season},
     orderBy:{points:"desc"},
     take:10,
     include:{guild:{select:{slug:true,name:true}}}
    }
   }
  }),
  db.battleGuild.findMany({
   orderBy:{createdAt:"desc"},
   take:50,
   include:{
    owner:{select:{username:true,displayName:true}},
    _count:{select:{members:true,territories:true}}
   }
  }),
  me?db.battleGuildMember.findUnique({
   where:{userId:me.id},
   include:{guild:{select:{id:true,slug:true,name:true,regionCode:true}}}
  }):Promise.resolve(null)
 ]);

 return NextResponse.json({
  season,
  myGuild:myMembership?.guild??null,
  guilds,
  territories:territories.map(territory=>({
   id:territory.id,
   regionCode:territory.regionCode,
   heldSince:territory.heldSince,
   holderGuild:territory.holderGuild,
   leaders:territory.scores.map(score=>({
    guildId:score.guildId,
    guild:score.guild,
    points:score.points.toString()
   }))
  }))
 });
}
