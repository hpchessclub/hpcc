import {requireAdmin} from "@/lib/auth";
import TournamentsAdmin from "../tournaments/page";
import ImportTournamentResults from "@/components/admin/ImportTournamentResults";
export default async function ResultsAdmin(){await requireAdmin("results");return <><ImportTournamentResults/><TournamentsAdmin/></>;}
