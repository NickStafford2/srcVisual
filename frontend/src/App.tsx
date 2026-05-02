import { HighlightedNodeInfo } from "./components/source-view/HighlightedNodeInfo";
import { InputPanel } from "./components/input-panel/InputPanel";
import { SelectedNodeInfo } from "./components/source-view/SelectedNodeInfo";
import { SourceSection } from "./components/source-view/SourceSection";
import { XmlPane } from "./components/source-view/XmlPane";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { SrcDiffHighlightProvider } from "./srcdiff/highlightContext";
import type { SourceViewHighlight } from "./srcdiff/srcView";
import { useSrcDiffData } from "./srcdiff/useSrcDiffData";
import { useSrcDiffSelection } from "./srcdiff/useSrcDiffSelection";

export default function App() {
  const srcDiffData = useSrcDiffData();
  const srcDiffSelection = useSrcDiffSelection(srcDiffData.data);

  const files = srcDiffData.data?.files ?? [];
  const selectedFile =
    srcDiffSelection.selectedNodeFileIndex === null
      ? null
      : files[srcDiffSelection.selectedNodeFileIndex];
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
    <main className="min-h-screen bg-site-bg px-4 pb-8 text-slate-100 md:px-6 md:pb-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <InputPanel
          selectedUpload={srcDiffData.selectedUpload}
          xmlInput={srcDiffData.xmlInput}
          isLoading={srcDiffData.isLoading}
          error={srcDiffData.error}
          data={srcDiffData.data}
          includeSkippedTags={srcDiffData.includeSkippedTags}
          onUploadChange={srcDiffData.setSelectedUpload}
          onXmlInputChange={srcDiffData.handleXmlInputChange}
          onIncludeSkippedTagsChange={srcDiffData.setIncludeSkippedTags}
          onSubmit={srcDiffData.handleSubmit}
        />

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
          <SrcDiffTree
            files={files}
            selectedFileIndex={srcDiffSelection.selectedFileIndex}
            selectedNodeId={srcDiffSelection.selectedNodeId}
            onSelectFileIndex={srcDiffSelection.setSelectedFileIndex}
            onSelectNode={srcDiffSelection.setSelectedNodeId}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <SelectedNodeInfo
              selectedNode={srcDiffSelection.selectedNode}
              selectedFilename={selectedFile?.filename ?? null}
              selectedNodeFileIndex={srcDiffSelection.selectedNodeFileIndex}
              selectedSpans={srcDiffSelection.selectedSpans}
            />

            <HighlightedNodeInfo />
          </div>

          <XmlPane
            title="srcDiff XML"
            subtitle="Annotated XML returned by the backend"
            source={
              srcDiffData.data?.annotated_srcdiff_xml ?? srcDiffData.xmlInput
            }
            selectedSpan={srcDiffSelection.selectedSpans.xmlSpan}
            selectedKind={srcDiffSelection.selectedSpans.kind}
            selectedNodeId={srcDiffSelection.selectedNode?.id ?? null}
            highlights={xmlHighlights}
          />

          <SourceSection
            files={files}
            focusedFileIndex={srcDiffSelection.selectedFileIndex}
            selectedNodeFileIndex={srcDiffSelection.selectedNodeFileIndex}
          />
        </SrcDiffHighlightProvider>
      </div>
    </main>
  );
}
