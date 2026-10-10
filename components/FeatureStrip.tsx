import Link from "next/link";
import { GraduationCap, Trophy, CalendarDays, Users, ArrowUpRight } from "lucide-react";
const items = [
  { icon: Users, title: "Club membership", text: "Join, renew or find your member record", href: "/join#membership-search" },
  { icon: GraduationCap, title: "Learn & improve", text: "Explore coaching opportunities", href: "/coaching" },
  { icon: CalendarDays, title: "Club calendar", text: "See what is coming up at HPCC", href: "/calendar" },
  { icon: Trophy, title: "Play & compete", text: "Find tournaments and event details", href: "/tournaments" }
];
export default function FeatureStrip() {
  return <section className="border-b border-stone-200 bg-[#FAFAF9]"><div className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">{items.map(({icon:Icon,title,text,href})=><Link href={href} key={title} className="group flex items-start gap-3"><Icon className="mt-1 h-6 w-6 shrink-0 text-[#555555]"/><div><div className="flex items-center gap-2 font-bold text-[#171717]">{title}<ArrowUpRight size={15} className="transition group-hover:translate-x-1"/></div><p className="mt-1 text-sm text-stone-600">{text}</p></div></Link>)}</div></section>;
}
