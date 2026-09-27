"use client";

import { ErrorState } from "@/components/common/error-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isDb = /DATABASE_URL|ECONNREFUSED|connect|database/i.test(error.message);
  return (
    <ErrorState
      title={isDb ? "Database not reachable" : "Something went wrong"}
      message={
        isDb
          ? "Make sure PostgreSQL is running (npm run db:up) and DATABASE_URL in .env is correct."
          : "The page could not be loaded. Please try again."
      }
      onRetry={reset}
    />
  );
}
