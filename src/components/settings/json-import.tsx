"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import type { ImportResult } from "@/importers/types";

export function JsonImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File) {
    setPending(true);
    setMessage(null);
    try {
      const payload: unknown = JSON.parse(await file.text());
      const res = await api.post<ImportResult>("/api/import/json", payload);
      setMessage({
        ok: res.errors.length === 0,
        text: `${res.created} created · ${res.updated} updated · ${res.skipped} unchanged/skipped${res.errors.length ? ` · ${res.errors.length} invalid` : ""}`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof SyntaxError ? "This file is not valid JSON." : errorMessage(err) });
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button variant="secondary" size="sm" className="w-fit" onClick={() => input.current?.click()} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <FileUp />}
        Import JSON file
      </Button>
      {message && <p className={message.ok ? "text-[13px] text-muted-foreground" : "text-[13px] text-destructive"}>{message.text}</p>}
    </div>
  );
}
