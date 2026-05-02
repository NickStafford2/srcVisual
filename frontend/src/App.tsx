import { Hero } from "./components/Hero";
import { SourceSection } from "./components/source-view/SourceSection";
import SrcDiffTree from "./components/srcdiff-tree/SrcDiffTree";
import { InputPanel } from "./components/input-panel/InputPanel";
import { useSrcDiffData } from "./srcdiff/useSrcDiffData";
import { useSrcDiffSelection } from "./srcdiff/useSrcDiffSelection";

export default function App() {
  const srcDiffData = useSrcDiffData();
  const srcDiffSelection = useSrcDiffSelection(srcDiffData.data);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(93,135,255,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(104,224,168,0.16),transparent_28%),linear-gradient(180deg,#09111b_0%,#101826_100%)] px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <Hero />

        <InputPanel
          selectedUpload={srcDiffData.selectedUpload}
          xmlInput={srcDiffData.xmlInput}
          isLoading={srcDiffData.isLoading}
          error={srcDiffData.error}
          data={srcDiffData.data}
          selectedFileIndex={srcDiffSelection.selectedFileIndex}
          onUploadChange={srcDiffData.setSelectedUpload}
          onXmlInputChange={srcDiffData.handleXmlInputChange}
          onSubmit={srcDiffData.handleSubmit}
          onSelectFileIndex={srcDiffSelection.setSelectedFileIndex}
        />

        <SrcDiffTree
          root={srcDiffSelection.selectedFile?.tree ?? null}
          selectedNodeId={srcDiffSelection.selectedNodeId}
          onSelectNode={srcDiffSelection.setSelectedNodeId}
        />

        <SourceSection
          filename={srcDiffSelection.selectedFile?.filename ?? null}
          selectedNode={srcDiffSelection.selectedNode}
          xmlSource={
            srcDiffData.data?.annotated_srcdiff_xml ?? srcDiffData.xmlInput
          }
          sourceCodeBefore={
            srcDiffSelection.selectedFile?.source_code_before ?? ""
          }
          sourceCodeAfter={
            srcDiffSelection.selectedFile?.source_code_after ?? ""
          }
        />
      </div>
    </main>
  );
}
