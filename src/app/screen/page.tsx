import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ScreenView } from "./ScreenView";

export const dynamic = "force-dynamic";

export default function Page() {
  const role = cookies().get("kekkon_role")?.value;
  if (role !== "screen") {
    redirect("/");
  }
  return <ScreenView />;
}
