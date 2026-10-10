import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function Hero() {
  return <section className="relative overflow-hidden bg-hpcc-pale text-hpcc-navy">
    <div className="container-page relative grid gap-6 py-7 md:grid-cols-[1.1fr_1fr] md:items-center lg:py-9">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-hpcc-blue">Howick-Pakuranga Chess Club · East Auckland</p>
        <h1 className="mt-4 hpcc-display text-3xl font-bold leading-[1.15] tracking-tight md:text-4xl lg:text-[2.75rem]">Learn. Play. Grow<br/><span className="text-hpcc-blue">with HPCC.</span></h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-hpcc-navy/85">A place to learn, compete and connect. Discover club chess, school competitions and community programmes with HPCC.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/join" className="inline-flex items-center gap-3 rounded-full bg-hpcc-navy px-5 py-2.5 text-sm font-bold text-white">Join the club <ArrowUpRight size={18}/></Link><Link href="/tournaments" className="inline-flex items-center gap-3 rounded-full border border-hpcc-navy/40 px-5 py-2.5 text-sm font-bold hover:bg-hpcc-accent">Explore tournaments <ArrowUpRight size={18}/></Link></div>
      </div>
      <div className="relative h-48 overflow-hidden rounded-2xl sm:h-56 md:h-64 lg:h-72"><Image src="/images/hpcc-king-4k.jpg" alt="Silver king chess piece on a light-green chessboard" fill priority sizes="(min-width: 768px) 48vw, 100vw" className="object-cover object-[78%_center]" /></div>
    </div>
  </section>;
}
