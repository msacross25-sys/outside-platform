import type {Instrumentation} from "next";
import {logError,logInfo} from "@/lib/logger";

export function register(){
 if(process.env.NEXT_RUNTIME==="nodejs"){
  logInfo("server_started",{
   nodeVersion:process.version,
   environment:process.env.NODE_ENV??"unknown"
  });
 }
}

export const onRequestError:Instrumentation.onRequestError=async(error,request,context)=>{
 const digest=
  typeof error==="object"&&error!==null&&"digest" in error
   ?String((error as {digest?:unknown}).digest??"")
   :undefined;

 logError("request_error",error,{
  method:request.method,
  path:request.path,
  routerKind:context.routerKind,
  routePath:context.routePath,
  routeType:context.routeType,
  digest
 });
};
