"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function Signup(){
 const router=useRouter();
 const [error,setError]=useState("");

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  setError("");
  const f=new FormData(e.currentTarget);
  const payload={displayName:f.get("displayName"),username:f.get("username"),email:f.get("email"),password:f.get("password")};
  const r=await fetch("/api/users",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const data=await r.json();
  if(!r.ok){setError(data.error??"Could not create account.");return;}
  router.push("/verify-email?login="+encodeURIComponent(String(payload.email??""))+"&created=1");
 }

 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Come OUTSiiDE.</h1><p>Create your account.</p><form onSubmit={submit}><label>Display name<input name="displayName" required maxLength={60}/></label><label>Username<input name="username" required minLength={3} maxLength={30} autoComplete="username"/></label><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label>{error&&<div className="formError">{error}</div>}<button>Create account</button></form><p>Already OUTSiiDE? <Link href="/login">Log in</Link></p></div></main>;
}
