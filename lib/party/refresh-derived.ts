import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

/**
 * Rebuild shopping + timeline after the response is sent so page opens stay fast.
 * Dirty flags remain as a safety net if this work fails.
 */
export function schedulePartyDerivedRefresh(partyId: string) {
  after(async () => {
    try {
      const { regenerateShoppingList } = await import("@/lib/actions/shopping");
      const { syncPartyTimeline } = await import("@/lib/actions/timeline");

      await regenerateShoppingList(partyId);
      await syncPartyTimeline(partyId, { mode: "structural" });

      revalidatePath(`/app/parties/${partyId}`);
      revalidatePath(`/app/parties/${partyId}/menu`);
      revalidatePath(`/app/parties/${partyId}/shopping`);
      revalidatePath(`/app/parties/${partyId}/costs`);
      revalidatePath(`/app/parties/${partyId}/timeline`);
    } catch (error) {
      console.error("[schedulePartyDerivedRefresh]", partyId, error);
    }
  });
}
