import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign in · Reel" };

// Asks Supabase which providers are switched on, so a button never leads to a "provider not enabled" error.
// Asked on every visit: a cached answer kept the button hidden after Google was switched on.
async function googleEnabled() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}

export default async function SignInPage() {
  const google = await googleEnabled();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Sign in to start creating</h1>
        <p className="mt-2 text-sm text-muted">New accounts get 100 free credits, about 25 high-quality images.</p>
      </div>
      <Suspense>
        <SignInForm google={google} />
      </Suspense>
    </main>
  );
}
