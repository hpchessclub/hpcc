import MeetingSummary from "@/components/MeetingSummary";
import { JuniorConfig } from "@/lib/juniorConfig";
import Link from "next/link";
export default function JuniorContent({ config: c }: { config: JuniorConfig }) {
  return <main className="container-page py-10">
    <section className="rounded-2xl bg-hpcc-accent p-6 md:p-10"><p className="text-xs font-bold uppercase tracking-widest text-hpcc-blue">Learn. Play. Grow.</p><h1 className="hpcc-display mt-3 text-3xl font-bold md:text-4xl">{c.title}</h1><p className="mt-4 max-w-3xl leading-7">{c.introduction}</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/join" className="btn-primary">Junior membership</Link><a href={`mailto:${c.contactEmail}?subject=HPCC%20-%20Junior%20Club%20enquiry`} className="btn-secondary">Ask about Junior Club</a></div><p className="mt-3 text-sm">Junior Club Membership is for school pupils.</p></section>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="card p-6"><h2 className="text-2xl font-bold">Junior Hour</h2><dl className="mt-4 space-y-3"><div><dt className="font-bold">When</dt><dd>{c.when}</dd></div><div><dt className="font-bold">Where</dt><dd>{c.where}</dd></div><div><dt className="font-bold">School holidays</dt><dd>{c.holidays}</dd></div></dl><p className="mt-4 leading-7">{c.session}</p></section>
      <section className="card p-6"><h2 className="text-2xl font-bold">Junior Hour Ladder</h2><p className="mt-4 leading-7">{c.ladderDescription}</p><div className="mt-5 flex flex-wrap gap-3">{[[c.ladderUrl, "Ladder standings"], [c.pairingUrl, "My pairing tonight"], [c.signInUrl, "Sign in for Junior Hour"]].map(([url,label])=><a key={url} href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary">{label} ↗</a>)}</div><p className="mt-4 text-sm text-stone-600">{c.signInNote}</p></section>
      <section className="card p-6"><h2 className="text-2xl font-bold">{c.termsTitle}</h2><MeetingSummary text={c.terms}/></section>
      <section className="card p-6"><h2 className="text-2xl font-bold">Juniors v Seniors Challenge Nights</h2><MeetingSummary text={c.challenges}/></section>
    </div>
    <section className="mt-8"><h2 className="text-2xl font-bold">From Junior Hour to club chess</h2><div className="mt-5 grid gap-5 md:grid-cols-3"><article className="card p-6"><h3 className="text-xl font-bold">Junior Championship</h3><MeetingSummary text={c.championship}/></article><article className="card p-6"><h3 className="text-xl font-bold">Senior club tournaments</h3><MeetingSummary text={c.seniorChess}/></article><article className="card p-6"><h3 className="text-xl font-bold">Interschools</h3><MeetingSummary text={c.interschools}/></article></div><p className="mt-5 leading-7 text-stone-700">{c.alumni}</p></section>
    <section className="mt-8 rounded-2xl bg-hpcc-pale p-6"><h2 className="text-2xl font-bold">For parents</h2><p className="mt-4 leading-7">{c.parents}</p><a href={`mailto:${c.contactEmail}`} className="mt-4 inline-block font-bold underline">{c.contactEmail}</a></section>
  </main>;
}
