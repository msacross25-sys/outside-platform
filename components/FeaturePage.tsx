import { Shell } from "./Shell";

export function FeaturePage({ eyebrow, title, copy, items }: { eyebrow: string; title: string; copy: string; items: string[] }) {
  return <Shell><section className="page">
    <span className="eyebrow">{eyebrow}</span>
    <h1>{title}</h1><p className="lede">{copy}</p>
    <div className="grid">{items.map(item => <article className="card" key={item}>{item}</article>)}</div>
  </section></Shell>;
}
