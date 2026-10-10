import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { POPPIES_CONFIG_SLUG, validatePoppiesConfig } from "@/lib/poppiesConfig";
export async function POST(req: Request) {
 const admin = await getCurrentAdmin();
 if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
 if (!canAccess(admin.profile.role, "poppies")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
 try {
  const config = validatePoppiesConfig(await req.json());
  const s = createSupabaseServiceClient();
  const { data, error } = await s.from("news_posts").upsert({ slug: POPPIES_CONFIG_SLUG, title: "Poppies Chess settings (internal)", content: JSON.stringify(config), is_published: false, publish_to_social: false, updated_at: new Date().toISOString() }, { onConflict: "slug" }).select("content").single();
  if (error) throw new Error(error.message);
  if (!data || data.content !== JSON.stringify(config)) throw new Error("Settings could not be verified. Please try again.");
  revalidatePath("/"); revalidatePath("/poppies"); revalidatePath("/club-admin/poppies");
  return NextResponse.json({ ok: true, config });
 } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Poppies Chess settings." }, { status: 400 }); }
}
