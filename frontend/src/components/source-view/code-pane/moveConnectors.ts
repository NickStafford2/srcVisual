import type { SourceRevision } from "../../../srcdiff/lineLinks";

export type MoveSegmentRegistration = {
  moveId: string;
  revision: SourceRevision;
  element: HTMLElement | null;
};

export type RegisterMoveSegment = (
  registration: MoveSegmentRegistration,
) => void;
