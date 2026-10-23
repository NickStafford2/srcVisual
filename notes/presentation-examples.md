# Presentation examples: stronger Type-3 shortlist

Reviewed 2026-10-23 against current history CLI output and exact Git revisions.
This list supersedes the earlier selection below. Every new candidate has **no
`.cxx` endpoint and no source/destination whole-file rename**. The main Linux
and SQLite examples use `.c` files; OpenCV alternatives use `.cpp` / `.hpp`.

Three agents reviewed Linux, SQLite, and OpenCV. A second agent independently
checked Linux 942's logging loop and Linux 232's interrupt handler. These are
source-supported presentation candidates for Nicholas to review, not new formal
human research labels. Only the selected output is endorsed, not every match
in its comparison. Type-3 is the producer's recorded classification; the notes
say how substantial the actual edit is.

## Review these first

All rows below are reported **Type-3**. Use **Show only this move group** in the
details popup to remove unrelated boxes and connectors.

| Use? | Repository in viewer | Pair | Select output | What to show | Cached when checked |
| --- | --- | ---: | --- | --- | --- |
| [ ] | Linux | **942** | `item:2e2338aca` | Complete 17-line helper moves into shared EDAC code, with configuration/list adaptation | No |
| [ ] | OpenCV | **913** | `item:97b1dcdaf` | Complete file-reading helper moves to common test code; redundant inner guard removed | No |
| [ ] | SQLite | **1** | `item:97b1dcdaf` | Constant-expression loop moves between files and gains an initialization-mode argument | **Yes** |
| [ ] | Linux | **942** | `item:c89025cc1` | Nested logging loop moves into shared code, with changed configuration expression | No |
| [ ] | Linux | **109** | `item:e1c9756ce` | Configuration block moves before device registration; cleanup jump becomes direct return | No |
| [ ] | Linux | **232** | `item:97b1dcdaf` | Complete display-interrupt handler transfers between existing implementations | No |

**Choose Linux, not Linux (kernel/).** Every Linux number in this new shortlist
belongs to `.srcmove-whole` (viewer repository ID `linux-whole`). Pair numbers
are local to an analysis. The full commits below identify the exact comparison.
The search box searches loaded results: use **Show more existing results** until
the desired pair is loaded, or select its point in the activity chart.

Cached status above was read from the running viewer. No new comparisons were
materialized during this search. Uncached examples need first-time preparation;
source review alone does not establish browser layout/readiness. Do not attempt
their first build live in the presentation. SQLite 1 is available to inspect now.

### 1. Linux 942: private helper becomes shared code

- [ ] Keep this example. My notes:
- Before: `80476f22b8b7e193b26f285a7c9f9e4b63abca16`
- After: `4b5713ef2f929dd8720fcdb66c063643ef9e3bcb`
- Output: **`item:2e2338aca`** — a complete function.
- From: `drivers/edac/i10nm_base.c:308–324`, `enable_retry_rd_err_log`.
- To: `drivers/edac/skx_common.c:205–221`, `skx_enable_rrl`.
- Comparison size: 23 analyzable files, 15 displayed outputs. Isolate this output.

The two loops and register-enabling calls continue in the new helper. Concrete
changes include:

```c
// Before
static void enable_retry_rd_err_log(bool enable)
list_for_each_entry(d, i10nm_edac_list, list)
imc_num = res_cfg->ddr_imc_num;

// After
void skx_enable_rrl(bool enable)
list_for_each_entry(d, &dev_edac_list, list)
imc_num = skx_res_cfg->ddr_imc_num;
```

These are selected lines, not complete compilable functions. The destination
also adds `EXPORT_SYMBOL_GPL(skx_enable_rrl)`. Existing source files are modified;
neither is renamed. Good presentation claim: **srcMove follows the complete
helper into shared code despite edits to its interface and implementation.**
Do not describe this as a newly designed algorithm.

### 2. OpenCV 913: readable whole-function move with cleanup

- [ ] Keep this example. My notes:
- Before: `97abffbdac6a4cb7294719e0b1df93a9cfaceb5b`
- After: `dbd4e4549d00a4b455058adb31dcf8630499cdee`
- Output: **`item:97b1dcdaf`** — the comparison's only displayed move.
- From: `modules/imgcodecs/test/test_animation.cpp:9–29`, `readFileBytes`.
- To: `modules/imgcodecs/test/test_common.cpp:51–66`, `readFileBytes`.
- Comparison size: 10 analyzable files, one displayed output.

