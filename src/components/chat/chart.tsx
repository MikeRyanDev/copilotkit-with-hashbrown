"use client";

import { useEffect, useRef, useState } from "react";
import { useAgent, useAgentContext } from "@copilotkit/react-core/v2";
import { randomUUID, defaultApplyEvents, RunAgentInput } from "@ag-ui/client";
import type { ChartConfiguration } from "chart.js";
import { Chart as ChartJS } from "chart.js/auto";
import { s } from "@hashbrownai/core";
import {
  useJsonParser,
  useRuntime,
  useRuntimeFunction,
} from "@hashbrownai/react";
import { chartAgentResultSchema, chartInputSchema } from "@/lib/chart-agent";
import { chartSchema } from "@/lib/chart-schema";
import { buildChartOptions } from "@/lib/chart-options";
import {
  fastFoodItemSchema,
  fastFoodQuerySchema,
} from "@/lib/fast-food-schema";
import { queryFastFoodItems, type FastFoodQueryOptions } from "@/lib/fast-food";
import { Squircle } from "../squircle";
import { useCopilotKit } from "@copilotkit/react-core/v2";
import { filter, map, tap } from "rxjs";

type ChartInputConfig = s.Infer<typeof chartInputSchema>;
type RuntimeChartConfig = s.Infer<typeof chartSchema>;

