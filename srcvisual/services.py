from __future__ import annotations

import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from bisect import bisect_right
from dataclasses import dataclass
from pathlib import Path
from xml.parsers import expat

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
        source_code_before = run_command(
            ["archive_reader", f"--unit={unit}", "--revision=0", "--output-src", str(input_path)]
        ).stdout
        source_code_after = run_command(
            ["archive_reader", f"--unit={unit}", "--revision=1", "--output-src", str(input_path)]
        ).stdout

        write_source_file(revision_zero_dir / filename, source_code_before)
        write_source_file(revision_one_dir / filename, source_code_after)

        files.append(
            {
                "unit": unit,
                "filename": filename,
                "language": unit_info.get("language"),
                "source_code_before": source_code_before,
                "source_code_after": source_code_after,
            }
        )

    return files


def build_tree_index(annotated_srcdiff_xml: str) -> tuple[dict[str, dict[str, object]], bool]:
    root = ET.fromstring(annotated_srcdiff_xml)
    unit_elements = [child for child in root if child.tag == f"{{{SRC_NS}}}unit"]
    xml_span_by_path = build_xml_span_index(annotated_srcdiff_xml)
    index: dict[str, dict[str, object]] = {}
    has_position_data = False

    for unit_number, unit_element in enumerate(unit_elements, start=1):
        filename = unit_element.attrib.get("filename", f"unit-{unit_number}")
        tree = build_tree_node(
            unit_element,
            path=f"/src:unit[{unit_number}]",
            inherited_diff_kind=None,
            inherited_move_id=None,
            xml_span_by_path=xml_span_by_path,
        )
        index[filename] = tree
        has_position_data = has_position_data or tree_has_positions(tree)

    return index, has_position_data


def build_tree_node(
    element: ET.Element,
    *,
    path: str,
    inherited_diff_kind: str | None,
    inherited_move_id: str | None,
    xml_span_by_path: dict[str, SourceSpan],
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
            xml_span_by_path=xml_span_by_path,
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
        "xml_span": xml_span_by_path.get(path).to_dict() if path in xml_span_by_path else None,
        "before_span": before_span.to_dict() if before_span else None,
        "after_span": after_span.to_dict() if after_span else None,
        "children": children,
    }


def spans_for_element(element: ET.Element, diff_kind: str | None) -> tuple[SourceSpan | None, SourceSpan | None]:
    spans = parse_position_spans(element)
    if spans is None:
        return None, None

    if diff_kind == "delete":
        return spans[0], None
    if diff_kind == "insert":
        return None, spans[0]

    if len(spans) == 1:
        return spans[0], spans[0]

    return spans[0], spans[1]


def parse_position_spans(element: ET.Element) -> tuple[SourceSpan, ...] | None:
    start = element.attrib.get(POS_START)
    end = element.attrib.get(POS_END)
    if not start or not end:
        return None

    try:
        start_points = parse_position_points(start)
        end_points = parse_position_points(end)
    except ValueError:
        return None

    if len(start_points) != len(end_points):
        return None

    spans = []
    for index in range(len(start_points)):
        start_line, start_col = start_points[index]
        end_line, end_col = end_points[index]
        spans.append(
            SourceSpan(
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
            )
        )

    return tuple(spans)


def parse_position_point(value: str) -> tuple[int, int]:
    line_text, col_text = value.split(":", 1)
    return int(line_text), int(col_text)


def parse_position_points(value: str) -> tuple[tuple[int, int], ...]:
    return tuple(parse_position_point(part) for part in value.split("|"))


def build_xml_span_index(annotated_srcdiff_xml: str) -> dict[str, SourceSpan]:
    xml_bytes = annotated_srcdiff_xml.encode("utf-8")
    line_start_offsets = compute_line_start_offsets(xml_bytes)
    spans: dict[str, SourceSpan] = {}
    skipped_names = skipped_tree_tag_names()

    parser = expat.ParserCreate(namespace_separator="|")
    nested_unit_count = 0

    @dataclass
    class Frame:
        tag: str
        path: str | None
        start_byte: int
        child_counts: dict[str, int]

    stack: list[Frame] = []

    def start_element(name: str, attrs: dict[str, str]) -> None:
        nonlocal nested_unit_count
        del attrs
        tag = prefixed_name_from_expat(name)
        start_byte = parser.CurrentByteIndex

        if not stack:
            path = None
        elif len(stack) == 1 and stack[0].tag == "unit" and tag == "unit":
            nested_unit_count += 1
            path = f"/src:unit[{nested_unit_count}]"
        elif stack[-1].path is not None and tag not in skipped_names:
            parent = stack[-1]
            parent.child_counts[tag] = parent.child_counts.get(tag, 0) + 1
            path = f"{parent.path}/{tag}[{parent.child_counts[tag]}]"
        else:
            path = None

        stack.append(Frame(tag=tag, path=path, start_byte=start_byte, child_counts={}))

    def end_element(name: str) -> None:
        del name
        frame = stack.pop()
        if frame.path is None:
            return

        end_tag_start = parser.CurrentByteIndex
        close_byte = xml_bytes.find(b">", end_tag_start)
        if close_byte == -1:
            return

        start_line, start_col = offset_to_line_col(frame.start_byte, line_start_offsets)
        end_line, end_col = offset_to_line_col(close_byte, line_start_offsets)
        spans[frame.path] = SourceSpan(
            start_line=start_line,
            start_col=start_col,
            end_line=end_line,
            end_col=end_col + 1,
        )

    parser.StartElementHandler = start_element
    parser.EndElementHandler = end_element
    parser.Parse(xml_bytes, True)

    return spans


def compute_line_start_offsets(xml_bytes: bytes) -> list[int]:
    offsets = [0]
    for index, byte in enumerate(xml_bytes):
        if byte == 10:
            offsets.append(index + 1)
    return offsets


def offset_to_line_col(offset: int, line_start_offsets: list[int]) -> tuple[int, int]:
    line_index = bisect_right(line_start_offsets, offset) - 1
    line_start = line_start_offsets[line_index]
    return line_index + 1, offset - line_start + 1


def prefixed_name_from_expat(name: str) -> str:
    if "|" not in name:
        return name

    namespace, local_name = name.split("|", 1)
    prefix = NAMESPACE_PREFIX.get(namespace)
    if prefix:
        return f"{prefix}:{local_name}" if prefix != "src" else local_name
    return local_name


def skipped_tree_tag_names() -> set[str]:
    return {prefixed_name(tag) for tag in SKIPPED_TREE_TAGS}


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
