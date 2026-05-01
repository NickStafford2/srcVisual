import type { ReactNode } from "react";

type SampleButtonProps = {
  children: ReactNode;
  onClick: () => void;
};

export function SampleButton({ children, onClick }: SampleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-sky-300/30 bg-sky-300/10 px-4 py-2.5 text-sm text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20"
    >
      {children}
    </button>
  );
}