The helper retains its open/seek/read/size-check flow. `static` is removed, and
this redundant inner guard is simplified:

```cpp
// Before, already inside if (wfile != NULL)
if (wfile) {
    fclose(wfile);
}

// After, still inside if (wfile != NULL)
fclose(wfile);
```

Both test files already exist and are modified, not renamed. This is the most
readable complete-function example in the shortlist: **a helper moves to common
code while a redundant conditional is removed.** The surrounding non-null guard
is essential to explaining why the simplification makes sense.

### 3. SQLite 1: small cross-file move with a changed call

- [ ] Keep this example. My notes:
- Before: `7fa8cff00cfc82c65fc9c3b9028ad0c9d5cc07ea`
- After: `9e5727e51dfc007636ad2be2c16b2dcf5576ddf4`
- Output: **`item:97b1dcdaf`** — the comparison's only displayed move.
- From: `src/insert.c:611–613`, inside `exprListIsConstant`.
- To: `src/expr.c:2685–2687`, inside `sqlite3ExprListIsConstant`.
- Comparison size: three analyzable files, one displayed output; already cached.

```c
// Before
for(ii=0; ii<pRow->nExpr; ii++){
  if( 0==sqlite3ExprIsConstant(pParse, pRow->a[ii].pExpr) ) return 0;
}

// After
for(ii=0; ii<pList->nExpr; ii++){
  if( 0==exprIsConst(pParse, pList->a[ii].pExpr, iInit) ) return 0;
}
```

The old helper disappears from `insert.c:609–615`; the generalized helper appears
in `expr.c:2682–2689` and call sites change to use it. Its new `bNoIs` parameter
selects `iInit = bNoIs ? 6 : 1`. **The detected construct is the loop, not the whole
helper.** This is unrelated to the previously rejected SQLite extension/file
rename example; the exact commit pair is different.

### 4. Linux 942: the more visibly edited nested loop

- [ ] Keep this example. My notes:
- Same exact commits as example 1, output **`item:c89025cc1`**.
- From: `drivers/edac/i10nm_base.c:348–367`, `show_retry_rd_err_log`.
- To: `drivers/edac/skx_common.c:265–284`, `skx_show_rrl`.
- Detected construct: complete outer loop, including its nested loop.

```c
// Before
scrub = (rrl->modes[i] == FRE_SCRUB || rrl->modes[i] == LRE_SCRUB);
log = read_imc_reg(imc, ch, offset, width);
if (retry_rd_err_log == 2 && !j && (log & status_mask))
    write_imc_reg(imc, ch, offset, width, log & ~status_mask);

// After
scrub = (rrl->sources[i] == RRL_SRC_FRE_SCRUB || rrl->sources[i] == RRL_SRC_LRE_SCRUB);
log = skx_read_imc_reg(imc, ch, offset, width);
if (skx_res_cfg->rrl_ctrl_mode == RRL_CTRL_LINUX && !j && (log & status_mask))
    skx_write_imc_reg(imc, ch, offset, width, log & ~status_mask);
```

Selected lines above show the edits; the full 20-line loop remains recognizable.
Callback registration switches to the new shared helper, supporting continuity.
A second source review agrees this is a convincing edited relocation. The new
configuration is initialized from the old control value: **show adaptation to
shared configuration, not a claim of changed algorithm or proven equivalence.**

### 5. Linux 109: moving initialization changes error handling

- [ ] Keep this example. My notes:
- Before: `415f2044228cc8b948dc04e079aaa86a4d1aa1d3`
- After: `f2c53ea949c5048f96b3dbb5a5ee7131ce4ff2de`
- Output: **`item:e1c9756ce`**.
- From: `drivers/net/macsec.c:4254–4258`.
- To: `drivers/net/macsec.c:4239–4243`, still inside `macsec_newlink`.
- Comparison size: 178 analyzable files, 46 displayed outputs; preparation can be large.

```c
// Before: after registration/linking
if (data) {
    err = macsec_changelink_common(dev, data);
    if (err)
        goto del_dev;
}

// After: before register_netdevice(dev)
if (data) {
    err = macsec_changelink_common(dev, data);
    if (err)
        return err;
}
```

This is real movement across a registration boundary, not an ordinary line-number
shift. The cleanup jump changes because configuration now occurs before device
registration. Strong five-line visual example, but the first-parent merge
comparison includes many unrelated files; isolate this group and rehearse it.

### 6. Linux 232: complete interrupt handler transfer

