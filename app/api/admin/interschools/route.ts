import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import {saveProgrammeRecords} from "@/lib/programmeRecords";
import { INTERSCHOOL_CONFIG_SLUG, validateInterschoolConfig } from "@/lib/interschoolConfig";
export async function POST(req: Request) {
 const admin = await getCurrentAdmin();
 if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
 if (!canAccess(admin.profile.role, "interschools")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
 try {
  const config = validateInterschoolConfig(await req.json());
  await saveProgrammeRecords(INTERSCHOOL_CONFIG_SLUG, "Interschool Chess settings (internal)", config);
  revalidatePath("/"); revalidatePath("/interschools"); revalidatePath("/club-admin/interschools");
  return NextResponse.json({ ok: true, config });
 } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Interschool Chess settings." }, { status: 400 }); }
}
