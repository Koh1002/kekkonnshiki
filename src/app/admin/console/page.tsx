import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminConsole } from "./Console";

export const dynamic = "force-dynamic";

export default function Page() {
  if (!isAdmin()) {
    redirect("/admin");
  }
  return <AdminConsole />;
}
