"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/field";
import { api, errorMessage } from "@/lib/api-client";
import type { ImportResult } from "@/importers/types";

interface SsiPanelProps {
  /** Maskierte E-Mail, wenn SSI_EMAIL/SSI_PASSWORD auf Vercel gesetzt sind */
  configuredEmail: string | null;
  autoSync: boolean;
}

function summary(r: ImportResult) {
  const parts = [`${r.created} new`, `${r.updated} updated`, `${r.skipped} unchanged`];
  if (r.errors.length) parts.push(`${r.errors.length} invalid`);
  return parts.join(" · ");
}

export function SsiPanel({ configuredEmail, autoSync }: SsiPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"sync" | "csv" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function sync(e?: React.FormEvent) {
    e?.preventDefault();
    setPending("sync");
    setMessage(null);
    try {
      const body = configuredEmail && !email ? {} : { email, password };
      const res = await api.post<ImportResult>("/api/import/ssi", body);
      setMessage({ ok: true, text: `Sync complete: ${summary(res)}` });
      setPassword("");
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setPending(null);
    }
  }

  async function onCsv(file: File) {
    setPending("csv");
    setMessage(null);
    try {
      const res = await api.post<ImportResult>("/api/import/ssi-csv", { csv: await file.text() });
      setMessage({ ok: true, text: `CSV imported: ${summary(res)}` });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setPending(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {configuredEmail ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 text-[14px]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Connected as <b>{configuredEmail}</b>
              <span className="block text-[13px] text-muted-foreground">
                {autoSync ? "Automatic sync every night (04:00 UTC)." : "Tap “Sync now” to download new dives."}
              </span>
            </span>
          </div>
          <Button onClick={() => sync()} disabled={!!pending} className="w-full sm:w-fit">
            {pending === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Sync now
          </Button>
        </div>
      ) : (
        <form onSubmit={sync} className="flex flex-col gap-3">
          <p className="text-[13px] text-muted-foreground">
            Your SSI login is only used for this download and is not stored.
          </p>
          <Field id="ssi-email" label="SSI e-mail">
            <Input
              id="ssi-email"
              type="email"
              autoComplete="username"
              autoCapitalize="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field id="ssi-password" label="SSI password">
            <Input
              id="ssi-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={!!pending || !email || !password} className="w-full sm:w-fit">
            {pending === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Download dives from SSI
          </Button>
        </form>
      )}

      {pending === "sync" && (
        <p className="text-[13px] text-muted-foreground">The first sync can take up to a few minutes – please keep this page open.</p>
      )}
      {message && (
        <p role="status" className={message.ok ? "text-[14px] font-medium text-primary" : "text-[14px] text-destructive"}>
          {message.text}
        </p>
      )}

      <div className="border-t border-border/60 pt-3">
        <p className="mb-2 text-[13px] text-muted-foreground">
          Alternative: upload the CSV export from my.divessi.com (fewer fields).
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
        />
        <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={!!pending}>
          {pending === "csv" ? <Loader2 className="animate-spin" /> : <FileUp />}
          Upload SSI CSV
        </Button>
      </div>
    </div>
  );
}
