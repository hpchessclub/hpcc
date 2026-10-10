export const dynamic = "force-dynamic";
import { mergeHpccNews } from "@/lib/hpccNewsAnnouncements";
import PageShell from "@/components/PageShell";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatDate } from "@/lib/format";
export default async function NewsPage() { const service = createSupabaseServiceClient(); const { data: storedNews } = await service.from("news_posts").select("*").order("published_at", { ascending: false }); const data = mergeHpccNews(storedNews || []); return <PageShell><main className="container-page py-12"><h1 className="text-4xl font-extrabold">News</h1><div className="mt-8 grid gap-6 md:grid-cols-3">{(data || []).map((n:any)=><Link key={n.id} href={`/news/${n.slug}`} className="card overflow-hidden hover:border-hpcc-blue">{n.image_url && <img src={n.image_url} alt={n.title} className="h-56 w-full object-cover"/>}<div className="p-5"><p className="text-xs font-bold text-hpcc-blue">{formatDate(n.published_at)}</p><h2 className="mt-2 text-xl font-extrabold">{n.title}</h2><p className="mt-2 text-sm text-slate-600">{n.summary}</p></div></Link>)}{(!data || data.length===0) && <div className="card p-6 text-slate-600 md:col-span-3">No news has been published yet.</div>}</div></main></PageShell> }
