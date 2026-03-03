import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GenerateQuizModal } from "../components/GenerateQuizModal";

describe("GenerateQuizModal", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onGenerated: vi.fn(),
  };

  it("renders the modal with form fields", () => {
    render(<GenerateQuizModal {...defaultProps} />);
    expect(screen.getByText("Generate with AI")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/islamic history/i)).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("caps question count input at max 10", () => {
    render(<GenerateQuizModal {...defaultProps} />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("max", "10");
    expect(input).toHaveAttribute("min", "1");
  });
});
