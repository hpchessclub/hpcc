export const dynamic = "force-dynamic";
import { hpccNewsAnnouncements } from "@/lib/hpccNewsAnnouncements";
import MeetingSummary from "@/components/MeetingSummary";
import PageShell from "@/components/PageShell";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";

export default async function NewsDetail({ params }: { params: Promise<{slug:string}> }) {
  const { slug } = await params;
  const service = createSupabaseServiceClient();
  const { data:stored } = await service.from("news_posts").select("*").eq("slug", slug).maybeSingle();
  if (stored?.is_published === false) notFound();
  const n = stored || hpccNewsAnnouncements.find(item => item.slug === slug);
  if(!n) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const url = `${site}/news/${n.slug}`;
  return <PageShell><main className="container-page py-12"><article data-content-source={stored?"database":"announcement"} className="card overflow-hidden">{n.image_url && <img src={n.image_url} alt={n.title} className="h-96 w-full object-cover"/>}<div className="p-8"><p className="text-sm font-bold text-hpcc-blue">{formatDate(n.published_at)}</p><h1 className="mt-2 text-4xl font-extrabold">{n.title}</h1><div className="mt-4 flex flex-wrap gap-2"><a className="btn-secondary py-2" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Share to Facebook</a><a className="btn-secondary py-2" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(n.title)}`}>Share to X</a><a className="btn-secondary py-2" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>Share to LinkedIn</a></div><MeetingSummary text={n.content}/></div></article></main></PageShell>
}
