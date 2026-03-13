import { s } from "@hashbrownai/core";

const nullableStringArray = (description: string) =>
  s.anyOf([s.array(description, s.string("Entry")), s.nullish()]);

const numericInput = (description: string) =>
  s.anyOf([
    s.number(description),
    s.string(`${description} (stringified number)`),
    s.nullish(),
  ]);

export const fastFoodQuerySchema = s.object("fast food dataset query", {
  itemIds: nullableStringArray("Exact menu item identifiers"),
  restaurants: nullableStringArray(
    'Restaurants to include (supports fuzzy matching like "CFA" for Chick-fil-A)',
  ),
  categories: nullableStringArray(
    'Menu categories to include (supports partial matches, e.g. "sal" for Salad)',
  ),
  searchTerm: s.anyOf([
    s.string("Free-text search across restaurant and menu item names"),
    s.nullish(),
  ]),
  maxCalories: numericInput("Maximum calories to include"),
  minCalories: numericInput("Minimum calories to include"),
  minProtein: numericInput("Minimum protein grams"),
  maxSodium: numericInput("Maximum sodium (mg)"),
  limit: numericInput("Maximum number of records to return"),
  sortBy: s.anyOf([
    s.enumeration("Metric used to sort results", [
      "calories",
      "protein",
      "totalFat",
      "sodium",
      "sugar",
    ]),
    s.string("Sort metric as free-form text"),
    s.nullish(),
  ]),
  sortDirection: s.anyOf([
    s.enumeration("Sort direction", ["asc", "desc"]),
    s.string("Sort direction as text"),
    s.nullish(),
  ]),
});

export const fastFoodItemSchema = s.object("fast food menu item", {
  id: s.string("Unique identifier for the menu item"),
  restaurant: s.string("Restaurant or chain name"),
  item: s.string("Full menu item label"),
  shortName: s.string("Short alias for the menu item"),
  description: s.string("Human-readable description"),
  servingSize: s.string("Serving size descriptor"),
  categories: s.array(
    "Menu categories assigned to the item",
    s.string("Category label"),
  ),
  calories: s.number("Total calories (kcal)"),
  totalFat: s.number("Total fat in grams"),
  saturatedFat: s.number("Saturated fat in grams"),
  transFat: s.number("Trans fat in grams"),
  cholesterol: s.number("Cholesterol (mg)"),
  sodium: s.number("Sodium (mg)"),
  totalCarbs: s.number("Total carbohydrates in grams"),
  fiber: s.number("Dietary fiber in grams"),
  sugar: s.number("Sugar in grams"),
  protein: s.number("Protein in grams"),
  sources: s.array(
    "Source URLs that back the nutrition data",
    s.string("Source URL"),
  ),
  lastAudited: s.anyOf([
    s.string("ISO timestamp for the last audit"),
    s.nullish(),
  ]),
});
