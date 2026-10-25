import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import {saveProgrammeRecords} from "@/lib/programmeRecords";
import { POPPIES_CONFIG_SLUG, validatePoppiesConfig } from "@/lib/poppiesConfig";
export async function POST(req: Request) {
 const admin = await getCurrentAdmin();
 if (!admin) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
 if (!canAccess(admin.profile.role, "poppies")) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
 try {
  const config = validatePoppiesConfig(await req.json());
  await saveProgrammeRecords(POPPIES_CONFIG_SLUG, "Poppies Chess settings (internal)", config);
  revalidatePath("/"); revalidatePath("/poppies"); revalidatePath("/club-admin/poppies");
  return NextResponse.json({ ok: true, config });
 } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save Poppies Chess settings." }, { status: 400 }); }
}
