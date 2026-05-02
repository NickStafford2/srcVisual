import type { SrcDiffTreeNode } from "../../srcdiff/types";

import { CodePane } from "./CodePane";
import { XmlPane } from "./XmlPane";

type SourceSectionProps = {
  filename: string | null;
  selectedNode: SrcDiffTreeNode | null;
  xmlSource: string;
  sourceCodeBefore: string;
  sourceCodeAfter: string;
};

export function SourceSection({
  filename,
  selectedNode,
  xmlSource,
  sourceCodeBefore: beforeSource,
  sourceCodeAfter: afterSource,
}: SourceSectionProps) {
  const selectedKind = selectedNode?.kind ?? "plain";

  return (
    <section className="rounded-[24px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">
            XML and source
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {selectedNode
              ? `Selected ${selectedNode.xml_label} at XML path ${selectedNode.path}`
              : "Select a tree node to highlight its XML and source spans."}
          </p>

          {selectedNode ? (
            <p className="mt-1 font-mono text-xs text-slate-400">
              xml_span:{" "}
              {selectedNode.xml_span
                ? `${selectedNode.xml_span.start_line}:${selectedNode.xml_span.start_col} → ${selectedNode.xml_span.end_line}:${selectedNode.xml_span.end_col}`
                : "missing"}
            </p>
          ) : null}
        </div>

        {selectedNode?.move_id ? (
          <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200">
            move={selectedNode.move_id}
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        <XmlPane
          title="srcDiff XML"
          subtitle="Annotated XML returned by the backend"
          source={xmlSource}
          span={selectedNode?.xml_span}
          kind={selectedKind}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CodePane
          title="Revision 0"
          subtitle={filename ? `${filename} before` : "Upload a file to begin"}
          source={beforeSource}
          span={selectedNode?.before_span}
          kind={selectedKind}
        />

        <CodePane
          title="Revision 1"
          subtitle={filename ? `${filename} after` : "Upload a file to begin"}
          source={afterSource}
          span={selectedNode?.after_span}
          kind={selectedKind}
        />
      </div>
    </section>
  );
}
