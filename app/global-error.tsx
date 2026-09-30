"use client";
import {useEffect} from "react";

export default function GlobalError({
 error,
 reset
}:{
 error:Error&{digest?:string};
 reset:()=>void;
}){
 useEffect(()=>{
  console.error("OUTSiiDE client error",error.digest??error.message);
 },[error]);

 return <html><body><main className="auth"><div className="authCard">
  <h1>OUTSiiDE hit a snag.</h1>
  <p>We could not finish that request. Your account data is still protected.</p>
  {error.digest&&<p>Reference: {error.digest}</p>}
  <button onClick={()=>reset()}>Try again</button>
  <button onClick={()=>location.assign("/")}>Return home</button>
 </div></main></body></html>;
}
