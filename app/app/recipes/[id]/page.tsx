import { RecipeEditor } from "@/components/recipe/recipe-editor";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function CookbookRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .is("party_id", null)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!recipe) notFound();

  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase.from("ingredients").select("*").eq("recipe_id", id).order("sort_order"),
    supabase.from("recipe_steps").select("*").eq("recipe_id", id).order("sort_order"),
  ]);

  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-7xl">
        <RecipeEditor
          mode="edit"
          recipe={recipe}
          ingredients={ingredients ?? []}
          steps={steps ?? []}
          backHref="/app/recipes"
        />
      </div>
    </div>
  );
}
