import {requireAdmin} from "@/lib/auth";
import {getPoppiesSettings} from "@/lib/poppiesSettings";
import PoppiesSettingsManager from "@/components/admin/PoppiesSettingsManager";
export default async function Page(){await requireAdmin("poppies");return <PoppiesSettingsManager initial={await getPoppiesSettings()}/>}
