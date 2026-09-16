"""Heading detection -> Document > Page > Section > Paragraph/Table hierarchy."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .base import Block, DocumentPage, ParsedDocument

_NUMBERED = re.compile(r"^\s*(\d+(\.\d+){0,3})[.)]?\s+(\S.{0,90})$")
_ALLCAPS = re.compile(r"^[A-Z0-9][A-Z0-9 \-/&,'()]{3,70}$")


def heading_level(line: str) -> int:
    """0 = not a heading, otherwise 1..4."""
    s = line.strip()
    if not s or len(s) > 110 or s.endswith((".", ";", ",")):
        return 0
    m = _NUMBERED.match(s)
    if m:
        return min(4, m.group(1).count(".") + 1)
    if _ALLCAPS.match(s):
        return 1
    if s.startswith("#"):
        return min(4, len(s) - len(s.lstrip("#")))
    if len(s.split()) <= 9 and s[0].isupper() and not s.endswith(":"):
        return 2
    return 0


@dataclass
class Section:
    title: str
    parent: str
    page: int
    level: int
    blocks: list[Block] = field(default_factory=list)


def _blocks_for_page(page: DocumentPage) -> list[Block]:
    if page.blocks:
        return page.blocks
    out: list[Block] = []
    for para in [p.strip() for p in page.text.split("\n\n") if p.strip()]:
        lvl = heading_level(para) if "\n" not in para else 0
        out.append(Block(text=para, block_type="heading" if lvl else "paragraph", level=lvl))
    return out


def build_sections(doc: ParsedDocument) -> list[Section]:
    sections: list[Section] = []
    stack: list[tuple[int, str]] = []  # (level, title)
    current: Section | None = None

    for page in doc.pages:
        for block in _blocks_for_page(page):
            lvl = block.level if block.block_type == "heading" else 0
            if lvl:
                title = block.text.strip().lstrip("#").strip()
                while stack and stack[-1][0] >= lvl:
                    stack.pop()
                parent = stack[-1][1] if stack else doc.name
                stack.append((lvl, title))
                current = Section(title=title, parent=parent, page=page.page_number, level=lvl)
                sections.append(current)
                continue
            if current is None:
                current = Section(title="Introduction", parent=doc.name, page=page.page_number, level=1)
                sections.append(current)
            current.blocks.append(block)
    return [s for s in sections if s.blocks]
