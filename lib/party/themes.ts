export type PartyTheme = {
  key: string;
  name: string;
  paper: string;
  paper2: string;
  ink: string;
  primary: string;
  secondary: string;
  wine: string;
  olive: string;
  blush: string;
  gold: string;
};

export const PARTY_THEMES: PartyTheme[] = [
  { key: "tomato-cream", name: "Tomato Cream", paper: "#F6F0E7", paper2: "#E9DED0", ink: "#251C18", primary: "#C84A35", secondary: "#E58262", wine: "#8A2E26", olive: "#74785E", blush: "#DDB8AA", gold: "#B59758" },
  { key: "sage-supper", name: "Sage Supper", paper: "#F2F1E8", paper2: "#E2E3D5", ink: "#252920", primary: "#73806A", secondary: "#AAB39A", wine: "#665A52", olive: "#485543", blush: "#D2C7B8", gold: "#B69B61" },
  { key: "olive-table", name: "Olive Table", paper: "#F3EFE2", paper2: "#E6DFC9", ink: "#28261C", primary: "#7C7A45", secondary: "#B5A96D", wine: "#70524B", olive: "#50512E", blush: "#D7C6AF", gold: "#B99A50" },
  { key: "burgundy-wine", name: "Burgundy Wine", paper: "#F5EDE8", paper2: "#E7D8D3", ink: "#291D1F", primary: "#7E3943", secondary: "#B66A70", wine: "#54242D", olive: "#6C7057", blush: "#D5AAB0", gold: "#B49462" },
  { key: "midnight-dinner", name: "Midnight Dinner", paper: "#EFF1EE", paper2: "#DBE0DD", ink: "#1E2529", primary: "#34495A", secondary: "#718595", wine: "#55404B", olive: "#667268", blush: "#BCC7C9", gold: "#B39B6A" },
  { key: "butter-linen", name: "Butter & Linen", paper: "#F7F0DA", paper2: "#E9DFC1", ink: "#30271A", primary: "#D6A943", secondary: "#E7C977", wine: "#80534A", olive: "#72714F", blush: "#E2C6AE", gold: "#916F29" },
  { key: "terracotta", name: "Terracotta", paper: "#F4EBE2", paper2: "#E7D7CA", ink: "#2F221D", primary: "#B86547", secondary: "#D99A79", wine: "#79412F", olive: "#74705A", blush: "#DCB4A1", gold: "#B89156" },
  { key: "plum-dinner", name: "Plum Dinner", paper: "#F2ECEE", paper2: "#E1D5DA", ink: "#291F26", primary: "#795169", secondary: "#A98296", wine: "#4D3444", olive: "#6D705D", blush: "#CDB2BF", gold: "#AE9164" },
  { key: "espresso", name: "Espresso", paper: "#F2ECE4", paper2: "#E2D7CA", ink: "#251E1A", primary: "#665044", secondary: "#A18472", wine: "#50332E", olive: "#6B7057", blush: "#CDB8AA", gold: "#A88855" },
  { key: "blue-porcelain", name: "Blue Porcelain", paper: "#EEF1EF", paper2: "#DDE4E2", ink: "#20292E", primary: "#486B83", secondary: "#819BA8", wine: "#5B4858", olive: "#66746B", blush: "#BEC9C7", gold: "#B19A69" },
];

export const DEFAULT_PARTY_THEME_KEY = "tomato-cream";

export function partyThemeByKey(key: string | null | undefined) {
  return PARTY_THEMES.find((theme) => theme.key === key) ?? PARTY_THEMES[0];
}

function hexToRgbString(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

export function partyThemeCssVars(key: string | null | undefined): React.CSSProperties {
  const theme = partyThemeByKey(key);
  return {
    "--paper": theme.paper,
    "--paper-2": theme.paper2,
    "--ink": theme.ink,
    "--tomato": theme.primary,
    "--orange": theme.secondary,
    "--wine": theme.wine,
    "--olive": theme.olive,
    "--blush": theme.blush,
    "--gold": theme.gold,
    "--paper-rgb": hexToRgbString(theme.paper),
    "--paper-2-rgb": hexToRgbString(theme.paper2),
    "--ink-rgb": hexToRgbString(theme.ink),
    "--tomato-rgb": hexToRgbString(theme.primary),
    "--orange-rgb": hexToRgbString(theme.secondary),
    "--wine-rgb": hexToRgbString(theme.wine),
    "--olive-rgb": hexToRgbString(theme.olive),
    "--blush-rgb": hexToRgbString(theme.blush),
    "--gold-rgb": hexToRgbString(theme.gold),
  } as React.CSSProperties;
}

export const ACCENT_COLOR_PALETTE = [
  "#C84A35",
  "#E58262",
  "#73806A",
  "#7C7A45",
  "#7E3943",
  "#486B83",
  "#D6A943",
  "#B86547",
  "#795169",
  "#665044",
  "#397A78",
  "#78659A",
];
