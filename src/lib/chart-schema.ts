import { s } from "@hashbrownai/core";

const legendSchema = s.object("the legend for the chart", {
  display: s.boolean("whether to display the legend"),
  position: s.enumeration("the position of the legend", [
    "top",
    "bottom",
    "left",
    "right",
  ]),
  align: s.enumeration("alignment of the legend items", [
    "start",
    "center",
    "end",
  ]),
  labels: s.object("the labels configuration for the legend", {
    color: s.string("the color of the label text"),
    font: s.object("the font options for legend labels", {
      family: s.string("the font family"),
      size: s.number("the font size"),
      style: s.enumeration("the font style", [
        "normal",
        "italic",
        "oblique",
        "initial",
        "inherit",
      ]),
      weight: s.number("the font weight"),
      lineHeight: s.number("the line height for labels"),
    }),
  }),
});

const interactionSchema = s.object("the interaction for the chart", {
  mode: s.anyOf([
    s.enumeration("the mode of the interaction", [
      "index",
      "dataset",
      "point",
      "nearest",
      "x",
      "y",
    ]),
    s.nullish(),
  ]),
  axis: s.anyOf([
    s.enumeration("the axis of the interaction", ["x", "y", "xy"]),
    s.nullish(),
  ]),
  intersect: s.boolean("whether to intersect the interaction"),
});

const nullableStringTemplate = (description: string) =>
  s.anyOf([s.string(description), s.nullish()]);

const tooltipSchema = s.anyOf([
  s.object("templated tooltip configuration", {
    enabled: s.anyOf([s.boolean("whether the tooltip is enabled"), s.nullish()]),
    displayColors: s.anyOf([
      s.boolean("whether to display dataset colors in the tooltip"),
      s.nullish(),
    ]),
    titleTemplate: nullableStringTemplate("Mustache template for the title"),
    beforeTitleTemplate: nullableStringTemplate("Template before the title"),
    afterTitleTemplate: nullableStringTemplate("Template after the title"),
    labelTemplate: nullableStringTemplate("Template for the label"),
    afterLabelTemplate: nullableStringTemplate("Template after the label"),
    beforeBodyTemplate: nullableStringTemplate("Template before the body"),
    afterBodyTemplate: nullableStringTemplate("Template after the body"),
    footerTemplate: nullableStringTemplate("Template for the footer"),
  }),
  s.nullish(),
]);

const optionsSchema = s.object("the options for the chart", {
  plugins: s.object("the plugins for the chart", {
    legend: legendSchema,
    title: s.object("the title configuration for the chart", {
      display: s.boolean("whether to display the title"),
      text: s.string("the title text"),
      position: s.enumeration("the position of the title", ["top", "bottom"]),
      color: s.string("the color of the title"),
      align: s.enumeration("alignment of the title", ["start", "center", "end"]),
      font: s.object("the font options for the title", {
        family: s.string("the font family"),
        weight: s.number("the font weight"),
        size: s.number("the font size"),
        lineHeight: s.number("the line height for the title"),
      }),
    }),
    tooltip: tooltipSchema,
  }),
  scales: s.object("the scales for the chart", {
    x: s.object("the x-axis scale", {
      grid: s.object("the grid configuration for the x-axis", {
        color: s.string("the color of the grid"),
      }),
      title: s.anyOf([
        s.object("the title for the x-axis", {
          display: s.boolean("whether to display the axis title"),
          text: s.string("the axis title"),
          color: s.string("the axis title color"),
          font: s.object("the axis title font", {
            family: s.string("the font family"),
            size: s.number("the font size"),
            weight: s.number("the font weight"),
          }),
        }),
        s.nullish(),
      ]),
      ticks: s.object("the ticks configuration for the x-axis", {
        color: s.string("the color of the label text"),
        font: s.object("the font options for x-axis labels", {
          family: s.string("the font family"),
          size: s.number("the font size"),
        }),
      }),
    }),
    y: s.object("the y-axis scale", {
      grid: s.object("the grid configuration for the y-axis", {
        color: s.string("the color of the grid"),
      }),
      title: s.anyOf([
        s.object("the title for the y-axis", {
          display: s.boolean("whether to display the axis title"),
          text: s.string("the axis title"),
          color: s.string("the axis title color"),
          font: s.object("the axis title font", {
            family: s.string("the font family"),
            size: s.number("the font size"),
            weight: s.number("the font weight"),
          }),
        }),
        s.nullish(),
      ]),
      ticks: s.object("the ticks configuration for the y-axis", {
        color: s.string("the color of the label text"),
        font: s.object("the font options for y-axis labels", {
          family: s.string("the font family"),
          size: s.number("the font size"),
        }),
      }),
    }),
  }),
  interaction: interactionSchema,
});

