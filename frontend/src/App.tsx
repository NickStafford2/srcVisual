import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
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

type MainTabId =
  | "input"
  | "source-code"
  | "xml-pane"
  | "highlighted-node-info"
  | "move-summary";

const resultTabs: { id: MainTabId; label: string }[] = [
  { id: "source-code", label: "Source" },
  { id: "xml-pane", label: "XML" },
  { id: "highlighted-node-info", label: "Node Info" },
  { id: "move-summary", label: "Move Summary" },
];

export default function App() {
  const _srcDiffData = useSrcDiffData();
  const _srcDiffSelection = useSrcDiffSelection(_srcDiffData.data);
  const [_activeMainTab, _setActiveMainTab] = useState<MainTabId>("input");

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

  useEffect(() => {
    if (!_data) {
      _setActiveMainTab("input");
      return;
    }

    _setActiveMainTab("source-code");
  }, [_data]);

  return (
    <SrcDiffHighlightProvider value={_highlightContextValue}>
      <main className="flex h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_24%)] text-slate-100">
        <div className="mx-auto flex h-full w-full max-w-[2220px] flex-col">
          <AppHeader />

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
            <aside
              className={`shrink-0 space-y-3 self-stretch transition-[width] duration-300 ${_sidebarWidthClass}`}
            >
              <SrcDiffTree
                files={_files}
                hasData={_hasData}
                onHighlightNode={_srcDiffSelection.highlightNode}
                onHighlightMoveGroup={_srcDiffSelection.highlightMoveGroup}
              />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div
                  aria-label="Main view tabs"
                  className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-[20px] border border-white/10 bg-slate-950/85 p-2 backdrop-blur"
                  role="tablist"
                >
                  {resultTabs.map((_tab) => {
                    const _tabId = `${_tab.id}-tab`;
                    const _panelId = `${_tab.id}-panel`;
                    const _isActive = _activeMainTab === _tab.id;
                    const _isDisabled = !_data;

                    return (
                      <button
                        key={_tab.id}
                        aria-controls={_panelId}
                        aria-selected={_isActive}
                        className={`rounded-[14px] px-4 py-2 text-sm font-medium transition ${
                          _isActive
                            ? "bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.28)]"
                            : _isDisabled
                              ? "cursor-not-allowed bg-white/5 text-slate-500 opacity-60"
                              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-slate-100"
                        }`}
                        disabled={_isDisabled}
                        id={_tabId}
                        onClick={() => {
                          _setActiveMainTab(_tab.id);
                        }}
                        role="tab"
                        type="button"
                      >
                        {_tab.label}
                      </button>
                    );
                  })}

                  <button
                    aria-controls="input-panel"
                    aria-selected={_activeMainTab === "input"}
                    className={`ml-auto rounded-[14px] px-4 py-2 text-sm font-medium transition ${
                      _activeMainTab === "input"
                        ? "bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(103,232,249,0.28)]"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-slate-100"
                    }`}
                    id="input-tab"
                    onClick={() => {
                      _setActiveMainTab("input");
                    }}
                    role="tab"
                    type="button"
                  >
                    Input
                  </button>
                </div>

                <div className="min-h-0">
                  <div
                    aria-labelledby="input-tab"
                    hidden={_activeMainTab !== "input"}
                    id="input-panel"
                    role="tabpanel"
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
                  </div>

                  {_data ? (
                    <>
                      <div
                        aria-labelledby="source-code-tab"
                        hidden={_activeMainTab !== "source-code"}
                        id="source-code-panel"
                        role="tabpanel"
                      >
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

                      <div
                        aria-labelledby="xml-pane-tab"
                        hidden={_activeMainTab !== "xml-pane"}
                        id="xml-pane-panel"
                        role="tabpanel"
                      >
                        <XmlPane
                          title="srcDiff XML"
                          subtitle="Moved srcdiff XML returned by the backend"
                          source={_data.moved_srcdiff_xml}
                          highlights={_xmlHighlights}
                        />
                      </div>

                      <div
                        aria-labelledby="highlighted-node-info-tab"
                        hidden={_activeMainTab !== "highlighted-node-info"}
                        id="highlighted-node-info-panel"
                        role="tabpanel"
                      >
                        <HighlightedNodeInfo
                          moveResults={_data.move_results}
                          moveNodesById={_srcDiffSelection.moveNodesById}
                        />
                      </div>

                      <div
                        aria-labelledby="move-summary-tab"
                        hidden={_activeMainTab !== "move-summary"}
                        id="move-summary-panel"
                        role="tabpanel"
                      >
                        <MoveSummary
                          moveResults={_data.move_results}
                          moveNodesById={_srcDiffSelection.moveNodesById}
                          onHighlightMoveGroup={_srcDiffSelection.highlightMoveGroup}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SrcDiffHighlightProvider>
  );
}
