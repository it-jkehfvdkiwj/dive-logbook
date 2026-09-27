import { redirect } from "next/navigation";
import { AppMark } from "@/components/common/app-mark";
import { LoginForm } from "@/components/common/login-form";
import { isAuthEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!isAuthEnabled()) redirect("/");
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center py-10">
      <AppMark className="size-16" />
      <h1 className="mt-5 text-[28px] font-bold tracking-tight">Dive Log</h1>
      <p className="mb-8 mt-1 text-[15px] text-muted-foreground">Enter your password to open your logbook.</p>
      <LoginForm next={target} />
    </div>
  );
}
