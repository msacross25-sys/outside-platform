import {NextResponse} from "next/server";

function releaseId(){
 return process.env.OUTSIDE_RELEASE
  ||process.env.VERCEL_GIT_COMMIT_SHA
  ||process.env.GITHUB_SHA
  ||process.env.RENDER_GIT_COMMIT
  ||process.env.RAILWAY_GIT_COMMIT_SHA
  ||null;
}

export function GET(){
 return NextResponse.json({
  ok:true,
  service:"outside-web",
  release:releaseId(),
  time:new Date().toISOString()
 });
}
