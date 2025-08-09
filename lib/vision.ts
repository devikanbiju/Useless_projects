// Vision helper — swap internals with a real cloud model later.
// IMPORTANT: We do NOT infer sensitive attributes (like gender) from images.

export type OutfitDetection = {
  items: string[]; // e.g., ["saree", "blouse", "mundu"]
  caption?: string;
};

export type DetectedOutfit = {
  top?: string | null;
  bottom?: string | null;
  dress?: string | null;
  outer?: string | null;
  footwear?: string | null;
  accessories: string[];
  rawLabels: string[];
  confidence: number; // 0..1 heuristic
};

function detectItemsHeuristicFromUri(uri: string): string[] {
  const s = uri.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const items: string[] = [];
  const add = (name: string) => {
    if (!items.includes(name)) items.push(name);
  };

  // Avoid false positives: check whole words and common compound words
  // Indian wear
  if (/\b(saree|sari)\b/.test(s)) add('saree');
  if (/\b(mundu|lungi)\b/.test(s)) add('mundu/lungi');
  if (/\b(lehenga|ghagra)\b/.test(s)) add('lehenga');
  if (/\b(salwar kameez|salwar-kameez)\b/.test(s)) add('salwar');
  if (/\b(kurta|kurti|kurtha)\b/.test(s)) add('kurta/kurti');
  if (/\b(blouse)\b/.test(s)) add('blouse');
  if (/\b(dupatta|shawl|stole)\b/.test(s)) add('dupatta');
  if (/\b(sherwani)\b/.test(s)) add('sherwani');

  // Western wear
  if (/\b(t ?shirt|tee)\b/.test(s)) add('t-shirt');
  // match 'shirt' but avoid 'sherwani' causing 'shirt'
  if (/\bshirt\b/.test(s) && !/\bsherwani\b/.test(s)) add('shirt');
  if (/\b(jean|denim|jeans)\b/.test(s)) add('jeans');
  if (/\b(pant|trouser|pants|trousers)\b/.test(s)) add('pants');
  if (/\bshorts\b/.test(s)) add('shorts');
  if (/\bskirt\b/.test(s)) add('skirt');
  if (/\bdress\b/.test(s)) add('dress');
  if (/\bhoodie\b/.test(s)) add('hoodie');
  if (/\b(suit|blazer|coat)\b/.test(s)) add('suit');

  // Footwear
  if (/\b(shoe|sneaker|sneakers)\b/.test(s)) add('shoes');
  if (/\b(sandal|slipper|flipflop|flip flop)\b/.test(s)) add('sandals');

  // Accessories
  if (/\b(watch)\b/.test(s)) add('watch');
  if (/\b(bag|backpack|purse)\b/.test(s)) add('bag');
  if (/\b(cap|hat|beanie)\b/.test(s)) add('cap');
  if (/\b(glasses|goggles|sunglass|sunglasses)\b/.test(s)) add('glasses');

  // Fallback: if uri includes keywords like 'outfit' or 'fashion'
  if (!items.length && /\b(outfit|fashion|clothes|look)\b/.test(s)) add('outfit');

  if (!items.length) add('outfit');
  return items;
}

