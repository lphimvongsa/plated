"use client";

import { toggleTaskDone, toggleTaskLocked } from "@/lib/actions/parties";
import { usePartyAccess } from "@/lib/party/access-client";
import { Check, Lock, Play, Unlock } from "lucide-react";
import { useTransition } from "react";

export function TaskDoneToggle({
  taskId,
  partyId,
  done,
  title,
  placement = "rail",
}: {
  taskId: string;
  partyId: string;
  done: boolean;
  title: string;
  placement?: "rail" | "inline";
}) {
  const [pending, startTransition] = useTransition();
  const { canEdit } = usePartyAccess();

  return (
    <button
      type="button"
      disabled={pending || !canEdit}
      onClick={(event) => {
        event.stopPropagation();
        startTransition(async () => {
          await toggleTaskDone(taskId, !done, partyId);
        });
      }}
      className={
        placement === "rail"
          ? `absolute -left-[46px] top-6 z-10 grid h-9 w-9 place-items-center rounded-full border-4 border-paper ${
              done ? "bg-olive text-paper" : "bg-paper text-ink/35 ring-1 ring-ink/15"
            }`
          : `grid h-8 w-8 shrink-0 place-items-center rounded-full ${
              done ? "bg-olive text-paper" : "bg-paper text-ink/35 ring-1 ring-ink/15"
            }`
      }
      aria-label={`Mark ${title} ${done ? "incomplete" : "complete"}`}
    >
      {done ? <Check size={15} /> : <Play size={13} />}
    </button>
  );
}

export function TaskLockToggle({
  taskId,
  partyId,
  locked,
}: {
  taskId: string;
  partyId: string;
  locked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { canEdit } = usePartyAccess();

  return (
    <button
      type="button"
      disabled={pending || !canEdit}
      onClick={(event) => {
        event.stopPropagation();
        startTransition(async () => {
          await toggleTaskLocked(taskId, !locked, partyId);
        });
      }}
      className="chip"
      aria-label={locked ? "Unlock task" : "Lock task"}
    >
      {locked ? <Lock size={13} /> : <Unlock size={13} />}
      {locked ? "Locked" : "Lock"}
    </button>
  );
}
