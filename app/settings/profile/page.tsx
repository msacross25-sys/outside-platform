"use client";
import { FormEvent,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
export default function EditProfile(){
 const router=useRouter();const [user,setUser]=useState<any>(null);const [error,setError]=useState("");
 useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(!d.user)router.replace("/login");else setUser(d.user)})},[router]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const r=await fetch("/api/profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({displayName:f.get("displayName"),bio:f.get("bio")})});const d=await r.json();if(!r.ok)return setError(d.error);router.push("/u/"+d.user.username);}
 if(!user)return <main className="auth"><div className="authCard">Loading…</div></main>;
 return <main className="auth"><div className="authCard"><h1>Edit profile</h1><form onSubmit={save}><label>Display name<input name="displayName" defaultValue={user.displayName} required maxLength={60}/></label><label>Bio<input name="bio" defaultValue={user.bio??""} maxLength={160}/></label>{error&&<div className="formError">{error}</div>}<button>Save profile</button></form></div></main>;
}
