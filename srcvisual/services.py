from __future__ import annotations

import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

SRC_NS = "http://www.srcML.org/srcML/src"
DIFF_NS = "http://www.srcML.org/srcDiff"
MV_NS = "http://www.srcML.org/srcMove"
POS_NS = "http://www.srcML.org/srcML/position"

POS_START = f"{{{POS_NS}}}start"
POS_END = f"{{{POS_NS}}}end"

SKIPPED_TREE_TAGS = {f"{{{DIFF_NS}}}ws"}
NAMESPACE_PREFIX = {
    SRC_NS: "src",
    DIFF_NS: "diff",
    MV_NS: "mv",
    POS_NS: "pos",
}


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str


@dataclass(frozen=True)
class SourceSpan:
    start_line: int
    start_col: int
    end_line: int
    end_col: int

    def to_dict(self) -> dict[str, int]:
        return {
            "start_line": self.start_line,
            "start_col": self.start_col,
            "end_line": self.end_line,
            "end_col": self.end_col,
        }


def build_visualization_payload(*, filename: str, payload: bytes) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="srcvisual-") as tmpdir_name:
        tmpdir = Path(tmpdir_name)
        input_path = tmpdir / sanitize_filename(filename)
        input_path.write_bytes(payload)

        revision_zero_dir = tmpdir / "revision_0"
        revision_one_dir = tmpdir / "revision_1"
        revision_zero_dir.mkdir()
        revision_one_dir.mkdir()

        original_files = extract_revision_files(
            input_path=input_path,
            revision_zero_dir=revision_zero_dir,
            revision_one_dir=revision_one_dir,
        )
        if not original_files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        positioned_path = tmpdir / "positioned.srcdiff.xml"
        annotated_path = tmpdir / "annotated.srcdiff.xml"

        run_command(["srcdiff", "--position", str(revision_zero_dir), str(revision_one_dir), "-o", str(positioned_path)])
        run_command(["srcMove", str(positioned_path), str(annotated_path)])

        annotated_srcdiff_xml = annotated_path.read_text(encoding="utf-8")
        tree_by_filename, has_position_data = build_tree_index(annotated_srcdiff_xml)

        files: list[dict[str, object]] = []
        for file_info in original_files:
            tree = tree_by_filename.get(file_info["filename"])
            files.append(
                {
                    **file_info,
                    "tree": tree,
                }
            )

        return {
            "source_filename": filename,
            "annotated_srcdiff_xml": annotated_srcdiff_xml,
            "units": str(len(files)),
            "has_position_data": has_position_data,
            "files": files,
        }


def extract_revision_files(
    *,
    input_path: Path,
    revision_zero_dir: Path,
    revision_one_dir: Path,
) -> list[dict[str, object]]:
    archive_info = json.loads(run_command(["archive_reader", "--info", str(input_path)]).stdout)
    unit_count = int(archive_info["units"])
    files: list[dict[str, object]] = []

    for unit in range(1, unit_count + 1):
        unit_info = json.loads(run_command(["archive_reader", "--info", f"--unit={unit}", str(input_path)]).stdout)
        filename = unit_info.get("filename", f"unit-{unit}.cpp")
        before_source = run_command(
            ["archive_reader", f"--unit={unit}", "--revision=0", "--output-src", str(input_path)]
        ).stdout
        after_source = run_command(
            ["archive_reader", f"--unit={unit}", "--revision=1", "--output-src", str(input_path)]
        ).stdout

        write_source_file(revision_zero_dir / filename, before_source)
        write_source_file(revision_one_dir / filename, after_source)

        files.append(
            {
                "unit": unit,
                "filename": filename,
                "language": unit_info.get("language"),
                "before_source": before_source,
                "after_source": after_source,
            }
        )

    return files


def build_tree_index(annotated_srcdiff_xml: str) -> tuple[dict[str, dict[str, object]], bool]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]
    index: dict[str, dict[str, object]] = {}
    has_position_data = False

    for unit_number, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename", f"unit-{unit_number}")
        tree = build_tree_node(unit_element, path=f"/src:unit[{unit_number}]", inherited_diff_kind=None, inherited_move_id=None)
        index[filename] = tree
        has_position_data = has_position_data or tree_has_positions(tree)

    return index, has_position_data


