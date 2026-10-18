# Backlog

This is a non-authoritative list of candidate improvements. Items should be
implemented only when they support a measured usability, evaluation, or
operational need. Current behavior is documented in the project README,
application rules, and architecture documents.

## Near-term candidates

- Replace the process-local upload progress broker with a cross-worker contract,
  or remove that optional stream. Gunicorn currently runs multiple workers, so
  an upload request and its progress connection can reach different processes.
- Recheck the checked-in examples against the admitted srcMove toolchain when
  candidate rules change. Move examples should use complete statements or
  larger regions accepted by the current detector.
- Decide whether whitespace-only emphasis helps review work; reduce it if it
  obscures structural changes.
- Add artifact lifecycle metrics if inventory output is insufficient for
  operating the local application.

## Evidence-gated candidates

- Move uploaded-XML processing to durable background runs only if measurements
  show that synchronous uploads are a usability problem.
- Add XML neighborhood projections only if whole-document XML retrieval is a
  measured bottleneck.
- Add filtered XML export only for a demonstrated research workflow.
- Add source-row virtualization only if focused projections still render too
  many rows in realistic comparisons.
- Expose srcMove granularity controls only after the desired producer contract
  and reproducibility implications are defined.

## Low-priority deferred work

- TODO (after the thesis defense): Review compatibility code across srcDiffVisual
  and its srcMove consumer boundaries, then remove legacy-format readers,
  fallbacks, and read-time reconstruction retained only for older data. Prefer
  one current contract with explicit move origins and complete annotation
  identities stored when artifacts are created. Inventory the affected data
  and consumers, recompute fresh results and visualization artifacts with the
  current toolchain, and validate them before retiring old paths. Compatibility
  code is unwanted long-term complexity; preserving old generated data should
  not dictate the future implementation. Coordinate this review with the
  deferred `MoveKey` work below. This TODO does not authorize deleting frozen
  research evidence or changing thesis data before the defense; retain any
  required historical evidence separately from the live application's data.

- TODO: Scope move identities by tool so equal raw IDs can coexist. Consider
  the following TypeScript key for API lookups, UI state, and connector
  registrations; preserve each tool's original ID. Add a regression with the
  same ID in both layers. This is low priority given the low expected collision
  risk; defer it behind current research and usability work. See the
  [artifact architecture](artifact-architecture.md#correspondences-on-source)
  for existing behavior.

  ```typescript
  type MoveKey = {
    origin: "srcdiff" | "srcmove";
    id: string;
  };
  ```

Public hosting is not a backlog-sized feature. It requires an explicit
security design, sandboxing, resource limits, authorization, and threat model.
