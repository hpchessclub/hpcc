import { requireAdmin } from "@/lib/auth";
import { getJuniorSettings } from "@/lib/juniorSettings";
import JuniorSettingsManager from "@/components/admin/JuniorSettingsManager";
export default async function JuniorAdminPage() {
 await requireAdmin("juniors");
 return <JuniorSettingsManager initial={await getJuniorSettings()}/>;
}
