import { useState } from "react";
import type {
  ArtifactFileSummary,
  ArtifactFocusProfile,
} from "../../types";
import { MoveConnectorOverlay } from "../source-view/code-pane/MoveConnectorOverlay";
import { useMoveConnectorOverlay } from "../source-view/code-pane/useMoveConnectorOverlay";
import { ArtifactSourceFile } from "./ArtifactSourceFile";

type Props = {
  artifactId: string;
  files: ArtifactFileSummary[];
  focus: ArtifactFocusProfile;
  activeMoveId: string | null;
  onFocusChange: (focus: ArtifactFocusProfile) => void;
};

export function ArtifactSourcePane({
  artifactId,
  files,
  focus,
  activeMoveId,
  onFocusChange,
}: Props) {
  const { containerRef, groups, registerMoveSegment, unregisterMoveSegment } =
    useMoveConnectorOverlay();
  const [hoveredMoveId, setHoveredMoveId] = useState<string | null>(null);
  const _moveFocused = activeMoveId !== null;

  return (
    <section aria-label="Artifact source" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-neutral-950 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {_moveFocused
              ? `Move ${activeMoveId} · ${files.length} file${files.length === 1 ? "" : "s"}`
              : files[0]?.filename}
          </p>
          <p className="text-xs text-slate-400">
            {_moveFocused
              ? "Showing every rendered endpoint"
              : files[0]
                ? `${files[0].revision_0_lines} → ${files[0].revision_1_lines} lines`
                : "No source file selected"}
          </p>
        </div>
        <label className="text-xs text-slate-300">
          Focus{" "}
          <select
            value={focus}
            disabled={_moveFocused}
            onChange={(event) =>
              onFocusChange(event.target.value as ArtifactFocusProfile)
            }
            className="rounded border border-white/15 bg-neutral-900 px-2 py-1 disabled:opacity-60"
          >
            <option value="changes-and-moves">Changes and moves</option>
            <option value="moves">Moves</option>
            <option value="changes">Changes</option>
            <option value="complete-file">Complete file</option>
          </select>
        </label>
      </div>

      <div ref={containerRef} className="relative isolate space-y-4">
        <MoveConnectorOverlay
          groups={groups}
          activeMoveId={hoveredMoveId ?? activeMoveId}
          onMoveHover={(moveId) => setHoveredMoveId(moveId)}
          onMoveLeave={(moveId) =>
            setHoveredMoveId((current) => (current === moveId ? null : current))
          }
          onMoveClick={(moveId) => setHoveredMoveId(moveId)}
        />

        <div className="relative z-10 space-y-4">
          {files.map((file) => (
            <ArtifactSourceFile
              key={file.file_id}
              artifactId={artifactId}
              file={file}
              focus={focus}
              registerMoveSegment={registerMoveSegment}
              unregisterMoveSegment={unregisterMoveSegment}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
