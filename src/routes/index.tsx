import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Upload, Loader2, Sparkles, FileAudio, CheckCircle2, ListChecks, Gavel, Mic } from "lucide-react";
import { summarizeAudio } from "@/lib/summarize.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meeting Summarizer AI — Audio to transcript & summary" },
      {
        name: "description",
        content:
          "Upload meeting audio and instantly get a clean transcript, key points, decisions, and action items powered by AI.",
      },
      { property: "og:title", content: "Meeting Summarizer AI" },
      {
        property: "og:description",
        content: "Turn meeting recordings into transcripts and structured summaries in seconds.",
      },
    ],
  }),
  component: Index,
});

type Result = Awaited<ReturnType<typeof summarizeAudio>>;

function Index() {
  const summarize = useServerFn(summarizeAudio);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const result = r.result as string;
        res(result.split(",")[1] ?? "");
      };
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  async function handleProcess() {
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const audioBase64 = await fileToBase64(file);
      const out = await summarize({ data: { audioBase64, mimeType: file.type || "audio/mpeg" } });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("audio")) setFile(f);
  }

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "var(--gradient-hero)" }}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Mic className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Scribe</span>
        </div>
        <span className="text-xs text-muted-foreground">Meeting Summarizer AI</span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <section className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powered by Lovable AI
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Turn meetings into{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              clear summaries
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
            Drop in an audio recording. Get a clean transcript, key decisions, and action items in
            seconds.
          </p>
        </section>

        <section className="mt-12">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-3xl border border-border bg-card/50 p-8 backdrop-blur-xl"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {!file ? (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-background/30 px-6 py-16 text-center transition hover:border-primary/60 hover:bg-background/50"
              >
                <Upload className="mb-4 h-8 w-8 text-primary" />
                <span className="text-base font-medium">Drop audio file or click to upload</span>
                <span className="mt-1 text-sm text-muted-foreground">
                  MP3, WAV, M4A, WebM, OGG · up to ~20 min works best
                </span>
              </button>
            ) : (
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <FileAudio className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                    className="rounded-xl border border-border bg-background/40 px-4 py-2 text-sm font-medium transition hover:bg-background/70"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Summarize
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
          </div>
        </section>

        {result && (
          <section className="mt-10 space-y-6">
            <div className="rounded-3xl border border-border bg-card/60 p-8 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-widest text-primary">Summary</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{result.title}</h2>
              <p className="mt-3 text-muted-foreground">{result.summary}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card icon={<ListChecks className="h-4 w-4" />} title="Key points">
                {result.key_points.length === 0 ? (
                  <Empty>No key points detected.</Empty>
                ) : (
                  <ul className="space-y-2">
                    {result.key_points.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card icon={<CheckCircle2 className="h-4 w-4" />} title="Action items">
                {result.action_items.length === 0 ? (
                  <Empty>No action items detected.</Empty>
                ) : (
                  <ul className="space-y-3">
                    {result.action_items.map((a, i) => (
                      <li key={i} className="rounded-xl bg-background/40 p-3 text-sm">
                        <div>{a.task}</div>
                        {a.owner && (
                          <div className="mt-1 text-xs text-primary">@ {a.owner}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card icon={<Gavel className="h-4 w-4" />} title="Decisions">
                {result.decisions.length === 0 ? (
                  <Empty>No explicit decisions detected.</Empty>
                ) : (
                  <ul className="space-y-2">
                    {result.decisions.map((d, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card icon={<FileAudio className="h-4 w-4" />} title="Transcript">
                <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-background/40 p-4 text-sm leading-relaxed">
                  {result.transcript}
                </div>
              </Card>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
