"use client";
import {FormEvent,Suspense,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";

function VerifyEmailContent(){
 const params=useSearchParams();
 const token=params.get("token")??"";
 const initialLogin=params.get("login")??"";
 const [login,setLogin]=useState(initialLogin);
 const [message,setMessage]=useState(token?"Open this secure link by pressing Verify below.":"Check your inbox for the verification email.");
 const [done,setDone]=useState(false);

 async function verify(){
  const r=await fetch("/api/auth/verify-email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
  const d=await r.json();
  if(!r.ok){setMessage(d.error??"Verification failed.");return;}
  setDone(true);
  setMessage("Email verified. You can sign in now.");
 }

 async function resend(e:FormEvent){
  e.preventDefault();
  await fetch("/api/auth/verify-email/request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({login})});
  setMessage("If that account still needs verification, a new email has been sent.");
 }

 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Verify your email.</h1><p>{message}</p>{token&&!done&&<button onClick={verify}>Verify email</button>}{done&&<p><Link href="/login">Continue to login</Link></p>} {!done&&<form onSubmit={resend}><label>Email or username<input value={login} onChange={e=>setLogin(e.target.value)} required/></label><button type="submit">Resend verification</button></form>}<p><Link href="/login">Back to login</Link></p></div></main>;
}

export default function VerifyEmail(){
 return <Suspense fallback={<main className="auth"><div className="authCard">Loading…</div></main>}><VerifyEmailContent/></Suspense>;
}