- [ ] Keep this example. My notes:
- Before: `3f17a52d47ed39c89cc8429307cf246e781ec979`
- After: `654ae5d73c05bd2943d65636ce6cd0aa46e62f18`
- Output: **`item:97b1dcdaf`**.
- From: `drivers/gpu/drm/nouveau/nvkm/subdev/gsp/rm/r535/disp.c:1421–1434`, `r535_disp_intr`.
- To: `drivers/gpu/drm/nouveau/nvkm/engine/disp/tu102.c:165–178`, `tu102_disp_intr`.
- Comparison size: 82 analyzable files, 21 displayed outputs.

The complete handler keeps its register mask, bit iteration, and `IRQ_HANDLED`
return. The function and called helper change `r535_` to `tu102_`, and `static`
is removed. Registration switches to a configurable callback whose new table
references `tu102_disp_intr`, independently corroborating the transferred role.
Two source reviews agree it is a good whole-function move. **The Type-3 edit is
mostly linkage/name adaptation; use Linux 942 for more visible internal edits.**
Neither existing file is renamed. Other matches in this merge are weaker.

## Backups, with limitations

| Use? | Repository / pair | Output | Exact endpoints | Reason / limitation |
| --- | --- | --- | --- | --- |
| [ ] | **SQLite 764** | `item:97b1dcdaf` | `src/select.c:3265–3270` (`multiSelect`) → `:2744–2749` (`generateWithRecursiveQuery`) | Collation setup transfers between functions; `db->pDfltColl` becomes `pParse->db->pDfltColl`. Six files / seven outputs. Real relocation, but a small edit. |
| [ ] | **Linux 903** | `item:97b1dcdaf` | `init/main.c:331–369` → `lib/bootconfig.c:427–464`, `xbc_snprint_cmdline` | Complete library extraction; only `static` removed plus signature whitespace. Four files / two outputs. Uncluttered, but minimal Type-3 editing. |
| [ ] | **OpenCV 103** | `item:e1c9756ce` | `modules/imgproc/src/resize.cpp:3650–3667` → `hal/ipp/src/resize_ipp.cpp:33–49`, resize-worker `operator()` | Full worker method transfer, `Range` → `cv::Range`, instrumentation call removed. Three files / 32 outputs. Better than the old tiny-return selection, but IPP API jargon. |

Full backup commit pairs:

- SQLite 764: `8e272dd9a76b9ebc3f356e0990392a9380954992` → `9b7005feeae1fd6267f0b52161998ce2d75335e2`.
- Linux 903: `8b308f96484e37d92d2fc6b72b091f60496c000e` → `4f7e89065e41fd487e411d35b5caeac2a10af10e`.
- OpenCV 103: `577f395bee405986dc145e9eb8fd928ef5636d98` → `15367f7c52208c7107216c27e36207ba8188a016`.

All backups are currently uncached in the running viewer. OpenCV 91 also has
valid whole-construct transfers, but their edits are mostly `cv::` qualification,
so the stronger examples above take priority.

## What was excluded

- The prior `.cxx` Scintilla examples and SQLite extension/file rename.
- OpenCV SVD transfer whose enclosing file is a Git `R085` rename.
- SQLite same-location fixes, nesting-only changes, unrelated declaration/guard
  matches, and the previously unsupported wasm reorganization matches.
- Notepad++ generic declaration matches: they are less convincing than the
  selected Linux/SQLite/OpenCV continuations.

## How to reproduce the evidence checks

These entries use current `srcmove-history list --moves` and `show PAIR` JSON
(classification, output IDs, endpoints), plus `git show` of both exact revisions
and `git diff --find-renames` to check deletions, insertions, surrounding roles,
and rename status. No private history database SQL was used. For example:

```bash
python3 srcMove/bin/srcmove-history -C srcMove/reference-repositories/linux \
  --state-dir .srcmove-whole show 942 --format json
git -C srcMove/reference-repositories/linux diff --find-renames \
  80476f22b8b7e193b26f285a7c9f9e4b63abca16 \
  4b5713ef2f929dd8720fcdb66c063643ef9e3bcb -- drivers/edac/
```

- [ ] Review SQLite 1 immediately, then choose Linux 942 / OpenCV 913 for preparation.
- [ ] Confirm each selected group's exact endpoints in Source.
- [ ] Use the popup's **Show only this move group** action.
- [ ] Prepare chosen uncached comparisons before the presentation.
- [ ] Reopen after refreshing and rehearse details, connectors, and results.json.

<details>
<summary>Earlier shortlist and cache checks — superseded; contains excluded .cxx / rename examples</summary>

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

</details>
