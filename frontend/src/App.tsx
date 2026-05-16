import { useState } from "react";
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
  const srcDiffData = useSrcDiffData();
  const srcDiffSelection = useSrcDiffSelection(srcDiffData.data);
  const [_isSidebarCollapsed, _setIsSidebarCollapsed] = useState(false);

  const _data = srcDiffData.data;
  const _files = _data?.files ?? [];
  const _resultsLayoutClass = _isSidebarCollapsed
    ? "xl:grid-cols-[96px_minmax(0,1fr)]"
    : "xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]";

  const xmlHighlights: SourceViewHighlight[] =
    srcDiffSelection.highlightedSpans.flatMap((highlight) => {
      if (!highlight.xmlSpan) return [];

      return [
        {
          nodeId: highlight.nodeId,
          kind: highlight.kind,
          span: highlight.xmlSpan,
        },
      ];
    });

  return (
    <main className="bg-site-bg min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_24%)] px-4 pb-8 text-slate-100 md:px-6 md:pb-10">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
        <InputPanel
          inputMode={srcDiffData.inputMode}
          selectedUpload={srcDiffData.selectedUpload}
          xmlInput={srcDiffData.xmlInput}
          isLoading={srcDiffData.isLoading}
          error={srcDiffData.error}
          progressMessage={srcDiffData.progressMessage}
          progressMessages={srcDiffData.progressMessages}
          data={srcDiffData.data}
          includeSkippedTags={srcDiffData.includeSkippedTags}
          pruningLevel={srcDiffData.pruningLevel}
          exampleFilenames={srcDiffData.exampleFilenames}
          examplesError={srcDiffData.examplesError}
          isLoadingExample={srcDiffData.isLoadingExample}
          onInputModeChange={srcDiffData.setInputMode}
          onLoadExample={srcDiffData.handleLoadExample}
          onUploadChange={srcDiffData.setSelectedUpload}
          onXmlInputChange={srcDiffData.handleXmlInputChange}
          onIncludeSkippedTagsChange={srcDiffData.setIncludeSkippedTags}
          onPruningLevelChange={srcDiffData.setPruningLevel}
          onSubmit={srcDiffData.handleSubmit}
        />

        {_data ? (
          <SrcDiffHighlightProvider
            value={{
              highlightedNodes: srcDiffSelection.highlightedNodes,
              highlightedNodeIds: srcDiffSelection.highlightedNodeIds,
              highlightedSpans: srcDiffSelection.highlightedSpans,
              highlightMode: srcDiffSelection.highlightMode,
              unhighlightNode: srcDiffSelection.unhighlightNode,
              highlightAllMoves: srcDiffSelection.highlightAllMoves,
              highlightAllInserts: srcDiffSelection.highlightAllInserts,
              highlightAllDeletes: srcDiffSelection.highlightAllDeletes,
              clearHighlights: srcDiffSelection.clearHighlights,
            }}
          >
            <div className={`grid gap-6 ${_resultsLayoutClass} xl:items-start`}>
              <div className="min-w-0 xl:sticky xl:top-4">
                <SrcDiffTree
                  files={_files}
                  sidebarCollapsed={_isSidebarCollapsed}
                  onToggleSidebar={() => {
                    _setIsSidebarCollapsed((current) => !current);
                  }}
                  onHighlightNode={srcDiffSelection.highlightNode}
                  onHighlightMoveGroup={srcDiffSelection.highlightMoveGroup}
                />
              </div>

              <div className="min-w-0 space-y-6">
                <HighlightedNodeInfo
                  moveResults={_data.move_results}
                  moveNodesById={srcDiffSelection.moveNodesById}
                />

                <MoveSummary
                  moveResults={_data.move_results}
                  moveNodesById={srcDiffSelection.moveNodesById}
                  onHighlightMoveGroup={srcDiffSelection.highlightMoveGroup}
                />

                <XmlPane
                  title="srcDiff XML"
                  subtitle="Moved srcdiff XML returned by the backend"
                  source={_data.moved_srcdiff_xml}
                  highlights={xmlHighlights}
                />

                <SourceCodeSection
                  files={_files}
                  highlightedSpansByUnitId={
                    srcDiffSelection.sourceHighlightedSpansByUnitId
                  }
                  moveResults={_data.move_results}
                  moveNodesById={srcDiffSelection.moveNodesById}
                  onHighlightMoveGroup={srcDiffSelection.highlightMoveGroup}
                />
              </div>
            </div>
          </SrcDiffHighlightProvider>
        ) : null}
      </div>
    </main>
  );
}
