# Presentation example shortlist

Editable rehearsal notes, 2026-10-23. Check an entry when you want to use it;
add your own notes and reorder freely. These are candidates, not new research
labels. No entry below has been rehearsed in the current browser session.

Pair numbers and output IDs were checked with the current `srcmove-history`
CLI against each repository's active `.srcmove` analysis. Commit pairs are the
durable identifiers: archived analyses can have different pair numbers or
classifications. Old visualization artifact IDs are not assumed compatible or
ready to open. “Saved XML” means an active `.srcmove/comparisons` directory
already exists for that commit pair; it does not establish visualization cache
readiness.

## Check these first

- [ ] **SQLite 78 — a small exact relocation**
  - Original: `9c94fcbea8f397c81236293caf288dced82791d0`
  - Modified: `9274a8d14e6bda63f8cc7c5f6b891cea7f88269c`
  - Select: `item:97b1dcdaf` (Type-1); `src/select.c:7491` → `src/select.c:7488`, inside `selectCheckOnClausesExpr`.
  - Why: one reported item; compact opening example of a declaration moving out of a nested region. Current compact evidence records relocation to a different structural region.
  - Preparation: current artifact `1f9f0853fd2e48249c07bb7ad9f541e3` built and move-endpoint source warmed on 2026-10-23. Browser rehearsal still needed.
  - My notes:

- [ ] **Notepad++ 643 — move a complete method between classes/files**
  - Original: `5b26ef1ca867b57e63aa5421b534e42d3f5bc4a7`
  - Modified: `e85c354135e62a18407280f58ddfcb4b45984d81`
  - Select: `item:97b1dcdaf` (Type-2c), `MoveImeCarets`; `scintilla/win32/ScintillaWin.cxx:1370–1376` → `scintilla/src/ScintillaBase.cxx:218–224`.
  - Why: readable whole-method transfer; the class qualifier changes consistently while the method's body continues. Thesis AI review judged source-supported movement, not a proof of semantic equivalence.
  - Preparation: current artifact `88974a600e9e474b99e4b77b4740de09` built and move-endpoint source warmed on 2026-10-23. The comparison contains 15 displayed outputs; isolate this item first. Browser rehearsal still needed.
  - My notes:

- [ ] **Notepad++ 740 — two adjacent functions as a sequence**
  - Original: `f127ba02d05f4ce1a3086768dc9c4f9ed561ae39`
  - Modified: `5c1813185aa111d6247de39e3d7049ebef0960e0`
  - Select: `sequence:2349f331c`, members `2349f331c` and `ad49f146c` (both Type-1): `SetSymmetric` / `GradientValue`; `scintilla/win32/PlatWin.cxx:1034–1057` → `scintilla/win32/SurfaceGDI.cxx:475–498`.
  - Why: thesis-reviewed example of adjacency preserved across a file transfer. Both members have individual source support; grouping does not prove one developer editing action.
  - Preparation: no saved XML found in active comparison directory. Large comparison: 399 atomic groups / 172 displayed outputs. Prepare it ahead of time and focus the sequence before presenting.
  - My notes:

- [ ] **OpenCV 86 — extraction with consistent name changes**
  - Original: `3c10324630381b1ab39490bc5bdf3e8b14956be3`
  - Modified: `37f3c7539b30fb5b124f750658f3ca79551f9518`
  - Select: `item:e1c9756ce` (Type-2c); `modules/objdetect/src/aruco/aruco_dictionary.cpp:101–104` → same file `:47–50`.
  - Why: final partial-byte write leaves `Dictionary::identify` and appears in the new `CellBitMasks` constructor; `not0/not1` become `not0Writable/not1Writable`. Thesis AI review supports movement as part of extraction, without claiming a separate editing action for the conditional.
  - Preparation: current artifact `2958829d6f8a48fb9be54df6d8ef1f53` built and move-endpoint source warmed on 2026-10-23. Seven displayed outputs; isolate the conditional first. Browser rehearsal still needed.
  - My notes:

## Additional candidates with saved XML

- [ ] **Notepad++ 13 — edited loop moves into a new helper header**
  - Original: `bf9f8b4c9549dadd23f483190dd1e1e4707da3ea`
  - Modified: `e59774add26b0130d38aaf722aceb0259ccc0078`
  - Select: `item:97b1dcdaf` (Type-3); `scintilla/src/EditView.cxx` → new `scintilla/src/RunThreads.h:24–26`.
  - Why: short loop changes `f.wait()` to `f.get()` and removes `const` as threading is extracted. Git diff and retained endpoint text inspected; fresh candidate, not a human correctness label.
  - Also try: `sequence:4db018fed`, adjacent `IdleWork` / `QueueIdleWork` declarations in `scintilla/win32/ScintillaWin.cxx`.
  - Preparation: artifact `e0b4ecda7929414eb51a7cab0984437d` reused and move-endpoint source warmed on 2026-10-23; three displayed outputs. Browser validation still needed.
  - My notes:

