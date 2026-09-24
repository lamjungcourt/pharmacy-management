import { guardDashboard } from "@/lib/authz";
import DashboardClient from "./DashboardClient";

// Server wrapper: users without Dashboard access are sent to the first page they ARE allowed to open.
export default async function Page() {
  await guardDashboard();
  return <DashboardClient />;
}
