"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api-client";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      await api.put("/api/me/password", { password });
      setPassword("");
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="new-password" className="text-sm font-medium">
        Change password
      </label>
      <div className="flex gap-2">
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={state === "saving" || password.length < 4}>
          {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <Check /> : null}
          Save
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {state === "saved" && <p className="text-sm text-primary">Password changed.</p>}
    </form>
  );
}