export async function detectOutfit(uri: string): Promise<DetectedOutfit> {
  // Simple normalization helpers
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();

  // Common clothing keywords grouped by category
  const TOPS = ["tshirt", "t-shirt", "tee", "shirt", "kurta", "kurti", "blouse", "camisole", "tank top", "vest", "hoodie", "sweater", "jumper"];
  const BOTTOMS = ["jeans", "trouser", "pants", "pant", "shorts", "skirt", "dhoti", "mundu", "lungi"];
  const DRESSES = ["dress", "gown", "sari", "saree", "lehenga", "salwar", "anarkali"];
  const OUTERS = ["jacket", "coat", "blazer", "cardigan", "overcoat"];
  const FOOTWEAR = ["shoe", "shoes", "sneaker", "sneakers", "sandals", "slipper", "boots"];
  const ACCESS = ["bag", "backpack", "watch", "cap", "hat", "scarf", "sunglasses", "glasses", "belt", "tie"];

  // Heuristic: if uri contains words (often from filenames or hosted labels), use them
  const candidates = new Set<string>();
  try {
    const parts = uri.split(/[^a-zA-Z0-9]+/).map(p => p.toLowerCase()).filter(Boolean);
    parts.forEach(p => candidates.add(p));
  } catch (e) {
    // ignore
  }

  // Also try to infer from common image hosting patterns (contain clothing words)
  const found: string[] = [];
  const pushIf = (arr: string[], target: string[]) => {
    for (const a of arr) {
      if (candidates.has(a) || uri.toLowerCase().includes(a)) {
        target.push(a);
      }
    }
  };

  pushIf(TOPS, found);
  pushIf(BOTTOMS, found);
  pushIf(DRESSES, found);
  pushIf(OUTERS, found);
  pushIf(FOOTWEAR, found);
  pushIf(ACCESS, found);

  // Normalize and map synonyms to readable labels
  const mapLabel = (token: string) => {
    if (["tshirt","t-shirt","tee"].includes(token)) return "T-shirt";
    if (token === "shirt") return "Shirt";
    if (["kurta","kurti"].includes(token)) return "Kurta/Kurti";
    if (token === "blouse") return "Blouse";
    if (["jeans"].includes(token)) return "Jeans";
    if (["trouser","pants","pant"].includes(token)) return "Trousers";
    if (token === "shorts") return "Shorts";
    if (token === "skirt") return "Skirt";
    if (["sari","saree"].includes(token)) return "Saree";
    if (token === "dress") return "Dress";
    if (token === "lehenga") return "Lehenga";
    if (token === "salwar") return "Salwar";
    if (["jacket","coat","blazer","cardigan"].includes(token)) return token.charAt(0).toUpperCase() + token.slice(1);
    if (["shoe","shoes","sneaker","sneakers","boots","sandals","slipper"].includes(token)) return "Footwear";
    if (["bag","backpack"].includes(token)) return "Bag/Backpack";
    if (["watch"].includes(token)) return "Watch";
    if (["cap","hat"].includes(token)) return "Cap/Hat";
    if (["sunglasses","glasses"].includes(token)) return "Glasses";
    return token;
  };

  const accessories: string[] = [];
  let top: string | null = null;
  let bottom: string | null = null;
  let dress: string | null = null;
  let outer: string | null = null;
  let footwear: string | null = null;

  for (const f of found) {
    const f0 = norm(f);
    if (TOPS.includes(f0) && !top) top = mapLabel(f0);
    else if (BOTTOMS.includes(f0) && !bottom) bottom = mapLabel(f0);
    else if (DRESSES.includes(f0) && !dress) dress = mapLabel(f0);
    else if (OUTERS.includes(f0) && !outer) outer = mapLabel(f0);
    else if (FOOTWEAR.includes(f0) && !footwear) footwear = mapLabel(f0);
    else if (ACCESS.includes(f0)) accessories.push(mapLabel(f0));
    else accessories.push(mapLabel(f0));
  }

  // Heuristic confidence: more labeled parts -> higher confidence
  const partsCount = [top, bottom, dress, outer, footwear].filter(Boolean).length + accessories.length;
  const confidence = Math.min(0.95, 0.15 + partsCount * 0.18);

  // If nothing detected from uri, provide a sensible default guess
  if (partsCount === 0) {
    // try to guess from filename words still; fallback minimal labels
    const guess = uri.toLowerCase();
    if (guess.includes('sari') || guess.includes('saree')) dress = 'Saree';
    else if (guess.includes('dress')) dress = 'Dress';
    else if (guess.includes('shirt')) top = 'Shirt';
    else if (guess.includes('jeans')) bottom = 'Jeans';
  }

  // Deduplicate accessories
  const uniqueAccessories = Array.from(new Set(accessories.filter(Boolean)));

  const rawLabels = found.length ? found : Array.from(candidates).slice(0,5);

  return {
    top,
    bottom,
    dress,
    outer,
    footwear,
    accessories: uniqueAccessories,
    rawLabels,
    confidence,
  };
}