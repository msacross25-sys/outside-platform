"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function Signup(){
 const router=useRouter();
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  setBusy(true);
  setError("");

  const f=new FormData(e.currentTarget);
  const payload={
   displayName:f.get("displayName"),
   username:f.get("username"),
   email:f.get("email"),
   password:f.get("password"),
   dateOfBirth:f.get("dateOfBirth"),
   referralCode:f.get("referralCode"),
   confirmAdult:f.get("confirmAdult")==="on",
   confirmSingleAccount:f.get("confirmSingleAccount")==="on",
   acceptTerms:f.get("acceptTerms")==="on",
   acceptPrivacy:f.get("acceptPrivacy")==="on",
   acceptCommunityGuidelines:f.get("acceptCommunityGuidelines")==="on"
  };

  const r=await fetch("/api/users",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify(payload)
  });
  const data=await r.json();
  if(!r.ok){
   setError(data.error??"Could not create account.");
   setBusy(false);
   return;
  }

  router.push("/verify-email?login="+encodeURIComponent(String(payload.email??""))+"&created=1");
 }

 return <main className="auth"><div className="authCard">
  <Link className="brand" href="/">OUTS<span>ii</span>DE</Link>
  <h1>Come OUTSiiDE.</h1>
  <p>Create one secure adult account.</p>

  <form onSubmit={submit}>
   <label>Display name<input name="displayName" required maxLength={60}/></label>
   <label>Username<input name="username" required minLength={3} maxLength={30} autoComplete="username"/></label>
   <label>Email<input name="email" type="email" required autoComplete="email"/></label>
   <label>Password<input name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/></label>
   <label>Date of birth<input name="dateOfBirth" type="date" required autoComplete="bday"/></label>

   <label><input name="confirmAdult" type="checkbox" required/> I confirm I am at least 18 years old.</label>
   <label><input name="confirmSingleAccount" type="checkbox" required/> I confirm I am not creating a duplicate account to evade OUTSiiDE rules, enforcement, referrals, rankings, Battles, or payout controls.</label>
   <label><input name="acceptTerms" type="checkbox" required/> I accept the <Link href="/legal/terms" target="_blank">Terms of Service</Link>.</label>
   <label><input name="acceptPrivacy" type="checkbox" required/> I accept the <Link href="/legal/privacy" target="_blank">Privacy Policy</Link>.</label>
   <label><input name="acceptCommunityGuidelines" type="checkbox" required/> I accept the <Link href="/rules" target="_blank">Community Rules</Link>.</label>

   <label>Referral code <span>(optional)</span><input name="referralCode" maxLength={32} placeholder="OUT-XXXXXXXX"/></label>

   {error&&<div className="formError">{error}</div>}
   <button disabled={busy}>{busy?"Creating account…":"Create account"}</button>
  </form>

  <p>Already OUTSiiDE? <Link href="/login">Log in</Link></p>
 </div></main>;
}
