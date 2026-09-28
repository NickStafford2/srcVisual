import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
type Position = { x: number; y: number };
const POPUP_WIDTH = 480;
const VIEWPORT_PADDING = 12;
export function ArtifactPopup({
  title,
  badge,
  identity,
  position,
  color,
  onClose,
  children,
}: {
  title: string;
  badge?: string;
  identity: string;
  position: Position;
  color: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [windowPosition, setWindowPosition] = useState(() =>
    initialPosition(position),
  );
  const [drag, setDrag] = useState<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;

    function move(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setWindowPosition(
        clampPosition({
          left: event.clientX - activeDrag.offsetX,
          top: event.clientY - activeDrag.offsetY,
        }),
      );
    }

    function end(event: PointerEvent) {
      if (event.pointerId === activeDrag.pointerId) setDrag(null);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [drag]);

  const popup = (
    <section
      aria-label={`${title} ${identity}`}
      className="border-diff-move-1/40 fixed z-50 max-h-[calc(100vh-24px)] w-[480px] max-w-[calc(100vw-24px)] overflow-auto rounded-2xl border bg-slate-950/95 text-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      style={{ ...windowPosition, borderColor: color }}
    >
      <header
        style={{ borderColor: color, backgroundColor: `${color}18` }}
        className={`flex touch-none items-start gap-3 border-b px-4 py-3 ${drag ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={(event) => {
          setDrag({
            pointerId: event.pointerId,
            offsetX: event.clientX - windowPosition.left,
            offsetY: event.clientY - windowPosition.top,
          });
        }}
      >
        <div className="min-w-0 flex-1">
          <p
            style={{ color }}
            className="text-[11px] tracking-[0.2em] uppercase"
          >
            {title}
          </p>
          <h2 className="mt-1 truncate font-mono text-sm text-slate-100">
            {identity}
          </h2>
        </div>
        {badge ? <span className="rounded-full border px-2.5 py-1 font-mono text-xs" style={{color, borderColor: color}}>{badge}</span> : null}
        <button
          type="button"
          aria-label={`Close ${title.toLowerCase()} ${identity}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        >
          Close
        </button>
      </header>

      {children}
    </section>
  );

  return typeof document === "undefined"
    ? popup
    : createPortal(popup, document.body);
}
function initialPosition(position: Position) {
  return clampPosition({ left: position.x + 16, top: position.y + 16 });
}

function clampPosition(position: { left: number; top: number }) {
  if (typeof window === "undefined") return position;
  return {
    left: Math.max(
      VIEWPORT_PADDING,
      Math.min(
        position.left,
        Math.max(
          VIEWPORT_PADDING,
          window.innerWidth - POPUP_WIDTH - VIEWPORT_PADDING,
        ),
      ),
    ),
    top: Math.max(
      VIEWPORT_PADDING,
      Math.min(
        position.top,
        Math.max(VIEWPORT_PADDING, window.innerHeight - 260),
      ),
    ),
  };
}
