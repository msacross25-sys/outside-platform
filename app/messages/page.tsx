import { Shell } from "@/components/Shell";
import { MessageInbox } from "@/components/MessageInbox";
export default function Messages(){return <Shell><section className="page"><span className="eyebrow">Messages</span><h1>Your conversations.</h1><p className="lede">Private one-to-one messaging. Group chat, voice notes and disappearing media come later.</p><MessageInbox/></section></Shell>}
