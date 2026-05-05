import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ScreenView } from "./ScreenView";

export const dynamic = "force-dynamic";

// /screen?auth=<SCREEN_ACCOUNT_NAME> でも入れるようにしておく。
// /api/screen-auth に投げて Cookie を発行 → /screen に戻る。
export default function Page({
  searchParams,
}: {
  searchParams: { auth?: string };
}) {
  const role = cookies().get("kekkon_role")?.value;
  if (role === "screen") return <ScreenView />;

  if (searchParams.auth) {
    redirect(`/api/screen-auth?token=${encodeURIComponent(searchParams.auth)}`);
  }
  redirect("/");
}
