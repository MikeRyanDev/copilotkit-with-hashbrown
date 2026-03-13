export interface FastFoodItem {
  id: string;
  restaurant: string;
  item: string;
  shortName: string;
  description: string;
  servingSize: string;
  categories: string[];
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  fiber: number;
  sugar: number;
  protein: number;
  sources: string[];
  lastAudited: string | null;
}

export type FastFoodSortMetric =
  | "calories"
  | "protein"
  | "totalFat"
  | "sodium"
  | "sugar";

export interface FastFoodQueryOptions {
  itemIds?: string[] | null;
  restaurants?: string[] | null;
  categories?: string[] | null;
  searchTerm?: string | null;
  maxCalories?: number | null;
  minCalories?: number | null;
  minProtein?: number | null;
  maxSodium?: number | null;
  limit?: number | null;
  sortBy?: FastFoodSortMetric | null;
  sortDirection?: "asc" | "desc" | null;
}

const CSV_URL = "/fastfood_v2.csv";

let itemsPromise: Promise<FastFoodItem[]> | null = null;

const restaurantAliases: Record<string, string[]> = {
  "chick fil a": ["chick-fil-a", "cfa"],
  "mcdonalds": ["mcdonald's", "mcdonald's", "mcd", "mcd's"],
  "kfc": ["kentucky fried chicken"],
};

