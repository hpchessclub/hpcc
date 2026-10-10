import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function Hero() {
  return <section className="relative overflow-hidden bg-hpcc-pale text-hpcc-navy md:aspect-[3/1] md:flex md:items-center">
    <div className="absolute inset-0" aria-hidden="true">
      <Image src="/images/hpcc-king-wide.jpg" alt="" fill priority sizes="100vw" className="object-cover object-right md:object-center" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-hpcc-pale/90 via-hpcc-pale/60 to-transparent md:from-hpcc-pale/35 md:via-transparent" aria-hidden="true" />
    <div className="container-page relative w-full grid gap-6 py-7 md:grid-cols-[1.1fr_1fr] md:items-center lg:py-9">
      <div className="relative max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-hpcc-blue">Howick-Pakuranga Chess Club · East Auckland</p>
        <h1 className="mt-4 hpcc-display text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-[2.75rem]">Learn. Play. Grow<br/><span className="text-hpcc-blue">with HPCC.</span></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-hpcc-navy/85">A place to learn, compete and connect. Discover club chess, school competitions and community programmes with HPCC.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/join" className="inline-flex items-center gap-3 rounded-full bg-hpcc-navy px-5 py-2.5 text-sm font-bold text-white">Join the club <ArrowUpRight size={18}/></Link><Link href="/tournaments" className="inline-flex items-center gap-3 rounded-full border border-hpcc-navy/40 px-5 py-2.5 text-sm font-bold hover:bg-hpcc-accent">Explore tournaments <ArrowUpRight size={18}/></Link></div>
      </div>
      <div className="hidden h-64 md:block lg:h-72" aria-hidden="true" />
    </div>
  </section>;
}
