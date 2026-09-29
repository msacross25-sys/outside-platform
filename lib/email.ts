function appUrl(){
 return (process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000").replace(/\/$/,"");
}

async function sendEmail(to:string,subject:string,html:string,idempotencyKey:string){
 const mode=process.env.EMAIL_DELIVERY_MODE??(process.env.NODE_ENV==="production"?"resend":"log");
 if(mode==="test")return;
 if(mode==="log"){
  console.info("OUTSiiDE development email", {to,subject});
  return;
 }
 if(mode!=="resend")throw new Error("Unsupported EMAIL_DELIVERY_MODE.");
 const apiKey=process.env.RESEND_API_KEY;
 const from=process.env.EMAIL_FROM;
 if(!apiKey||!from)throw new Error("RESEND_API_KEY and EMAIL_FROM are required for email delivery.");

 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{
   "authorization":"Bearer "+apiKey,
   "content-type":"application/json",
   "idempotency-key":idempotencyKey
  },
  body:JSON.stringify({from,to:[to],subject,html})
 });
 if(!response.ok){
  const body=(await response.text()).slice(0,1000);
  throw new Error("Email delivery failed: "+response.status+" "+body);
 }
}

export async function sendVerificationEmail(email:string,token:string){
 const url=appUrl()+"/verify-email?token="+encodeURIComponent(token);
 await sendEmail(
  email,
  "Verify your OUTSiiDE email",
  '<div style="font-family:Arial,sans-serif"><h1>Verify your email</h1><p>Confirm this email address to finish setting up your OUTSiiDE account.</p><p><a href="'+url+'">Verify email</a></p><p>This link expires in 24 hours.</p></div>',
  "verify-email/"+token.slice(0,20)
 );
}

export async function sendPasswordResetEmail(email:string,token:string){
 const url=appUrl()+"/reset-password?token="+encodeURIComponent(token);
 await sendEmail(
  email,
  "Reset your OUTSiiDE password",
  '<div style="font-family:Arial,sans-serif"><h1>Reset your password</h1><p>Use the secure link below to choose a new OUTSiiDE password.</p><p><a href="'+url+'">Reset password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p></div>',
  "password-reset/"+token.slice(0,20)
 );
}
