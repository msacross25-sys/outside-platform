import type {NextConfig} from "next";

const headers=[
 {key:"X-DNS-Prefetch-Control",value:"off"},
 {key:"X-Frame-Options",value:"DENY"},
 {key:"X-Content-Type-Options",value:"nosniff"},
 {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
 {key:"Permissions-Policy",value:"camera=(self), microphone=(self), geolocation=(), payment=()"}
];

if(process.env.NODE_ENV==="production"){
 headers.push(
  {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
  {key:"Cross-Origin-Resource-Policy",value:"same-origin"},
  {key:"Content-Security-Policy",value:[
   "default-src 'self'",
   "base-uri 'self'",
   "object-src 'none'",
   "frame-ancestors 'none'",
   "form-action 'self'",
   "script-src 'self' 'unsafe-inline'",
   "style-src 'self' 'unsafe-inline'",
   "img-src 'self' data: blob: https:",
   "media-src 'self' blob: https:",
   "connect-src 'self' https: wss:",
   "font-src 'self' data:",
   "worker-src 'self' blob:",
   "upgrade-insecure-requests"
  ].join("; ")}
 );
}

const nextConfig:NextConfig={
 poweredByHeader:false,
 output:"standalone",
 outputFileTracingIncludes:{
  "/*":[
   "./node_modules/.prisma/client/**/*",
   "./node_modules/@prisma/client/**/*"
  ]
 },
 async headers(){
  return [{source:"/:path*",headers}];
 }
};

export default nextConfig;
