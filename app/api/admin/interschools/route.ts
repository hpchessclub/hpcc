import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { INTERSCHOOL_CONFIG_SLUG, validateInterschoolConfig } from "@/lib/interschoolConfig";
export async function POST(req: Request) {
 const admin = await getCurrentAdmin();
 if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
 if (!canAccess(admin.profile.role, "interschools")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
 try {
  const config = validateInterschoolConfig(await req.json());
  const s = createSupabaseServiceClient();
  const { data, error } = await s.from("news_posts").upsert({ slug: INTERSCHOOL_CONFIG_SLUG, title: "Interschool Chess settings (internal)", content: JSON.stringify(config), is_published: false, publish_to_social: false, updated_at: new Date().toISOString() }, { onConflict: "slug" }).select("content").single();
  if (error) throw new Error(error.message);
  if (!data || data.content !== JSON.stringify(config)) throw new Error("Settings could not be verified. Please try again.");
  revalidatePath("/"); revalidatePath("/interschools"); revalidatePath("/club-admin/interschools");
  return NextResponse.json({ ok: true, config });
 } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Interschool Chess settings." }, { status: 400 }); }
}
