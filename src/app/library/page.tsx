import Link from "next/link";

export const metadata = { title: "Library · Reel" };

// Milestone 4: grid of everything, image/video filter, prompt search.
export default function LibraryPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Library</h1>
      <p className="mt-2 text-muted">Search and filters are on the way. For now, everything you make is in your feed.</p>
      <Link href="/create" className="mt-4 inline-block text-accent underline">
        Back to Create
      </Link>
    </main>
  );
}
