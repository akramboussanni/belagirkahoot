import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuizFormPage } from "../pages/QuizFormPage";

vi.mock("../api/quizzes", () => ({
  createQuiz: vi.fn(),
  updateQuiz: vi.fn(),
  getQuiz: vi.fn(),
}));

vi.mock("../api/ai", () => ({
  generateQuiz: vi.fn(),
}));

function renderForm(path = "/host/quizzes/new") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/host/quizzes/new" element={<QuizFormPage />} />
          <Route path="/host/quizzes/:quizID/edit" element={<QuizFormPage />} />
          <Route path="/host/quizzes" element={<div>quiz list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("QuizFormPage — create mode", () => {
  it("renders create heading", () => {
    renderForm();
    expect(screen.getByText("Nouveau quiz")).toBeInTheDocument();
  });

  it("shows validation error when title is empty", async () => {
    renderForm();
    const submitBtn = screen.getByRole("button", { name: /créer le quiz/i });
    fireEvent.submit(submitBtn.closest("form")!);
    expect(await screen.findByText(/le titre du quiz est requis/i)).toBeInTheDocument();
  });

  it("shows validation error when no correct option selected", async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText(/ex: Histoire de l'Islam/i), {
      target: { value: "My Quiz" },
    });
    fireEvent.change(screen.getByPlaceholderText("Texte de la question"), {
      target: { value: "What is 2+2?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option 1"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByPlaceholderText("Option 2"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /créer le quiz/i }));
    expect(
      await screen.findByText(/exactement une option correcte/i)
    ).toBeInTheDocument();
  });

  it("can add and remove a question", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /ajouter une question/i }));
    expect(screen.getAllByPlaceholderText("Texte de la question")).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
    expect(screen.getAllByPlaceholderText("Texte de la question")).toHaveLength(1);
  });

  it("can add an option up to 4", () => {
    renderForm();
    expect(screen.getAllByPlaceholderText(/Option \d/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /ajouter une option/i }));
    expect(screen.getAllByPlaceholderText(/Option \d/)).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /ajouter une option/i }));
    expect(screen.getAllByPlaceholderText(/Option \d/)).toHaveLength(4);
    // button disappears at 4
    expect(screen.queryByRole("button", { name: /ajouter une option/i })).not.toBeInTheDocument();
  });

  it("shows Générer avec l'IA button in create mode", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /générer avec l'ia/i })).toBeInTheDocument();
  });

  it("does not show Générer avec l'IA button in edit mode", () => {
    renderForm("/host/quizzes/123/edit");
    expect(screen.queryByRole("button", { name: /générer avec l'ia/i })).not.toBeInTheDocument();
  });

  it("opens GenerateQuizModal when Générer avec l'IA is clicked", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /générer avec l'ia/i }));
    expect(screen.getByPlaceholderText(/Histoire islamique/i)).toBeInTheDocument();
  });

  it("pre-fills form when location state contains generated data", () => {
    const generated = {
      title: "AI History Quiz",
      questions: [
        {
          text: "Who was the first caliph?",
          time_limit: 20,
          order: 1,
          options: [
            { text: "Abu Bakr", is_correct: true },
            { text: "Umar", is_correct: false },
            { text: "Uthman", is_correct: false },
            { text: "Ali", is_correct: false },
          ],
        },
      ],
    };

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[{ pathname: "/host/quizzes/new", state: { generated } }]}>
          <Routes>
            <Route path="/host/quizzes/new" element={<QuizFormPage />} />
            <Route path="/host/quizzes" element={<div>quiz list</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByDisplayValue("AI History Quiz")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Who was the first caliph?")).toBeInTheDocument();
  });
});
