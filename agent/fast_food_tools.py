import csv
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from langchain.tools import tool

DATASET_PATH = Path(__file__).resolve().parent.parent / "public" / "fastfood_v2.csv"

RESTAURANT_ALIASES = {
    "chick fil a": ["chick-fil-a", "cfa"],
    "mcdonalds": ["mcdonald's", "mcdonald's", "mcd", "mcds"],
    "kfc": ["kentucky fried chicken"],
}


def normalize_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower().replace("'", "")).strip()


def levenshtein(left: str, right: str) -> int:
    if left == right:
        return 0

    rows = len(left) + 1
    columns = len(right) + 1
    matrix = [[0] * columns for _ in range(rows)]

    for row in range(rows):
        matrix[row][0] = row
    for column in range(columns):
        matrix[0][column] = column

    for row in range(1, rows):
        for column in range(1, columns):
            cost = 0 if left[row - 1] == right[column - 1] else 1
            matrix[row][column] = min(
                matrix[row - 1][column] + 1,
                matrix[row][column - 1] + 1,
                matrix[row - 1][column - 1] + cost,
            )

    return matrix[-1][-1]


def similarity(left: str, right: str) -> float:
    max_length = max(len(left), len(right))
    if max_length == 0:
        return 1.0
    return 1 - (levenshtein(left, right) / max_length)


def fuzzy_match(left: str, right: str, threshold: float = 0.72) -> bool:
    a = normalize_for_match(left)
    b = normalize_for_match(right)
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    return similarity(a, b) >= threshold


def expand_aliases(value: str) -> list[str]:
    expanded = {value}
    for canonical, aliases in RESTAURANT_ALIASES.items():
        candidates = [canonical, *aliases]
        if value in candidates:
            expanded.update(candidates)
    return list(expanded)


def fuzzy_match_restaurant(left: str, right: str) -> bool:
    return any(
        fuzzy_match(candidate_left, candidate_right, 0.72)
        for candidate_left in expand_aliases(normalize_for_match(left))
        for candidate_right in expand_aliases(normalize_for_match(right))
    )


def get_metric_value(item: dict[str, Any], metric: str) -> float:
    mapping = {
        "calories": item["calories"],
        "protein": item["protein"],
        "totalFat": item["totalFat"],
        "sodium": item["sodium"],
        "sugar": item["sugar"],
    }
    return float(mapping.get(metric, item["calories"]))


@lru_cache(maxsize=1)
def load_fast_food_items() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    with DATASET_PATH.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            restaurant = row["chain"].strip()
            item = row["menu_item"].strip()
            items.append(
                {
                    "id": normalize_for_match(f"{restaurant}-{item}").replace(" ", "-"),
                    "restaurant": restaurant,
                    "item": item,
                    "shortName": row["short_name"].strip(),
                    "description": row["description"].strip(),
                    "servingSize": row["serving_size"].strip(),
                    "categories": [
                        category.strip()
                        for category in row["categories"].split("|")
                        if category.strip()
                    ],
                    "calories": float(row["calories"] or 0),
                    "totalFat": float(row["total_fat_g"] or 0),
                    "saturatedFat": float(row["saturated_fat_g"] or 0),
                    "transFat": float(row["trans_fat_g"] or 0),
                    "cholesterol": float(row["cholesterol_mg"] or 0),
                    "sodium": float(row["sodium_mg"] or 0),
                    "totalCarbs": float(row["carbs_g"] or 0),
                    "fiber": float(row["fiber_g"] or 0),
                    "sugar": float(row["sugar_g"] or 0),
                    "protein": float(row["protein_g"] or 0),
                    "sources": [
                        source.strip()
                        for source in row["sources"].split("|")
                        if source.strip()
                    ],
                    "lastAudited": row["last_audited"].strip() or None,
                }
            )
    return items


def query_fast_food_items(
    query: str = "",
    restaurants: list[str] | None = None,
    categories: list[str] | None = None,
    max_calories: float | None = None,
    min_protein: float | None = None,
    max_sodium: float | None = None,
    limit: int | None = 25,
    sort_by: str | None = None,
    sort_direction: str | None = None,
) -> list[dict[str, Any]]:
    items = list(load_fast_food_items())

    if restaurants:
        items = [
            item
            for item in items
            if any(
                fuzzy_match_restaurant(restaurant, item["restaurant"])
                for restaurant in restaurants
            )
        ]

    if categories:
        items = [
            item
            for item in items
            if any(
                fuzzy_match(category, item_category, 0.65)
                for category in categories
                for item_category in item["categories"]
            )
        ]

    if query.strip():
        tokens = [token for token in query.strip().split() if token]
        items = [
            item
            for item in items
            if all(
                any(
                    fuzzy_match(token, word, 0.65)
                    or normalize_for_match(token) in normalize_for_match(word)
                    for word in " ".join(
                        [
                            item["restaurant"],
                            item["item"],
                            item["shortName"],
                            item["description"],
                            item["servingSize"],
                            " ".join(item["categories"]),
                        ]
                    ).split()
                )
                for token in tokens
            )
        ]

    if max_calories is not None:
        items = [item for item in items if item["calories"] <= max_calories]

    if min_protein is not None:
        items = [item for item in items if item["protein"] >= min_protein]

    if max_sodium is not None:
        items = [item for item in items if item["sodium"] <= max_sodium]

    if sort_by:
        reverse = (sort_direction or "desc").lower() != "asc"
        items.sort(
            key=lambda item: (get_metric_value(item, sort_by), item["item"]),
            reverse=reverse,
        )

    if limit:
        items = items[: max(limit, 1)]

    return items


@tool
def search_fast_food_items(
    query: str = "",
    restaurants: list[str] | None = None,
    categories: list[str] | None = None,
    maxCalories: str = "",
    minProtein: str = "",
    maxSodium: str = "",
    limit: str = "25",
    sortBy: str = "",
    sortDirection: str = "",
):
    """
    Search the fast-food nutrition dataset by restaurant, category, or nutrient
    thresholds. Use this before making specific claims about menu items.
    """

    def to_number(value: str) -> float | None:
        trimmed = value.strip()
        if not trimmed:
            return None
        try:
            return float(trimmed)
        except ValueError:
            return None

    def to_limit(value: str) -> int | None:
        parsed = to_number(value)
        if parsed is None:
            return None
        rounded = int(parsed)
        return rounded if rounded > 0 else None

    return query_fast_food_items(
        query=query,
        restaurants=[entry.strip() for entry in restaurants or [] if entry.strip()] or None,
        categories=[entry.strip() for entry in categories or [] if entry.strip()] or None,
        max_calories=to_number(maxCalories),
        min_protein=to_number(minProtein),
        max_sodium=to_number(maxSodium),
        limit=to_limit(limit) or 25,
        sort_by=sortBy.strip() or None,
        sort_direction=sortDirection.strip() or None,
    )
