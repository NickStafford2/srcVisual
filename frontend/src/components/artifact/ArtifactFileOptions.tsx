import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  filename: string;
  hidden: boolean;
  onToggleVisibility: () => void;
  onShowOnly: () => void;
};

export function ArtifactFileOptions({
  filename,
  hidden,
  onToggleVisibility,
  onShowOnly,
}: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current!.getBoundingClientRect();
    const menu = menuRef.current!.getBoundingClientRect();
    menuRef.current!.querySelector("button")?.focus({ preventScroll: true });
    setPosition({
      top:
        trigger.bottom + menu.height + 4 <= window.innerHeight
          ? trigger.bottom + 4
          : Math.max(4, trigger.top - menu.height - 4),
      left: Math.max(
        4,
        Math.min(
          trigger.right - menu.width,
          window.innerWidth - menu.width - 4,
        ),
      ),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      )
        setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Options for ${filename}`}
        title={`Options for ${filename}`}
        onClick={() => setOpen((current) => !current)}
        className="flex h-5 shrink-0 items-center rounded px-1.5 text-slate-500 hover:bg-white/10 hover:text-white"
      >
        ⋯
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="group"
              aria-label={`File actions for ${filename}`}
              style={position}
              className="fixed z-50 w-40 rounded border border-white/15 bg-slate-900 p-1 shadow-xl"
            >
              <button
                type="button"
                onClick={() => run(onToggleVisibility)}
                className="w-full rounded px-2 py-2 text-left text-xs text-slate-200 hover:bg-white/10"
              >
                {hidden ? "Show file" : "Hide file"}
              </button>
              <button
                type="button"
                onClick={() => run(onShowOnly)}
                className="w-full rounded px-2 py-2 text-left text-xs text-slate-200 hover:bg-white/10"
              >
                Show only this file
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
