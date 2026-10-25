import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata = { title: "Club Nights | Howick-Pakuranga Chess Club", description: "Your first Tuesday at HPCC: junior and senior session times, what to expect and membership questions." };
const steps = [
  ["Email us first", "Tell us which Tuesday you plan to come, and whether you want to join the Junior Club or the Senior Club."],
  ["Arrive a little early", "Juniors: please come at 5:50pm to help set up. Seniors: please arrive a little early. The session starts at 7:30pm."],
  ["Play", "Juniors are paired by the club’s system after a short lesson. Seniors play in the current club tournament — you’ll need to keep score (chess notation)."],
  ["Help pack up", "At the end of the night, please help pack away boards and clocks and put the chairs back where they belong."]
];
const answers = [
  ["Can I just turn up?", "Please email us first to let us know when you are planning to visit, and whether you want to join the Junior Club or the Senior Club. Then come along on a Tuesday — new and potential members are always welcome."],
  ["Which session is right for me?", "Junior Hour caters mainly for beginners: a 15-minute interactive lesson, then games. The 7:30pm club tournament is for players of all abilities who know how the pieces move and can keep score (chess notation is required)."],
  ["Is there chess during the school holidays?", "There is no Junior Club during school holidays. Senior club tournaments continue through the holidays."],
  ["Do I need a separate form for each member of my family?", "Yes — please complete a separate membership form for each family member joining the club."],
  ["Does my annual fee include NZCF membership?", "Yes. HPCC is affiliated to the New Zealand Chess Federation, and NZCF membership is renewed annually along with your club membership."],
  ["Am I allowed to join other clubs?", "Yes. If you have already paid your NZCF membership through another club, you can deduct $20 from your HPCC membership fee — just let us know."]
];
export default function ClubNightsPage() {
  return <PageShell><main className="container-page space-y-10 py-10 text-hpcc-navy">
    <header className="rounded-2xl bg-hpcc-accent p-6 sm:p-10">
      <p className="text-sm font-bold uppercase tracking-widest">New here?</p>
      <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Your first club night</h1>
      <p className="mt-4 max-w-2xl">Complete beginners, returning players and visitors from other clubs are all welcome. Here’s everything you need for your first Tuesday.</p>
      <a className="mt-6 inline-block rounded-lg bg-hpcc-navy px-5 py-3 font-bold text-white" href="mailto:howickpakurangachessclub@gmail.com">Email us before you visit</a>
    </header>
    <section aria-labelledby="when"><h2 id="when" className="mb-4 font-serif text-2xl font-bold">When and where</h2>
      <dl className="grid gap-4 rounded-xl border border-hpcc-navy/15 bg-white p-6 sm:grid-cols-2">
        <div><dt className="font-bold">When</dt><dd>Every Tuesday</dd></div>
        <div><dt className="font-bold">Junior Club</dt><dd>6:00pm–7:00pm (arrive 5:50pm)</dd></div>
        <div><dt className="font-bold">Senior Club</dt><dd>Tuesday at 7:30pm; finish varies with the tournament.</dd></div>
        <div><dt className="font-bold">Where</dt><dd>Downstairs at the Howick Bowling Club, Howick, Auckland. <a className="underline" href="https://www.google.com/maps/search/?api=1&query=Howick+Bowling+Club+Auckland" target="_blank" rel="noreferrer">View map</a></dd></div>
      </dl><p className="mt-4">No Junior Club during school holidays. Senior tournaments continue during school holidays.</p>
    </section>
    <section aria-labelledby="first"><h2 id="first" className="mb-4 font-serif text-2xl font-bold">How your first night works</h2><ol className="grid gap-4 sm:grid-cols-2">{steps.map(([title, text], i) => <li key={title} className="rounded-xl bg-hpcc-accent p-6"><h3 className="font-bold">{i + 1}. {title}</h3><p className="mt-2">{text}</p></li>)}</ol></section>
    <section aria-labelledby="sessions"><h2 id="sessions" className="mb-4 font-serif text-2xl font-bold">Which session is for me?</h2><div className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-xl border border-hpcc-navy/15 p-6"><p className="text-sm">5:50pm arrival · term time</p><h3 className="mt-2 font-serif text-xl font-bold">Junior Hour</h3><p className="mt-3">Mainly for beginners and young players: a 15-minute interactive lesson, then games and chess activities, run by club volunteers with parents helping out.</p><Link href="/juniors" className="mt-4 inline-block font-bold underline">Explore Junior Chess</Link></article>
      <article className="rounded-xl border border-hpcc-navy/15 p-6"><p className="text-sm">Tuesday at 7:30pm</p><h3 className="mt-2 font-serif text-xl font-bold">Club night tournament</h3><p className="mt-3">For players of all abilities who know how the pieces move. Rated tournaments run all year — commit to the rounds you enter.</p><Link href="/tournaments" className="mt-4 inline-block font-bold underline">View tournaments</Link></article>
    </div></section>
    <section aria-labelledby="questions"><h2 id="questions" className="mb-4 font-serif text-2xl font-bold">Quick answers</h2><div className="space-y-3">{answers.map(([question, answer]) => <details key={question} className="rounded-xl border border-hpcc-navy/15 p-5"><summary className="cursor-pointer font-bold">{question}</summary><p className="mt-3">{answer}</p></details>)}</div><p className="mt-4">For rating questions, <Link href="/contact" className="underline">contact the club</Link>; for membership questions, <Link href="/join" className="underline">view membership options</Link>.</p></section>
    <section className="rounded-2xl bg-hpcc-accent p-6"><h2 className="font-serif text-2xl font-bold">Ready to join?</h2><p className="mt-3">Come and try a night first. When you’re ready, membership covers club tournaments and your annual NZCF membership.</p><Link href="/join" className="mt-4 inline-block rounded-lg bg-hpcc-navy px-5 py-3 font-bold text-white">Membership options</Link></section>
  </main></PageShell>;
}