def build_tree_node(
    element: ET.Element,
    *,
    path: str,
    inherited_diff_kind: str | None,
    inherited_move_id: str | None,
) -> dict[str, object]:
    tag = prefixed_name(element.tag)
    current_diff_kind = inherited_diff_kind
    if tag == "diff:delete":
        current_diff_kind = "delete"
    elif tag == "diff:insert":
        current_diff_kind = "insert"

    current_move_id = element.attrib.get(f"{{{MV_NS}}}id") or element.attrib.get("move") or inherited_move_id
    current_kind = "move" if current_move_id else current_diff_kind or "plain"

    before_span, after_span = spans_for_element(element, current_diff_kind)
    children: list[dict[str, object]] = []
    tag_counts: dict[str, int] = {}

    for child in list(element):
        if child.tag in SKIPPED_TREE_TAGS:
            continue

        child_name = prefixed_name(child.tag)
        tag_counts[child_name] = tag_counts.get(child_name, 0) + 1
        child_path = f"{path}/{child_name}[{tag_counts[child_name]}]"
        child_node = build_tree_node(
            child,
            path=child_path,
            inherited_diff_kind=current_diff_kind,
            inherited_move_id=current_move_id,
        )
        children.append(child_node)

    if before_span is None:
        before_span = merge_child_spans(children, "before_span")
    if after_span is None:
        after_span = merge_child_spans(children, "after_span")

    return {
        "id": path,
        "path": path,
        "tag": tag,
        "label": build_node_label(tag, element),
        "kind": current_kind,
        "move_id": current_move_id,
        "before_span": before_span.to_dict() if before_span else None,
        "after_span": after_span.to_dict() if after_span else None,
        "children": children,
    }


def spans_for_element(element: ET.Element, diff_kind: str | None) -> tuple[SourceSpan | None, SourceSpan | None]:
    span = parse_span(element)
    if span is None:
        return None, None

    if diff_kind == "delete":
        return span, None
    if diff_kind == "insert":
        return None, span
    return span, span


def parse_span(element: ET.Element) -> SourceSpan | None:
    start = element.attrib.get(POS_START)
    end = element.attrib.get(POS_END)
    if not start or not end:
        return None

    try:
        start_line, start_col = parse_position_point(start)
        end_line, end_col = parse_position_point(end)
    except ValueError:
        return None

    return SourceSpan(start_line=start_line, start_col=start_col, end_line=end_line, end_col=end_col)


def parse_position_point(value: str) -> tuple[int, int]:
    line_text, col_text = value.split(":", 1)
    return int(line_text), int(col_text)


def merge_child_spans(children: list[dict[str, object]], key: str) -> SourceSpan | None:
    spans: list[SourceSpan] = []
    for child in children:
        span_dict = child.get(key)
        if not span_dict:
            continue
        spans.append(
            SourceSpan(
                start_line=int(span_dict["start_line"]),
                start_col=int(span_dict["start_col"]),
                end_line=int(span_dict["end_line"]),
                end_col=int(span_dict["end_col"]),
            )
        )

    if not spans:
        return None

    start = min(spans, key=lambda span: (span.start_line, span.start_col))
    end = max(spans, key=lambda span: (span.end_line, span.end_col))
    return SourceSpan(
        start_line=start.start_line,
        start_col=start.start_col,
        end_line=end.end_line,
        end_col=end.end_col,
    )


def build_node_label(tag: str, element: ET.Element) -> str:
    if tag == "unit" and element.attrib.get("filename"):
        return f"unit: {element.attrib['filename']}"

    preview = build_text_preview(element)
    if preview:
        return f"{tag}: {preview}"
    return tag


def build_text_preview(element: ET.Element) -> str | None:
    if list(element):
        return None

    text = " ".join("".join(element.itertext()).split())
    if not text:
        return None
    if len(text) > 48:
        return f"{text[:45]}..."
    return text


def prefixed_name(tag: str) -> str:
    if not tag.startswith("{"):
        return tag

    namespace, local_name = tag[1:].split("}", 1)
    prefix = NAMESPACE_PREFIX.get(namespace)
    if prefix:
        return f"{prefix}:{local_name}" if prefix != "src" else local_name
    return local_name


def tree_has_positions(node: dict[str, object]) -> bool:
    if node.get("before_span") or node.get("after_span"):
        return True
    return any(tree_has_positions(child) for child in node.get("children", []))


def write_source_file(path: Path, contents: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def run_command(argv: list[str]) -> CommandResult:
    completed = subprocess.run(argv, check=True, capture_output=True, text=True)
    return CommandResult(stdout=completed.stdout, stderr=completed.stderr)


def sanitize_filename(filename: str) -> str:
    candidate = Path(filename).name
    if candidate:
        return candidate
    return "uploaded.srcdiff.xml"
