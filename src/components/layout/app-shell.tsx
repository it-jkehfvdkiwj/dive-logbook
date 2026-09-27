import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* Hintergrund hinter der iOS-Statusleiste (Standalone-Modus) */}
      <div className="fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-background/90 backdrop-blur-xl" aria-hidden />
      <Sidebar />
      <main className="pt-safe pb-[calc(58px+env(safe-area-inset-bottom)+24px)] lg:pb-12 lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
