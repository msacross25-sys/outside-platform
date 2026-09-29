"use client";
import {FormEvent,Suspense,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";

function ResetPasswordContent(){
 const params=useSearchParams();
 const token=params.get("token")??"";
 const [message,setMessage]=useState("");
 const [done,setDone]=useState(false);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const password=String(f.get("password")??"");
  const confirm=String(f.get("confirm")??"");
  if(password!==confirm){setMessage("Passwords do not match.");return;}
  const r=await fetch("/api/auth/password-reset/confirm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,password})});
  const d=await r.json();
  if(!r.ok){setMessage(d.error??"Could not reset password.");return;}
  setDone(true);
  setMessage("Password reset. All previous sessions were signed out.");
 }

 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Choose a new password.</h1>{!token?<p>This reset link is missing its secure token.</p>:!done?<form onSubmit={submit}><label>New password<input name="password" type="password" minLength={10} maxLength={128} required autoComplete="new-password"/></label><label>Confirm password<input name="confirm" type="password" minLength={10} maxLength={128} required autoComplete="new-password"/></label><button>Reset password</button></form>:<p><Link href="/login">Sign in with your new password</Link></p>}{message&&<p>{message}</p>}</div></main>;
}

export default function ResetPassword(){
 return <Suspense fallback={<main className="auth"><div className="authCard">Loading…</div></main>}><ResetPasswordContent/></Suspense>;
}
