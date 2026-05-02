import { InputPanel } from "./components/input-panel/InputPanel";
import { SourceSection } from "./components/source-view/SourceSection";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { useSrcDiffData } from "./srcdiff/useSrcDiffData";
import { useSrcDiffSelection } from "./srcdiff/useSrcDiffSelection";

export default function App() {
  const srcDiffData = useSrcDiffData();
  const srcDiffSelection = useSrcDiffSelection(srcDiffData.data);

  const files = srcDiffData.data?.files ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(93,135,255,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(104,224,168,0.16),transparent_28%),linear-gradient(180deg,#09111b_0%,#101826_100%)] px-4 pb-8 text-slate-100 md:px-6 md:pb-10">
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

        <SrcDiffTree
          files={files}
          selectedFileIndex={srcDiffSelection.selectedFileIndex}
          selectedNodeId={srcDiffSelection.selectedNodeId}
          highlightedNodeIds={srcDiffSelection.highlightedNodeIds}
          highlightMode={srcDiffSelection.highlightMode}
          onSelectFileIndex={srcDiffSelection.setSelectedFileIndex}
          onSelectNode={srcDiffSelection.setSelectedNodeId}
          onHighlightAllMoves={srcDiffSelection.highlightAllMoves}
          onHighlightAllInserts={srcDiffSelection.highlightAllInserts}
          onHighlightAllDeletes={srcDiffSelection.highlightAllDeletes}
          onClearHighlights={srcDiffSelection.clearHighlights}
        />

        <SourceSection
          files={files}
          focusedFileIndex={srcDiffSelection.selectedFileIndex}
          selectedNode={srcDiffSelection.selectedNode}
          selectedNodeFileIndex={srcDiffSelection.selectedNodeFileIndex}
          selectedSpans={srcDiffSelection.selectedSpans}
          highlightedSpans={srcDiffSelection.highlightedSpans}
          xmlSource={
            srcDiffData.data?.annotated_srcdiff_xml ?? srcDiffData.xmlInput
          }
        />
      </div>
    </main>
  );
}
