"use client";

import {
  DEFAULT_COOKBOOK_VIEW,
  getCookbookViewMode,
  setCookbookViewMode,
  type CookbookViewMode,
} from "@/lib/recipes/cookbook-view-preference";
import {
  removePushSubscription,
  setNotificationMasterEnabled,
  replacePantryItems,
  savePushSubscription,
  updateMeasurementSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  updateProfileSettings,
} from "@/lib/actions/settings";
import { signOut } from "@/lib/actions/auth";
import { Bell, BookOpen, ChefHat, LayoutGrid, LogOut, Ruler, Save, Shield, UserRound, ImagePlus, Plus, X, BellRing } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const navItems = [
  [UserRound, "Profile"], [BookOpen, "Cookbook"], [Ruler, "Measurements"], [ChefHat, "Kitchen & pantry"], [Bell, "Notifications"], [Shield, "Privacy"],
] as const;
type Section = (typeof navItems)[number][1];
function isSection(value: string | null): value is Section { return navItems.some(([, label]) => label === value); }

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export type SettingsProfile = {
  name: string | null; email: string | null; avatar_url: string | null; cooking_skill_level: string;
  preferred_measurement: string; preferred_dimension: string; notification_master: boolean;
  notify_rsvps: boolean; notify_collaborator_invites: boolean; notify_collaborator_accepts: boolean;
  retain_receipt_images: boolean; profile_discoverable: boolean;
};

