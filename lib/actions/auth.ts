"use server";

import { redirect } from "next/navigation";
import { safeNextPath, siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect(next !== "/app" ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
  }

  return {
    error: null,
    message: "Check your email to confirm your account, then sign in.",
  };
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unable to load session." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_complete) {
    redirect(next !== "/app" ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
  }
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}


export async function requestPasswordReset(email: string) {
  const supabase = await createClient();
  const value = email.trim();
  if (!value) return { error: "Enter your email first." };
  const origin = siteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(value, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
  });
  if (error) return { error: error.message };
  return { error: null, message: "Password reset email sent." };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don’t match." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { error: null };
}
