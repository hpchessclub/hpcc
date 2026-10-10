import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Hero() {
  return <section className="relative overflow-hidden bg-[#111111] text-white">
    <div className="absolute inset-0 bg-[url('/images/hpcc-silver-king-hero.jpg')] bg-no-repeat bg-[length:auto_100%] bg-right" aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/20 lg:from-black/85 lg:via-black/35 lg:to-transparent" aria-hidden="true" />
    <div className="container-page relative grid gap-8 py-10 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:py-16">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E3E5E4]">Howick-Pakuranga Chess Club · East Auckland</p>
        <h1 className="mt-4 hpcc-display text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">Learn. Play. Grow<br/><span className="text-[#E3E5E4]">with HPCC.</span></h1>
        <p className="mt-4 max-w-md text-base leading-7 text-white/80">A place to learn, compete and connect. Discover club chess, school competitions and community programmes with HPCC.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/join" className="inline-flex items-center gap-3 rounded-full bg-[#E3E5E4] px-5 py-2.5 text-sm font-bold text-[#111111]">Join the club <ArrowUpRight size={18}/></Link><Link href="/tournaments" className="inline-flex items-center gap-3 rounded-full border border-white/40 px-5 py-2.5 text-sm font-bold hover:bg-white/10">Explore tournaments <ArrowUpRight size={18}/></Link></div>
      </div>
      <div className="hidden min-h-[210px] lg:block" aria-hidden="true" />
    </div>
  </section>;
}
