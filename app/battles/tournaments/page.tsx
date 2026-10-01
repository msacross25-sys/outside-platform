import {Shell} from "@/components/Shell";
import {TournamentCenter} from "@/components/TournamentCenter";

export default function TournamentPage(){
 return <Shell><section className="page">
  <span className="eyebrow">TOURNAMENT MODE</span>
  <h1>Bracket season starts here.</h1>
  <p className="lede">Create brackets, enter as an approved Host, seed competitors and run each matchup from an OUTSiiDE Live room.</p>
  <TournamentCenter/>
 </section></Shell>;
}
