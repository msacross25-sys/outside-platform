"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";

export default function MfaChallenge(){
 const router=useRouter();
 const [error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  setError("");
  const f=new FormData(e.currentTarget);
  const r=await fetch("/api/auth/mfa/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:f.get("code")})});
  const d=await r.json();
  if(!r.ok){setError(d.error??"Could not verify MFA.");return;}
  router.push("/");
  router.refresh();
 }
 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Security check.</h1><p>Enter the 6-digit authenticator code or one of your recovery codes.</p><form onSubmit={submit}><label>Authenticator or recovery code<input name="code" required autoComplete="one-time-code"/></label>{error&&<div className="formError">{error}</div>}<button>Verify</button></form></div></main>;
}
