"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await api.post("/api/auth/logout").catch(() => undefined);
        window.location.replace("/login");
      }}
    >
      <LogOut /> Log out
    </Button>
  );
}
