import { useEffect } from "react";

type InputDialogProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function InputDialog({
  isOpen,
  title,
  onClose,
  children,
}: InputDialogProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const _previousOverflow = document.body.style.overflow;

    function _handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", _handleKeyDown);

    return () => {
      document.body.style.overflow = _previousOverflow;
      window.removeEventListener("keydown", _handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md md:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="input-dialog-title"
        className="flex h-[min(80vh,980px)] w-[min(80vw,1220px)] max-w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/95 shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500">
              Input
            </p>
            <h2
              id="input-dialog-title"
              className="mt-1 text-sm font-semibold text-slate-100"
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-3 md:p-5">{children}</div>
      </div>
    </div>
  );
}
