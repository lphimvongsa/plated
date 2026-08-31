"use client";

import { Brand } from "@/components/brand";
import { signInWithEmail, signUpWithEmail } from "@/lib/actions/auth";
import { ArrowRight, Eye, EyeOff, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

function oauthErrorMessage(code: string | null) {
  if (!code) return null;
  if (code === "auth") return "Sign-in didn’t complete. Please try again.";
  if (code === "google" || code === "google-disabled") {
    return "Google sign-in isn’t enabled yet. Enable the Google provider in the Supabase dashboard, then try again.";
  }
  return code;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [error, setError] = useState<string | null>(oauthErrorMessage(searchParams.get("error")));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="paper-noise min-h-screen bg-paper lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen border-r border-ink/15 p-7 lg:block">
        <div className="relative h-full overflow-hidden border border-ink/15 bg-ink">
          <img src="/photos/party-10.webp" alt="Friends eating together around a warm dinner table" className="absolute inset-0 h-full w-full object-cover object-[54%_50%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-paper/25 px-5 py-4 text-[8px] font-bold uppercase tracking-[0.16em] text-paper/70">
            <span>plated. supper club</span>
            <span>members only</span>
          </div>
          <div className="absolute bottom-10 left-10 max-w-xl text-paper">
            <p className="font-handwritten text-2xl text-orange">A little structure before the beautiful mess.</p>
            <h1 className="mt-3 font-editorial text-7xl font-semibold leading-[0.82] tracking-[-0.045em]">Plan the dinner. Be at the dinner.</h1>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-5 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between border-b border-ink/15 pb-4">
          <Brand compact />
          <Link href="/" className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/48 hover:text-tomato">Back home</Link>
        </div>

        <div className="my-auto w-full max-w-md self-center py-12">
          <p className="eyebrow">Welcome to plated.</p>
          <h2 className="mt-4 font-editorial text-6xl font-semibold leading-[0.82] tracking-[-0.045em] text-tomato">
            {mode === "signup" ? "Set your table." : "Welcome back."}
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/55">
            {mode === "signup"
              ? "Create an account to start planning parties and collaborating with your cooks."
              : "Sign in to return to your menus, guests, and timelines."}
          </p>

          <a href="/auth/google" className="btn-secondary mt-8 w-full justify-between bg-[#faf7f0]">
            <span className="inline-flex items-center gap-3"><span className="text-sm font-bold text-[#4285F4]">G</span> Continue with Google</span>
            <ArrowRight size={14} />
          </a>

          {error ? <p className="mt-4 text-sm text-tomato">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-olive">{message}</p> : null}

          <div className="my-6 flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.16em] text-ink/35">
            <span className="h-px flex-1 bg-ink/15" />
            or use email
            <span className="h-px flex-1 bg-ink/15" />
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setMessage(null);
              const formData = new FormData(event.currentTarget);
              startTransition(async () => {
                const result =
                  mode === "signup"
                    ? await signUpWithEmail(formData)
                    : await signInWithEmail(formData);
                if (result?.error) setError(result.error);
                if (result && "message" in result && result.message) setMessage(result.message);
              });
            }}
          >
            {mode === "signup" ? (
              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Name</span>
                <input className="field" name="name" placeholder="Your name" required />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Email</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" size={16} />
                <input type="email" name="email" className="field pl-11" placeholder="you@example.com" required />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em]">
                <span>Password</span>
                {mode === "login" ? <button type="button" className="text-tomato">Forgot password?</button> : null}
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="field pr-11"
                  placeholder="8+ characters"
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/38" aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button className="btn-primary mt-2 w-full justify-between" type="submit" disabled={pending}>
              {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={15} />
            </button>
          </form>

          <p className="mt-7 text-center text-xs text-ink/50">
            {mode === "signup" ? "Already have an account?" : "New to plated.?"}{" "}
            <button
              className="border-b border-tomato font-bold text-tomato"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
                setMessage(null);
              }}
            >
              {mode === "signup" ? "Log in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="border-t border-ink/15 pt-4 text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-ink/35">
          By continuing, you agree to the Terms and Privacy Policy.
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="paper-noise grid min-h-screen place-items-center bg-paper">
          <p className="text-sm text-ink/45">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