export async function getFastFoodItems(): Promise<FastFoodItem[]> {
  if (!itemsPromise) {
    itemsPromise = fetch(CSV_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load fast-food dataset (${response.status})`);
        }

        return response.text();
      })
      .then(parseFastFoodCsv);
  }

  return itemsPromise;
}

export async function queryFastFoodItems(
  options: FastFoodQueryOptions = {},
): Promise<FastFoodItem[]> {
  const items = await getFastFoodItems();
  return filterFastFoodItems(items, options);
}

export function filterFastFoodItems(
  items: FastFoodItem[],
  options: FastFoodQueryOptions = {},
): FastFoodItem[] {
  const normalized = {
    itemIds: normalizeList(options.itemIds),
    restaurants: normalizeList(options.restaurants),
    categories: normalizeList(options.categories),
    searchTerm: options.searchTerm?.trim() ?? null,
    maxCalories:
      typeof options.maxCalories === "number" ? options.maxCalories : null,
    minCalories:
      typeof options.minCalories === "number" ? options.minCalories : null,
    minProtein: typeof options.minProtein === "number" ? options.minProtein : null,
    maxSodium: typeof options.maxSodium === "number" ? options.maxSodium : null,
    limit:
      typeof options.limit === "number" && options.limit > 0
        ? Math.floor(options.limit)
        : null,
    sortBy: options.sortBy ?? null,
    sortDirection: options.sortDirection ?? "desc",
  } satisfies Required<Omit<FastFoodQueryOptions, "sortDirection">> & {
    sortDirection: "asc" | "desc";
  };

  let filtered = [...items];

  if (normalized.itemIds?.length) {
    const ids = new Set(normalized.itemIds.map((value) => value.toLowerCase()));
    filtered = filtered.filter((item) => ids.has(item.id.toLowerCase()));
  }

  if (normalized.restaurants?.length) {
    filtered = filtered.filter((item) =>
      normalized.restaurants!.some((restaurant) =>
        fuzzyMatchRestaurant(restaurant, item.restaurant),
      ),
    );
  }

  if (normalized.categories?.length) {
    filtered = filtered.filter((item) =>
      item.categories.some((itemCategory) =>
        normalized.categories!.some((category) =>
          fuzzyMatch(category, itemCategory, 0.65),
        ),
      ),
    );
  }

  if (normalized.searchTerm) {
    const tokens = normalized.searchTerm
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    filtered = filtered.filter((item) => {
      const haystack = [
        item.restaurant,
        item.item,
        item.shortName,
        item.description,
        item.servingSize,
        item.categories.join(" "),
      ]
        .join(" ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean);

      return tokens.every((token) =>
        haystack.some(
          (word) =>
            fuzzyMatch(token, word, 0.65) ||
            normalizeForMatch(word).includes(normalizeForMatch(token)),
        ),
      );
    });
  }

  if (normalized.maxCalories !== null) {
    filtered = filtered.filter((item) => item.calories <= normalized.maxCalories!);
  }

  if (normalized.minCalories !== null) {
    filtered = filtered.filter((item) => item.calories >= normalized.minCalories!);
  }

  if (normalized.minProtein !== null) {
    filtered = filtered.filter((item) => item.protein >= normalized.minProtein!);
  }

  if (normalized.maxSodium !== null) {
    filtered = filtered.filter((item) => item.sodium <= normalized.maxSodium!);
  }

  if (normalized.sortBy) {
    filtered.sort((left, right) =>
      compareByMetric(
        left,
        right,
        normalized.sortBy!,
        normalized.sortDirection,
      ),
    );
  }

  if (normalized.limit) {
    filtered = filtered.slice(0, normalized.limit);
  }

  return filtered;
}

function compareByMetric(
  left: FastFoodItem,
  right: FastFoodItem,
  metric: FastFoodSortMetric,
  direction: "asc" | "desc",
) {
  const difference = getMetricValue(left, metric) - getMetricValue(right, metric);
  if (difference !== 0) {
    return direction === "asc" ? difference : -difference;
  }

  return left.item.localeCompare(right.item);
}

function getMetricValue(item: FastFoodItem, metric: FastFoodSortMetric) {
  switch (metric) {
    case "protein":
      return item.protein;
    case "totalFat":
      return item.totalFat;
    case "sodium":
      return item.sodium;
    case "sugar":
      return item.sugar;
    case "calories":
    default:
      return item.calories;
  }
}

function normalizeList(values?: string[] | null) {
  if (!values?.length) {
    return null;
  }

  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fuzzyMatchRestaurant(left: string, right: string) {
  const leftNormalized = normalizeForMatch(left);
  const rightNormalized = normalizeForMatch(right);
  if (leftNormalized === rightNormalized) {
    return true;
  }

  const expandedLeft = expandAliases(leftNormalized);
  const expandedRight = expandAliases(rightNormalized);

  return expandedLeft.some((candidateLeft) =>
    expandedRight.some((candidateRight) =>
      fuzzyMatch(candidateLeft, candidateRight, 0.72),
    ),
  );
}

function expandAliases(value: string) {
  const expanded = new Set([value]);

  for (const [canonical, aliases] of Object.entries(restaurantAliases)) {
    const candidates = [canonical, ...aliases];
    if (candidates.some((candidate) => candidate === value)) {
      for (const candidate of candidates) {
        expanded.add(candidate);
      }
    }
  }

  return [...expanded];
}

function fuzzyMatch(left: string, right: string, threshold: number) {
  const a = normalizeForMatch(left);
  const b = normalizeForMatch(right);

  if (!a || !b) {
    return false;
  }

  if (a === b || a.includes(b) || b.includes(a)) {
    return true;
  }

  return similarity(a, b) >= threshold;
}

function similarity(left: string, right: string) {
  const distance = levenshtein(left, right);
  const maxLength = Math.max(left.length, right.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

function levenshtein(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );

  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function parseFastFoodCsv(csv: string): FastFoodItem[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const [, ...rows] = lines;

  return rows
    .map(parseCsvRow)
    .filter((row): row is string[] => row.length >= 18)
    .map((row) => ({
      id: slugify(`${row[0]}-${row[1]}`),
      restaurant: row[0],
      item: row[1],
      shortName: row[2],
      description: row[3],
      servingSize: row[4],
      categories: row[5]
        .split("|")
        .map((category) => category.trim())
        .filter(Boolean),
      calories: toNumber(row[6]),
      totalFat: toNumber(row[7]),
      saturatedFat: toNumber(row[8]),
      transFat: toNumber(row[9]),
      cholesterol: toNumber(row[10]),
      sodium: toNumber(row[11]),
      totalCarbs: toNumber(row[12]),
      fiber: toNumber(row[13]),
      sugar: toNumber(row[14]),
      protein: toNumber(row[15]),
      sources: row[16]
        .split("|")
        .map((source) => source.trim())
        .filter(Boolean),
      lastAudited: row[17]?.trim() ? row[17].trim() : null,
    }));
}

function parseCsvRow(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(value: string) {
  return normalizeForMatch(value).replace(/\s+/g, "-");
}
