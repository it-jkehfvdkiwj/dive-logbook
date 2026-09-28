"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/field";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { pluralize } from "@/lib/format";
import type { UserSummary } from "@/services/userService";

export function UsersPanel({ users, currentUserId }: { users: UserSummary[]; currentUserId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [toDelete, setToDelete] = useState<UserSummary | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    setFieldErrors({});
    try {
      await api.post("/api/users", { name, password });
      setMessage({ ok: true, text: `${name} can now log in with the password you set.` });
      setName("");
      setPassword("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        const details = err.details as { field?: string } | undefined;
        setFieldErrors(details?.field ? { [details.field]: [err.message] } : err.fieldErrors);
      }
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="-mx-1 flex flex-col">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-1 py-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium">
                {u.name}
                {u.id === currentUserId && <span className="text-muted-foreground"> (you)</span>}
              </div>
              <div className="text-[13px] text-muted-foreground">
                {u.isAdmin ? "Admin" : "Diver"} · {pluralize(u.diveCount ?? 0, "dive")}
              </div>
            </div>
            {!u.isAdmin && u.id !== currentUserId && (
              <Button variant="destructive-ghost" size="icon-sm" aria-label={`Delete ${u.name}`} onClick={() => setToDelete(u)}>
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="flex flex-col gap-3 border-t border-border/60 pt-4">
        <div className="text-sm font-medium">Add a diver</div>
        <Field id="new-user-name" label="Name" error={fieldErrors.name}>
          <Input id="new-user-name" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id="new-user-password" label="Password (their login)" error={fieldErrors.password} hint="At least 4 characters. Share it with your buddy.">
          <Input id="new-user-password" autoCapitalize="off" autoCorrect="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full sm:w-fit" disabled={pending || !name.trim() || password.length < 4}>
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Add diver
        </Button>
        {message && <p className={message.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{message.text}</p>}
      </form>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description={`All of ${toDelete?.name}'s dives, sightings and photos will be permanently deleted. The shared species catalog stays.`}
        confirmLabel="Delete diver"
        onConfirm={async () => {
          if (!toDelete) return;
          await api.delete(`/api/users/${toDelete.id}`);
          router.refresh();
        }}
      />
    </div>
  );
}
