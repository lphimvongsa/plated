import { PartyShell } from "@/components/party-shell";

export default function PartyLayout({ children }: { children: React.ReactNode }) {
  return <PartyShell>{children}</PartyShell>;
}
