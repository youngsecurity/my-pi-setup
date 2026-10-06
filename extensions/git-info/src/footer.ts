import {
  FooterComponent,
  type ExtensionContext,
  type ReadonlyFooterDataProvider,
} from "@earendil-works/pi-coding-agent";
import {
  Container,
  truncateToWidth,
  visibleWidth,
  type Component,
} from "@earendil-works/pi-tui";

const CAPTURE_WIDGET = "git-info-footer-capture";

function findBuiltinFooter(component: Component): FooterComponent | undefined {
  if (component instanceof FooterComponent) return component;
  if (component instanceof Container) {
    for (const child of component.children) {
      const footer = findBuiltinFooter(child);
      if (footer) return footer;
    }
  }
  return undefined;
}

function singleLine(text: string): string {
  return text
    .replace(/[\r\n\t]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

/** Keep the native path and usage/model rows; only lay out extension statuses. */
export function renderGitFooter(
  base: Component,
  statuses: ReadonlyMap<string, string>,
  width: number,
): string[] {
  if (width <= 0) return [];
  const lines = base.render(width);
  const git = statuses.get("git-info");
  if (!git) return lines;

  const right = truncateToWidth(singleLine(git), width);
  const rightWidth = visibleWidth(right);
  const leftBudget = Math.max(0, width - rightWidth - 2);
  const otherStatuses = [...statuses.entries()]
    .filter(([key]) => key !== "git-info")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, text]) => singleLine(text))
    .join(" ");
  const left = leftBudget > 0 ? truncateToWidth(otherStatuses, leftBudget) : "";
  const gap = " ".repeat(Math.max(0, width - visibleWidth(left) - rightWidth));
  return [...lines.slice(0, 2), `${left}${gap}${right}`];
}

/** Returns cleanup, or undefined when another extension owns the footer. */
export function installGitFooter(
  ctx: ExtensionContext,
): (() => void) | undefined {
  if (ctx.mode !== "tui") return undefined;

  // Pi 0.85 exposes setFooter but no getFooter. Capture its existing component
  // through the public TUI container tree before setFooter removes it. Reusing
  // the real instance preserves live usage, subscription and compaction state.
  // This temporary widget renders no rows and is removed immediately.
  let nativeFooter: FooterComponent | undefined;
  try {
    ctx.ui.setWidget(CAPTURE_WIDGET, (tui) => {
      nativeFooter = findBuiltinFooter(tui);
      return { render: () => [], invalidate() {} };
    });
  } finally {
    ctx.ui.setWidget(CAPTURE_WIDGET, undefined);
  }
  const base = nativeFooter;
  if (!base) return undefined;

  ctx.ui.setFooter((tui, _theme, data: ReadonlyFooterDataProvider) => ({
    render: (width) =>
      renderGitFooter(base, data.getExtensionStatuses(), width),
    invalidate: () => base.invalidate(),
    dispose: data.onBranchChange(() => tui.requestRender()),
  }));
  return () => ctx.ui.setFooter(undefined);
}
