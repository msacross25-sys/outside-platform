"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
export default function Login(){
 const [error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");const f=new FormData(e.currentTarget);const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({login:f.get("login"),password:f.get("password")})});const data=await r.json();if(!r.ok)return setError(data.error??"Could not sign in.");location.href="/";}
 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Welcome back.</h1><p>Sign in to come OUTSiiDE.</p><form onSubmit={submit}><label>Email or username<input name="login" required autoComplete="username"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label>{error&&<div className="formError">{error}</div>}<button>Log in</button></form><p>New here? <Link href="/signup">Create an account</Link></p></div></main>;
}
