import { motion } from "motion/react";

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Supprimer" }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <motion.div
        className="w-full max-w-sm mx-4 rounded-3xl p-6 bg-white shadow-2xl"
        style={{
          border: "4px solid rgba(1,54,254,0.1)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <h2 id="confirm-modal-title" className="text-xl font-black text-[#0136fe] mb-2 uppercase tracking-tight">
          {title}
        </h2>
        <p className="text-base font-medium mb-6" style={{ color: "rgba(1,54,254,0.7)" }}>{message}</p>
        <div className="flex justify-end gap-3">
          <motion.button
            onClick={onCancel}
            className="px-5 py-3 text-sm font-black rounded-xl transition-colors"
            style={{ background: "rgba(1,54,254,0.05)", color: "#0136fe" }}
            whileHover={{ scale: 1.02, background: "rgba(1,54,254,0.1)" }} whileTap={{ scale: 0.98 }}
          >
            Annuler
          </motion.button>
          <motion.button
            onClick={onConfirm}
            className="px-5 py-3 text-sm font-black text-white rounded-xl transition-colors shadow-lg"
            style={{ background: "#f44336" }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
