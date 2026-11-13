/**
 * Seed content for MOCK mode. Photos are the store's real photos reused as stand-ins until real
 * per-piece photos are uploaded. Prices are dummy numbers flagged price_is_placeholder (shown as [price]).
 */
export type Kind = "tops" | "bottoms" | "collectible" | "game";
export type Status = "live" | "held" | "sold" | "draft" | "archived";

export interface SeedPiece {
  title: string;
  cat: "jerseys" | "jackets" | "tees" | "y2k" | "denim" | "toys" | "games";
  store: "barrie" | "newmarket" | "toronto";
  seller: string;
  size: string;
  era: "70s" | "80s" | "90s" | "Y2K" | "00s" | "10s" | "Mixed";
  cond: "like_new" | "great" | "light_wear" | "worn_in";
  status: Status;
  photo: string;
  price: number; // dummy cents
  m: Record<string, string | number | boolean>;
  notes?: string;
  authenticity?: string;
  /** hours ago it went live */
  age: number;
  /** sold pieces */
  sold?: { hoursAgo: number; via: "online" | "in_store"; order?: string };
  featured?: number;
  drop?: boolean;
}

export const STORES = [
  {
    slug: "barrie", name: "Barrie", sort: 1,
    address: "Georgian Mall, lower level, Unit B016, 509 Bayfield St, Barrie",
    hours: { mon: ["09:30", "21:00"], tue: ["09:30", "21:00"], wed: ["09:30", "21:00"], thu: ["09:30", "21:00"], fri: ["09:30", "21:00"], sat: ["09:30", "18:00"], sun: ["11:00", "17:00"] },
    instagram: "eravintagebarrie", maps: "Georgian Mall 509 Bayfield St Barrie ON", photo: "/photos/store-cow-cube.jpg",
  },
  {
    slug: "newmarket", name: "Newmarket", sort: 2,
    address: "Upper Canada Mall, 17600 Yonge St, Newmarket",
    hours: {}, instagram: "eravintageucm", maps: "Upper Canada Mall 17600 Yonge St Newmarket ON", photo: null,
  },
  {
    slug: "toronto", name: "Toronto", sort: 3,
    address: "The Well, 486 Front St W, Toronto",
    hours: {}, instagram: "eravintageto", maps: "The Well 486 Front St W Toronto ON", photo: "/photos/jerseys-wall.jpg",
  },
] as const;

export const SELLERS = [
  { name: "Emotional Baggage Vintage", instagram: "emotionalbaggagevintage", placeholder: false },
  { name: "Virtue Vintage", instagram: "virtuevintage_", placeholder: false },
  { name: "Take Two Trading Co.", instagram: "taketwotradingcompany", placeholder: false },
  { name: "[Fourth seller]", instagram: "[handle]", placeholder: true },
];

export const CATEGORIES: { slug: SeedPiece["cat"]; name: string; kind: Kind }[] = [
  { slug: "jerseys", name: "Jerseys", kind: "tops" },
  { slug: "jackets", name: "Jackets", kind: "tops" },
  { slug: "tees", name: "Graphic tees", kind: "tops" },
  { slug: "y2k", name: "Y2K", kind: "tops" },
  { slug: "denim", name: "Denim", kind: "bottoms" },
  { slug: "toys", name: "Pokémon & toys", kind: "collectible" },
  { slug: "games", name: "Retro games", kind: "game" },
];

export const TICKER = [
  "New pieces every week",
  "Every piece is one of one",
  "Free pickup in store",
  "Toronto · Newmarket · Barrie",
  "Restocking daily",
];

// Quotes come from the concept canvas. NOT confirmed as real: flagged so mock shows a "sample" mark.
export const REVIEWS = [
  { author: "Jaz L.", quote: "This is a one of a kind vintage store!" },
  { author: "", quote: "Amazing selection with something for everyone and at prices you can't beat." },
  { author: "", quote: "Their service is super helpful and very friendly staff." },
];

const top = (pit: number, len: number, sleeve = 24, shoulder = 19) => ({ pit_to_pit: pit, length: len, sleeve, shoulder });
const denim = (waist: number, inseam: number) => ({ waist, inseam, rise: 11, leg_opening: 8 });

