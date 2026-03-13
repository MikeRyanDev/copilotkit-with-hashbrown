"use client";

import type { MouseEvent } from "react";
import {
  createMagicTextNodeRenderers,
  type MagicTextCitationRenderData,
  type MagicTextNodeRenderers,
} from "@hashbrownai/react";

type PromptNavigationDetail = {
  prompt: string;
};

function emitPromptNavigation(prompt: string) {
  window.dispatchEvent(
    new CustomEvent<PromptNavigationDetail>("hb:prompt-link", {
      detail: { prompt },
    }),
  );
}

function handleArticleLink(url: string) {
  if (typeof window === "undefined") {
    return;
  }

  const absolute = new URL(url, window.location.origin);
  const prompt = absolute.searchParams.get("prompt");

  if (absolute.origin === window.location.origin && prompt) {
    window.history.replaceState({}, "", `/?prompt=${encodeURIComponent(prompt)}`);
    emitPromptNavigation(prompt);
    return;
  }

  window.open(absolute.toString(), "_blank", "noopener,noreferrer");
}

function onLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  url: string,
) {
  event.preventDefault();
  handleArticleLink(url);
}

function onCitationClick(
  event: MouseEvent<HTMLAnchorElement>,
  citation: MagicTextCitationRenderData,
) {
  event.preventDefault();
  const url = citation.definition?.url;
  if (!url) {
    return;
  }
  handleArticleLink(url);
}

export const markdownNodeRenderers: MagicTextNodeRenderers =
  createMagicTextNodeRenderers({
    citation: ({ citation }) => {
      if (!citation) {
        return null;
      }

      const label = `[${citation.number}]${citation.definition?.text ? ` ${citation.definition.text}` : ""}`;
      const url = citation.definition?.url;

      if (!url) {
        return (
          <sup className="inline-flex align-baseline">
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[rgba(255,255,255,0.4)] px-1 text-[10px] font-semibold text-[var(--sunshine-yellow-dark)] opacity-70"
              aria-label={label}
            >
              {citation.number}
            </span>
          </sup>
        );
      }

      return (
        <sup className="inline-flex align-baseline">
          <a
            href={url}
            title={label}
            aria-label={label}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sunshine-yellow-light)] px-1 text-[10px] font-semibold text-[var(--chocolate-brown)] no-underline shadow-[0_4px_10px_-6px_rgba(119,70,37,0.45)]"
            onClick={(event) => onCitationClick(event, citation)}
          >
            {citation.number}
          </a>
        </sup>
      );
    },
    link: ({ defaultNode }) => defaultNode,
    autolink: ({ defaultNode }) => defaultNode,
  });

export const markdownRendererProps = {
  className: "article-markdown",
  options: {
    segmenter: {
      granularity: "word" as const,
    },
  },
  caret: false,
  onLinkClick,
  onCitationClick,
  nodeRenderers: markdownNodeRenderers,
};
