from __future__ import annotations

SRC_NS = "http://www.srcML.org/srcML/src"
DIFF_NS = "http://www.srcML.org/srcDiff"
MV_NS = "http://www.srcML.org/srcMove"
POS_NS = "http://www.srcML.org/srcML/position"

POS_START = f"{{{POS_NS}}}start"
POS_END = f"{{{POS_NS}}}end"
POS_TABS = f"{{{POS_NS}}}tabs"

SKIPPED_TREE_TAGS = {f"{{{DIFF_NS}}}ws"}

NAMESPACE_PREFIX = {
    SRC_NS: "src",
    DIFF_NS: "diff",
    MV_NS: "mv",
    POS_NS: "pos",
}


def prefixed_name(tag: str) -> str:
    if not tag.startswith("{"):
        return tag

    namespace, local_name = tag[1:].split("}", 1)
    prefix = NAMESPACE_PREFIX.get(namespace)

    if prefix:
        return f"{prefix}:{local_name}" if prefix != "src" else local_name

    return local_name


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
