import { createFileRoute } from "@tanstack/react-router";
import { LockViewer } from "@/components/lock/LockViewer";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "J.B Access Smart Lock — Interactive 3D" },
      { name: "description", content: "Explore the J.B Access smart door lock in interactive 3D: rotate, zoom and inspect every detail." },
      { property: "og:title", content: "J.B Access Smart Lock — Interactive 3D" },
      { property: "og:description", content: "Rotate and zoom the J.B Access smart lock in 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <header className="pointer-events-none absolute left-6 top-6 z-10">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">J.B Access</p>
        <h1 className="mt-1 text-2xl font-light text-foreground">Smart Door Lock</h1>
        <p className="mt-1 text-xs text-muted-foreground">Drag to rotate · Scroll or pinch to zoom</p>
      </header>
      <LockViewer />
    </main>
  );
}
