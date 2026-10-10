import { requireAdmin } from "@/lib/auth";
import { getInterschoolSettings } from "@/lib/interschoolSettings";
import InterschoolSettingsManager from "@/components/admin/InterschoolSettingsManager";
export default async function InterschoolAdminPage() {
 await requireAdmin("interschools");
 return <InterschoolSettingsManager initial={await getInterschoolSettings()}/>;
}
