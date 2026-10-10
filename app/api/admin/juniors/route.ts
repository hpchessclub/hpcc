import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { JUNIOR_CONFIG_SLUG, validateJuniorConfig } from "@/lib/juniorConfig";
export async function POST(req: Request) {
 const admin = await getCurrentAdmin();
 if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
 if (!canAccess(admin.profile.role, "juniors")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
 try {
  const config = validateJuniorConfig(await req.json());
  const s = createSupabaseServiceClient();
  const { data, error } = await s.from("news_posts").upsert({ slug: JUNIOR_CONFIG_SLUG, title: "Junior Chess settings (internal)", content: JSON.stringify(config), is_published: false, publish_to_social: false, updated_at: new Date().toISOString() }, { onConflict: "slug" }).select("content").single();
  if (error) throw new Error(error.message);
  if (!data || data.content !== JSON.stringify(config)) throw new Error("Settings could not be verified. Please try again.");
  revalidatePath("/juniors"); revalidatePath("/club-admin/juniors");
  return NextResponse.json({ ok: true, config });
 } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Junior Chess settings." }, { status: 400 }); }
}
