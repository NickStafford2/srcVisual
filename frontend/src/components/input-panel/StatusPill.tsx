import type { ReactNode } from "react";

type StatusPillProps = {
  children: ReactNode;
  error: string | null;
};

export function StatusPill({ children, error }: StatusPillProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-2 text-sm",
        error
          ? "border-red-300/10 bg-red-300/10 text-red-200"
          : "border-emerald-300/10 bg-emerald-300/10 text-emerald-200",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
