"use client";

import { Loader2, FileSearch, ShieldCheck, Sparkles, ImageIcon } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProgressBar } from "@/components/findings/ProgressBar";

interface AnalyzingPageProps {
  filename: string;
  phase?: "parse" | "rules" | "render";
  onCancel?: () => void;
}

const STEPS = [
  { id: "parse" as const, icon: FileSearch, label: "Extracting slide metadata" },
  { id: "rules" as const, icon: ShieldCheck, label: "Running brand compliance rules" },
  { id: "render" as const, icon: ImageIcon, label: "Rendering slide previews" },
  { id: "ai" as const, icon: Sparkles, label: "Performing semantic review" },
];

const PHASE_PROGRESS: Record<string, number> = {
  parse: 25,
  rules: 55,
  render: 85,
};

export function AnalyzingPage({
  filename,
  phase = "parse",
  onCancel,
}: AnalyzingPageProps) {
  const activeIndex = STEPS.findIndex((s) => s.id === phase);

  return (
    <div className="app-canvas flex min-h-screen flex-col">
      <AppHeader
        title="Analyzing presentation"
        subtitle={filename}
        onBack={onCancel}
        backLabel="Cancel and go back"
      />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="animate-scale-in w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-10 shadow-[var(--shadow-xl)]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-ping rounded-2xl bg-[var(--accent)]/15" />
              <div className="brand-mark relative flex h-16 w-16 items-center justify-center rounded-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              Review in progress
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
              Your deck is being evaluated against ACME brand guidelines. Slide
              previews render via ConvertAPI when configured on Vercel.
            </p>
          </div>

          <ProgressBar
            progress={PHASE_PROGRESS[phase] ?? 25}
            label="Processing…"
            className="mb-8"
          />

          <ul className="space-y-3">
            {STEPS.filter((s) => s.id !== "ai").map((step, i) => {
              const isActive = step.id === phase;
              const isDone = activeIndex > i;
              return (
                <li
                  key={step.label}
                  className="animate-fade-in-up flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <step.icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive || isDone
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted-light)]"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isActive
                        ? "font-medium text-[var(--foreground)]"
                        : isDone
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                  )}
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-center text-xs text-[var(--muted-light)]">
            {filename}
          </p>
        </div>
      </main>
    </div>
  );
}
