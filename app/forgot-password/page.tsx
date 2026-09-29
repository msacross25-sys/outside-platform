"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";

export default function ForgotPassword(){
 const [message,setMessage]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  await fetch("/api/auth/password-reset/request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({login:f.get("login")})});
  setMessage("If the account exists, a password-reset email has been sent.");
 }
 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Reset your password.</h1><p>Enter your email or username.</p><form onSubmit={submit}><label>Email or username<input name="login" required autoComplete="username"/></label><button>Send reset link</button></form>{message&&<p>{message}</p>}<p><Link href="/login">Back to login</Link></p></div></main>;
}