- [ ] **OpenCV 51 — exact code moves into a new implementation file**
  - Original: `1bea199e008070b3256d60854511682c9b102470`
  - Modified: `e6b1ef272ebe4fb9f2e3b6c3b7020e915dc3e812`
  - Select: `sequence:ca389c35a`, including function member `ca389c35a` (`getIppiHistogramFunction_C1`, Type-1); `modules/imgproc/src/histogram.cpp:696` → `hal/ipp/src/histogram_ipp.cpp:26`.
  - Why: the retained function text is identical and readable. The displayed sequence also contains class member `0ef953636`; inspect the whole sequence before deciding how to explain it.
  - Preparation: artifact `2e0395fa6cd24a20aabaa2ca8396d920` reused and move-endpoint source warmed on 2026-10-23; 29 atomic groups / 10 displayed outputs. Fresh candidate; browser and surrounding-code review still needed.
  - My notes:

- [ ] **Linux (kernel/) 42 — a short cross-file guard relocation**
  - Original: `69f80fef3153299d9c72c53d1d71eef6354b6926`
  - Modified: `762122d75e50e4919ef77afc2dffdc4931c5be87`
  - Select: `item:c89025cc1` (Type-1); `kernel/sched/ext/sub.c` → `kernel/sched/ext/ext.c`, guard `if (cpu_active(cpu_of(rq))) return;`.
  - Why: the guard and its comment leave `scx_rescue_flush` and appear in `rq_offline_scx`. Git diff inspected; fresh candidate, not a human correctness label.
  - Preparation: artifact `7bc4d060e7324e579b7d2c0223483e50` reused and move-endpoint source warmed on 2026-10-23; two displayed outputs. Browser validation still needed. Choose **Linux (kernel/)**, not the whole-repository analysis; pair numbering belongs to the scoped analysis.
  - My notes:

## Useful with an explicit interpretation caveat

- [ ] **SQLite 322 — helper continuity across an extension/file rename**
  - Original: `991cbd78b37a4b6e6e305bc04ebd267af4c0f745`
  - Modified: `3d006d0d00cc79bb8cfb9dc63f2db2acb080ac82`
  - Select: `item:9adefe000` (Type-2c), `analysisSql` → `diskusedSql`; `ext/misc/analyze.c:132–150` → `ext/misc/diskused.c:141–159`.
  - Why: existing thesis screenshots demonstrate endpoint selection/details. Thesis AI review supports helper continuity across reorganization, with consistent names changing throughout the helper.
  - Caveat: the commit explicitly renames the extension; do not describe every matched function as an independently established editing action. Keep this as an interface/interpretation example, not the default clean-move opener.
  - Preparation: no saved XML found in active comparison directory; historical screenshots are not a ready current artifact.
  - My notes:

## Sources and rehearsal checklist

Thesis-reviewed descriptions: [history evaluation records](../../thesis-workspace/thesis-draft-final/15-history-evaluation-records.md)
(Notepad++ 643 / 740, OpenCV 86, SQLite 322) and
[chapter 8 screenshot notes](../../thesis-workspace/thesis-draft-final/figures/chapter8/README.md).
Additional candidates came from active history CLI `list --moves` / `show` and
retained comparison JSON, with targeted Git diff inspection where stated.

- [ ] Choose 3–5 examples and reorder this list.
- [ ] Confirm the intended move is convincing in both source panes.
- [ ] Prepare the current visualization artifacts and note load times.
- [ ] Restart the backend, refresh the browser, and reopen each chosen example.
- [ ] Set the initial focus/visible files and rehearse selection, details, and connectors.

## Cache preparation check, 2026-10-23

These are application HTTP timings, not browser rendering measurements or research results.
After restarting the backend, the preparation utility reused every rechecked artifact:

| Repository / pair | Artifact plus move-source requests |
| --- | ---: |
| SQLite 78 | 0.85 s |
| OpenCV 51 | 1.24 s |
| OpenCV 86 | 1.78 s |
| Notepad++ 13 | 4.72 s |
| Notepad++ 643 | 4.40 s |

Linux (kernel/) 42 was reused and warmed before the restart (2.54 s).
The disposable alignment database measured 32 KiB; the three newly built
visualization artifacts measured about 258 MiB total. Browser layout and
interaction rehearsal remains unchecked. Use the development frontend at
<http://localhost:5173> to use the new browser session cache.
