import {readCommittee} from "@/lib/committeeStorage";
import {readClubPublicSettings} from "@/lib/clubPublicSettings";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import SettingsManager from "@/components/admin/SettingsManager";

export default async function SettingsAdmin(){
  await requireAdmin("settings");
  const s=createSupabaseServiceClient();
  const {data}=await s.from("club_settings").select("*").eq("id","default").maybeSingle();
  const publicSettings=await readClubPublicSettings(s,data||{});const committee=await readCommittee(s,publicSettings);
  return <SettingsManager initial={publicSettings} exists={!!data} committee={committee} />;
}
