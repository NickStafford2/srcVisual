import { useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputDialog } from "./components/input-panel/InputDialog";
import { InputPanel } from "./components/input-panel/InputPanel";
import { HighlightedNodeInfo } from "./components/source-view/node-info/HighlightedNodeInfo";
import { MoveSummary } from "./components/source-view/node-info/MoveSummary";
import { SourceCodeSection } from "./components/source-view/SourceCodeSection";
import { XmlPane } from "./components/source-view/XmlPane";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { SrcDiffHighlightProvider } from "./srcdiff/highlightContext";
import type { SourceViewHighlight } from "./srcdiff/srcView";
import { useSrcDiffData } from "./srcdiff/useSrcDiffData";
import { useSrcDiffSelection } from "./srcdiff/useSrcDiffSelection";

export default function App() {
  const _srcDiffData = useSrcDiffData();
  const _srcDiffSelection = useSrcDiffSelection(_srcDiffData.data);
  const [_isInputOpen, _setIsInputOpen] = useState(false);

  const _data = _srcDiffData.data;
  const _hasData = Boolean(_data);
  const _files = _data?.files ?? [];
  const _sidebarWidthClass = _hasData ? "lg:w-[360px]" : "lg:w-[108px]";
  const _xmlHighlights: SourceViewHighlight[] =
    _srcDiffSelection.highlightedSpans.flatMap((highlight) => {
      if (!highlight.xmlSpan) return [];

      return [
        {
          nodeId: highlight.nodeId,
          kind: highlight.kind,
          span: highlight.xmlSpan,
        },
      ];
    });
  const _highlightContextValue = useMemo(
    () => ({
      highlightedNodes: _srcDiffSelection.highlightedNodes,
      highlightedNodeIds: _srcDiffSelection.highlightedNodeIds,
      highlightedSpans: _srcDiffSelection.highlightedSpans,
      highlightMode: _srcDiffSelection.highlightMode,
      unhighlightNode: _srcDiffSelection.unhighlightNode,
      highlightAllMoves: _srcDiffSelection.highlightAllMoves,
      highlightAllInserts: _srcDiffSelection.highlightAllInserts,
      highlightAllDeletes: _srcDiffSelection.highlightAllDeletes,
      clearHighlights: _srcDiffSelection.clearHighlights,
    }),
    [_srcDiffSelection],
  );

  return (
    <SrcDiffHighlightProvider value={_highlightContextValue}>
      <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_24%)] text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-[2220px] flex-1 flex-col">
          <AppHeader
            isInputOpen={_isInputOpen}
            onToggleInput={() => {
              _setIsInputOpen((current) => !current);
            }}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 bg-orange-400 lg:flex-row lg:items-stretch">
            <aside
              className={`h-full shrink-0 space-y-3 bg-red-600 transition-[width] duration-300 ${_sidebarWidthClass}`}
            >
              <SrcDiffTree
                files={_files}
                hasData={_hasData}
                onHighlightNode={_srcDiffSelection.highlightNode}
                onHighlightMoveGroup={_srcDiffSelection.highlightMoveGroup}
              />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-amber-200">
              {_data ? (
                <div className="space-y-6">
                  <HighlightedNodeInfo
                    moveResults={_data.move_results}
                    moveNodesById={_srcDiffSelection.moveNodesById}
                  />

                  <MoveSummary
                    moveResults={_data.move_results}
                    moveNodesById={_srcDiffSelection.moveNodesById}
                    onHighlightMoveGroup={_srcDiffSelection.highlightMoveGroup}
                  />

                  <XmlPane
                    title="srcDiff XML"
                    subtitle="Moved srcdiff XML returned by the backend"
                    source={_data.moved_srcdiff_xml}
                    highlights={_xmlHighlights}
                  />

                  <SourceCodeSection
                    files={_files}
                    highlightedSpansByUnitId={
                      _srcDiffSelection.sourceHighlightedSpansByUnitId
                    }
                    moveResults={_data.move_results}
                    moveNodesById={_srcDiffSelection.moveNodesById}
                    onHighlightMoveGroup={_srcDiffSelection.highlightMoveGroup}
                  />
                </div>
              ) : (
                <section className="flex min-h-[60vh] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-slate-950/50 text-center shadow-[0_18px_48px_rgba(0,0,0,0.18)] lg:min-h-full">
                  <div className="max-w-xl">
                    <p className="text-[11px] font-medium tracking-[0.28em] text-slate-500 uppercase">
                      Ready
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-50">
                      Open the input window to load srcDiff XML.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      The top bar is separate now. The left rail stays fixed.
                      The work area fills the rest.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        <InputDialog
          isOpen={_isInputOpen}
          title="srcDiff Visualizer"
          onClose={() => {
            _setIsInputOpen(false);
          }}
        >
          <InputPanel
            inputMode={_srcDiffData.inputMode}
            selectedUpload={_srcDiffData.selectedUpload}
            xmlInput={_srcDiffData.xmlInput}
            isLoading={_srcDiffData.isLoading}
            error={_srcDiffData.error}
            progressMessage={_srcDiffData.progressMessage}
            progressMessages={_srcDiffData.progressMessages}
            data={_srcDiffData.data}
            includeSkippedTags={_srcDiffData.includeSkippedTags}
            pruningLevel={_srcDiffData.pruningLevel}
            exampleFilenames={_srcDiffData.exampleFilenames}
            examplesError={_srcDiffData.examplesError}
            isLoadingExample={_srcDiffData.isLoadingExample}
            onInputModeChange={_srcDiffData.setInputMode}
            onLoadExample={_srcDiffData.handleLoadExample}
            onUploadChange={_srcDiffData.setSelectedUpload}
            onXmlInputChange={_srcDiffData.handleXmlInputChange}
            onIncludeSkippedTagsChange={_srcDiffData.setIncludeSkippedTags}
            onPruningLevelChange={_srcDiffData.setPruningLevel}
            onSubmit={_srcDiffData.handleSubmit}
          />
        </InputDialog>
      </main>
    </SrcDiffHighlightProvider>
  );
}
