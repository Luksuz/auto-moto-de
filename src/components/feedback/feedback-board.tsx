"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import type { FeedbackStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createFeedbackItem,
  updateFeedbackStatus,
  deleteFeedbackItem,
  addFeedbackComment,
} from "@/lib/actions/feedback";

export interface FeedbackCommentDTO {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}
export interface FeedbackItemDTO {
  id: string;
  title: string;
  body: string | null;
  status: FeedbackStatus;
  author: string;
  createdAt: string;
  comments: FeedbackCommentDTO[];
}

const COLUMNS: { status: FeedbackStatus; label: string; tint: string; dot: string }[] = [
  { status: "TODO", label: "Za napraviti", tint: "bg-surface-2", dot: "bg-muted" },
  { status: "IN_PROGRESS", label: "U tijeku", tint: "bg-primary/5", dot: "bg-primary" },
  { status: "DONE", label: "Završeno", tint: "bg-success/5", dot: "bg-success" },
];

const ORDER: FeedbackStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackBoard({ items }: { items: FeedbackItemDTO[] }) {
  const router = useRouter();
  const [author, setAuthor] = useState("Klijent");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kupiauto-feedback-author");
    if (saved) setAuthor(saved);
  }, []);

  function saveAuthor(v: string) {
    setAuthor(v);
    localStorage.setItem("kupiauto-feedback-author", v);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="w-full max-w-xs">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Tvoje ime (potpis uz komentare)
          </label>
          <Input
            value={author}
            onChange={(e) => saveAuthor(e.target.value)}
            placeholder="npr. Luka ili Klijent"
          />
        </div>
        <Button onClick={() => setAdding(true)} variant="accent">
          <Plus className="size-4" /> Nova stavka
        </Button>
      </div>

      {adding && (
        <NewItemForm
          author={author}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col.status);
          return (
            <div key={col.status} className={cn("rounded-xl p-3", col.tint)}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", col.dot)} />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    {col.label}
                  </h2>
                </div>
                <Badge variant="neutral">{colItems.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {colItems.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted">
                    Nema stavki
                  </p>
                )}
                {colItems.map((item) => (
                  <FeedbackCard key={item.id} item={item} author={author} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewItemForm({
  author,
  onClose,
  onSaved,
}: {
  author: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createFeedbackItem({ title, body, author });
      if (res.ok) {
        setTitle("");
        setBody("");
        onSaved();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mb-5 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Nova stavka</h3>
        <button onClick={onClose} className="text-muted hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>
      <div className="space-y-3">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Naslov (npr. Promijeni boju gumba u heroju)"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Detaljniji opis (opcionalno)…"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={submit} disabled={pending || !title.trim()}>
            {pending ? "Spremam…" : "Dodaj stavku"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedbackCard({
  item,
  author,
}: {
  item: FeedbackItemDTO;
  author: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();

  const idx = ORDER.indexOf(item.status);

  function move(dir: -1 | 1) {
    const next = ORDER[idx + dir];
    if (!next) return;
    start(async () => {
      await updateFeedbackStatus(item.id, next);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Obrisati ovu stavku?")) return;
    start(async () => {
      await deleteFeedbackItem(item.id);
      router.refresh();
    });
  }

  function sendComment() {
    if (!comment.trim()) return;
    start(async () => {
      const res = await addFeedbackComment({ itemId: item.id, author, body: comment });
      if (res.ok) {
        setComment("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
        <button
          onClick={remove}
          disabled={pending}
          className="shrink-0 text-muted hover:text-red-600"
          aria-label="Obriši"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {item.body && (
        <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground/75">
          {item.body}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <span className="font-medium text-foreground/70">{item.author}</span>
        <span>•</span>
        <span>{fmtDate(item.createdAt)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={pending || idx === 0}
            onClick={() => move(-1)}
            aria-label="Pomakni lijevo"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={pending || idx === ORDER.length - 1}
            onClick={() => move(1)}
            aria-label="Pomakni desno"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary"
        >
          <MessageSquare className="size-3.5" />
          {item.comments.length}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {item.comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-surface-2 p-2.5">
              <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                <span className="font-semibold text-foreground/80">{c.author}</span>
                <span>•</span>
                <span>{fmtDate(c.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-xs text-foreground/80">
                {c.body}
              </p>
            </div>
          ))}
          <div className="flex items-end gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Dodaj komentar…"
              className="min-h-10 flex-1 text-xs"
              rows={2}
            />
            <Button
              size="icon"
              onClick={sendComment}
              disabled={pending || !comment.trim()}
              aria-label="Pošalji"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
