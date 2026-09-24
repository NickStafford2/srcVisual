import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputPanel } from "./components/input-panel/InputPanel";
import { TabPanel } from "./components/TabPanel";
import { Tabs, type TabDefinition } from "./components/Tabs";
import { useSrcDiffData } from "./srcdiff/useSrcDiffData";
import { useHistoryData } from "./history/useHistoryData";
import { ArtifactNavigator } from "./components/artifact/ArtifactNavigator";
import { ArtifactMoveSummary as ArtifactMoveSummaryPane } from "./components/artifact/ArtifactMoveSummary";
import { ArtifactNodeInfo } from "./components/artifact/ArtifactNodeInfo";
import { ArtifactSourcePane } from "./components/artifact/ArtifactSourcePane";
import { ArtifactXmlPane } from "./components/artifact/ArtifactXmlPane";
import { fetchArtifactNode } from "./api";
import { useBigMoveBenchReview } from "./bigmovebench/useBigMoveBenchReview";
import { BigMoveBenchCaseBar } from "./components/BigMoveBenchCaseBar";
import {
  type ArtifactFocusProfile,
  type ArtifactMoveSummary,
  type ArtifactTreeNode,
} from "./types";

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

export default function App() {
  const srcDiffData = useSrcDiffData();
  const historyData = useHistoryData(
    srcDiffData.inputMode === "history",
    srcDiffData.acceptVisualization,
  );
  const benchmarkData = useBigMoveBenchReview(srcDiffData.acceptVisualization);
  const artifact = srcDiffData.data;
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>("input");
  const [selectedArtifactFileId, setSelectedArtifactFileId] = useState("");
  const [selectedArtifactMoveId, setSelectedArtifactMoveId] = useState<
    string | null
  >(null);
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
      setSelectedArtifactMoveId(null);
      setVisibleArtifactMoveIds(new Set());
      setSelectedArtifactNodeId(null);
      setSelectedArtifactNode(null);
      setArtifactNodeError(null);
      setArtifactFocus("changes-and-moves");
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
          setSelectedArtifactMoveId(node.move_id);
          if (node.move_id) {
            const moveId = node.move_id;
            setVisibleArtifactMoveIds((visible) =>
              new Set(visible).add(moveId),
            );
          }
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
  const selectedArtifactMove = artifact?.moves.items.find(
    (move) => move.move_id === selectedArtifactMoveId,
  );

  function selectArtifactFile(fileId: string) {
    setSelectedArtifactFileId(fileId);
    setSelectedArtifactMoveId(null);
    setSelectedArtifactNodeId(null);
  }

  function showArtifactMove(move: ArtifactMoveSummary) {
    const fileId = moveFileIds(move)[0];
    if (fileId) setSelectedArtifactFileId(fileId);
    setSelectedArtifactMoveId(move.move_id);
    setSelectedArtifactNodeId(null);
    setVisibleArtifactMoveIds((current) => new Set(current).add(move.move_id));
  }

  function toggleArtifactMove(move: ArtifactMoveSummary) {
    setVisibleArtifactMoveIds((current) => {
      const next = new Set(current);
      if (next.has(move.move_id)) next.delete(move.move_id);
      else next.add(move.move_id);
      return next;
    });
  }

  function selectArtifactNode(node: ArtifactTreeNode) {
    setSelectedArtifactFileId(fileIdFromNodeId(node.node_id));
    setSelectedArtifactMoveId(node.move_id);
    setSelectedArtifactNodeId(node.node_id);
    if (node.move_id) {
      const moveId = node.move_id;
      setVisibleArtifactMoveIds((current) => new Set(current).add(moveId));
    }
  }

  function selectArtifactNodeById(nodeId: string) {
    setSelectedArtifactFileId(fileIdFromNodeId(nodeId));
    setSelectedArtifactNodeId(nodeId);
    setSelectedArtifactNode(null);
  }

  function selectArtifactEndpoint(move: ArtifactMoveSummary, nodeId: string) {
    setSelectedArtifactFileId(fileIdFromNodeId(nodeId));
    setSelectedArtifactMoveId(move.move_id);
    setSelectedArtifactNodeId(nodeId);
    setVisibleArtifactMoveIds((current) => new Set(current).add(move.move_id));
    setActiveMainTab("source-code");
  }

  function selectArtifactMoveById(moveId: string) {
    const move = artifact?.moves.items.find((item) => item.move_id === moveId);
    if (!move) return;
    setSelectedArtifactMoveId(moveId);
    setSelectedArtifactNodeId(null);
    setVisibleArtifactMoveIds((current) => new Set(current).add(moveId));
  }

  return (
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
                selectedMoveId={selectedArtifactMoveId}
                visibleMoveIds={visibleArtifactMoveIds}
                selectedNodeId={selectedArtifactNodeId}
                focus={selectedArtifactMove ? "moves" : artifactFocus}
                onSelectFile={selectArtifactFile}
                onToggleMove={toggleArtifactMove}
                onSelectNode={selectArtifactNode}
              />
            ) : null}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <BigMoveBenchCaseBar {...benchmarkData} />
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
                        files={artifact.files}
                        selectedFileId={selectedArtifactFileId}
                        selectedNodeId={selectedArtifactNodeId}
                        active={activeMainTab === "source-code"}
                        focus={selectedArtifactMove ? "moves" : artifactFocus}
                        activeMove={selectedArtifactMove ?? null}
                        moves={artifact.moves.items}
                        visibleMoveIds={visibleArtifactMoveIds}
                        onVisibleMoveIdsChange={setVisibleArtifactMoveIds}
                        onSelectMove={selectArtifactMoveById}
                        onFocusChange={setArtifactFocus}
                      />
                    </TabPanel>

                    <TabPanel tabId="xml-pane" activeTabId={activeMainTab}>
                      <ArtifactXmlPane
                        artifactId={artifact.artifact_id}
                        active={activeMainTab === "xml-pane"}
                        selectedNode={selectedArtifactNode}
                        onSelectNodeId={selectArtifactNodeById}
                      />
                    </TabPanel>

                    <TabPanel
                      tabId="highlighted-node-info"
                      activeTabId={activeMainTab}
                    >
                      <ArtifactNodeInfo
                        node={selectedArtifactNode}
                        loading={artifactNodeLoading}
                        error={artifactNodeError}
                        onRevealSource={() => setActiveMainTab("source-code")}
                      />
                    </TabPanel>

                    <TabPanel tabId="move-summary" activeTabId={activeMainTab}>
                      <ArtifactMoveSummaryPane
                        files={artifact.files}
                        moves={artifact.moves.items}
                        selectedMoveId={selectedArtifactMoveId}
                        selectedNodeId={selectedArtifactNodeId}
                        onSelectMove={showArtifactMove}
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
    </main>
  );
}

function moveFileIds(move: ArtifactMoveSummary): string[] {
  return [
    ...new Set(
      [...move.from_node_ids, ...move.to_node_ids].map(
        (nodeId) => nodeId.split(":n", 1)[0],
      ),
    ),
  ];
}

function fileIdFromNodeId(nodeId: string): string {
  return nodeId.split(":n", 1)[0];
}
