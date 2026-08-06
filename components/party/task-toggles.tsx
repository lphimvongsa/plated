"use client";

import { toggleTaskDone, toggleTaskLocked } from "@/lib/actions/parties";
import { Check, Lock, Play, Unlock } from "lucide-react";
import { useTransition } from "react";

export function TaskDoneToggle({
  taskId,
  partyId,
  done,
  title,
}: {
  taskId: string;
  partyId: string;
  done: boolean;
  title: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleTaskDone(taskId, !done, partyId);
        })
      }
      className={`absolute -left-[46px] top-6 z-10 grid h-9 w-9 place-items-center rounded-full border-4 border-paper ${
        done ? "bg-olive text-paper" : "bg-paper text-ink/35 ring-1 ring-ink/15"
      }`}
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

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleTaskLocked(taskId, !locked, partyId);
        })
      }
      className="btn-icon h-8 w-8"
      aria-label={locked ? "Unlock task" : "Lock task"}
    >
      {locked ? <Unlock size={14} /> : <Lock size={14} />}
    </button>
  );
}
