import {Shell} from "@/components/Shell";
import {PostComposer} from "@/components/PostComposer";

export default function Create(){
 return <Shell><section className="page createPage">
  <p className="neonEyebrow">CREATE OUTSiiDE</p>
  <h1>Make your moment.</h1>
  <p className="lede">Create a post with text, photos or video. Your media uploads directly to protected storage.</p>
  <div className="createModes"><b>Post</b><span>Story</span><span>Live</span><span>Porch</span></div>
  <PostComposer/>
  <div className="createChoices">
   <article><b>Photo + Video</b><span>Direct upload with server-verified ownership.</span></article>
   <article><b>Stories</b><span>Share for 24 hours.</span></article>
   <article><b>Go Live</b><span>Broadcast with guests and effects.</span></article>
   <article><b>Start a Porch</b><span>Open a conversation room.</span></article>
  </div>
 </section></Shell>;
}
