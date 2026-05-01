import { Hero } from "./components/Hero";
import { SourceSection } from "./components/source-view/SourceSection";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { useSrcDiffVisualizer } from "./srcdiff/useSrcDiffVisualizer";
import { InputPanel } from "./components/input-panel/InputPanel";

export default function App() {
  const srcDiff = useSrcDiffVisualizer();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(93,135,255,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(104,224,168,0.16),transparent_28%),linear-gradient(180deg,#09111b_0%,#101826_100%)] px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <Hero />

        <InputPanel
          selectedUpload={srcDiff.selectedUpload}
          xmlInput={srcDiff.xmlInput}
          isLoading={srcDiff.isLoading}
          error={srcDiff.error}
          data={srcDiff.data}
          selectedFileIndex={srcDiff.selectedFileIndex}
          onUploadChange={srcDiff.setSelectedUpload}
          onXmlInputChange={srcDiff.handleXmlInputChange}
          onSubmit={srcDiff.handleSubmit}
          onSelectFileIndex={srcDiff.setSelectedFileIndex}
        />

        <SrcDiffTree
          root={srcDiff.selectedFile?.tree ?? null}
          selectedNodeId={srcDiff.selectedNodeId}
          onSelectNode={srcDiff.setSelectedNodeId}
        />

        <SourceSection
          filename={srcDiff.selectedFile?.filename ?? null}
          selectedNode={srcDiff.selectedNode}
          xmlLines={srcDiff.xmlLines}
          beforeLines={srcDiff.beforeLines}
          afterLines={srcDiff.afterLines}
          onSelectNode={srcDiff.setSelectedNodeId}
        />
      </div>
    </main>
  );
}
