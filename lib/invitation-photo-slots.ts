export const MAX_INVITATION_PHOTOS = 5;

export const INVITATION_PHOTO_SLOTS = [
  { value: "overview_left", label: "Overview" },
  { value: "overview_right", label: "Overview · right" },
  { value: "menu_left", label: "Menu · left" },
  { value: "menu_right", label: "Menu · right" },
  { value: "rsvp_bottom", label: "RSVP · bottom" },
] as const;

export type InvitationPhotoSlot = (typeof INVITATION_PHOTO_SLOTS)[number]["value"];

export const DEFAULT_INVITATION_SLOTS: InvitationPhotoSlot[] = INVITATION_PHOTO_SLOTS.map((slot) => slot.value);

const SLOT_ALIASES: Record<string, InvitationPhotoSlot> = {
  "overview-left": "overview_left",
  "overview-right": "overview_right",
  "overview-wide": "overview_left",
  overview_wide: "overview_left",
  "menu-left": "menu_left",
  "menu-right": "menu_right",
  "menu-wide": "menu_left",
  menu_wide: "menu_left",
  "rsvp-bottom": "rsvp_bottom",
};

export function isInvitationPhotoSlot(value: string): value is InvitationPhotoSlot {
  return INVITATION_PHOTO_SLOTS.some((slot) => slot.value === value);
}

export function normalizeInvitationPhotoSlot(value: string, index = 0): InvitationPhotoSlot {
  const aliased = SLOT_ALIASES[value] ?? value;
  if (isInvitationPhotoSlot(aliased)) return aliased;
  return DEFAULT_INVITATION_SLOTS[index] ?? "rsvp_bottom";
}

export function defaultInvitationSlots(count: number): string[] {
  return DEFAULT_INVITATION_SLOTS.slice(0, Math.max(0, count));
}

export function normalizeInvitationSlots(input: unknown, count: number): string[] {
  const allowed = new Set<string>([...INVITATION_PHOTO_SLOTS.map((slot) => slot.value), "unplaced"]);
  const source = Array.isArray(input) ? input.map(String) : [];
  const defaults = defaultInvitationSlots(count);
  return Array.from({ length: count }, (_, index) => {
    const raw = source[index] ?? "";
    const aliased = SLOT_ALIASES[raw] ?? raw;
    return allowed.has(aliased) ? aliased : defaults[index] ?? "unplaced";
  });
}

export function slotsConflict(a: string, b: string) {
  if (a === b && a !== "unplaced") return true;
  return false;
}

/** Normalize slot values and resolve duplicate conflicts deterministically.
 * Earlier photos keep their requested location; later conflicting photos become unplaced.
 */
export function sanitizeInvitationSlots(input: unknown, count: number): string[] {
  const normalized = normalizeInvitationSlots(input, count);
  const accepted: string[] = [];

  for (const slot of normalized) {
    if (slot !== "unplaced" && accepted.some((existing) => slotsConflict(existing, slot))) {
      accepted.push("unplaced");
    } else {
      accepted.push(slot);
    }
  }

  return accepted;
}
