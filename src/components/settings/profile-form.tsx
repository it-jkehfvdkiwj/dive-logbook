"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage } from "@/lib/api-client";

interface ProfileFormProps {
  displayName: string;
  syncOverwriteManualEdits: boolean;
}

export function ProfileForm({ displayName, syncOverwriteManualEdits }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [overwrite, setOverwrite] = useState(syncOverwriteManualEdits);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(next: { displayName: string; syncOverwriteManualEdits: boolean }) {
    setState("saving");
    setError(null);
    try {
      await api.put("/api/me", { name: next.displayName, syncOverwriteManualEdits: next.syncOverwriteManualEdits });
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 1500);
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save({ displayName: name, syncOverwriteManualEdits: overwrite });
        }}
      >
        <Input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoCapitalize="words" />
        <Button type="submit" variant="secondary" disabled={state === "saving" || !name.trim() || name === displayName}>
          {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <Check /> : null}
          Save
        </Button>
      </form>
      <label className="flex items-center justify-between gap-4 rounded-xl bg-secondary px-4 py-3">
        <span>
          <span className="block text-[15px] font-medium">Sync may overwrite my edits</span>
          <span className="block text-[13px] text-muted-foreground">
            Off: fields you changed manually on imported dives are kept during a sync.
          </span>
        </span>
        <Switch
          checked={overwrite}
          onCheckedChange={(v) => {
            setOverwrite(v);
            save({ displayName: name || displayName, syncOverwriteManualEdits: v });
          }}
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
