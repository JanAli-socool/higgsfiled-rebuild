import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { StartFree } from "./start-free";

const STEPS = [
  { title: "Draft stills for a credit each", body: "Try ideas fast. Add a look like 35mm film or Noir, and see the exact words it adds." },
  { title: "Pick a frame and press Animate", body: "Your prompt carries over. Add camera moves like #push-in or #orbit, in the order you want them." },
  { title: "Know the cost before you run", body: "Every take shows its price and what you'll have left. Failed or cancelled takes are refunded on their own." },
];

export default async function Home() {
  if (await getUser()) redirect("/create");
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-4">
        <Logo />
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/pricing" className="text-muted hover:text-text">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-muted hover:text-text">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Make a still.
              <br />
              <span className="text-accent">Then make it move.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              One workspace for images and video. Direct the camera in a few words, see what every take costs before you run
              it, and turn any frame into a shot.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <StartFree className="rounded-card bg-accent px-5 py-3 font-medium text-accent-text transition-transform hover:-translate-y-0.5">
                Start free, no account needed
              </StartFree>
              <span className="text-sm text-muted">30 credits to try. 100 with an account.</span>
            </div>
          </div>

          <figure className="relative">
            <div className="grid grid-cols-2 gap-3">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/samples/lighthouse.jpg" alt="A still: a lighthouse on a sea cliff at dusk" className="aspect-[3/4] w-full rounded-card border border-border object-cover" />
                <p className="mt-2 text-xs text-muted">1 · the still</p>
              </div>
              <div>
                <video
                  src="/samples/lighthouse.mp4"
                  poster="/samples/lighthouse.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label="The same frame animated: waves crash and the camera pushes in"
                  className="aspect-[3/4] w-full rounded-card border border-accent/50 object-cover shadow-float"
                />
                <p className="mt-2 text-xs text-muted">2 · the shot</p>
              </div>
            </div>
            <figcaption className="mt-3 rounded-card border border-border bg-surface px-3 py-2 font-mono text-xs text-muted">
              waves crash against the cliff below, clouds drift, the lamp glows <span className="rounded bg-accent-soft px-1 text-accent">#push-in</span>
            </figcaption>
          </figure>
        </section>

        <section className="grid gap-4 border-t border-border py-12 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-card border border-border bg-surface p-5">
              <p className="font-mono text-xs text-accent">0{i + 1}</p>
              <h2 className="mt-2 font-medium">{s.title}</h2>
              <p className="mt-1.5 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap gap-4 border-t border-border px-4 py-6 text-xs text-muted">
        <span>Reel · a 24-hour prototype</span>
        <Link href="/pricing" className="hover:text-text">
          Pricing
        </Link>
      </footer>
    </div>
  );
}
