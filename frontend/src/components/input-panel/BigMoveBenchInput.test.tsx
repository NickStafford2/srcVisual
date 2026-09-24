import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { BigMoveBenchReviewManifest } from "../../bigmovebench/types";
import { BigMoveBenchInput } from "./BigMoveBenchInput";

const manifest: BigMoveBenchReviewManifest = {
  schema_version: 1,
  review_id: "bmb-review-sha256-test",
  case_count: 2,
  cases: [
    {
      ordinal: 1,
      case_id: "miss",
      outcome: "srcmove_miss",
      strength_stratum: "strong",
      type3_both_similarity: 0.82,
      diagnosis: { stage: "verification", reason: "below_threshold" },
      directory: "cases/0001",
      files: {},
    },
    {
      ordinal: 2,
      case_id: "pass",
      outcome: "oracle_pass",
      strength_stratum: "very_strong",
      type3_both_similarity: 0.94,
      diagnosis: { stage: "selected", reason: "expected_type3_move_selected" },
      directory: "cases/0002",
      files: {},
    },
  ],
};

it("filters review cases and opens the selected visualization", async () => {
  const user = userEvent.setup();
  const visualizeCase = vi.fn().mockResolvedValue(undefined);
  render(
    <BigMoveBenchInput
      selectedBundle={null}
      manifest={manifest}
      activeOrdinal={null}
      isLoading={false}
      error={null}
      setSelectedBundle={vi.fn()}
      importBundle={vi.fn().mockResolvedValue(undefined)}
      visualizeCase={visualizeCase}
      acceptVisualization={vi.fn()}
    />,
  );

  expect(screen.getByText("verification: below_threshold")).toBeVisible();
  expect(
    screen.queryByText("selected: expected_type3_move_selected"),
  ).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Review case filter"), "all");
  await user.click(screen.getByText("selected: expected_type3_move_selected"));
  expect(visualizeCase).toHaveBeenCalledWith(2);
});
