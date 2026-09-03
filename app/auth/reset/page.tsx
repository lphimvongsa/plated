"use client";

import { Brand } from "@/components/brand";
import { updatePassword } from "@/lib/actions/auth";
import { Check, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pending,startTransition] = useTransition();
  const [error,setError] = useState<string|null>(null);
  const [done,setDone] = useState(false);
  return <main className="paper-noise grid min-h-screen place-items-center bg-paper p-4"><section className="w-full max-w-md border border-ink/15 bg-paper-2 p-7 shadow-card sm:p-9"><Brand/><div className="mt-10"><div className="grid h-11 w-11 place-items-center rounded-full bg-tomato/10 text-tomato"><KeyRound size={19}/></div><h1 className="mt-5 font-editorial text-4xl font-semibold">Choose a new password.</h1><p className="mt-3 text-sm text-ink/50">Use at least 8 characters.</p></div>{done?<div className="mt-8"><div className="flex items-center gap-2 text-sm font-semibold text-olive"><Check size={17}/> Password updated.</div><button className="btn-primary mt-5 w-full" onClick={()=>router.replace("/app")}>Continue to plated.</button></div>:<form className="mt-8 space-y-4" onSubmit={(e)=>{e.preventDefault();setError(null);const fd=new FormData(e.currentTarget);startTransition(async()=>{const result=await updatePassword(fd);if(result.error)setError(result.error);else setDone(true);});}}><label><span className="mb-2 block text-xs font-semibold">New password</span><input className="field" type="password" name="password" minLength={8} required/></label><label><span className="mb-2 block text-xs font-semibold">Confirm password</span><input className="field" type="password" name="confirm" minLength={8} required/></label>{error?<p className="text-sm font-semibold text-tomato">{error}</p>:null}<button className="btn-primary w-full" disabled={pending}>{pending?"Updating…":"Update password"}</button></form>}</section></main>;
}
