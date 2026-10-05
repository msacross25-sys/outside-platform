"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function Login(){
 const router=useRouter();
 const [error,setError]=useState("");
 const [verifyLogin,setVerifyLogin]=useState("");

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  setError("");
  setVerifyLogin("");
  const f=new FormData(e.currentTarget);
  const login=String(f.get("login")??"");
  const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({login,password:f.get("password")})});
  const data=await r.json();
  if(!r.ok){
   if(data.code==="EMAIL_VERIFICATION_REQUIRED")setVerifyLogin(login);
   setError(data.error??"Could not sign in.");
   return;
  }
  if(data.ageVerificationRequired){
   const next=data.mfaRequired?"mfa":data.mfaSetupRequired?"setup":"home";
   router.push("/verify-age?next="+next);return;
  }
  if(data.mfaRequired){router.push("/mfa");return;}
  if(data.mfaSetupRequired){router.push("/settings/security?setup=1");return;}
  router.push("/");
  router.refresh();
 }

 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Welcome back.</h1><p>Sign in to come OUTSiiDE.</p><form onSubmit={submit}><label>Email or username<input name="login" required autoComplete="username"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label>{error&&<div className="formError">{error}</div>}{verifyLogin&&<p><Link href={"/verify-email?login="+encodeURIComponent(verifyLogin)}>Resend verification email</Link></p>}<button>Log in</button></form><p><Link href="/forgot-password">Forgot password?</Link></p><p>New here? <Link href="/signup">Create an account</Link></p></div></main>;
}
