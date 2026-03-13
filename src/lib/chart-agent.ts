import { s } from "@hashbrownai/core";

export const chartTypeHints = [
  "bar",
  "bubble",
  "doughnut",
  "line",
  "pie",
  "polarArea",
  "radar",
  "scatter",
] as const;

export const chartInputSchema = s.object("Configuration for the fast-food chart", {
  prompt: s.string("Narrative description of the chart to create"),
  chartType: s.anyOf([
    s.enumeration("Optional Chart.js chart type hint", [...chartTypeHints]),
    s.nullish(),
  ]),
  restaurants: s.array(
    "Optional list of restaurant names to include",
    s.string("Restaurant name"),
  ),
  menuItems: s.array(
    "Specific menu item ids to focus on",
    s.string("Menu item id"),
  ),
  categories: s.array(
    "Menu categories to highlight",
    s.string("Category label"),
  ),
  searchTerm: s.anyOf([s.string("Optional search term"), s.nullish()]),
  maxCalories: s.anyOf([s.number("Maximum calories"), s.nullish()]),
  minCalories: s.anyOf([s.number("Minimum calories"), s.nullish()]),
  minProtein: s.anyOf([s.number("Minimum protein"), s.nullish()]),
  maxSodium: s.anyOf([s.number("Maximum sodium"), s.nullish()]),
  limit: s.anyOf([s.number("Maximum number of menu items to fetch"), s.nullish()]),
  sortBy: s.anyOf([
    s.enumeration("Metric used to sort results", [
      "calories",
      "protein",
      "totalFat",
      "sodium",
      "sugar",
    ]),
    s.nullish(),
  ]),
  sortDirection: s.anyOf([
    s.enumeration("Sort direction", ["desc", "asc"]),
    s.nullish(),
  ]),
});

export const chartAgentResultSchema = s.object("Result", {
  result: s.anyOf([
    s.object("Success", {
      type: s.literal("SUCCESS"),
      javascript: s.string("The JavaScript code to render the chart"),
    }),
    s.object("Error", {
      type: s.literal("ERROR"),
      message: s.string("The error message"),
    }),
  ]),
});
