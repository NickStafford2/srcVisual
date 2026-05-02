import type { SourceRevision } from "../../../srcdiff/lineLinks";

type BackgroundImageStyle = {
  backgroundImage: string;
};

export function getCodePaneSurfaceStyle(
  revision: SourceRevision,
): BackgroundImageStyle {
  const direction = getCodePaneGradientDirection(revision);

  return {
    backgroundImage: `linear-gradient(${direction}, rgb(var(--site-bg-rgb) / 0.92) 0%, rgb(var(--site-bg-rgb) / 0.72) 30%, rgb(var(--site-bg-rgb) / 0.36) 58%, rgb(2 6 23 / 0.08) 82%, rgb(2 6 23 / 0) 100%)`,
  };
}

export function getCodePaneBodyStyle(
  revision: SourceRevision,
): BackgroundImageStyle {
  const direction = getCodePaneGradientDirection(revision);

  return {
    backgroundImage: `linear-gradient(${direction}, rgb(var(--site-bg-rgb) / 0.82) 0%, rgb(var(--site-bg-rgb) / 0.54) 32%, rgb(var(--site-bg-rgb) / 0.24) 60%, rgb(2 6 23 / 0.1) 84%, rgb(2 6 23 / 0) 100%)`,
  };
}

function getCodePaneGradientDirection(revision: SourceRevision): string {
  return revision === "revision-0" ? "90deg" : "270deg";
}
