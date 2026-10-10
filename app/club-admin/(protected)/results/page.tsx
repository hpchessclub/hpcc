import {requireAdmin} from "@/lib/auth";
import {getSeasonResultsSettings} from "@/lib/seasonResultsSettings";
import SeasonResultsManager from "@/components/admin/SeasonResultsManager";
export default async function ResultsAdmin(){await requireAdmin("results");return <SeasonResultsManager initial={await getSeasonResultsSettings()}/>;}
