"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

type SessionRow={id:string;createdAt:string;lastSeenAt:string;expiresAt:string;userAgent:string|null;current:boolean;mfaVerified:boolean};
type SecurityEvent={id:string;kind:string;userAgent:string|null;createdAt:string};
type MfaStatus={enabled:boolean;requiredForStaff:boolean;staffRole:string|null;sessionVerified:boolean;setupRequired:boolean;challengeRequired:boolean;setupPending:boolean};

export default function SecuritySettings(){
 const router=useRouter();
 const [sessions,setSessions]=useState<SessionRow[]>([]);
 const [events,setEvents]=useState<SecurityEvent[]>([]);
 const [mfa,setMfa]=useState<MfaStatus|null>(null);
 const [secret,setSecret]=useState("");
 const [uri,setUri]=useState("");
 const [recoveryCodes,setRecoveryCodes]=useState<string[]>([]);
 const [message,setMessage]=useState("");

 async function load(){
  const [s,m,e]=await Promise.all([fetch("/api/security/sessions"),fetch("/api/security/mfa/status"),fetch("/api/security/events")]);
  if(s.status===401||m.status===401||e.status===401){router.replace("/login");return;}
  const [sd,md,ed]=await Promise.all([s.json(),m.json(),e.json()]);
  if(s.ok)setSessions(sd.sessions??[]);
  if(m.ok)setMfa(md);
  if(e.ok)setEvents(ed.events??[]);
 }

 useEffect(()=>{void load()},[]);

 async function beginMfa(){
  setMessage("");
  const r=await fetch("/api/security/mfa/setup",{method:"POST"});
  const d=await r.json();
  if(!r.ok){setMessage(d.error??"Unable to start MFA setup.");return;}
  setSecret(d.secret);
  setUri(d.otpauthUri);
 }

 async function enableMfa(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const r=await fetch("/api/security/mfa/enable",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:f.get("code")})});
  const d=await r.json();
  if(!r.ok){setMessage(d.error??"Unable to enable MFA.");return;}
  setRecoveryCodes(d.recoveryCodes??[]);
  setSecret("");
  setUri("");
  setMessage("MFA is enabled. Save the recovery codes somewhere secure.");
  await load();
 }

 async function revoke(sessionId:string){
  const r=await fetch("/api/security/sessions",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId})});
  if(r.ok)await load();
 }

 async function revokeOthers(){
  const r=await fetch("/api/security/sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"REVOKE_OTHERS"})});
  if(r.ok){setMessage("Other sessions were signed out.");await load();}
 }

 if(!mfa)return <main className="auth"><div className="authCard">Loading security settings…</div></main>;

 return <main className="auth"><div className="authCard"><Link className="brand" href="/">OUTS<span>ii</span>DE</Link><h1>Security Center</h1><p>Manage MFA, devices and recent account security activity.</p>{mfa.requiredForStaff&&<div className="formError">MFA is required for {mfa.staffRole??"staff"} HQ access.</div>}{mfa.challengeRequired&&<p><Link href="/mfa">Verify MFA for this session</Link></p>}<section className="featureCard"><h2>Multi-factor authentication</h2><p>{mfa.enabled?"Enabled":"Not enabled"}{mfa.sessionVerified?" · This session verified":""}</p>{!secret&&<button onClick={beginMfa}>{mfa.enabled?"Rotate authenticator":"Set up authenticator"}</button>}{secret&&<div><p>In your authenticator app, choose manual setup and enter this secret:</p><code>{secret}</code><details><summary>Authenticator URI</summary><code>{uri}</code></details><form onSubmit={enableMfa}><label>6-digit code<input name="code" inputMode="numeric" pattern="[0-9]{6}" required autoComplete="one-time-code"/></label><button>Confirm MFA</button></form></div>}{recoveryCodes.length>0&&<div><h3>Recovery codes</h3><p>Each code works once. Save these now; they will not be shown again.</p><pre>{recoveryCodes.join("\n")}</pre></div>}</section><section className="featureCard"><h2>Signed-in devices</h2><button onClick={revokeOthers}>Sign out other devices</button>{sessions.map(s=><article key={s.id}><b>{s.current?"This device":"Session"}</b><p>{s.userAgent??"Unknown device"}</p><small>Last active {new Date(s.lastSeenAt).toLocaleString()} · expires {new Date(s.expiresAt).toLocaleDateString()}{s.mfaVerified?" · MFA verified":""}</small>{!s.current&&<button onClick={()=>revoke(s.id)}>Sign out</button>}</article>)}</section><section className="featureCard"><h2>Recent security activity</h2>{events.length===0?<p>No security events yet.</p>:events.map(e=><article key={e.id}><b>{e.kind.replaceAll("_"," ")}</b><p>{new Date(e.createdAt).toLocaleString()}</p><small>{e.userAgent??"Unknown device"}</small></article>)}</section>{message&&<p>{message}</p>}<p><Link href="/settings/profile">Back to profile settings</Link></p></div></main>;
}
