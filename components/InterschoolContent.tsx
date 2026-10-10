import MeetingSummary from "@/components/MeetingSummary";
import { InterschoolConfig } from "@/lib/interschoolConfig";
export default function InterschoolContent({config:c}:{config:InterschoolConfig}) {
 return <main className="container-page py-10"><section className="rounded-2xl bg-hpcc-accent p-6 md:p-10"><p className="text-xs font-bold uppercase tracking-widest">For schools</p><h1 className="hpcc-display mt-3 text-3xl font-bold md:text-4xl">{c.title}</h1><p className="mt-4 leading-7">{c.introduction}</p><a href={c.enquiryUrl} className="btn-primary mt-6">School enquiries</a></section><article className="card mt-8 p-6 md:p-8"><MeetingSummary text={c.content}/></article></main>;
}
