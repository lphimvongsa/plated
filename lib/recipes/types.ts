export type RecipeFields = {
  title: string;
  description?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  servings?: number;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  total_minutes?: number | null;
  course?: string | null;
  cuisine?: string | null;
  difficulty?: string | null;
  tags?: string[];
  dietary_tags?: string[];
  allergy_tags?: string[];
  equipment?: string[];
  notes?: string | null;
  make_ahead_notes?: string | null;
  storage_notes?: string | null;
  reheating_notes?: string | null;
  import_status?: string;
  import_source_type?: string | null;
};

export type IngredientFields = {
  id?: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  preparation_note?: string | null;
  section?: string | null;
  category?: string | null;
  allergen_tags?: string[];
  pantry_flag?: boolean;
  sort_order?: number;
  secondary_quantity?: number | null;
  secondary_unit?: string | null;
  estimated_unit_cost?: number | null;
};

export type RecipeStepFields = {
  id?: string;
  title: string;
  description?: string | null;
  duration_minutes?: number | null;
  /** Named cooking task this step belongs to (timeline bar). */
  task?: string | null;
  sort_order?: number;
};

export type ManualRecipeInput = {
  partyId?: string | null;
  addToMenu?: boolean;
  recipe: RecipeFields;
  ingredients?: IngredientFields[];
  steps?: RecipeStepFields[];
};
