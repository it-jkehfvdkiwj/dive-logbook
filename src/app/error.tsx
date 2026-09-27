"use client";

import { ErrorState } from "@/components/common/error-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isDb = /DATABASE_URL|ECONNREFUSED|connect|database/i.test(error.message);
  return (
    <ErrorState
      title={isDb ? "Database not reachable" : "Something went wrong"}
      message={
        isDb
          ? "Check that the database is running and DATABASE_URL is set correctly (locally: npm run db:up; on Vercel: Storage → Neon connected)."
          : "The page could not be loaded. Please try again."
      }
      onRetry={reset}
    />
  );
}
