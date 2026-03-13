import { s, prompt } from "@hashbrownai/core";
import { exposeComponent, exposeMarkdown, useUiKit } from "@hashbrownai/react";
import { chartInputSchema } from "@/lib/chart-agent";
import { ExecutiveSummary } from "./executive-summary";
import { HorizontalRule } from "./horizontal-rule";
import { Heading } from "./heading";
import { CitationBlock } from "./citation-block";
import { Chart } from "./chart";
import { ChartGhostLoader } from "./chart-ghost-loader";
import { markdownRendererProps } from "./markdown-renderer";

export function useChatKit() {
  return useUiKit({
    //     examples: prompt`
    //       # Fast-Food Article
    //       <ui>
    //         <h level=${1} text="Chicken sandwiches that over-deliver on protein" />
    //         <executive-summary text="Chick-fil-A, Subway, and Arby's all have high-protein sandwiches, but the sodium trade-offs vary sharply." />
    //         <hr />
    //         <markdown children=${`
    // Compare standout menu items and cite the source URLs inline.[^1]

    // [^1]: Example Source https://example.com
    //         `} />
    //         <chart chart=${{
    //           prompt: "Compare protein and sodium for chicken sandwiches",
    //           chartType: "scatter",
    //           restaurants: ["Chick-fil-A", "Subway", "Arby's"],
    //           menuItems: [],
    //           categories: ["Chicken"],
    //           searchTerm: "chicken sandwich",
    //           maxCalories: 900,
    //           minCalories: null,
    //           minProtein: 20,
    //           maxSodium: null,
    //           limit: 8,
    //           sortBy: "protein",
    //           sortDirection: "desc",
    //         }} />
    //       </ui>
    //     `,
    components: [
      exposeComponent(ExecutiveSummary, {
        name: "executive-summary",
        description:
          "Present a concise executive summary at the top of the article.",
        props: {
          text: s.streaming.string("The summary text stitched from the data"),
        },
      }),
      exposeComponent(HorizontalRule, {
        name: "hr",
        description: "Show a horizontal rule to separate sections.",
      }),
      exposeMarkdown({
        name: "markdown",
        citations: true,
        description: `
          Render markdown with links, emphasis, lists, and citation definitions.
          Define citations with [^source-id]: Source title https://example.com
        `,
        ...markdownRendererProps,
      }),
      exposeComponent(Heading, {
        name: "h",
        description:
          "Show a heading to separate sections with configurable level.",
        props: {
          text: s.streaming.string("The text to show in the heading"),
          level: s.number("Heading level from 1 to 6"),
        },
      }),
      exposeComponent(CitationBlock, {
        name: "blockquote",
        description: "Highlight a supporting quote or citation.",
        props: {
          text: s.streaming.string("The quoted text to display"),
          source: s.streaming.string("Optional source or attribution"),
        },
      }),
      exposeComponent(Chart, {
        name: "chart",
        description: `
          Visualize insights from the fast-food nutrition dataset. Supports bar,
          line, pie, doughnut, and scatter charts with configurable filters.
        `,
        fallback: ChartGhostLoader,
        props: {
          chart: chartInputSchema,
        },
      }),
    ],
  });
}
