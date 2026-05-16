import { useEffect, useRef, useState } from "react";
import type { SrcDiffTreeNode } from "../../srcdiff/types";

type TreeNodeActionsMenuProps = {
  node: SrcDiffTreeNode;
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
};

export function TreeNodeActionsMenu({
  node,
  onHighlightNode,
  onHighlightMoveGroup,
}: TreeNodeActionsMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <div ref={menuRef} className="relative ml-1 shrink-0">
      <button
        type="button"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={`Actions for ${node.label}`}
        onClick={() => setIsMenuOpen((current) => !current)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
      >
        ...
      </button>

      {isMenuOpen ? (
        <div
          role="menu"
          aria-label={`${node.label} actions`}
          className="absolute top-full right-0 z-30 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-slate-950/98 p-1.5 shadow-2xl"
        >
          <MenuActionButton
            label="Highlight node"
            onClick={() => {
              onHighlightNode(node.id);
              setIsMenuOpen(false);
            }}
          />

          {node.move_id ? (
            <MenuActionButton
              label="Highlight move group"
              onClick={() => {
                onHighlightMoveGroup(node.id);
                setIsMenuOpen(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-100 transition hover:bg-white/8"
    >
      {label}
    </button>
  );
}
