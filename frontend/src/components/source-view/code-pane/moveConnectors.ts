import type { SourceRevision } from "../../../srcdiff/lineLinks";

export type MoveSegmentRegistration = {
  moveId: string;
  endpointId: string;
  revision: SourceRevision;
  element: HTMLElement;
};

export type MoveSegmentUnregistration = {
  moveId: string;
  endpointId: string;
  revision: SourceRevision;
  element: HTMLElement;
};

export type RegisterMoveSegment = (
  registration: MoveSegmentRegistration,
) => void;

export type UnregisterMoveSegment = (
  registration: MoveSegmentUnregistration,
) => void;
