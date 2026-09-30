import {readdir} from "node:fs/promises";
import {join} from "node:path";
import {PrismaClient} from "@prisma/client";

const db=new PrismaClient();

function fail(message,detail){
 console.error("RESTORE VERIFICATION FAILURE:",message);
 if(detail!==undefined)console.error(detail);
 process.exitCode=1;
}

try{
 const migrationRoot=join(process.cwd(),"prisma","migrations");
 const local=(await readdir(migrationRoot,{withFileTypes:true}))
  .filter(entry=>entry.isDirectory())
  .map(entry=>entry.name)
  .sort();

 const applied=await db.$queryRawUnsafe(
  'select migration_name, finished_at, rolled_back_at from "_prisma_migrations" order by migration_name'
 );

 const activeApplied=applied
  .filter(row=>row.finished_at&&!row.rolled_back_at)
  .map(row=>row.migration_name)
  .sort();

 const failed=applied.filter(row=>!row.finished_at&&!row.rolled_back_at);
 const missing=local.filter(name=>!activeApplied.includes(name));
 const unexpected=activeApplied.filter(name=>!local.includes(name));

 if(failed.length)fail("Restored database contains unfinished migrations.",failed.map(row=>row.migration_name));
 if(missing.length)fail("Restored database is missing repository migrations.",missing);
 if(unexpected.length)fail("Restored database contains migrations not present in this release.",unexpected);

 const critical=await Promise.all([
  db.user.count(),
  db.session.count(),
  db.authToken.count(),
  db.authRateLimit.count(),
  db.mfaCredential.count(),
  db.authEvent.count(),
  db.post.count(),
  db.media.count(),
  db.porchRoom.count(),
  db.liveReplay.count(),
  db.coinWallet.count(),
  db.giftTransaction.count()
 ]);

 if(process.exitCode)process.exit(1);

 console.log(JSON.stringify({
  ok:true,
  migrations:activeApplied.length,
  criticalModelsReadable:true,
  rowCounts:{
   users:critical[0],
   sessions:critical[1],
   authTokens:critical[2],
   authRateLimits:critical[3],
   mfaCredentials:critical[4],
   authEvents:critical[5],
   posts:critical[6],
   media:critical[7],
   porchRooms:critical[8],
   liveReplays:critical[9],
   coinWallets:critical[10],
   giftTransactions:critical[11]
  },
  checkedAt:new Date().toISOString()
 }));
}finally{
 await db.$disconnect();
}
