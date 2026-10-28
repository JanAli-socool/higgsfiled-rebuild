import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in · Reel" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <p className="text-sm font-medium text-accent">Reel</p>
        <h1 className="mt-1 text-2xl font-semibold">Sign in to start creating</h1>
        <p className="mt-2 text-sm text-muted">New accounts get 100 free credits, about 25 high-quality images.</p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
