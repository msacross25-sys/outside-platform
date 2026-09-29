import type {NextConfig} from "next";

const headers=[
 {key:"X-DNS-Prefetch-Control",value:"off"},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"Permissions-Policy",value:"camera=(self), microphone=(self), geolocation=(), payment=()"}
];

if(process.env.NODE_ENV==="production"){
 headers.push({key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"});
}

const nextConfig:NextConfig={
 async headers(){
  return [{source:"/:path*",headers}];
 }
};

export default nextConfig;
