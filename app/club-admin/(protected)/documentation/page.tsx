import { requireAdmin } from "@/lib/auth";
export default async function DocumentationPage() {
 await requireAdmin("documentation");
 return <main className="space-y-4"><h1 className="text-2xl font-bold">HPCC Administration Guide</h1><p>Manage membership fees, club information and payment accounts before opening registrations. Create tournaments with the correct event type and a selected HPCC payment account.</p><p>Use member search to select a record, review payment status and confirm payments only after checking the bank transaction. Preview content and bulk emails before publishing or sending.</p><p>HPCC email providers, payment processing and address lookup require separate HPCC configuration. Deployment and database rebuild instructions are in the repository README.</p></main>;
}
