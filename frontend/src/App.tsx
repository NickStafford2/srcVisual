import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputPanel } from "./components/input-panel/InputPanel";
import { TabPanel } from "./components/TabPanel";
import { Tabs, type TabDefinition } from "./components/Tabs";
import { useSrcDiffData } from "./srcdiff/useSrcDiffData";
import { useHistoryData } from "./history/useHistoryData";
import { ArtifactNavigator } from "./components/artifact/ArtifactNavigator";
import { ArtifactMoveSummary as ArtifactMoveSummaryPane } from "./components/artifact/ArtifactMoveSummary";
import { ArtifactMovePopup } from "./components/artifact/ArtifactMovePopup";
import { ArtifactSourcePane } from "./components/artifact/ArtifactSourcePane";
import { CorrespondencePopup } from "./components/artifact/CorrespondencePopup";
import {
  ArtifactCorrespondences,
  type Pair,
} from "./components/artifact/ArtifactCorrespondences";
import { ArtifactXmlPane } from "./components/artifact/ArtifactXmlPane";
import { fetchArtifactNode } from "./api";
import { useBigMoveBenchReview } from "./bigmovebench/useBigMoveBenchReview";
import { BigMoveBenchCaseBar } from "./components/BigMoveBenchCaseBar";
import {
  type ArtifactDiffKind,
  type ArtifactDiffOverlayRegion,
  type ArtifactFocusProfile,
  type ArtifactMoveSummary,
  type ArtifactTreeNode,
} from "./types";

const defaultVisibleDiffKinds = new Set<ArtifactDiffKind>(["delete", "insert"]);

type MainTabId =
  | "input"
  | "source-code"
  | "xml-pane"
  | "move-summary"
  | "correspondences";

const resultTabs: TabDefinition<MainTabId>[] = [
  { id: "source-code", label: "Source" },
  { id: "xml-pane", label: "XML" },
  { id: "move-summary", label: "Move Summary" },
  { id: "correspondences", label: "Correspondences" },
];

