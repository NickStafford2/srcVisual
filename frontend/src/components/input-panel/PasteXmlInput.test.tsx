import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExampleInput } from "./ExampleInput";

describe("ExampleInput", () => {
  it("groups custom and generated examples and strips the repeated prefix", async () => {
    const _user = userEvent.setup();
    const _onLoadExample = vi.fn();

    render(
      <ExampleInput
        exampleFilenames={[
          "e2e_custom_1x1_basic.xml",
          "e2e_generated_to_new_file_diff.xml",
          "e2e_generated_complex_diff.xml",
        ]}
        examplesError={null}
        isLoadingExample={false}
        disabled={false}
        loadedExampleFilename={null}
        onLoadExample={_onLoadExample}
      />,
    );

    const _custom_section = screen.getByLabelText("Custom examples");
    const _generated_section = screen.getByLabelText("Generated examples");

    expect(
      within(_custom_section).getByRole("button", { name: "1x1_basic.xml" }),
    ).toBeInTheDocument();
    expect(
      within(_generated_section).getByRole("button", {
        name: "to_new_file_diff.xml",
      }),
    ).toBeInTheDocument();
    expect(
      within(_generated_section).getByRole("button", {
        name: "complex_diff.xml",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "e2e_custom_1x1_basic.xml" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "e2e_generated_to_new_file_diff.xml",
      }),
    ).not.toBeInTheDocument();

    await _user.click(
      within(_generated_section).getByRole("button", {
        name: "to_new_file_diff.xml",
      }),
    );

    expect(_onLoadExample).toHaveBeenCalledWith(
      "e2e_generated_to_new_file_diff.xml",
    );
  });
});
