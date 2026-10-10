import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Hero() {
  return <section className="relative overflow-hidden bg-[#111111] text-white">
    <div className="absolute inset-0 bg-[url('/images/hpcc-modern-hero.jpg')] bg-cover bg-[70%_center] grayscale" aria-hidden="true" />
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/10" aria-hidden="true" />
    <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:py-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E3E5E4]">Howick-Pakuranga Chess Club · East Auckland</p>
        <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight md:text-7xl">Your next move.<br/><span className="text-[#E3E5E4]">Our community.</span></h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-white/80">A place to learn, compete and connect. Discover club chess, school competitions and community programmes with HPCC.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/join" className="inline-flex items-center gap-3 rounded-full bg-[#E3E5E4] px-6 py-3 font-bold text-[#111111]">Join the club <ArrowUpRight size={18}/></Link><Link href="/tournaments" className="inline-flex items-center gap-3 rounded-full border border-white/40 px-6 py-3 font-bold hover:bg-white/10">Explore tournaments <ArrowUpRight size={18}/></Link></div>
      </div>
      <div className="hidden min-h-[300px] lg:block" aria-hidden="true" />
    </div>
  </section>;
}
