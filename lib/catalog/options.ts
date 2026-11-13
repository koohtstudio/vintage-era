export const ERAS = ["70s", "80s", "90s", "Y2K", "00s", "10s", "Mixed", "Unknown"] as const;
export type Era = (typeof ERAS)[number];

export const CONDITIONS = [
  { value: "like_new", label: "Like new" },
  { value: "great", label: "Great condition" },
  { value: "light_wear", label: "Light wear" },
  { value: "worn_in", label: "Worn in" },
] as const;
export type Condition = (typeof CONDITIONS)[number]["value"];
export const conditionLabel = (v: string) => CONDITIONS.find((c) => c.value === v)?.label ?? v;

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const SIZE_FILTERS = ["XS", "S", "M", "L", "XL", "XXL", "One size"] as const;

/** Size chips offered in admin per measurement kind. */
export const SIZE_CHOICES: Record<string, readonly string[]> = {
  tops: [...APPAREL_SIZES, "One size"],
  bottoms: ["26", "28", "30", "32", "34", "36", "38", "S", "M", "L", "XL"],
  collectible: ["One size"],
  game: ["One size"],
};

export const PHOTO_KINDS = ["front", "back", "tag", "flaw", "detail"] as const;
