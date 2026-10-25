import {clubHistory} from "@/lib/clubHistory";
import {createSupabaseServiceClient} from "@/lib/supabase/service";
import {readClubPublicSettings,committeeDefaults} from "@/lib/clubPublicSettings";
export const dynamic="force-dynamic";
import PageShell from "@/components/PageShell";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Howick-Pakuranga Chess Club",
  description: "Discover HPCC’s history, junior chess tradition and club committee.",
};

// Public club information from https://www.hpchessclub.org/about-us-1.
const officerDefaults = [
  { role: "President", name: "FM Martin Dreyer", email: "martin@dandd.co.nz" },
  { role: "Secretary", name: "Winnie Ong", email: "hpchess.winnie@gmail.com" },
  { role: "Treasurer", name: "Mathew Gosling", email: "matthew.gosling99@gmail.com" },
  { role: "Club Captain", name: "Cigi Zhong", email: "zhongcigi@gmail.com" },
];
const constitution = "https://www.hpchessclub.org/_files/ugd/138650_0582abb7b14d4ffab1af746819a0886c.pdf";

export default async function AboutPage() {
  const service=createSupabaseServiceClient();const {data}=await service.from("club_settings").select("*").eq("id","default").maybeSingle();
  const settings=await readClubPublicSettings(service,data||{});const committee=settings.additional_committee_members||committeeDefaults;
  const officers=officerDefaults.map(officer=>officer.role==="Secretary"?{...officer,name:settings.club_secretary_name,email:settings.club_secretary_email}:officer.role==="Club Captain"?{...officer,role:"Senior Club Captain",name:settings.senior_club_captain_name||"Contact the club",email:settings.senior_club_captain_email||""}:officer);

  return (
    <PageShell>
      <main className="container-page py-12">
        <section className="rounded-3xl bg-hpcc-pale p-8 text-hpcc-navy shadow-soft lg:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-hpcc-blue">About Us</p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl sm:text-5xl">Howick-Pakuranga Chess Club</h1>
          <p className="mt-5 text-xl text-hpcc-blue">Learn. Play. Grow with HPCC.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/join" className="rounded-md bg-white px-5 py-3 font-bold text-hpcc-navy">Join the Club</Link>
            <Link href="/tournaments" className="rounded-md border border-hpcc-navy/30 px-5 py-3 font-bold hover:bg-hpcc-accent">Explore Tournaments</Link>
          </div>
        </section>

        <section className="mt-8 space-y-6">
          <article className="card p-7 lg:p-9">
            <h2 className="font-serif text-3xl">Our History</h2>
            <div className="mt-5 max-w-5xl space-y-4 leading-8 text-stone-700">{clubHistory.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
            </div>
          </article>
          <article className="card p-7 lg:p-9">
            <h2 className="font-serif text-3xl">Junior Chess</h2>
            <p className="mt-5 leading-8 text-stone-700">Sutton’s junior teaching tradition continues. Former juniors WIM Jasmine Zhang, FM Luke Li and FM Daniel Gong represented New Zealand at Olympiads.</p>
            <Link href="/coaching" className="btn-secondary mt-6">Explore Coaching</Link>
          </article>
        </section>

        <section className="mt-10" aria-labelledby="committee-title">
          <h2 id="committee-title" className="font-serif text-3xl">Our Committee</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {officers.map(officer => (
              <article key={officer.role} className="card p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">{officer.role}</h3>
                <p className="mt-3 text-lg font-bold">{officer.name}</p>
                {officer.email&&<a href={`mailto:${officer.email}`} className="mt-3 block break-words text-sm underline underline-offset-4">{officer.email}</a>}
              </article>
            ))}
          </div>
          <article className="card mt-5 p-7">
            <h3 className="font-serif text-2xl">Additional Committee Members</h3>
            <ul className="mt-4 grid list-inside list-disc gap-3 text-stone-700 sm:grid-cols-2 lg:grid-cols-3">
              {committee.map(name => <li key={name}>{name}</li>)}
            </ul>
          </article>
        </section>

        <section className="card mt-8 flex flex-wrap items-center justify-between gap-5 p-7">
          <h2 className="font-serif text-2xl">Club Constitution</h2>
          <a href={constitution} target="_blank" rel="noopener noreferrer" className="btn-secondary">Read Constitution (PDF, opens in a new tab)</a>
        </section>
      </main>
    </PageShell>
  );
}
