import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="pt-16">
      <EmptyState
        icon={<Compass />}
        title="Not found"
        description="This page or entry doesn't exist (anymore)."
        action={
          <Link href="/" className={buttonVariants()}>
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
