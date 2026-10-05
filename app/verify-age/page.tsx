"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function VerifyAgePage(){
 const router=useRouter();
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  setBusy(true);setError("");
  const form=new FormData(e.currentTarget);
  const response=await fetch("/api/account/age",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({dateOfBirth:form.get("dateOfBirth")})
  });
  const data=await response.json();
  if(!response.ok){setError(data.error??"Age verification failed.");setBusy(false);return}

  const next=new URLSearchParams(window.location.search).get("next");
  if(next==="mfa"){router.push("/mfa");return}
  if(next==="setup"){router.push("/settings/security?setup=1");return}
  router.push("/");
  router.refresh();
 }

 return <main className="auth"><div className="authCard">
  <Link className="brand" href="/">OUTS<span>ii</span>DE</Link>
  <h1>Age verification</h1>
  <p>OUTSiiDE is for adults age 18 and older. Enter your date of birth to continue.</p>
  <form onSubmit={submit}>
   <label>Date of birth<input name="dateOfBirth" type="date" required autoComplete="bday"/></label>
   {error&&<div className="formError">{error}</div>}
   <button disabled={busy}>{busy?"Checking…":"Continue"}</button>
  </form>
 </div></main>;
}
