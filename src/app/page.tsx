import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function Home() {
  if (await getUser()) redirect("/create");
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4">
      <p className="text-sm font-medium text-accent">Reel</p>
      <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Make a still. Then make it move.</h1>
      <p className="text-lg text-muted">
        One workspace for images and video. Direct the camera with a few words, see what every take costs before you
        run it, and turn any frame into a shot.
      </p>
      <div>
        <Link href="/sign-in" className="inline-block rounded-card bg-accent px-5 py-3 font-medium text-accent-text">
          Start creating
        </Link>
      </div>
    </main>
  );
}
