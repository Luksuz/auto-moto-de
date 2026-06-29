import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FeedbackBoard, type FeedbackItemDTO } from "@/components/feedback/feedback-board";

export const metadata: Metadata = {
  title: "Feedback ploča",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const items = await prisma.feedbackItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  const dto: FeedbackItemDTO[] = items.map((i) => ({
    id: i.id,
    title: i.title,
    body: i.body,
    status: i.status,
    author: i.author,
    createdAt: i.createdAt.toISOString(),
    comments: i.comments.map((c) => ({
      id: c.id,
      author: c.author,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-600">
          Privremeno • interno
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-navy">
          Feedback ploča
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ostavljaj komentare, prijedloge i primjedbe na izradu stranice. Pomakni
          stavke kroz statuse <strong>Za napraviti → U tijeku → Završeno</strong> i
          dodaj komentare za lakšu komunikaciju.
        </p>
      </div>
      <FeedbackBoard items={dto} />
    </div>
  );
}
