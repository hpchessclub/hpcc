import Link from "next/link";
import {formatDate,formatMoney} from "@/lib/format";
import {displayRatingFormat,displayRatingType,displayTournamentSystem} from "@/lib/tournamentOptions";

export default function TournamentCard({tournament:t,phase}:{tournament:any;phase?:string}){
 const image=t.tournament_image_url||t.image_url||"/images/hpcc-king-wide-small.jpg";
 const free=t.tournament_type==="club_calendar"&&t.require_payment===false&&Number(t.entry_fee_cents||0)===0;
 const fee=free?"Free for active members":Number(t.entry_fee_cents)>0?formatMoney(Number(t.entry_fee_cents)):"Fee to be confirmed";
 return <article className="card overflow-hidden sm:flex" aria-label={t.title}>
  <Link href={`/tournaments/${t.slug}`} className="block shrink-0 bg-hpcc-pale sm:w-[180px]" aria-label={`View ${t.title}`}><img src={image} alt={t.tournament_image_url||t.image_url?`${t.title} tournament poster`:""} loading="lazy" className={`h-40 w-full sm:h-full sm:min-h-[180px] ${t.tournament_image_url||t.image_url?'object-contain':'object-cover object-right'}`}/></Link>
  <div className="min-w-0 flex-1 p-4"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold">{t.date_display||formatDate(t.start_date)}</p>{phase&&<span className="rounded bg-hpcc-pale px-2 py-0.5 text-[10px] font-bold text-hpcc-blue">{phase}</span>}</div>
   <h3 className="mt-2 text-base font-bold leading-snug"><Link href={`/tournaments/${t.slug}`}>{t.title}</Link></h3>
   <p className="mt-2 text-xs leading-5 text-stone-700">{displayRatingFormat(t)} · {t.time_control||t.custom_time_control||"Time TBC"} · {displayTournamentSystem(t)} · {displayRatingType(t)}</p>
   <p className="mt-1 text-xs leading-5 text-stone-600">{t.venue_name||t.venue||"Venue to be confirmed"}</p><p className="mt-1 text-xs font-bold">{fee}</p>
   <div className="mt-3 flex flex-wrap gap-2"><Link href={`/tournaments/${t.slug}`} className="btn-secondary px-4 py-1.5 text-xs">View Details</Link>{t.status==='open'&&t.allow_public_registration&&<Link href={`/tournaments/${t.slug}/register`} className="btn-primary px-4 py-1.5 text-xs">Register</Link>}{t.show_public_entries&&['open','closed','completed'].includes(t.status)&&<Link href={`/tournaments/${t.slug}/entries`} className="btn-secondary px-4 py-1.5 text-xs">View Entries</Link>}<Link href={`/absence?tournament=${encodeURIComponent(t.title)}`} aria-label={`Report absence for ${t.title}`} className="btn-secondary px-4 py-1.5 text-xs">Report Absence</Link>{t.vega_url&&<a href={t.vega_url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-4 py-1.5 text-xs">Vega Results ↗</a>}</div>
  </div>
 </article>;
}