export default function App() {
  const srcDiffData = useSrcDiffData();
  const historyData = useHistoryData(
    srcDiffData.inputMode === "history",
    srcDiffData.acceptVisualization,
  );
  const benchmarkData = useBigMoveBenchReview(srcDiffData.acceptVisualization);
  const artifact = srcDiffData.data;
  const [visibleCorrespondences, setVisibleCorrespondences] = useState<Pair[]>(
    [],
  );
  const [inspectedCorrespondence, setInspectedCorrespondence] = useState<{
    pair: Pair;
    position: { x: number; y: number };
  } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>("input");
  const [selectedArtifactFileId, setSelectedArtifactFileId] = useState("");
  const [inspectedArtifactMove, setInspectedArtifactMove] = useState<{
    moveId: string;
    position: { x: number; y: number };
  } | null>(null);
  const [visibleArtifactMoveIds, setVisibleArtifactMoveIds] = useState<
    Set<string>
  >(() => new Set());
  const [selectedArtifactNodeId, setSelectedArtifactNodeId] = useState<
    string | null
  >(null);
  const [selectedArtifactNode, setSelectedArtifactNode] =
    useState<ArtifactTreeNode | null>(null);
  const [artifactNodeLoading, setArtifactNodeLoading] = useState(false);
  const [artifactNodeError, setArtifactNodeError] = useState<string | null>(
    null,
  );
  const [artifactFocus, setArtifactFocus] =
    useState<ArtifactFocusProfile>("changes-and-moves");
  const [visibleDiffKinds, setVisibleDiffKinds] = useState<
    Set<ArtifactDiffKind>
  >(() => new Set(defaultVisibleDiffKinds));
  const [diffOverlayRegions, setDiffOverlayRegions] = useState<
    ArtifactDiffOverlayRegion[]
  >([]);

  const hasData = Boolean(artifact);
  const sidebarWidthClass = hasData ? "lg:w-[360px]" : "lg:w-[108px]";

  const mainTabs: TabDefinition<MainTabId>[] = [
    ...resultTabs.map((tab) => ({
      ...tab,
      disabled: !artifact,
    })),
    {
      id: "input",
      label: "Input",
      className: "ml-auto",
    },
  ];

  useEffect(() => {
    if (!artifact) {
      setActiveMainTab("input");
      return;
    }

    setActiveMainTab("source-code");
  }, [artifact]);

  useEffect(() => {
    if (artifact) {
      setSelectedArtifactFileId(artifact.files[0]?.file_id ?? "");
      setInspectedArtifactMove(null);
      setVisibleCorrespondences([]);
      setInspectedCorrespondence(null);
      setVisibleArtifactMoveIds(
        new Set(artifact.moves.items.map((move) => move.move_id)),
      );
      setSelectedArtifactNodeId(null);
      setSelectedArtifactNode(null);
      setArtifactNodeError(null);
      setArtifactFocus("changes-and-moves");
      setVisibleDiffKinds(new Set(defaultVisibleDiffKinds));
      setDiffOverlayRegions([]);
    }
  }, [artifact]);

  useEffect(() => {
    if (!artifact || !selectedArtifactNodeId) {
      setSelectedArtifactNode(null);
      setArtifactNodeLoading(false);
      return;
    }
    let current = true;
    setArtifactNodeLoading(true);
    setArtifactNodeError(null);
    void fetchArtifactNode(artifact.artifact_id, selectedArtifactNodeId)
      .then((node) => {
        if (current) {
          setSelectedArtifactNode(node);
          setSelectedArtifactFileId(fileIdFromNodeId(node.node_id));
        }
      })
      .catch((reason: unknown) => {
        if (current) {
          setSelectedArtifactNode(null);
          setArtifactNodeError(
            reason instanceof Error
              ? reason.message
              : "Unable to load the selected tag.",
          );
        }
      })
      .finally(() => {
        if (current) setArtifactNodeLoading(false);
      });
    return () => {
      current = false;
    };
  }, [artifact, selectedArtifactNodeId]);

  const selectedArtifactFile = artifact?.files.find(
    (file) => file.file_id === selectedArtifactFileId,
  );
  function selectArtifactFile(fileId: string) {
    setSelectedArtifactFileId(fileId);
    clearArtifactNodeSelection();
  }

  function inspectArtifactMove(
    moveId: string,
    position: { x: number; y: number },
  ) {
    if (!artifact?.moves.items.some((move) => move.move_id === moveId)) return;
    setVisibleArtifactMoveIds((current) => {
      if (current.has(moveId)) return current;
      const next = new Set(current);
      next.add(moveId);
      return next;
    });
    setInspectedArtifactMove({ moveId, position });
  }

  function toggleArtifactMove(move: ArtifactMoveSummary) {
    setVisibleArtifactMoveIds((current) => {
      const next = new Set(current);
      if (next.has(move.move_id)) next.delete(move.move_id);
      else next.add(move.move_id);
      return next;
    });
  }

  function toggleDiffKind(kind: ArtifactDiffKind) {
    setVisibleDiffKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function selectArtifactNode(node: ArtifactTreeNode) {
    setSelectedArtifactFileId(fileIdFromNodeId(node.node_id));
    setSelectedArtifactNodeId(node.node_id);
    setSelectedArtifactNode(node);
  }

  function selectArtifactNodeById(nodeId: string) {
    setSelectedArtifactFileId(fileIdFromNodeId(nodeId));
    setSelectedArtifactNodeId(nodeId);
    setSelectedArtifactNode(null);
  }

  function selectArtifactEndpoint(nodeId: string) {
    setSelectedArtifactFileId(fileIdFromNodeId(nodeId));
    setSelectedArtifactNodeId(nodeId);
    setActiveMainTab("source-code");
  }

  function clearArtifactNodeSelection() {
    setSelectedArtifactNodeId(null);
    setSelectedArtifactNode(null);
    setArtifactNodeError(null);
    setDiffOverlayRegions([]);
  }

  return (
    <main className="bg-site-bg flex h-screen flex-col text-slate-100">
      <div className="mx-auto flex h-full w-full max-w-[2220px] flex-col">
        <AppHeader
          artifact={artifact}
          context={srcDiffData.comparisonContext}
          view={
            mainTabs.find((tab) => tab.id === activeMainTab)?.label ?? "Input"
          }
          focus={artifactFocus}
          visibleMoveCount={visibleArtifactMoveIds.size}
        />

        {srcDiffData.comparisonContext?.mode === "history" && historyData.selectedPair && activeMainTab !== "input" ? (
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2 text-xs text-slate-300">
            <span>History pair #{historyData.selectedPair.number}</span>
            {([-1, 1] as const).map(direction => {
              const current = historyData.pairs.findIndex(pair => pair.number === historyData.selectedPair?.number);
              const adjacent = historyData.pairs[current + direction];
              return <button key={direction} type="button" disabled={current < 0 || !adjacent || adjacent.status !== "completed" || historyData.isVisualizingPair} onClick={() => void historyData.openVisualization(adjacent.number)} className="rounded border border-white/20 px-3 py-1 disabled:opacity-40">{direction === -1 ? "Previous result" : "Next result"}</button>;
            })}
            <span>Uses the current filter and loaded results.</span>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
          <aside
            className={`shrink-0 space-y-3 self-stretch transition-[width] duration-300 ${sidebarWidthClass}`}
          >
            {artifact && selectedArtifactFileId ? (
              <ArtifactNavigator
                correspondenceControls={
                  activeMainTab === "source-code" ? (
                    <ArtifactCorrespondences
                      key={artifact.artifact_id}
                      artifactId={artifact.artifact_id}
                      active
                      sidebar
                      visiblePairs={visibleCorrespondences}
                      onVisiblePairsChange={setVisibleCorrespondences}
                    />
                  ) : null
                }
                manifest={artifact}
                selectedFileId={selectedArtifactFileId}
                inspectedMoveId={inspectedArtifactMove?.moveId ?? null}
                visibleMoveIds={visibleArtifactMoveIds}
                visibleDiffKinds={visibleDiffKinds}
                selectedNodeId={selectedArtifactNodeId}
                selectedNode={selectedArtifactNode}
                nodeLoading={artifactNodeLoading}
                nodeError={artifactNodeError}
                focus={artifactFocus}
                onSelectFile={selectArtifactFile}
                onToggleMove={toggleArtifactMove}
                onVisibleMoveIdsChange={setVisibleArtifactMoveIds}
                onToggleDiffKind={toggleDiffKind}
                onVisibleDiffKindsChange={setVisibleDiffKinds}
                onDiffOverlayRegionsChange={setDiffOverlayRegions}
                onSelectNode={selectArtifactNode}
                onClearNode={clearArtifactNodeSelection}
                onRevealNode={() => setActiveMainTab("source-code")}
              />
            ) : null}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {artifact?.provenance?.origin !== "benchmark" ? (
                <BigMoveBenchCaseBar {...benchmarkData} />
              ) : null}
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
                    diagnostics={srcDiffData.diagnostics}
                    onDiagnosticsChange={srcDiffData.setDiagnostics}
                    selectedUpload={srcDiffData.selectedUpload}
                    xmlInput={srcDiffData.xmlInput}
                    loadedExampleFilename={srcDiffData.loadedExampleFilename}
                    isLoading={srcDiffData.isLoading}
                    error={srcDiffData.error}
                    progressMessage={srcDiffData.progressMessage}
                    progressMessages={srcDiffData.progressMessages}
                    data={srcDiffData.data}
                    exampleFilenames={srcDiffData.exampleFilenames}
                    examplesError={srcDiffData.examplesError}
                    isLoadingExample={srcDiffData.isLoadingExample}
                    history={historyData}
                    benchmark={benchmarkData}
                    onInputModeChange={srcDiffData.setInputMode}
                    onLoadExample={srcDiffData.handleLoadExample}
                    onUploadChange={srcDiffData.setSelectedUpload}
                    onXmlInputChange={srcDiffData.handleXmlInputChange}
                    onSubmit={srcDiffData.handleSubmit}
                  />
                </TabPanel>

                {artifact && selectedArtifactFile ? (
                  <>
                    <TabPanel tabId="source-code" activeTabId={activeMainTab}>
                      <ArtifactSourcePane
                        artifactId={artifact.artifact_id}
                        visibleCorrespondences={visibleCorrespondences}
                        onInspectCorrespondence={(pair, position) =>
                          setInspectedCorrespondence({ pair, position })
                        }
                        files={artifact.files}
                        selectedFileId={selectedArtifactFileId}
                        selectedNodeId={selectedArtifactNodeId}
                        active={activeMainTab === "source-code"}
                        focus={artifactFocus}
                        inspectedMoveId={inspectedArtifactMove?.moveId ?? null}
                        moves={artifact.moves.items}
                        visibleMoveIds={visibleArtifactMoveIds}
                        visibleDiffKinds={visibleDiffKinds}
                        diffOverlayRegions={diffOverlayRegions}
                        onInspectMove={inspectArtifactMove}
                        onFocusChange={setArtifactFocus}
                      />
                    </TabPanel>

                    <TabPanel tabId="xml-pane" activeTabId={activeMainTab}>
                      <ArtifactXmlPane
                        artifactId={artifact.artifact_id}
                        active={activeMainTab === "xml-pane"}
                        selectedNode={selectedArtifactNode}
                        visibleDiffKinds={visibleDiffKinds}
                        onSelectNodeId={selectArtifactNodeById}
                      />
                    </TabPanel>

                    <TabPanel
                      tabId="correspondences"
                      activeTabId={activeMainTab}
                    >
                      <ArtifactCorrespondences
                        key={artifact.artifact_id}
                        artifactId={artifact.artifact_id}
                        active={activeMainTab === "correspondences"}
                      />
                    </TabPanel>
                    <TabPanel tabId="move-summary" activeTabId={activeMainTab}>
                      <ArtifactMoveSummaryPane
                        files={artifact.files}
                        moves={artifact.moves.items}
                        inspectedMoveId={inspectedArtifactMove?.moveId ?? null}
                        selectedNodeId={selectedArtifactNodeId}
                        onInspectMove={inspectArtifactMove}
                        onSelectEndpoint={selectArtifactEndpoint}
                      />
                    </TabPanel>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      {artifact && inspectedCorrespondence ? (
        <CorrespondencePopup
          key={`${artifact.artifact_id}:${inspectedCorrespondence.pair.id}`}
          artifactId={artifact.artifact_id}
          pair={inspectedCorrespondence.pair}
          position={inspectedCorrespondence.position}
          onClose={() => setInspectedCorrespondence(null)}
        />
      ) : null}
      {artifact && inspectedArtifactMove ? (
        <ArtifactMovePopup
          key={`${artifact.artifact_id}:${inspectedArtifactMove.moveId}`}
          artifactId={artifact.artifact_id}
          moveId={inspectedArtifactMove.moveId}
          position={inspectedArtifactMove.position}
          onClose={() => setInspectedArtifactMove(null)}
        />
      ) : null}
    </main>
  );
}

function fileIdFromNodeId(nodeId: string): string {
  return nodeId.split(":n", 1)[0];
}
