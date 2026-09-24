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
import { useHistoryData } from "./history/useHistoryData";
import { ArtifactNavigator } from "./components/artifact/ArtifactNavigator";
import { ArtifactSourcePane } from "./components/artifact/ArtifactSourcePane";
import { ArtifactXmlPane } from "./components/artifact/ArtifactXmlPane";
import { isArtifactManifest, type ArtifactFocusProfile } from "./types";

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
  const historyData = useHistoryData(
    srcDiffData.inputMode === "history",
    srcDiffData.acceptVisualization,
    srcDiffData.includeSkippedTags,
  );
  const data = srcDiffData.data;
  const artifact = data && isArtifactManifest(data) ? data : null;
  const legacyData = data && !isArtifactManifest(data) ? data : null;
  const srcDiffSelection = useSrcDiffSelection(legacyData);
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>("input");
  const [selectedArtifactFileId, setSelectedArtifactFileId] = useState("");
  const [artifactFocus, setArtifactFocus] =
    useState<ArtifactFocusProfile>("changes-and-moves");

  const hasData = Boolean(data);
  const files = legacyData?.files ?? [];
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

  useEffect(() => {
    if (artifact) {
      setSelectedArtifactFileId(artifact.files[0]?.file_id ?? "");
      setArtifactFocus("changes-and-moves");
    }
  }, [artifact]);

  const selectedArtifactFile = artifact?.files.find(
    (file) => file.file_id === selectedArtifactFileId,
  );

  return (
    <SrcDiffHighlightProvider value={highlightContextValue}>
      <main className="bg-site-bg flex h-screen flex-col text-slate-100">
        <div className="mx-auto flex h-full w-full max-w-[2220px] flex-col">
          <AppHeader />

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
            <aside
              className={`shrink-0 space-y-3 self-stretch transition-[width] duration-300 ${sidebarWidthClass}`}
            >
              {artifact && selectedArtifactFileId ? (
                <ArtifactNavigator
                  manifest={artifact}
                  selectedFileId={selectedArtifactFileId}
                  focus={artifactFocus}
                  onSelectFile={setSelectedArtifactFileId}
                />
              ) : (
                <SrcDiffTree
                  files={files}
                  hasData={hasData}
                  onHighlightNode={srcDiffSelection.highlightNode}
                  onHighlightMoveGroup={srcDiffSelection.highlightMoveGroup}
                />
              )}
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <Tabs
                  tabs={mainTabs}
                  activeTabId={activeMainTab}
                  ariaLabel="Main view tabs"
                  onTabChange={setActiveMainTab}
                />

                <div className="min-h-0 p-2">
                  <TabPanel tabId="input" activeTabId={activeMainTab}>
                    <InputPanel
                      inputMode={srcDiffData.inputMode}
                      selectedUpload={srcDiffData.selectedUpload}
                      xmlInput={srcDiffData.xmlInput}
                      loadedExampleFilename={srcDiffData.loadedExampleFilename}
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
                      history={historyData}
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

                  {legacyData ? (
                    <>
                      <TabPanel tabId="source-code" activeTabId={activeMainTab}>
                        <SourceCodeSection
                          files={files}
                          highlightedSpansByUnitId={
                            srcDiffSelection.sourceHighlightedSpansByUnitId
                          }
                          moveResults={legacyData.move_results}
                          moveNodesById={srcDiffSelection.moveNodesById}
                          onHighlightMoveGroup={
                            srcDiffSelection.highlightMoveGroup
                          }
                        />
                      </TabPanel>

                      <TabPanel tabId="xml-pane" activeTabId={activeMainTab}>
                        <XmlPane
                          source={legacyData.moved_srcdiff_xml}
                          highlights={xmlHighlights}
                        />
                      </TabPanel>

                      <TabPanel
                        tabId="highlighted-node-info"
                        activeTabId={activeMainTab}
                      >
                        <HighlightedNodeInfo
                          moveResults={legacyData.move_results}
                          moveNodesById={srcDiffSelection.moveNodesById}
                        />
                      </TabPanel>

                      <TabPanel
                        tabId="move-summary"
                        activeTabId={activeMainTab}
                      >
                        <MoveSummary
                          moveResults={legacyData.move_results}
                          moveNodesById={srcDiffSelection.moveNodesById}
                          onHighlightMoveGroup={
                            srcDiffSelection.highlightMoveGroup
                          }
                        />
                      </TabPanel>
                    </>
                  ) : artifact && selectedArtifactFile ? (
                    <>
                      <TabPanel tabId="source-code" activeTabId={activeMainTab}>
                        <ArtifactSourcePane
                          artifactId={artifact.artifact_id}
                          file={selectedArtifactFile}
                          focus={artifactFocus}
                          onFocusChange={setArtifactFocus}
                        />
                      </TabPanel>

                      <TabPanel tabId="xml-pane" activeTabId={activeMainTab}>
                        <ArtifactXmlPane
                          artifactId={artifact.artifact_id}
                          active={activeMainTab === "xml-pane"}
                        />
                      </TabPanel>

                      <TabPanel
                        tabId="highlighted-node-info"
                        activeTabId={activeMainTab}
                      >
                        <p className="text-sm text-slate-400">
                          Select a projected tree node to inspect it. Detailed node selection is retained in the legacy view during Phase 2.
                        </p>
                      </TabPanel>

                      <TabPanel tabId="move-summary" activeTabId={activeMainTab}>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-300">
                            {artifact.moves.move_count} detected moves
                          </p>
                          {artifact.moves.items.map((move) => (
                            <div
                              key={move.move_id}
                              className="rounded border border-white/10 bg-slate-950/60 p-3 text-sm"
                            >
                              <span className="font-mono text-violet-200">
                                {move.move_id}
                              </span>
                              {move.match_kind ? (
                                <span className="ml-2 text-slate-400">
                                  {move.match_kind}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
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
