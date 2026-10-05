"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function AcceptPoliciesPage(){
 const router=useRouter();
 const [ready,setReady]=useState(false);
 const [error,setError]=useState("");

 useEffect(()=>{
  fetch("/api/account/policies").then(async r=>{
   if(r.status===401){router.replace("/login");return}
   const d=await r.json();
   if(r.ok&&!d.required){
    const next=new URLSearchParams(window.location.search).get("next")||"home";
    router.replace(next==="mfa"?"/mfa":next==="setup"?"/settings/security?setup=1":"/");
    return;
   }
   setReady(true);
  });
 },[router]);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  const f=new FormData(e.currentTarget);
  const body={
   acceptTerms:f.get("acceptTerms")==="on",
   acceptPrivacy:f.get("acceptPrivacy")==="on",
   acceptCommunityGuidelines:f.get("acceptCommunityGuidelines")==="on"
  };
  const r=await fetch("/api/account/policies",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();
  if(!r.ok){setError(d.error??"Policy acceptance failed.");return}
  const next=new URLSearchParams(window.location.search).get("next")||"home";
  router.push(next==="mfa"?"/mfa":next==="setup"?"/settings/security?setup=1":"/");
  router.refresh();
 }

 if(!ready)return <main className="auth"><div className="authCard">Checking policies…</div></main>;
 return <main className="auth"><div className="authCard">
  <Link className="brand" href="/">OUTS<span>ii</span>DE</Link>
  <h1>Review updated policies</h1>
  <p>Accept the current OUTSiiDE policies to continue using your account.</p>
  <form onSubmit={submit}>
   <label><input name="acceptTerms" type="checkbox" required/> I accept the <Link href="/legal/terms" target="_blank">Terms of Service</Link>.</label>
   <label><input name="acceptPrivacy" type="checkbox" required/> I accept the <Link href="/legal/privacy" target="_blank">Privacy Policy</Link>.</label>
   <label><input name="acceptCommunityGuidelines" type="checkbox" required/> I accept the <Link href="/rules" target="_blank">Community Rules</Link>.</label>
   {error&&<div className="formError">{error}</div>}
   <button>Accept and continue</button>
  </form>
 </div></main>;
}