export const PIECES: SeedPiece[] = [
  // ---- live ----
  { title: "Northstars Varsity Jacket", cat: "jackets", store: "barrie", seller: "Take Two Trading Co.", size: "L", era: "90s", cond: "great", status: "live", photo: "northstars-varsity", price: 14500, m: top(24, 28, 33, 21), notes: "Wool body, leather sleeves. Light pilling inside the cuffs.", authenticity: "Embroidered patch and snap hardware consistent with 90s varsity manufacture.", age: 1, featured: 1 },
  { title: "Green Satin Bomber, Cropped", cat: "jackets", store: "toronto", seller: "Virtue Vintage", size: "M", era: "00s", cond: "great", status: "live", photo: "green-jacket-flatlay", price: 9500, m: top(22, 22, 25, 18), age: 3, featured: 2 },
  { title: "Colour-block Windbreaker", cat: "jackets", store: "newmarket", seller: "Emotional Baggage Vintage", size: "L", era: "90s", cond: "great", status: "live", photo: "jacket-flatlay-colour", price: 7500, m: top(25, 29, 26, 21), age: 5 },
  { title: "Navy Satin Starter Jacket", cat: "jackets", store: "barrie", seller: "Take Two Trading Co.", size: "XL", era: "90s", cond: "light_wear", status: "live", photo: "jackets-flatlay", price: 12000, m: top(26, 30, 27, 22), notes: "Small mark near left hem, see flaw photo.", age: 8 },
  { title: "Black Ferrari Graphic Tee", cat: "tees", store: "barrie", seller: "Virtue Vintage", size: "M", era: "00s", cond: "great", status: "live", photo: "ferrari-tee", price: 6500, m: top(21, 27, 8, 18), authenticity: "Single-stitch hem, 2000s licensed print.", age: 2, featured: 3 },
  { title: "90s Bulls Jersey, Red", cat: "jerseys", store: "toronto", seller: "Emotional Baggage Vintage", size: "XL", era: "90s", cond: "great", status: "live", photo: "jerseys-wall", price: 11000, m: top(24, 31, 0, 19), age: 4, featured: 4 },
  { title: "Raptors Jersey, Purple Dino", cat: "jerseys", store: "toronto", seller: "Take Two Trading Co.", size: "L", era: "90s", cond: "light_wear", status: "live", photo: "jerseys-wall", price: 13000, m: top(23, 30, 0, 18), age: 14 },
  { title: "Leafs Hockey Jersey", cat: "jerseys", store: "barrie", seller: "Emotional Baggage Vintage", size: "XL", era: "00s", cond: "great", status: "live", photo: "jerseys-wall", price: 9000, m: top(25, 32, 24, 21), age: 20 },
  { title: "Y2K Baby Tee Bundle", cat: "y2k", store: "toronto", seller: "Virtue Vintage", size: "S", era: "Y2K", cond: "great", status: "live", photo: "graphic-tees", price: 4500, m: top(16, 18, 6, 14), age: 6 },
  { title: "Rhinestone Zip Hoodie", cat: "y2k", store: "newmarket", seller: "Virtue Vintage", size: "M", era: "Y2K", cond: "like_new", status: "live", photo: "jackets-flatlay", price: 5500, m: top(20, 23, 24, 17), age: 9 },
  { title: "Light Wash Denim Jacket", cat: "denim", store: "barrie", seller: "Emotional Baggage Vintage", size: "S", era: "90s", cond: "great", status: "live", photo: "denim-boots", price: 8000, m: denim(28, 28), age: 7 },
  { title: "Baggy Y2K Jeans", cat: "denim", store: "toronto", seller: "Take Two Trading Co.", size: "32", era: "Y2K", cond: "light_wear", status: "live", photo: "denim-boots", price: 6000, m: denim(32, 31), age: 30 },
  { title: "Pokémon Plush Lot", cat: "toys", store: "barrie", seller: "Take Two Trading Co.", size: "One size", era: "Y2K", cond: "great", status: "live", photo: "pokemon-plush", price: 5000, m: { dimensions: "Mixed, 6 to 12 in", count: 8 }, age: 10 },
  { title: "Toy Wall Grab Bag", cat: "toys", store: "toronto", seller: "[Fourth seller]", size: "One size", era: "Mixed", cond: "great", status: "live", photo: "toy-wall", price: 3500, m: { dimensions: "Assorted", count: 5 }, age: 36 },
  { title: "Retro Game Cartridge Lot", cat: "games", store: "toronto", seller: "Take Two Trading Co.", size: "One size", era: "90s", cond: "great", status: "live", photo: "retro-games", price: 9500, m: { platform: "SNES / Genesis", tested: true, region: "NTSC", complete: false }, age: 12 },
  // ---- held ----
  { title: "NY Giants Satin Jacket", cat: "jackets", store: "barrie", seller: "Take Two Trading Co.", size: "XL", era: "80s", cond: "light_wear", status: "held", photo: "giants-jacket", price: 16000, m: top(26, 29, 27, 22), age: 2 },
  { title: "Game Boy Colour Bundle", cat: "games", store: "newmarket", seller: "Take Two Trading Co.", size: "One size", era: "Y2K", cond: "great", status: "held", photo: "retro-games", price: 11000, m: { platform: "Game Boy Colour", tested: true, region: "NTSC", complete: true }, age: 3 },
  // ---- sold (online, orders seeded) ----
  { title: "Green Bomber and Bag Set", cat: "jackets", store: "newmarket", seller: "Virtue Vintage", size: "M", era: "90s", cond: "light_wear", status: "sold", photo: "green-jacket-flatlay", price: 12500, m: top(23, 26, 25, 19), age: 50, sold: { hoursAgo: 20, via: "online", order: "ship" } },
  { title: "Graphic Tee Stack", cat: "tees", store: "toronto", seller: "Emotional Baggage Vintage", size: "L", era: "Y2K", cond: "great", status: "sold", photo: "graphic-tees", price: 9000, m: top(22, 28, 8, 19), age: 60, sold: { hoursAgo: 40, via: "online", order: "pickup-toronto" } },
  { title: "Light Wash Jeans and Boots", cat: "denim", store: "barrie", seller: "Emotional Baggage Vintage", size: "M", era: "90s", cond: "light_wear", status: "sold", photo: "denim-boots", price: 10500, m: denim(31, 30), age: 40, sold: { hoursAgo: 3, via: "online", order: "pickup-barrie" } },
  // ---- sold in store (one recent, one old: old one is hidden from the public by RLS) ----
  { title: "Pokémon Card Binder", cat: "toys", store: "barrie", seller: "Take Two Trading Co.", size: "One size", era: "Y2K", cond: "great", status: "sold", photo: "pokemon-plush", price: 18000, m: { dimensions: "Binder", count: 1 }, age: 70, sold: { hoursAgo: 26, via: "in_store" } },
  { title: "Sega Genesis Console", cat: "games", store: "toronto", seller: "Take Two Trading Co.", size: "One size", era: "90s", cond: "great", status: "sold", photo: "retro-games", price: 14000, m: { platform: "Genesis", tested: true, region: "NTSC", complete: false }, age: 400, sold: { hoursAgo: 240, via: "in_store" } },
  // ---- drafts ----
  { title: "Vintage Looney Tunes Tee", cat: "tees", store: "barrie", seller: "Virtue Vintage", size: "L", era: "90s", cond: "great", status: "draft", photo: "graphic-tees", price: 7000, m: top(23, 29, 8, 19), age: 0 },
  { title: "Chicago Bears Satin Jacket", cat: "jackets", store: "toronto", seller: "Take Two Trading Co.", size: "L", era: "90s", cond: "great", status: "draft", photo: "giants-jacket", price: 15000, m: top(25, 29, 27, 21), age: 0 },
  // ---- archived ----
  { title: "Mystery Denim Lot (listed in error)", cat: "denim", store: "barrie", seller: "Emotional Baggage Vintage", size: "One size", era: "Mixed", cond: "worn_in", status: "archived", photo: "denim-boots", price: 2000, m: denim(30, 30), age: 100 },
  // ---- friday drop (drafts until the drop opens) ----
  { title: "Dallas Cowboys Starter Jacket", cat: "jackets", store: "barrie", seller: "Take Two Trading Co.", size: "XL", era: "90s", cond: "great", status: "draft", photo: "northstars-varsity", price: 17000, m: top(27, 30, 28, 22), age: 0, drop: true },
  { title: "Vintage Racing Windbreaker", cat: "jackets", store: "toronto", seller: "Emotional Baggage Vintage", size: "L", era: "90s", cond: "great", status: "draft", photo: "jacket-flatlay-colour", price: 9000, m: top(25, 28, 26, 20), age: 0, drop: true },
  { title: "NHL Jersey, Navy", cat: "jerseys", store: "toronto", seller: "Emotional Baggage Vintage", size: "L", era: "00s", cond: "great", status: "draft", photo: "jerseys-wall", price: 10000, m: top(24, 30, 25, 20), age: 0, drop: true },
  { title: "Pikachu Grail Plush", cat: "toys", store: "newmarket", seller: "Take Two Trading Co.", size: "One size", era: "Y2K", cond: "like_new", status: "draft", photo: "pokemon-plush", price: 20000, m: { dimensions: "12 in", count: 1 }, age: 0, drop: true },
  { title: "N64 Console and Controllers", cat: "games", store: "barrie", seller: "Take Two Trading Co.", size: "One size", era: "90s", cond: "great", status: "draft", photo: "retro-games", price: 19000, m: { platform: "N64", tested: true, region: "NTSC", complete: true }, age: 0, drop: true },
];
