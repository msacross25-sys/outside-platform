import Link from "next/link";
import {notFound} from "next/navigation";
import {LEGAL_DOCUMENTS,LEGAL_EFFECTIVE_DATE} from "@/lib/policies";

export default async function LegalDocument({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const doc=LEGAL_DOCUMENTS[slug as keyof typeof LEGAL_DOCUMENTS];
 if(!doc)notFound();
 return <main className="pageStack">
  <section className="hero"><span className="eyebrow">OUTSiiDE Policy</span><h1>{doc.title}</h1><p>Version {doc.version} · Effective {LEGAL_EFFECTIVE_DATE}</p></section>
  {doc.sections.map(([title,body])=><section className="featureCard" key={title}><h2>{title}</h2><p>{body}</p></section>)}
  <section className="featureCard"><p><Link href="/legal">Back to Legal & Safety</Link></p></section>
 </main>;
}
