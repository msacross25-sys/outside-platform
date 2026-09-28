import { Shell } from "@/components/Shell";
import { ChatThread } from "@/components/ChatThread";
export default function Conversation({params}:{params:{id:string}}){return <Shell><section className="page"><span className="eyebrow">Messages</span><h1>Conversation</h1><ChatThread id={params.id}/></section></Shell>}
