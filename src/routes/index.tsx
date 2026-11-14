import { createFileRoute } from "@tanstack/react-router";
import { LockViewer } from "@/components/lock/LockViewer";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "قفل J.B الذكي — مجسم ثلاثي الأبعاد بالوجهين" },
      { name: "description", content: "استكشف الوجهين الخارجي والداخلي لقفل J.B الذكي مثبتين على قطاع باب، مع تدوير وتقريب وتفاصيل مستمدة من صور المنتج." },
      { property: "og:title", content: "قفل J.B الذكي — مجسم ثلاثي الأبعاد بالوجهين" },
      { property: "og:description", content: "شاهد الوحدة الخارجية والوحدة الداخلية لقفل J.B من جميع الزوايا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main dir="rtl" className="relative h-screen w-full overflow-hidden bg-background">
      <header className="pointer-events-none absolute right-5 top-5 z-10 sm:right-7 sm:top-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:text-xs">J.B Access</p>
        <h1 className="mt-1 text-xl font-light text-foreground sm:text-2xl">القفل الذكي بالوجهين</h1>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">اسحب للتدوير · استخدم العجلة أو القرص للتقريب</p>
      </header>
      <LockViewer />
    </main>
  );
}
