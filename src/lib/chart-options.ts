import type {
  ChartConfiguration,
  ChartType,
  TooltipCallbacks,
  TooltipItem,
} from "chart.js";
import { s } from "@hashbrownai/core";
import { chartSchema } from "./chart-schema";

type RuntimeChartConfig = s.Infer<typeof chartSchema>;
type RuntimeChartOptions = RuntimeChartConfig["options"];
type RuntimeTooltipConfig = RuntimeChartOptions["plugins"]["tooltip"];
type TemplateScope = Record<string, unknown>;
type TooltipMultiKey =
  | "title"
  | "beforeTitle"
  | "afterTitle"
  | "beforeBody"
  | "afterBody"
  | "footer";
type TooltipSingleKey = "label" | "afterLabel";

const TEMPLATE_PATTERN = /{{\s*([^}]+?)\s*}}/g;
const MAX_TEMPLATE_DEPTH = 10;

export function buildChartOptions(
  options: RuntimeChartOptions,
): ChartConfiguration["options"] {
  const { plugins, interaction, ...restOptions } = options;
  const { tooltip: tooltipConfig, ...otherPluginOptions } = plugins;

  return {
    responsive: true,
    maintainAspectRatio: true,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "transparent",
    ...restOptions,
    plugins: {
      ...otherPluginOptions,
      tooltip: createTooltipOptions(tooltipConfig),
    },
    interaction: normalizeInteraction(interaction),
  };
}

function normalizeInteraction(
  interaction: RuntimeChartOptions["interaction"] | null | undefined,
) {
  if (!interaction) {
    return undefined;
  }

  return {
    mode: interaction.mode ?? undefined,
    axis: interaction.axis ?? undefined,
    intersect:
      interaction.intersect === undefined ? undefined : interaction.intersect,
  };
}

function createTooltipOptions(
  tooltipConfig: RuntimeTooltipConfig,
): Record<string, unknown> | undefined {
  if (!tooltipConfig) {
    return undefined;
  }

  const callbacks = buildTooltipCallbacks(tooltipConfig);

  return {
    enabled: tooltipConfig.enabled ?? true,
    displayColors: tooltipConfig.displayColors ?? true,
    ...(callbacks ? { callbacks } : {}),
  };
}

function buildTooltipCallbacks(
  config: RuntimeTooltipConfig,
): TooltipCallbacks<ChartType> | undefined {
  if (!config) {
    return undefined;
  }

  const callbacks: Partial<TooltipCallbacks<ChartType>> = {};

  const registerMulti = <K extends TooltipMultiKey>(
    key: K,
    template?: string | null,
  ) => {
    const callback = createMultiDatumCallback(template);
    if (callback) {
      callbacks[key] = callback as TooltipCallbacks<ChartType>[K];
    }
  };

  const registerSingle = <K extends TooltipSingleKey>(
    key: K,
    template?: string | null,
  ) => {
    const callback = createSingleDatumCallback(template);
    if (callback) {
      callbacks[key] = callback as TooltipCallbacks<ChartType>[K];
    }
  };

  registerMulti("title", config.titleTemplate ?? null);
  registerMulti("beforeTitle", config.beforeTitleTemplate ?? null);
  registerMulti("afterTitle", config.afterTitleTemplate ?? null);
  registerSingle("label", config.labelTemplate ?? null);
  registerSingle("afterLabel", config.afterLabelTemplate ?? null);
  registerMulti("beforeBody", config.beforeBodyTemplate ?? null);
  registerMulti("afterBody", config.afterBodyTemplate ?? null);
  registerMulti("footer", config.footerTemplate ?? null);

  return Object.keys(callbacks).length
    ? (callbacks as TooltipCallbacks<ChartType>)
    : undefined;
}

function createMultiDatumCallback(
  template?: string | null,
): ((items: TooltipItem<ChartType>[]) => string | string[]) | undefined {
  const renderer = createTemplateRenderer(template);
  if (!renderer) {
    return undefined;
  }

  return (items) => {
    const lines = items
      .map((item) => renderer(item))
      .filter((line) => line.length > 0);

    return lines.length ? lines : "";
  };
}

function createSingleDatumCallback(
  template?: string | null,
): ((item: TooltipItem<ChartType>) => string | string[]) | undefined {
  const renderer = createTemplateRenderer(template);
  if (!renderer) {
    return undefined;
  }

  return (item) => renderer(item);
}

function createTemplateRenderer(
  template?: string | null,
): ((item: TooltipItem<ChartType>) => string) | null {
  if (!template) {
    return null;
  }

  const normalized = template.trim();
  if (!normalized) {
    return null;
  }

  return (item) => {
    const scope: TemplateScope = {
      datum: item,
      chart: item.chart,
      dataset: item.dataset,
      label: item.label,
      dataIndex: item.dataIndex,
      datasetIndex: item.datasetIndex,
      parsed: item.parsed,
      raw: item.raw,
      formattedValue: item.formattedValue,
    };

    return renderTemplate(normalized, scope);
  };
}

function renderTemplate(template: string, scope: TemplateScope): string {
  return template.replace(TEMPLATE_PATTERN, (_, expression = ""): string => {
    const value = evaluatePath(expression.trim(), scope, 0);

    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }

    return String(value);
  });
}

type TemplateToken =
  | { kind: "prop"; value: string }
  | { kind: "literal"; value: string | number }
  | { kind: "expression"; value: string };

function evaluatePath(path: string, scope: TemplateScope, depth: number): unknown {
  const trimmed = path.trim();
  if (!trimmed || depth > MAX_TEMPLATE_DEPTH) {
    return undefined;
  }

  const tokens = tokenizePath(trimmed);
  if (!tokens.length) {
    return undefined;
  }

  let current: unknown = scope;

  for (const token of tokens) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (token.kind === "prop" || token.kind === "literal") {
      current = readProperty(current, token.value);
      continue;
    }

    const resolvedKey = evaluatePath(token.value, scope, depth + 1);
    if (resolvedKey === null || resolvedKey === undefined) {
      return undefined;
    }
    if (typeof resolvedKey !== "string" && typeof resolvedKey !== "number") {
      return undefined;
    }
    current = readProperty(current, resolvedKey);
  }

  return current;
}

function tokenizePath(path: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let buffer = "";

  const pushBuffer = () => {
    if (!buffer) return;
    tokens.push({ kind: "prop", value: buffer });
    buffer = "";
  };

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index];

    if (char === ".") {
      pushBuffer();
      continue;
    }

    if (char === "[") {
      pushBuffer();
      const closingIndex = findClosingBracket(path, index);
      if (closingIndex === -1) {
        return [];
      }
      const content = path.slice(index + 1, closingIndex).trim();
      if (!content) {
        return [];
      }
      if (/^(['"]).*\1$/.test(content)) {
        tokens.push({
          kind: "literal",
          value: content.slice(1, -1),
        });
      } else if (/^-?\d+(\.\d+)?$/.test(content)) {
        tokens.push({
          kind: "literal",
          value: Number(content),
        });
      } else {
        tokens.push({ kind: "expression", value: content });
      }
      index = closingIndex;
      continue;
    }

    buffer += char;
  }

  pushBuffer();
  return tokens;
}

function findClosingBracket(value: string, startIndex: number) {
  let depth = 0;

  for (let index = startIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function readProperty(target: unknown, key: string | number) {
  if (target === null || target === undefined) {
    return undefined;
  }

  if (typeof target !== "object" && typeof target !== "function") {
    return undefined;
  }

  return Reflect.get(target as object, key);
}
