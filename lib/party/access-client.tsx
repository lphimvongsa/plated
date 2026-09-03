"use client";

import { createContext, useContext, type ReactNode } from "react";
import { canEditPartyRole, canManagePartyRole, formatPartyRole } from "@/lib/party/roles";

export type PartyAccessValue = {
  role: string | null;
  canEdit: boolean;
  canManage: boolean;
  isOwner: boolean;
};

const PartyAccessContext = createContext<PartyAccessValue>({
  role: null,
  canEdit: true,
  canManage: false,
  isOwner: false,
});

export function PartyAccessProvider({
  role,
  children,
}: {
  role: string | null;
  children: ReactNode;
}) {
  return (
    <PartyAccessContext.Provider
      value={{
        role,
        canEdit: canEditPartyRole(role),
        canManage: canManagePartyRole(role),
        isOwner: role === "owner",
      }}
    >
      {children}
    </PartyAccessContext.Provider>
  );
}

export function usePartyAccess() {
  return useContext(PartyAccessContext);
}

export { canEditPartyRole, canManagePartyRole, formatPartyRole };
