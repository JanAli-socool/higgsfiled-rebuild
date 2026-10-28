import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Library } from "@/components/library";

export const metadata = { title: "Library · Reel" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/library");
  const { kind, q } = await searchParams;
  return (
    <Library
      isGuest={user.is_anonymous ?? false}
      initialKind={kind === "image" || kind === "video" ? kind : "all"}
      initialQuery={q?.slice(0, 200) ?? ""}
    />
  );
}
