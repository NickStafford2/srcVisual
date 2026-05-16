import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputPanel } from "./components/input-panel/InputPanel";
import { HighlightedNodeInfo } from "./components/source-view/node-info/HighlightedNodeInfo";
import { MoveSummary } from "./components/source-view/node-info/MoveSummary";
import { SourceCodeSection } from "./components/source-view/SourceCodeSection";
import { XmlPane } from "./components/source-view/XmlPane";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { TabPanel } from "./components/TabPanel";
import { Tabs, type TabDefinition } from "./components/Tabs";
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

const resultTabs: TabDefinition<MainTabId>[] = [
  { id: "source-code", label: "Source" },
  { id: "xml-pane", label: "XML" },
  { id: "highlighted-node-info", label: "Node Info" },
  { id: "move-summary", label: "Move Summary" },
];

function getXmlHighlights(
  highlightedSpans: ReturnType<typeof useSrcDiffSelection>["highlightedSpans"],
): SourceViewHighlight[] {
  return highlightedSpans.flatMap((highlight) => {
    if (!highlight.xmlSpan) return [];

    return [
      {
        nodeId: highlight.nodeId,
        kind: highlight.kind,
        span: highlight.xmlSpan,
      },
    ];
  });
}

export default function App() {
  const srcDiffData = useSrcDiffData();
  const srcDiffSelection = useSrcDiffSelection(srcDiffData.data);
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>("input");

  const data = srcDiffData.data;
  const hasData = Boolean(data);
  const files = data?.files ?? [];
  const sidebarWidthClass = hasData ? "lg:w-[360px]" : "lg:w-[108px]";

  const mainTabs: TabDefinition<MainTabId>[] = [
    ...resultTabs.map((tab) => ({
      ...tab,
      disabled: !data,
    })),
    {
      id: "input",
      label: "Input",
      className: "ml-auto",
    },
  ];

  const xmlHighlights = getXmlHighlights(srcDiffSelection.highlightedSpans);

  const highlightContextValue = useMemo(
    () => ({
      highlightedNodes: srcDiffSelection.highlightedNodes,
      highlightedNodeIds: srcDiffSelection.highlightedNodeIds,
      highlightedSpans: srcDiffSelection.highlightedSpans,
      highlightMode: srcDiffSelection.highlightMode,
      unhighlightNode: srcDiffSelection.unhighlightNode,
      highlightAllMoves: srcDiffSelection.highlightAllMoves,
      highlightAllInserts: srcDiffSelection.highlightAllInserts,
      highlightAllDeletes: srcDiffSelection.highlightAllDeletes,
      clearHighlights: srcDiffSelection.clearHighlights,
    }),
    [srcDiffSelection],
  );

  useEffect(() => {
    if (!data) {
      setActiveMainTab("input");
      return;
    }

    setActiveMainTab("source-code");
  }, [data]);

  return (
    <SrcDiffHighlightProvider value={highlightContextValue}>
      <main className="flex h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_24%)] text-slate-100">
        <div className="mx-auto flex h-full w-full max-w-[2220px] flex-col">
          <AppHeader />

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
            <aside
              className={`shrink-0 space-y-3 self-stretch transition-[width] duration-300 ${sidebarWidthClass}`}
            >
              <SrcDiffTree
                files={files}
                hasData={hasData}
                onHighlightNode={srcDiffSelection.highlightNode}
                onHighlightMoveGroup={srcDiffSelection.highlightMoveGroup}
              />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <Tabs
                  tabs={mainTabs}
                  activeTabId={activeMainTab}
                  ariaLabel="Main view tabs"
                  onTabChange={setActiveMainTab}
                />

                <div className="min-h-0">
                  <TabPanel tabId="input" activeTabId={activeMainTab}>
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
                      onIncludeSkippedTagsChange={
                        srcDiffData.setIncludeSkippedTags
                      }
                      onPruningLevelChange={srcDiffData.setPruningLevel}
                      onSubmit={srcDiffData.handleSubmit}
                    />
                  </TabPanel>

                  {data ? (
                    <>
                      <TabPanel tabId="source-code" activeTabId={activeMainTab}>
                        <SourceCodeSection
                          files={files}
                          highlightedSpansByUnitId={
                            srcDiffSelection.sourceHighlightedSpansByUnitId
                          }
                          moveResults={data.move_results}
                          moveNodesById={srcDiffSelection.moveNodesById}
                          onHighlightMoveGroup={
                            srcDiffSelection.highlightMoveGroup
                          }
                        />
                      </TabPanel>

                      <TabPanel tabId="xml-pane" activeTabId={activeMainTab}>
                        <XmlPane
                          source={data.moved_srcdiff_xml}
                          highlights={xmlHighlights}
                        />
                      </TabPanel>

                      <TabPanel
                        tabId="highlighted-node-info"
                        activeTabId={activeMainTab}
                      >
                        <HighlightedNodeInfo
                          moveResults={data.move_results}
                          moveNodesById={srcDiffSelection.moveNodesById}
                        />
                      </TabPanel>

                      <TabPanel
                        tabId="move-summary"
                        activeTabId={activeMainTab}
                      >
                        <MoveSummary
                          moveResults={data.move_results}
                          moveNodesById={srcDiffSelection.moveNodesById}
                          onHighlightMoveGroup={
                            srcDiffSelection.highlightMoveGroup
                          }
                        />
                      </TabPanel>
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
