import { RecipeEditor } from "@/components/recipe/recipe-editor";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewCookbookRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ partyId?: string }>;
}) {
  const { partyId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const backHref = partyId ? `/app/parties/${partyId}/recipes` : "/app/recipes";

  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-7xl">
        <RecipeEditor mode="create" partyId={partyId} isPartyRecipe={Boolean(partyId)} backHref={backHref} />
      </div>
    </div>
  );
}
