import { PageHeader } from "@/components/layout/page-header";
import { ThemeSelector } from "@/components/common/theme-selector";
import { ProfileForm } from "@/components/settings/profile-form";
import { JsonImport } from "@/components/settings/json-import";
import { DemoDataPanel } from "@/components/settings/demo-data-panel";
import { LogoutButton } from "@/components/settings/logout-button";
import { SsiPanel } from "@/components/settings/ssi-panel";
import { ssiCredentialsFromEnv } from "@/importers/ssiImporter";
import { isAuthEnabled } from "@/lib/auth";
import { IMPORT_SOURCES } from "@/importers/registry";
import { cn } from "@/lib/utils";
import { countDemoDives } from "@/services/demoDataService";
import { listImportRuns } from "@/services/importService";
import { listUsers } from "@/services/userService";
import { requirePageUser } from "@/lib/current-user";
import { PasswordForm } from "@/components/settings/password-form";
import { UsersPanel } from "@/components/settings/users-panel";
import { SpeciesSettings } from "@/components/settings/species-settings";
import { countSpeciesToEnrich } from "@/services/speciesService";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function SettingsPage() {
  const user = await requirePageUser();
  const [demoDives, runs, users, toEnrich] = await Promise.all([
    countDemoDives(user.id),
    listImportRuns(user.id, 8),
    user.isAdmin ? listUsers() : Promise.resolve([]),
    countSpeciesToEnrich(),
  ]);
  const ssi = user.isAdmin ? ssiCredentialsFromEnv() : null;
  const maskedEmail = ssi ? ssi.email.replace(/^(.)(.*)(@.*)$/, (_m, a: string, b: string, c: string) => a + "•".repeat(Math.min(b.length, 6)) + c) : null;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex max-w-2xl flex-col gap-6">
        <Section title="Appearance">
          <ThemeSelector />
        </Section>

        <Section title="Marine Life">
          <SpeciesSettings lang={user.speciesNameLang} missing={toEnrich} />
        </Section>

        <Section title="Profile & Sync">
          <ProfileForm displayName={user.name} syncOverwriteManualEdits={user.syncOverwriteManualEdits} />
        </Section>

        <Section title="SSI Logbook">
          <SsiPanel configuredEmail={maskedEmail} autoSync={Boolean(ssi && process.env.CRON_SECRET)} />
        </Section>

        <Section title="Import / Sync">
          <ul className="-mx-1 mb-4 flex flex-col">
            {IMPORT_SOURCES.map((s) => (
              <li key={s.source} className="flex items-center justify-between gap-3 px-1 py-2.5">
                <div className="min-w-0">
                  <div className="text-[15px] font-medium">{s.label}</div>
                  <div className="text-[13px] text-muted-foreground">{s.description}</div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                    s.status === "available" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {s.status === "available" ? "Available" : "Coming soon"}
                </span>
              </li>
            ))}
          </ul>
          <JsonImport />
          {runs.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-3">
              <div className="mb-2 text-[13px] font-semibold text-muted-foreground">Recent imports</div>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {runs.map((r) => (
                  <li key={r.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none justify-between gap-3">
                        <span className="truncate">
                          {r.source.toUpperCase()} · {dateTime.format(r.startedAt)}
                        </span>
                        <span className={r.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                          {r.status === "failed" ? "Failed" : r.status === "running" ? "Running…" : `+${r.created} / ~${r.updated} / =${r.skipped}`}
                        </span>
                      </summary>
                      {(r.error || r.log) && (
                        <pre className="mt-1.5 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-secondary p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                          {[r.error, r.log].filter(Boolean).join("\n")}
                        </pre>
                      )}
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section title="Demo data">
          <DemoDataPanel demoDives={demoDives} />
        </Section>

        {isAuthEnabled() && (
          <Section title="Account">
            <div className="flex flex-col gap-4">
              <p className="text-[14px] text-muted-foreground">
                Logged in as <b className="text-foreground">{user.name}</b>
                {user.isAdmin && " (admin)"}. Your password is your login – it must be unique.
              </p>
              <PasswordForm />
              <LogoutButton />
            </div>
          </Section>
        )}

        {user.isAdmin && isAuthEnabled() && (
          <Section title="Users">
            <UsersPanel currentUserId={user.id} users={users} />
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h2>
      <div className="rounded-2xl border border-border/70 bg-card p-4">{children}</div>
    </section>
  );
}
