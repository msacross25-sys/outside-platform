import Link from "next/link";
export function StoryRail({stories}:{stories:any[]}){if(!stories.length)return null;return <div className="storyRail">{stories.map(s=><article className="storyBubble" key={s.id}><Link href={"/u/"+s.author.username}><div className="storyAvatar">{s.author.displayName.slice(0,1).toUpperCase()}</div><b>{s.author.displayName}</b></Link><p>{s.text}</p></article>)}</div>}
