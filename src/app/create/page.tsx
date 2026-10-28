import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Workspace } from "@/components/workspace";

export const metadata = { title: "Create · Reel" };

export default async function CreatePage() {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/create");
  return <Workspace isGuest={user.is_anonymous ?? false} />;
}
