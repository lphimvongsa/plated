import { PartySettingsForm } from "@/components/party/settings-form";
import { toDateInputValue, toTimeInputValue } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PartySettingsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase.from("parties").select("*").eq("id", partyId).maybeSingle();
  if (!party) notFound();

  return (
    <PartySettingsForm
      party={{
        id: party.id,
        name: party.name,
        location: party.location,
        theme: party.theme,
        cuisine: party.cuisine,
        service_style: party.service_style,
        dress_code: party.dress_code,
        guest_contribution_notes: party.guest_contribution_notes,
        planning_guest_count: party.planning_guest_count,
        date: toDateInputValue(party.starts_at, party.timezone),
        time: toTimeInputValue(party.starts_at, party.timezone),
        prep_date: toDateInputValue(party.prep_starts_at ?? party.starts_at, party.timezone),
      }}
    />
  );
}