const barDatasetSchema = s.object("a bar dataset", {
  label: s.string("the dataset label"),
  data: s.array("data points for the dataset", s.number("a data point")),
  backgroundColor: s.anyOf([
    s.string("the CSS color for the dataset"),
    s.array("the CSS colors for the dataset", s.string("a CSS color")),
  ]),
  tooltipMeta: s.anyOf([
    s.array("tooltip metadata", s.object("tooltip metadata entry", {})),
    s.nullish(),
  ]),
});

const lineDatasetSchema = s.object("a line dataset", {
  label: s.string("the dataset label"),
  data: s.array("data points for the dataset", s.number("a data point")),
  borderColor: s.string("the CSS color of the dataset"),
  backgroundColor: s.string("the CSS color of the dataset"),
  tension: s.number("the line tension"),
  fill: s.anyOf([s.boolean("whether to fill under the line"), s.nullish()]),
  tooltipMeta: s.anyOf([
    s.array("tooltip metadata", s.object("tooltip metadata entry", {})),
    s.nullish(),
  ]),
});

const pointSchema = s.object("a point", {
  x: s.number("the x value"),
  y: s.number("the y value"),
  label: s.anyOf([s.string("label"), s.nullish()]),
});

const scatterDatasetSchema = s.object("a scatter dataset", {
  label: s.string("the dataset label"),
  data: s.array("data points for the dataset", pointSchema),
  backgroundColor: s.string("the CSS color of the dataset"),
  borderColor: s.anyOf([s.string("the CSS border color"), s.nullish()]),
  tooltipMeta: s.anyOf([
    s.array("tooltip metadata", s.object("tooltip metadata entry", {})),
    s.nullish(),
  ]),
});

const chartTypeSchema = s.anyOf([
  s.object("a line chart", {
    type: s.literal("line"),
    data: s.object("The data for a line chart", {
      labels: s.array("The labels for the x-axis", s.string("an individual label")),
      datasets: s.array("The datasets for the chart", lineDatasetSchema),
    }),
  }),
  s.object("a bar chart", {
    type: s.literal("bar"),
    data: s.object("The data for a bar chart", {
      labels: s.array("The labels for the x-axis", s.string("an individual label")),
      datasets: s.array("The datasets for the chart", barDatasetSchema),
    }),
  }),
  s.object("a pie chart", {
    type: s.literal("pie"),
    data: s.object("The data for a pie chart", {
      labels: s.array("The labels for the pie chart", s.string("an individual label")),
      datasets: s.array("The datasets for the pie chart", barDatasetSchema),
    }),
  }),
  s.object("a doughnut chart", {
    type: s.literal("doughnut"),
    data: s.object("The data for a doughnut chart", {
      labels: s.array("The labels for the chart", s.string("an individual label")),
      datasets: s.array("The datasets for the chart", barDatasetSchema),
    }),
  }),
  s.object("a scatter chart", {
    type: s.literal("scatter"),
    data: s.object("The data for a scatter chart", {
      datasets: s.array("The datasets for the chart", scatterDatasetSchema),
    }),
  }),
]);

export const chartSchema = s.object("a chart", {
  chart: chartTypeSchema,
  options: optionsSchema,
});
