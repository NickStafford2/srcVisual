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

Public hosting is not a backlog-sized feature. It requires an explicit
security design, sandboxing, resource limits, authorization, and threat model.