export function Chart({ chart }: { chart: ChartInputConfig }) {
  const { agent } = useAgent({ agentId: "chart_coder_agent" });
  const { copilotkit } = useCopilotKit();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [runtimeChart, setRuntimeChart] = useState<RuntimeChartConfig | null>(
    null,
  );
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  useAgentContext({
    agentId: "chart_coder_agent",
    description: "output_schema",
    value: s.toJsonSchema(chartAgentResultSchema),
  });

  const getData = useRuntimeFunction({
    name: "getData",
    description: "Synchronously get fast-food data for the chart.",
    deps: [],
    args: fastFoodQuerySchema,
    result: s.array("menu items", fastFoodItemSchema),
    handler: async (input) => {
      const result = await queryFastFoodItems(sanitizeQuery(input));
      return result;
    },
  });

  const renderChart = useRuntimeFunction({
    name: "renderChart",
    description: "Render a chart using the local Chart.js bridge.",
    deps: [],
    args: chartSchema,
    handler: async (input) => {
      setRuntimeChart(input);
    },
  });

  const runtime = useRuntime({
    functions: [getData, renderChart],
    timeout: 10_000,
  });

  const { value: parsed } = useJsonParser(
    agentResponse ?? "",
    chartAgentResultSchema,
  );

  const generatedCode =
    parsed?.result?.type === "SUCCESS" ? parsed.result.javascript : null;

  useEffect(() => {
    console.log("parsed", parsed);
  }, [parsed]);

  useEffect(() => {
    console.log("agentResponse", agentResponse);
  }, [agentResponse]);

  useEffect(() => {
    const request = sanitizeChartInput(chart);
    if (!request.prompt) {
      return;
    }

    const input: RunAgentInput = {
      context: [
        {
          description: "output_schema",
          value: JSON.stringify(s.toJsonSchema(chartAgentResultSchema)),
        },
      ],
      messages: [
        {
          id: randomUUID(),
          role: "user",
          content: [
            "Runtime functions:",
            runtime.describe(),
            "",
            "Chart request JSON:",
            JSON.stringify(request, null, 2),
          ].join("\n"),
        },
      ],
      threadId: randomUUID(),
      runId: randomUUID(),
      tools: [],
    };

    const subscription = defaultApplyEvents(input, agent.run(input), agent, [])
      .pipe(
        map((result) => {
          return result.messages?.find(
            (message) => message.role === "assistant",
          )?.content;
        }),
        filter((content): content is string => !!content),
        tap((result) => setAgentResponse(result)),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [agent, chart, runtime, copilotkit]);

  useEffect(() => {
    if (!generatedCode) {
      return;
    }

    console.log("running code", generatedCode);

    const controller = new AbortController();

    runtime
      .run(generatedCode, controller.signal)
      .then((result) => {
        if (result?.error) {
          setRuntimeError(String(result.error));
        } else {
          console.log("result", result);
        }
      })
      .catch((error) => {
        setRuntimeError(error instanceof Error ? error.message : String(error));
      });

    return () => controller.abort();
  }, [generatedCode, runtime]);

  useEffect(() => {
    if (!runtimeError) {
      return;
    }

    console.error("runtimeError", runtimeError);
  }, [runtimeError]);

  useEffect(() => {
    if (!canvasRef.current || !runtimeChart) {
      return;
    }

    const canvas = canvasRef.current;
    const options = buildChartOptions(runtimeChart.options);
    chartInstanceRef.current?.destroy();
    const config = {
      ...runtimeChart.chart,
      options,
    } as ChartConfiguration;
    chartInstanceRef.current = new ChartJS(canvas, config);

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [runtimeChart]);

  return (
    <section className="my-5 w-full max-w-[960px]">
      <div className="relative p-5">
        <canvas ref={canvasRef} className="min-h-[320px] w-full" />
      </div>
    </section>
  );
}

function sanitizeQuery(
  input: s.Infer<typeof fastFoodQuerySchema>,
): FastFoodQueryOptions {
  const sanitizeList = (value?: string[] | null) => {
    if (!value?.length) {
      return null;
    }

    const cleaned = value.map((entry) => entry.trim()).filter(Boolean);
    return cleaned.length ? cleaned : null;
  };

  const sanitizeNumber = (value?: number | string | null) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sanitizeSortBy = (value?: string | null) => {
    if (!value) {
      return null;
    }

    return ["calories", "protein", "totalFat", "sodium", "sugar"].includes(
      value,
    )
      ? (value as FastFoodQueryOptions["sortBy"])
      : null;
  };

  const sanitizeSortDirection = (value?: string | null) =>
    value === "asc" || value === "desc" ? value : null;

  return {
    itemIds: sanitizeList(input.itemIds ?? null),
    restaurants: sanitizeList(input.restaurants ?? null),
    categories: sanitizeList(input.categories ?? null),
    searchTerm: input.searchTerm?.trim() || null,
    maxCalories: sanitizeNumber(input.maxCalories ?? null),
    minCalories: sanitizeNumber(input.minCalories ?? null),
    minProtein: sanitizeNumber(input.minProtein ?? null),
    maxSodium: sanitizeNumber(input.maxSodium ?? null),
    limit: sanitizeNumber(input.limit ?? null),
    sortBy: sanitizeSortBy(
      typeof input.sortBy === "string" ? input.sortBy.trim() : null,
    ),
    sortDirection: sanitizeSortDirection(
      typeof input.sortDirection === "string"
        ? input.sortDirection.trim().toLowerCase()
        : null,
    ),
  };
}

function sanitizeChartInput(chart: ChartInputConfig): ChartInputConfig {
  const sanitizeList = (value?: string[]) =>
    (value ?? []).map((entry) => entry.trim()).filter(Boolean);

  return {
    ...chart,
    prompt: chart.prompt.trim(),
    restaurants: sanitizeList(chart.restaurants),
    menuItems: sanitizeList(chart.menuItems),
    categories: sanitizeList(chart.categories),
    searchTerm: chart.searchTerm?.trim() || null,
    chartType: chart.chartType ?? null,
    maxCalories: chart.maxCalories ?? null,
    minCalories: chart.minCalories ?? null,
    minProtein: chart.minProtein ?? null,
    maxSodium: chart.maxSodium ?? null,
    limit: chart.limit ?? null,
    sortBy: chart.sortBy ?? null,
    sortDirection: chart.sortDirection ?? null,
  };
}
