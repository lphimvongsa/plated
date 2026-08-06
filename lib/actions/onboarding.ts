"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(input: {
  measurement: string;
  skill: string;
  timezone: string;
  pantry: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      preferred_measurement: input.measurement,
      cooking_skill_level: input.skill,
      timezone: input.timezone,
      onboarding_complete: true,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  await supabase.from("user_pantry_items").delete().eq("user_id", user.id);

  if (input.pantry.length) {
    const { error: pantryError } = await supabase.from("user_pantry_items").insert(
      input.pantry.map((name) => ({ user_id: user.id, name })),
    );
    if (pantryError) {
      return { error: pantryError.message };
    }
  }

  const { error: seedError } = await supabase.rpc("seed_demo_party_for_user", {
    p_user_id: user.id,
  });

  if (seedError) {
    return { error: seedError.message };
  }

  redirect("/app");
}
