"use client";

import { Modal } from "@/components/modal";
import { recipes } from "@/lib/mock-data";
import { BookOpen, Clock3, FolderPlus, Plus, Search, Sparkles } from "lucide-react";
import { useState } from "react";

const collections = [
  ["Dinner party tested", "18 recipes", "/photos/party-04.webp"],
  ["Summer things", "11 recipes", "/photos/party-01.webp"],
  ["Desserts worth making", "7 recipes", "/photos/party-08.webp"],
];

export default function CookbookPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Your cookbook</p><h1 className="mt-2 font-editorial text-5xl font-semibold md:text-6xl">Recipes worth inviting people over for.</h1><p className="mt-4 max-w-2xl text-sm text-ink/55">Save, organize, edit, and reuse recipes across parties.</p></div><button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add recipe</button></section>
        <section><div className="flex items-center justify-between"><div><p className="eyebrow">Collections</p><h2 className="mt-2 font-editorial text-4xl font-semibold">Your shelves</h2></div><button className="text-sm font-bold text-tomato"><FolderPlus size={15} className="mr-1 inline" /> New collection</button></div><div className="mt-5 grid gap-4 md:grid-cols-3">{collections.map(([name,count,image],i) => <article key={name} className={`group relative min-h-64 overflow-hidden rounded-[1.75rem] bg-ink text-paper shadow-card ${i===1 ? "md:translate-y-3" : ""}`}><img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5"><p className="font-editorial text-3xl font-semibold">{name}</p><p className="mt-2 text-xs text-paper/60">{count}</p></div></article>)}</div></section>
        <section><div className="flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white/35 p-3 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" /><input className="field pl-11" placeholder="Search recipes, cuisines, ingredients" /></label><select className="field sm:w-44"><option>All recipes</option><option>Favorites</option><option>Recently added</option></select></div><div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{recipes.map((recipe) => <article key={recipe.id} className="card overflow-hidden"><div className="h-48 overflow-hidden"><img src={recipe.image} alt="" className="h-full w-full object-cover" /></div><div className="p-5"><p className="eyebrow">{recipe.course}</p><h3 className="mt-2 font-editorial text-2xl font-semibold leading-tight">{recipe.title}</h3><div className="mt-4 flex items-center gap-2 text-xs text-ink/45"><Clock3 size={13} /> {recipe.prep} + {recipe.cook}</div></div></article>)}</div></section>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add to your cookbook"><div className="grid gap-3 sm:grid-cols-2">{["Import from URL", "Paste recipe text", "Upload PDF or image", "Enter manually"].map((item) => <button key={item} onClick={() => setOpen(false)} className="rounded-[1.5rem] border border-ink/15 bg-white/35 p-5 text-left hover:border-tomato"><BookOpen size={18} /><p className="mt-6 font-editorial text-2xl font-semibold">{item}</p><p className="mt-2 text-xs text-ink/45">Mock import flow</p></button>)}</div><div className="mt-5 rounded-2xl bg-orange/8 p-4 text-sm text-ink/55"><Sparkles size={16} className="mr-2 inline text-orange" />Imported recipes remain fully editable and keep their original source URL when available.</div></Modal>
    </div>
  );
}
