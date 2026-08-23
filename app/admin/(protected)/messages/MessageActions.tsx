"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setMessageStatus, type MessageStatus } from "./actions";

export function MessageActions({ id, status, compact = false }: { id: string; status: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (s: MessageStatus) =>
    start(async () => {
      await setMessageStatus(id, s);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "read" && status !== "archived" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("read")}>
          Mark read
        </Button>
      )}
      {status === "read" && !compact && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("new")}>
          Mark unread
        </Button>
      )}
      {status !== "archived" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("archived")}>
          Archive
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("read")}>
          Unarchive
        </Button>
      )}
    </div>
  );
}
