import { Shell } from "@/components/Shell";

export default function Home() {
  return <Shell><section className="feed">
    <div className="feedTabs"><b>For You</b><span>Following</span><span>Circles</span><span>Local</span></div>
    <article className="videoCard">
      <div className="videoStage">
        <div className="wordmark">OUTS<span>ii</span>DE</div>
        <h1>Come OUTSiiDE.</h1>
        <p>A social platform built for watching, creating, talking and belonging.</p>
        <button>Start exploring</button>
      </div>
      <div className="actions"><span>♡ Like</span><span>◯ Comment</span><span>↗ Share</span><span>☆ Save</span></div>
    </article>
    <div className="control"><b>You're in control.</b><span>Why am I seeing this? · Not interested · Show me more like this</span></div>
  </section></Shell>;
}