export function AccountSettingsClient({ profile, pantry, vapidPublicKey }: { profile: SettingsProfile; pantry: string[]; vapidPublicKey: string }) {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<Section>(isSection(searchParams.get("section")) ? searchParams.get("section") as Section : "Profile");
  const [cookbookView, setCookbookView] = useState<CookbookViewMode>(DEFAULT_COOKBOOK_VIEW);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [pantryItems, setPantryItems] = useState(pantry);
  const [pantryDraft, setPantryDraft] = useState("");
  const [pushState, setPushState] = useState<"unknown"|"enabled"|"disabled"|"unsupported">("unknown");
  const [notificationMaster, setNotificationMaster] = useState(profile.notification_master);

  useEffect(() => setCookbookView(getCookbookViewMode()), []);
  useEffect(() => { const next = searchParams.get("section"); if (isSection(next)) setSection(next); }, [searchParams]);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setPushState("unsupported"); return; }
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      setPushState(sub ? "enabled" : "disabled");
    }).catch(() => setPushState("disabled"));
  }, []);

  function flash(result: { error?: string | null }, success = "Settings saved.") { if (result.error) { setError(result.error); setMessage(null); } else { setError(null); setMessage(success); } }

  async function enableNativeNotifications() {
    setError(null);
    setMessage(null);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      setError("This browser does not support web push notifications.");
      return false;
    }
    if (!vapidPublicKey) {
      setError("Push notifications need NEXT_PUBLIC_VAPID_PUBLIC_KEY configured on the deployment.");
      return false;
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !standalone) {
      setError("On iPhone/iPad, add plated. to your Home Screen first, then enable notifications here.");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was not granted.");
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
        userAgent: navigator.userAgent,
      });
      if (result.error) { setError(result.error); return false; }
      const masterResult = await setNotificationMasterEnabled(true);
      if (masterResult.error) { setError(masterResult.error); return false; }
      setNotificationMaster(true);
      setPushState("enabled");
      setMessage("Native notifications enabled on this device.");
      return true;
    } catch (pushError) {
      setPushState("disabled");
      setError(pushError instanceof Error ? pushError.message : "Could not enable native notifications on this device.");
      return false;
    }
  }

  async function disableNativeNotifications() {
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setPushState("disabled");
      setMessage("Native notifications disabled on this device.");
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : "Could not disable native notifications on this device.");
    }
  }

  const initials = useMemo(() => (profile.name || profile.email || "P").split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase(), [profile.name, profile.email]);

  return <div className="p-4 md:p-8 xl:p-12"><div className="mx-auto max-w-5xl">
    <p className="eyebrow">Account settings</p><h1 className="mt-2 font-editorial text-5xl font-semibold md:text-6xl">Your kitchen defaults.</h1>
    <p className="mt-4 text-sm text-ink/55">Update your profile, cookbook layout, units, pantry, notifications, and privacy.</p>
    {message ? <div className="mt-6 border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">{message}</div> : null}
    {error ? <div className="mt-6 border border-tomato/25 bg-tomato/8 p-4 text-sm font-semibold text-tomato">{error}</div> : null}
    <div className="mt-10 grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="space-y-2">{navItems.map(([Icon,label]) => <button key={label} type="button" onClick={() => setSection(label)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${section === label ? "bg-ink text-paper" : "text-ink/55 hover:bg-white/40"}`}><Icon size={17}/>{label}</button>)}</nav>
      <div className="space-y-6">
        {section === "Profile" ? <article className="card p-6"><p className="eyebrow">Profile</p>
          <form onSubmit={(event) => { event.preventDefault(); const fd = new FormData(event.currentTarget); startTransition(async()=>flash(await updateProfileSettings(fd), "Profile saved. If you changed email, check your inbox to confirm it.")); }}>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-20 w-20 overflow-hidden place-items-center rounded-full bg-tomato font-editorial text-2xl font-semibold text-paper">{avatarPreview ? <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover"/> : initials}</div><div><button type="button" className="btn-secondary" onClick={()=>avatarInput.current?.click()}><ImagePlus size={15}/> Change photo</button><input ref={avatarInput} type="file" name="avatar" accept="image/*" className="sr-only" onChange={(e)=>{const file=e.target.files?.[0]; if(file) setAvatarPreview(URL.createObjectURL(file));}}/><p className="mt-2 text-xs text-ink/40">JPG, PNG, or WEBP · max 8 MB.</p></div></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold">Name</span><input className="field" name="name" defaultValue={profile.name ?? ""}/></label><label><span className="mb-2 block text-xs font-semibold">Email</span><input className="field" type="email" name="email" defaultValue={profile.email ?? ""}/></label><label><span className="mb-2 block text-xs font-semibold">Skill level</span><select className="field" name="cooking_skill_level" defaultValue={profile.cooking_skill_level}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label><span className="mb-2 block text-xs font-semibold">Default units</span><select className="field" name="preferred_measurement" defaultValue={profile.preferred_measurement === "Metric" ? "Metric" : "US"}><option value="US">US customary</option><option>Metric</option></select></label></div>
            <button type="submit" className="btn-primary mt-6" disabled={pending}><Save size={16}/> {pending?"Saving…":"Save settings"}</button>
          </form></article> : null}
        {section === "Cookbook" ? <article className="card p-6"><p className="eyebrow">Cookbook</p><h2 className="mt-2 font-editorial text-3xl font-semibold">How recipes appear</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{([['book',BookOpen,'Flipbook','Open-book spreads with page-turn animation.'],['grid',LayoutGrid,'Card grid','Searchable recipe cards.']] as const).map(([mode,Icon,title,copy])=><button key={mode} type="button" onClick={()=>{setCookbookView(mode);setCookbookViewMode(mode);setMessage("Cookbook preference saved on this device.")}} className={`border p-5 text-left transition ${cookbookView===mode?'border-tomato bg-tomato/5':'border-ink/15 hover:border-tomato/40'}`}><Icon size={18}/><p className="mt-3 font-editorial text-2xl font-semibold">{title}</p><p className="mt-2 text-sm text-ink/50">{copy}</p></button>)}</div></article> : null}
        {section === "Measurements" ? <article className="card p-6"><p className="eyebrow">Measurements</p><h2 className="mt-2 font-editorial text-3xl font-semibold">Cooking units</h2><form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(e)=>{e.preventDefault();startTransition(async()=>flash(await updateMeasurementSettings(new FormData(e.currentTarget))))}}><label><span className="mb-2 block text-xs font-semibold">Measurement system</span><select className="field" name="preferred_measurement" defaultValue={profile.preferred_measurement}><option value="US">US customary</option><option value="Metric">Metric</option></select></label><label><span className="mb-2 block text-xs font-semibold">Preferred dimension</span><select className="field" name="preferred_dimension" defaultValue={profile.preferred_dimension || "volume"}><option value="volume">Volume first</option><option value="weight">Weight first</option></select></label><button className="btn-primary sm:col-span-2 sm:w-fit" disabled={pending}><Save size={15}/> Save measurements</button></form></article> : null}
        {section === "Kitchen & pantry" ? <article className="card p-6"><p className="eyebrow">Kitchen & pantry</p><h2 className="mt-2 font-editorial text-3xl font-semibold">Staples you already keep</h2><p className="mt-3 text-sm text-ink/55">Pantry matches can be excluded from grocery totals automatically.</p><div className="mt-5 flex gap-2"><input className="field" value={pantryDraft} onChange={(e)=>setPantryDraft(e.target.value)} placeholder="Olive oil" onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();const v=pantryDraft.trim();if(v&&!pantryItems.some(i=>i.toLowerCase()===v.toLowerCase()))setPantryItems([...pantryItems,v]);setPantryDraft('')}}}/><button className="btn-secondary shrink-0" type="button" onClick={()=>{const v=pantryDraft.trim();if(v&&!pantryItems.some(i=>i.toLowerCase()===v.toLowerCase()))setPantryItems([...pantryItems,v]);setPantryDraft('')}}><Plus size={15}/> Add</button></div><div className="mt-4 flex flex-wrap gap-2">{pantryItems.map(item=><span key={item} className="chip inline-flex items-center gap-2">{item}<button type="button" onClick={()=>setPantryItems(pantryItems.filter(v=>v!==item))}><X size={12}/></button></span>)}</div><button type="button" className="btn-primary mt-6" disabled={pending} onClick={()=>startTransition(async()=>flash(await replacePantryItems(pantryItems),"Pantry saved."))}><Save size={15}/> Save pantry</button></article> : null}
        {section === "Notifications" ? <article className="card p-6"><p className="eyebrow">Notifications</p><h2 className="mt-2 font-editorial text-3xl font-semibold">Dinner updates, on time.</h2><p className="mt-3 text-sm text-ink/55">On iOS, install plated. to your Home Screen before enabling native notifications.</p><form className="mt-6 space-y-4" onSubmit={(e)=>{e.preventDefault();startTransition(async()=>flash(await updateNotificationSettings(new FormData(e.currentTarget)),"Notification preferences saved."))}}>{[['notification_master','Enable notifications',notificationMaster],['notify_rsvps','RSVP responses',profile.notify_rsvps],['notify_collaborator_invites','Collaborator invitations',profile.notify_collaborator_invites],['notify_collaborator_accepts','Collaborator accepts',profile.notify_collaborator_accepts]].map(([name,label,checked])=><label key={String(name)} className="flex items-center justify-between gap-4 border-b border-ink/10 pb-4 text-sm font-semibold"><span>{String(label)}</span><input type="checkbox" name={String(name)} checked={String(name)==='notification_master'?notificationMaster:undefined} defaultChecked={String(name)==='notification_master'?undefined:Boolean(checked)} onChange={String(name)==='notification_master'?(e)=>{
  const next=e.target.checked;
  if (!next) {
    setNotificationMaster(false);
    startTransition(async()=>flash(await setNotificationMasterEnabled(false),"Notifications turned off."));
    return;
  }
  setNotificationMaster(true);
  void enableNativeNotifications().then((enabled)=>{ if (!enabled) setNotificationMaster(false); });
}:undefined}/></label>)}<button className="btn-primary" disabled={pending}><Save size={15}/> Save preferences</button></form><div className="mt-6 border-t border-ink/10 pt-5"><div className="flex items-center gap-2"><BellRing size={18} className="text-tomato"/><p className="font-semibold">This device</p></div><p className="mt-2 text-xs text-ink/45">{pushState==='enabled'?'Native push is enabled.':pushState==='unsupported'?'Native push is not supported in this browser.':'Native push is not enabled yet.'}</p>{pushState==='enabled'?<button type="button" className="btn-secondary mt-4" onClick={disableNativeNotifications}>Disable on this device</button>:<button type="button" className="btn-secondary mt-4" onClick={enableNativeNotifications}>Enable native notifications</button>}</div></article> : null}
        {section === "Privacy" ? <article className="card p-6"><p className="eyebrow">Privacy</p><h2 className="mt-2 font-editorial text-3xl font-semibold">Data controls</h2><form className="mt-6 space-y-4" onSubmit={(e)=>{e.preventDefault();startTransition(async()=>flash(await updatePrivacySettings(new FormData(e.currentTarget)),"Privacy settings saved."))}}><label className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4"><span><strong className="block text-sm">Keep receipt images</strong><span className="mt-1 block text-xs text-ink/45">Turn off to delete stored receipt photos after parsing while retaining totals and line items.</span></span><input type="checkbox" name="retain_receipt_images" defaultChecked={profile.retain_receipt_images}/></label><label className="flex items-start justify-between gap-4"><span><strong className="block text-sm">Allow collaborator discovery</strong><span className="mt-1 block text-xs text-ink/45">Lets hosts match your Plated account when inviting your email.</span></span><input type="checkbox" name="profile_discoverable" defaultChecked={profile.profile_discoverable}/></label><button className="btn-primary mt-2" disabled={pending}><Save size={15}/> Save privacy</button></form></article> : null}
        <article className="border border-tomato/20 bg-tomato/5 p-6"><h2 className="font-editorial text-2xl font-semibold text-tomato">Account actions</h2><form action={signOut}><button type="submit" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-tomato"><LogOut size={15}/> Sign out</button></form></article>
      </div>
    </div>
  </div></div>;
}
