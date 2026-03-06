import { useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Check, Sparkles } from "lucide-react";

import { getQuiz, createQuiz, updateQuiz } from "../api/quizzes";
import type { Quiz } from "../types";
import type { QuestionInput } from "../api/quizzes";
import { GenerateQuizModal } from "../components/GenerateQuizModal";

interface OptionDraft {
  text: string;
  is_correct: boolean;
}

interface QuestionDraft {
  text: string;
  time_limit: number;
  options: OptionDraft[];
}

function blankOption(): OptionDraft {
  return { text: "", is_correct: false };
}

function blankQuestion(): QuestionDraft {
  return { text: "", time_limit: 20, options: [blankOption(), blankOption()] };
}

const OPTION_COLORS = ["#4caf50", "#2196f3", "#ff6b35", "#f44336"];
const OPTION_LETTERS = ["A", "B", "C", "D"];

// ── Inner form ────────────────────────────────────────────────────────────────

interface QuizFormProps {
  quizID?: string;
  initial: { title: string; questions: QuestionDraft[] };
}

function QuizForm({ quizID, initial }: QuizFormProps) {
  const isEdit = !!quizID;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initial.title);
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial.questions);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: { title: string; questions: QuestionInput[] }) =>
      isEdit ? updateQuiz(quizID!, input) : createQuiz(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["quiz", quizID] });
      navigate("/host/quizzes");
    },
  });

  function validate(): string | null {
    if (!title.trim()) return "Le titre du quiz est requis.";
    if (questions.length === 0) return "Ajoutez au moins une question.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `La question ${i + 1} doit avoir un texte.`;
      if (q.options.length < 2 || q.options.length > 4)
        return `La question ${i + 1} doit avoir entre 2 et 4 options.`;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim())
          return `L'option ${j + 1} de la question ${i + 1} doit avoir un texte.`;
      }
      if (q.options.filter((o) => o.is_correct).length !== 1)
        return `La question ${i + 1} doit avoir exactement une option correcte.`;
    }
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    mutation.mutate({
      title: title.trim(),
      questions: questions.map((q, i) => ({
        text: q.text.trim(),
        time_limit: q.time_limit,
        order: i + 1,
        options: q.options.map((o) => ({ text: o.text.trim(), is_correct: o.is_correct })),
      })),
    });
  }

  function updateQuestion(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function addQuestion() { setQuestions((qs) => [...qs, blankQuestion()]); }
  function removeQuestion(idx: number) { setQuestions((qs) => qs.filter((_, i) => i !== idx)); }
  function updateOption(qIdx: number, oIdx: number, patch: Partial<OptionDraft>) {
    setQuestions((qs) => qs.map((q, i) =>
      i !== qIdx ? q : { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) }
    ));
  }
  function setCorrect(qIdx: number, oIdx: number) {
    setQuestions((qs) => qs.map((q, i) =>
      i !== qIdx ? q : { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oIdx })) }
    ));
  }
  function addOption(qIdx: number) {
    setQuestions((qs) => qs.map((q, i) => (i !== qIdx ? q : { ...q, options: [...q.options, blankOption()] })));
  }
  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((qs) => qs.map((q, i) =>
      i !== qIdx ? q : { ...q, options: q.options.filter((_, j) => j !== oIdx) }
    ));
  }

  const inputStyle = {
    background: "white",
    border: "2px solid rgba(1,54,254,0.1)",
    color: "#0136fe",
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <img src="/favicon.png" alt="Logo" className="w-6 h-6 object-contain drop-shadow-md" />
        <h2 className="text-2xl font-black text-[#0136fe]">{isEdit ? "Modifier le quiz" : "Nouveau quiz"}</h2>
      </motion.div>

      {!isEdit && (
        <>
          <motion.button
            type="button"
            onClick={() => setShowAIModal(true)}
            className="w-full mb-8 py-5 rounded-3xl font-black text-sm flex items-center justify-center gap-3 relative overflow-hidden group"
            style={{
              background: "white",
              color: "#0136fe",
              border: "2px solid rgba(1, 54, 254, 0.1)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.04)",
            }}
            whileHover={{ scale: 1.01, borderColor: "#0136fe", boxShadow: "0 15px 45px rgba(1, 54, 254, 0.1)" }}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}>

            <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />

            <motion.div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: "linear-gradient(105deg, transparent 40%, #abed00 50%, transparent 60%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPositionX: ["200%", "-200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <Sparkles className="w-5 h-5 relative z-10" />
            <span className="relative z-10 tracking-widest uppercase">Générer avec l'IA</span>
          </motion.button>

          <AnimatePresence>
            {showAIModal && (
              <GenerateQuizModal
                onClose={() => setShowAIModal(false)}
                onGenerated={(data) => {
                  setShowAIModal(false);
                  setTitle(data.title);
                  setQuestions(
                    data.questions.map((q) => ({
                      text: q.text,
                      time_limit: q.time_limit,
                      options: q.options.map((o) => ({ text: o.text, is_correct: o.is_correct })),
                    }))
                  );
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(1,54,254,0.8)" }}>Titre du quiz</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.6)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.2)")}
            placeholder="ex: Culture Générale"
          />
        </motion.div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <motion.div key={qIdx}
              className="p-6 rounded-3xl space-y-5 border-2 relative overflow-hidden"
              style={{
                background: "white",
                borderColor: "rgba(1, 54, 254, 0.08)",
                boxShadow: "0 15px 45px rgba(0, 0, 0, 0.04)"
              }}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qIdx * 0.04 }}>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-inner"
                    style={{ background: "#0136fe", color: "white" }}>
                    {qIdx + 1}
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest" style={{ color: "#0136fe" }}>Question {qIdx + 1}</span>
                </div>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qIdx)} aria-label="Supprimer"
                    className="p-2 rounded-xl transition-colors hover:bg-red-50" style={{ color: "#f44336" }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-widest opacity-50 ml-1" style={{ color: "#0136fe" }}>Énoncé de la question</label>
                  <input
                    type="text"
                    required
                    value={q.text}
                    onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                    className="w-full rounded-2xl px-5 py-3.5 text-sm outline-none transition-all placeholder:opacity-30 border-2"
                    style={{
                      background: "rgba(1, 54, 254, 0.02)",
                      borderColor: "rgba(1, 54, 254, 0.08)",
                      color: "#0136fe"
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#0136fe")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(1, 54, 254, 0.08)")}
                    placeholder="Saisissez votre question ici..."
                  />
                </div>

                <div className="flex items-center gap-4 bg-black/5 p-3 rounded-2xl w-fit">
                  <label className="text-[10px] uppercase font-black tracking-widest opacity-50" style={{ color: "#0136fe" }}>Temps (s)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={q.time_limit}
                    onChange={(e) => updateQuestion(qIdx, { time_limit: Number(e.target.value) })}
                    className="w-16 rounded-xl px-3 py-1.5 font-bold text-center text-sm outline-none bg-white shadow-sm"
                    style={{ color: "#0136fe" }}
                  />
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((o, oIdx) => {
                  const color = OPTION_COLORS[oIdx % 4];
                  return (
                    <div key={oIdx} className="flex items-center gap-3 group/option">
                      <button
                        type="button"
                        onClick={() => setCorrect(qIdx, oIdx)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all shadow-sm"
                        style={{
                          background: o.is_correct ? color : "white",
                          border: `2px solid ${o.is_correct ? color : "rgba(1, 54, 254, 0.1)"}`,
                          color: o.is_correct ? "white" : "rgba(1, 54, 254, 0.3)",
                        }}>
                        {o.is_correct ? <Check className="w-5 h-5" /> : OPTION_LETTERS[oIdx]}
                      </button>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          value={o.text}
                          onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all border-2"
                          style={{
                            background: "rgba(1, 54, 254, 0.02)",
                            borderColor: "rgba(1, 54, 254, 0.08)",
                            color: "#0136fe"
                          }}
                          onFocus={(e) => (e.target.style.borderColor = color)}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(1, 54, 254, 0.08)")}
                          placeholder={`Réponse ${OPTION_LETTERS[oIdx]}...`}
                        />
                        {q.options.length > 2 && (
                          <button type="button" onClick={() => removeOption(qIdx, oIdx)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover/option:opacity-100 transition-opacity hover:bg-red-50 text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {q.options.length < 4 && (
                <button type="button" onClick={() => addOption(qIdx)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed transition-all text-[10px] uppercase font-black tracking-widest"
                  style={{ borderColor: "rgba(1, 54, 254, 0.1)", color: "rgba(1, 54, 254, 0.4)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0136fe", e.currentTarget.style.color = "#0136fe")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(1, 54, 254, 0.1)", e.currentTarget.style.color = "rgba(1, 54, 254, 0.4)")}>
                  + Ajouter une option
                </button>
              )}
            </motion.div>
          ))}

          <motion.button
            type="button"
            onClick={addQuestion}
            className="w-full py-5 rounded-3xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border-4 bg-white/30 backdrop-blur-sm"
            style={{ borderStyle: "dashed", borderColor: "rgba(1, 54, 254, 0.2)", color: "#0136fe" }}
            whileHover={{ scale: 1.01, borderColor: "#0136fe", background: "white" }}>
            <Plus className="w-5 h-5" /> Ajouter une question
          </motion.button>
        </div>

        {(formError || mutation.isError) && (
          <div className="text-sm rounded-xl px-4 py-3"
            style={{ background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)", color: "#f44336" }}>
            {formError ??
              (mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              "Un problème est survenu. Veuillez réessayer."}
          </div>
        )}

        <div className="flex items-center justify-between pt-6">
          <button type="button" onClick={() => navigate("/host/quizzes")}
            className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:bg-black/5"
            style={{ color: "rgba(1, 54, 254, 0.4)" }}>
            Annuler
          </button>

          <motion.button
            type="submit"
            disabled={mutation.isPending}
            className="px-8 py-3.5 rounded-2xl font-black text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20"
            style={{
              background: "#0136fe",
            }}
            whileHover={!mutation.isPending ? { scale: 1.05, boxShadow: "0 20px 40px rgba(1, 54, 254, 0.2)" } : {}}
            whileTap={!mutation.isPending ? { scale: 0.95 } : {}}>
            {mutation.isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le quiz"}
          </motion.button>
        </div>
      </form>
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

function quizToInitial(quiz: Quiz) {
  return {
    title: quiz.title,
    questions:
      quiz.questions && quiz.questions.length > 0
        ? quiz.questions.map((q) => ({
          text: q.text,
          time_limit: q.time_limit,
          options: q.options.map((o) => ({ text: o.text, is_correct: !!o.is_correct })),
        }))
        : [blankQuestion()],
  };
}

export function QuizFormPage() {
  const { quizID } = useParams<{ quizID: string }>();
  const location = useLocation();
  const isEdit = !!quizID;

  const { data: existing, isLoading, isError } = useQuery({
    queryKey: ["quiz", quizID],
    queryFn: () => getQuiz(quizID!),
    enabled: isEdit,
  });

  if (isEdit && isLoading) {
    return (
      <div className="flex gap-3 justify-center py-12">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-3 h-3 rounded-full" style={{ background: "#0136fe" }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    );
  }

  if (isEdit && (isError || !existing)) {
    return <p className="text-center py-12" style={{ color: "#f44336" }}>Quiz non trouvé.</p>;
  }

  const initial = existing
    ? quizToInitial(existing)
    : (location.state as { generated?: { title: string; questions: QuestionDraft[] } })?.generated
    ?? { title: "", questions: [blankQuestion()] };

  return <QuizForm quizID={quizID} initial={initial} />;
}
