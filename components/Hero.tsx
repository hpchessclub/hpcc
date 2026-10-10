import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function Hero() {
  return <section className="relative overflow-hidden bg-hpcc-pale text-hpcc-navy md:aspect-[15/4] md:flex md:items-center">
    <div className="absolute inset-0" aria-hidden="true">
      <Image src="/images/hpcc-king-wide-small.jpg" alt="" fill priority sizes="100vw" className="object-cover object-right md:object-center" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-hpcc-pale/90 via-hpcc-pale/60 to-transparent md:from-hpcc-pale/35 md:via-transparent" aria-hidden="true" />
    <div className="container-page relative w-full grid gap-6 py-[1.4rem] md:grid-cols-[1.1fr_1fr] md:items-center lg:py-[1.8rem]">
      <div className="relative max-w-md">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-hpcc-blue">Howick-Pakuranga Chess Club · East Auckland</p>
        <h1 className="mt-[0.8rem] hpcc-display text-2xl font-bold leading-[1.15] tracking-tight md:text-[1.8rem] lg:text-[2.2rem]">Learn. Play. Grow<br/><span className="text-hpcc-blue">with HPCC.</span></h1>
        <p className="mt-[0.8rem] max-w-md text-[0.7rem] leading-[1.2rem] text-hpcc-navy/85">A place to learn, compete and connect. Discover club chess, school competitions and community programmes with HPCC.</p>
        <div className="mt-[1.2rem] flex flex-wrap gap-3"><Link href="/join" className="inline-flex items-center gap-3 rounded-full bg-hpcc-navy px-4 py-2 text-[0.7rem] font-bold text-white">Join the club <ArrowUpRight size={14}/></Link><Link href="/tournaments" className="inline-flex items-center gap-3 rounded-full border border-hpcc-navy/40 px-4 py-2 text-[0.7rem] font-bold hover:bg-hpcc-accent">Explore tournaments <ArrowUpRight size={14}/></Link></div>
      </div>
      <div className="hidden h-[12.8rem] md:block lg:h-[14.4rem]" aria-hidden="true" />
    </div>
  </section>;
}
