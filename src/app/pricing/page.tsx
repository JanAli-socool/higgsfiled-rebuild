import Link from "next/link";

export const metadata = { title: "Credits · Reel" };

// Milestone 4: credit packs with Stripe Checkout (test mode).
export default function PricingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Credits</h1>
      <p className="mt-2 text-muted">
        Fast drafts cost 1 credit, high-quality images 4, and a 5-second video 20. Credit packs are coming soon.
      </p>
      <Link href="/create" className="mt-4 inline-block text-accent underline">
        Back to Create
      </Link>
    </main>
  );
}
