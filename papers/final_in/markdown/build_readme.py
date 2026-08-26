#!/usr/bin/env python3
"""Build a GitHub-flavored Markdown rendering of ../main.tex.

Output is an index (README.md) plus one page per top-level section in
sections/. It is split rather than a single file because of a hard limit in
GitHub's math renderer -- see "GitHub's math budget" below.

Pipeline:
  1. Derive every label's number by simulating LaTeX's counters over
     main.tex, so equations, theorems, figures and sections carry the same
     numbers as the PDF without needing a main.aux (which is a build
     artifact and is gitignored). main.aux is used when present, as a
     cross-check.
  2. Preprocess the LaTeX: resolve \\cite{...} to [n], give unlabelled
     numbered equations a synthetic label, unwrap environments pandoc does
     not know, and turn thebibliography into a References section.
  3. Run pandoc -> gfm with readme-filter.lua (display math lifted out of
     paragraphs, anchors, figures, one-symbol math to text).
  4. Post-process: equation numbers, cross-reference links, theorem and
     section numbering to match the PDF, collapsible Lean appendices.
  5. Split into per-section pages, rewrite every cross-reference to point at
     the page that holds its target, and distribute the footnotes.
  6. Copy the referenced figure PNGs into figures/.

Rerunnable: regenerates everything from main.tex alone.

GitHub's math budget
--------------------
GitHub renders ```math with MathJax, but its math-renderer element applies
its own limits first (from GitHub's chunk-lazy-element-math-renderer
bundle, reduced):

    renderMath() {
      let t = this.textContent.split("{").length;   // "{" count, plus one
      if (E.update(runId, t), E.total() > 2e3 || t > 1e3) return fail();
      let e = bannedMacrosIn(this.textContent);
      if (e.length) return fail(`The following macros are not allowed: ${e}`);
      ...
    }

So every expression on a page costs 1 + the number of "{" it contains, the
costs accumulate across the whole page, and once the running total passes
2000 every later expression renders as "Unable to render expression".

This paper costs about 7900, so no single page can carry it: the display
equations alone cost more than 2000. Split by section the worst page is
around 1200, and everything renders. build checks this and fails if any
page goes over.

Three further consequences, all handled in sanitize_math below:

  * BANNED_MACROS are rejected outright by a substring test on the raw
    expression. This paper used \\operatorname, \\phantom and \\hphantom.
  * GitHub removes MathJax's newcommand, bbox, html, require, action and
    colortbl packages, so \\newcommand/\\def cannot appear in output math.
    (Pandoc expands the paper's own \\newcommand definitions on read, so
    this only matters for anything that slips through.)
  * \\footnotesize and \\multicolumn are not in the package set at all;
    one occurrence fails the whole expression.

Separately, \\tag{n} makes MathJax emit <mjx-container width="full"> with
an <svg width="100%"> whose real size is only a min-width on the container.
GitHub's CSS leaves that container inline, min-width does not apply to
inline boxes, and the SVG collapses -- the equation renders one atom per
line in a tall thin column. Equation numbers are appended as
\\qquad\\text{(n)} inside the math instead.
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

MD_DIR = Path(__file__).resolve().parent
ROOT = MD_DIR.parent  # .../final_in
FIG_SRC = ROOT / "figures"
FIG_DST = MD_DIR / "figures"
SEC_DIR = MD_DIR / "sections"

# Render one-symbol inline math (T, \zeta, d_1, ...) as markdown text instead
# of as a GitHub math span. Set to False to keep every symbol in math mode.
SIMPLIFY_INLINE_MATH = True

# GitHub's per-page ceiling on (expressions + "{" characters).
MATH_BUDGET = 2000
MATH_BUDGET_PER_EXPR = 1000

# Rejected by GitHub with "The following macros are not allowed: ...".
BANNED_MACROS = [
    "DeclareMathOperator", "DeclarePairedDelimiters", "renewtagform",
    "newtagform", "colorbox", "fcolorbox", "hphantom", "vphantom",
    "phantom", "operatorname", "Newextarrow", "definecolor", "mathchoice",
    "unicode", "mmlToken",
]
# Unavailable because GitHub removes the packages that define them.
UNAVAILABLE_MACROS = [
    "newcommand", "renewcommand", "def", "let", "newenvironment",
    "bbox", "href", "require", "toggle", "columncolor",
]

THEOREM_CLASSES = (
    "theorem proposition conjecture lemma corollary definition remark".split()
)


def anchor_of(label: str) -> str:
    return re.sub(r"[:.]", "-", label)


def braced_arg(s: str, i: int) -> tuple[str, int]:
    """Read the balanced {...} starting at or after i; return (body, end)."""
    while i < len(s) and s[i] != "{":
        i += 1
    if i >= len(s):
        return "", i
    depth, start = 0, i
    while i < len(s):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start + 1: i], i + 1
        i += 1
    return s[start + 1:], len(s)


def unwrap_macro(s: str, name: str, nargs: int) -> str:
    """\\name{..}..{body} -> body, keeping only the last argument."""
    token = "\\" + name
    out: list[str] = []
    i = 0
    while True:
        j = s.find(token, i)
        if j < 0:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:j])
        k = j + len(token)
        body = ""
        for _ in range(nargs):
            body, k = braced_arg(s, k)
        out.append(body)
        i = k


# ---------------------------------------------------------------------------
# 1. numbering: simulate LaTeX's counters over main.tex
# ---------------------------------------------------------------------------
#
# The preamble fixes the scheme:
#     \newtheorem{theorem}{Theorem}[section]  -> theorem counter per section
#     every other theorem class shares the theorem counter
#     equations and figures run continuously (no \numberwithin)
#     \appendix switches sections to A, B, ...

ROW_NUMBERED = {"align", "gather", "eqnarray", "alignat", "flalign", "xalignat"}
SINGLE_NUMBERED = {"equation", "multline"}

EVENT = re.compile(
    r"""(?P<appendix>\\appendix\b)
      | (?P<sec>\\(?P<seclevel>sub)?section(?P<starred>\*)?\s*\{)
      | (?P<beginenv>\\begin\{(?P<envname>[a-z]+\*?)\})
      | (?P<endenv>\\end\{(?P<endname>[a-z]+\*?)\})
      | (?P<rowbreak>\\\\)
      | (?P<label>\\label\{(?P<labelname>[^}]*)\})
      | (?P<notag>\\notag\b|\\nonumber\b)
      | (?P<tag>\\tag\{(?P<tagval>[^}]*)\})
    """,
    re.X,
)


def number_labels(tex: str) -> dict[str, str]:
    """Return {label: number} for every \\label in the document."""
    labels: dict[str, str] = {}
    sec = sub = thm = eq = fig = tab = 0
    appendix = False
    env_stack: list[str] = []
    current: str | None = None
    subeq_parent: str | None = None
    subeq_child = 0

    def section_label() -> str:
        if appendix:
            return chr(ord("A") + sec - 1) if sec > 0 else "A"
        return str(sec)

    def full_section() -> str:
        return f"{section_label()}.{sub}" if sub else section_label()

    def next_eq() -> str:
        nonlocal eq, subeq_child
        if subeq_parent is not None:
            subeq_child += 1
            return f"{subeq_parent}{chr(ord('a') + subeq_child - 1)}"
        eq += 1
        return str(eq)

    for m in EVENT.finditer(tex):
        if m.group("appendix"):
            appendix, sec, sub, thm = True, 0, 0, 0
        elif m.group("sec"):
            if m.group("starred"):
                continue
            if m.group("seclevel"):
                sub += 1
                current = full_section()
            else:
                sec, sub, thm = sec + 1, 0, 0
                current = section_label()
        elif m.group("beginenv"):
            env = m.group("envname")
            env_stack.append(env)
            if env == "subequations":
                eq += 1
                subeq_parent, subeq_child = str(eq), 0
                current = subeq_parent
            elif env in THEOREM_CLASSES:
                thm += 1
                current = f"{section_label()}.{thm}"
            elif env == "figure":
                fig += 1
                current = str(fig)
            elif env == "table":
                tab += 1
                current = str(tab)
            elif env in SINGLE_NUMBERED or env in ROW_NUMBERED:
                current = next_eq()
        elif m.group("endenv"):
            if env_stack and env_stack.pop() == "subequations":
                subeq_parent, subeq_child = None, 0
        elif m.group("rowbreak"):
            if env_stack and env_stack[-1] in ROW_NUMBERED:
                current = next_eq()
        elif m.group("notag"):
            if env_stack and env_stack[-1] in (ROW_NUMBERED | SINGLE_NUMBERED):
                if subeq_parent is not None:
                    subeq_child -= 1
                else:
                    eq -= 1
                current = None
        elif m.group("tag"):
            current = m.group("tagval")
        elif m.group("label"):
            if current is not None:
                labels[m.group("labelname")] = current

    return labels


def ordered_headings(tex: str) -> list[tuple[int, str | None]]:
    """(level, number) for each sectioning command, in document order."""
    out: list[tuple[int, str | None]] = []
    sec = sub = 0
    appendix = False
    for m in re.finditer(
        r"\\appendix\b|\\(?P<lvl>sub)?section(?P<star>\*)?\s*\{", tex
    ):
        if m.group(0).startswith("\\appendix"):
            appendix, sec, sub = True, 0, 0
            continue
        level = 2 if m.group("lvl") else 1
        if m.group("star"):
            out.append((level, None))
            continue
        if level == 2:
            sub += 1
            num = f"{sec}.{sub}" if not appendix else f"{chr(64 + sec)}.{sub}"
        else:
            sec, sub = sec + 1, 0
            num = str(sec) if not appendix else chr(64 + sec)
        out.append((level, num))
    return out


tex_raw = (ROOT / "main.tex").read_text(encoding="utf-8")

# main.aux, when a LaTeX run has produced one, is the authority; the
# simulation above should agree with it exactly.
aux_path = ROOT / "main.aux"
aux_labels: dict[str, str] = {}
if aux_path.exists():
    aux_labels = dict(
        re.findall(r"\\newlabel\{([^}]+)\}\{\{([^}]*)\}", aux_path.read_text())
    )

CITES: dict[str, str] = {
    k: str(i + 1)
    for i, k in enumerate(re.findall(r"\\bibitem\{([^}]+)\}", tex_raw))
}
if aux_path.exists():
    CITES.update(
        dict(re.findall(r"\\bibcite\{([^}]+)\}\{([^}]+)\}", aux_path.read_text()))
    )

# ---------------------------------------------------------------------------
# 2. LaTeX preprocessing
# ---------------------------------------------------------------------------

tex = tex_raw


def cite_repl(m: re.Match) -> str:
    opt, keys = m.group(1), m.group(2)
    nums = ", ".join(CITES.get(k.strip(), "?") for k in keys.split(","))
    if opt:
        o = opt[1:-1].replace(r"\S", "§").replace("~", " ")
        return f"[{nums}, {o}]"
    return f"[{nums}]"


tex = re.sub(r"\\cite(\[[^\]]*\])?\{([^}]*)\}", cite_repl, tex)

# \resizebox{w}{h}{<tabular>} hides the table from pandoc, which then loses
# the \label and leaves #tab-... cross-references with no target.
tex = unwrap_macro(tex, "resizebox", 3)

# Numbered equations with no \label of their own still carry a number in the
# PDF. Give them a synthetic one so the number survives into the README.
_autoeq = 0


def label_bare_equation(m: re.Match) -> str:
    global _autoeq
    body = m.group(2)
    if re.search(r"\\label\{", body):
        return m.group(0)
    _autoeq += 1
    return f"{m.group(1)}\\label{{autoeq:{_autoeq}}}{body}{m.group(3)}"


tex = re.sub(
    r"(\\begin\{equation\})(.*?)(\\end\{equation\})",
    label_bare_equation,
    tex,
    flags=re.S,
)

LABELS = number_labels(tex)

# report any disagreement with a real LaTeX run
aux_mismatch = [
    f"{k}: aux={v} sim={LABELS.get(k)}"
    for k, v in aux_labels.items()
    if k in LABELS and LABELS[k] != v
]
if aux_labels:
    LABELS.update(aux_labels)

HEADING_NUMBERS = ordered_headings(tex)


def unwrap_subequations(m: re.Match) -> str:
    """Drop the \\begin{subequations} wrapper, keeping the equations inside.

    Pandoc does not know the environment, so it runs the equations it wraps
    together into a single display -- (93a) and (93b) come out as one block
    carrying one number. The numbers were already taken from the counters
    above, so the wrapper can go; its own label rides along on the first
    equation to keep #eq-... links working.
    """
    parent, body = m.group("plabel"), m.group("body")
    if parent:
        body = re.sub(
            r"\\begin\{equation\*?\}",
            lambda e: e.group(0) + f"\\label{{{parent}}}",
            body,
            count=1,
        )
    return body


tex = re.sub(
    r"\\begin\{subequations\}(?:\\label\{(?P<plabel>[^}]*)\})?"
    r"(?P<body>.*?)\\end\{subequations\}",
    unwrap_subequations,
    tex,
    flags=re.S,
)

tex = re.sub(
    r"\\begin\{thebibliography\}\{[^}]*\}",
    "\\\\section*{References}\n\\\\begin{enumerate}",
    tex,
)
tex = re.sub(r"\\bibitem\{[^}]+\}", r"\\item", tex)
tex = tex.replace("\\end{thebibliography}", "\\end{enumerate}")
HEADING_NUMBERS.append((1, None))  # the References section just injected

pre_tex = MD_DIR / "_main_pre.tex"
pre_tex.write_text(tex, encoding="utf-8", newline="\n")

# ---------------------------------------------------------------------------
# 3. pandoc
# ---------------------------------------------------------------------------

raw_md = MD_DIR / "_README_raw.md"
subprocess.run(
    [
        "pandoc", str(pre_tex),
        "-f", "latex",
        "-t", "gfm+tex_math_dollars",
        "--default-image-extension=png",
        "--wrap=none",
        "--shift-heading-level-by=1",  # paper title keeps "#" to itself
        "-M", f"simplify-inline-math={str(SIMPLIFY_INLINE_MATH).lower()}",
        "-s",
        "--lua-filter", str(MD_DIR / "readme-filter.lua"),
        "-o", str(raw_md),
    ],
    check=True,
    stderr=subprocess.DEVNULL,
)
md = raw_md.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# 4a. YAML front matter -> markdown title block
# ---------------------------------------------------------------------------

inline_spans = len(re.findall(r"\$`", md))

m = re.match(r"---\n(.*?)\n---\n", md, re.S)
yaml, body = m.group(1), md[m.end():]


def yaml_block(key: str) -> str:
    """Extract an indented block scalar such as `abstract: |`.

    The block may contain blank lines -- the abstract has display equations
    in it, which the filter lifts into blocks of their own -- so the run of
    indented lines cannot simply stop at the first empty one. The last line
    of the last key has no trailing newline, hence the (?:\n|$).
    """
    bm = re.search(rf"^{key}: \|\n((?:[ ]{{2}}.*(?:\n|$)|\n)*)", yaml, re.M)
    if not bm:
        return ""
    return "\n".join(
        line[2:] if line.startswith("  ") else line
        for line in bm.group(1).splitlines()
    ).strip()


title = re.sub(r"\*\*|\\$", "", yaml_block("title"), flags=re.M)
title = " ".join(title.split())
abstract = yaml_block("abstract")

# ---------------------------------------------------------------------------
# 4b. math: strip \label, sanitize for MathJax, append the equation number
# ---------------------------------------------------------------------------

SIZE_CMDS = re.compile(
    r"\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b\s*"
)


def strip_at_specs(tex_math: str) -> str:
    """Remove @{...} column specs, which MathJax's array does not support."""
    out = []
    i = 0
    while i < len(tex_math):
        if tex_math.startswith("@{", i):
            depth = 0
            j = i + 1
            while j < len(tex_math):
                if tex_math[j] == "{":
                    depth += 1
                elif tex_math[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            i = j + 1
            continue
        out.append(tex_math[i])
        i += 1
    return "".join(out)


def pop_tag(tex_math: str) -> tuple[str, str | None]:
    """Remove a \\tag{...} and return its value.

    The paper uses \\tag{\\ref{eq:...}} to repeat an earlier equation under
    its original number, so the argument needs balanced-brace parsing and
    the \\ref has to be resolved.
    """
    i = tex_math.find("\\tag")
    if i < 0:
        return tex_math, None
    body, end = braced_arg(tex_math, i + len("\\tag"))
    rest = tex_math[:i] + tex_math[end:]
    rm = re.search(r"\\(?:eq)?ref\{([^}]+)\}", body)
    if rm:
        return rest, LABELS.get(rm.group(1))
    body = body.strip()
    return rest, body or None


def strip_multicolumn(tex_math: str) -> str:
    """\\multicolumn{n}{spec}{body} -> body (MathJax has no \\multicolumn)."""
    while True:
        i = tex_math.find("\\multicolumn")
        if i < 0:
            return tex_math
        j = i + len("\\multicolumn")
        args = []
        for _ in range(3):
            while j < len(tex_math) and tex_math[j] != "{":
                j += 1
            if j >= len(tex_math):
                return tex_math
            depth, start = 0, j
            while j < len(tex_math):
                if tex_math[j] == "{":
                    depth += 1
                elif tex_math[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            args.append(tex_math[start + 1: j])
            j += 1
        tex_math = tex_math[:i] + (args[2] if len(args) == 3 else "") + tex_math[j:]


def strip_macro_with_arg(tex_math: str, name: str) -> str:
    """Remove \\name{...} entirely, argument included."""
    token = "\\" + name
    while True:
        i = tex_math.find(token)
        if i < 0:
            return tex_math
        _, end = braced_arg(tex_math, i + len(token))
        tex_math = tex_math[:i] + tex_math[end:]


def fix_text_dollars(tex_math: str) -> str:
    r"""\text{a $x$ b} -> \text{a }x\text{ b}.

    GitHub wraps a ```math block's content in $$...$$ and escapes every inner
    "$" to "\$" so it cannot break out. That turns nested math inside \text{}
    into a literal dollar sign and leaves the symbols in text mode, which
    MathJax rejects with "\theta is only supported in math mode".
    """
    out: list[str] = []
    i = 0
    while True:
        j = tex_math.find("\\text{", i)
        if j < 0:
            out.append(tex_math[i:])
            return "".join(out)
        out.append(tex_math[i:j])
        body, end = braced_arg(tex_math, j + len("\\text"))
        if "$" in body:
            parts = re.split(r"\$([^$]*)\$", body)
            # parts alternate text, math, text, math, ...
            out.append("".join(
                (part if k % 2 else f"\\text{{{part}}}")
                for k, part in enumerate(parts) if part
            ))
        else:
            out.append(f"\\text{{{body}}}")
        i = end


def shrink_braces(tex_math: str) -> str:
    """_{x} -> _x and ^{x} -> ^x for single-token groups.

    Braces are what GitHub's budget counts, and a one-character group needs
    none. Purely cosmetic to TeX, worth a few hundred off the page cost.
    """
    return re.sub(r"([_^])\{([A-Za-z0-9])\}", r"\1\2", tex_math)


def sanitize_math(tex_math: str) -> str:
    tex_math = SIZE_CMDS.sub("", tex_math)
    tex_math = strip_multicolumn(tex_math)
    tex_math = strip_at_specs(tex_math)
    tex_math = re.sub(r"%\n\s*", " ", tex_math)   # TeX line-continuation comments

    # \operatorname{Re} -> \mathrm{Re}: same output, and \operatorname is on
    # GitHub's banned list.
    tex_math = re.sub(r"\\operatorname\*?(?=\s*\{)", r"\\mathrm", tex_math)
    # The phantoms only pad alignment inside matrices; dropping them costs a
    # little spacing and nothing else.
    for name in ("hphantom", "vphantom", "phantom"):
        tex_math = strip_macro_with_arg(tex_math, name)

    tex_math = fix_text_dollars(tex_math)
    tex_math = shrink_braces(tex_math)
    return tex_math.strip("\n")


unnumbered_eq = 0


def fix_math_block(m: re.Match) -> str:
    global unnumbered_eq
    indent, inner = m.group(1), m.group(2)
    inner = re.sub(r"\\begin\{equation\*?\}\n?", "", inner)
    inner = re.sub(r"\\end\{equation\*?\}\n?", "", inner)

    labels_here = re.findall(r"\\label\{([^}]+)\}", inner)
    inner = re.sub(r"\\label\{[^}]+\}\n?", "", inner)
    inner, tag_number = pop_tag(inner)
    inner = sanitize_math(inner)

    # The most specific number wins: inside \begin{subequations} the child
    # label (93a) comes after the parent (93).
    number = tag_number
    for lab in labels_here:
        if lab in LABELS:
            number = LABELS[lab]
    if number:
        inner = f"{inner}\\qquad\\text{{({number})}}"
    else:
        unnumbered_eq += 1

    prefix = "".join(
        f'{indent}<a id="{anchor_of(lab)}"></a>\n\n'
        for lab in labels_here
        if lab in LABELS
    )
    lines = inner.split("\n")
    inner = "\n".join(indent + ln if ln else ln for ln in lines)
    return f"{prefix}{indent}```math\n{inner}\n{indent}```"


body = re.sub(
    r"^([ ]*)``` ?math\n(.*?)\n[ ]*```",
    fix_math_block,
    body,
    flags=re.S | re.M,
)


def outside_fences(text: str, fn) -> str:
    """Apply fn to the parts of text that are not inside a fenced block."""
    parts = re.split(r"(^```.*?^```$)", text, flags=re.S | re.M)
    for i in range(0, len(parts), 2):
        parts[i] = fn(parts[i])
    return "".join(parts)


# Inline spans need the same treatment: \operatorname is mostly inline.
body = outside_fences(
    body,
    lambda t: re.sub(
        r"\$`([^`]*)`\$", lambda m: "$`" + sanitize_math(m.group(1)) + "`$", t
    ),
)

# ---------------------------------------------------------------------------
# 4c. cross references
# ---------------------------------------------------------------------------

REF_RE = re.compile(
    r'<a href="#([^"]+)" data-reference-type="[^"]*" data-reference="[^"]*">([^<]*)</a>'
)


def ref_repl(m: re.Match) -> str:
    label, text = m.group(1), m.group(2)
    a = anchor_of(label)
    num = LABELS.get(label)
    kind = label.split(":", 1)[0]
    if kind == "eq":
        return f"[({num})](#{a})" if num else text
    if num:
        return f"[{num}](#{a})"
    return f"[{text}](#{a})"


body = REF_RE.sub(ref_repl, body)

# ---------------------------------------------------------------------------
# 4d. theorem-class divs: strip wrappers, renumber to the PDF scheme
# ---------------------------------------------------------------------------

lines = body.splitlines()
out: list[str] = []
pending_label: str | None = None
last_anchor: str | None = None

DIV_OPEN = re.compile(r'^<div(?: id="([^"]+)")? class="([a-z]+)">$')
BOLD_NUM = re.compile(
    r"\*\*(Theorem|Proposition|Conjecture|Lemma|Corollary|Definition|Remark)\s+"
    r"([\d.]+)\*\*"
)
ANCHOR_RE = re.compile(r'^<a id="([^"]+)"></a>$')

for line in lines:
    am = ANCHOR_RE.match(line)
    if am:
        last_anchor = am.group(1)
    dm = DIV_OPEN.match(line)
    if dm and (dm.group(2) in THEOREM_CLASSES or dm.group(2) in ("proof", "center")):
        if dm.group(2) in THEOREM_CLASSES:
            pending_label = dm.group(1)
        continue  # drop wrapper line
    if line == "</div>":
        continue
    bm = BOLD_NUM.search(line)
    if bm:
        label = pending_label
        if label is None and last_anchor:
            # the anchor the filter emitted carries the same id, ":" -> "-"
            label = next(
                (l for l in LABELS if anchor_of(l) == last_anchor), None
            )
        num = LABELS.get(label) if label else None
        if num:
            line = BOLD_NUM.sub(
                lambda b: f"**{b.group(1)} {num}**", line, count=1
            )
        pending_label = None
    out.append(line)

body = "\n".join(out)

# ---------------------------------------------------------------------------
# 4e. section numbers on headings, matching the PDF
# ---------------------------------------------------------------------------

heading_iter = iter(HEADING_NUMBERS)


def number_heading(m: re.Match) -> str:
    hashes, text = m.group(1), m.group(2)
    try:
        level, num = next(heading_iter)
    except StopIteration:
        return m.group(0)
    if num and len(hashes) - 1 != level:
        # pandoc and the tex walk disagreed; keep the heading unnumbered
        # rather than printing a wrong number
        return m.group(0)
    return f"{hashes} {num} {text}" if num else m.group(0)


body = re.sub(r"^(#{2,3}) (.+)$", number_heading, body, flags=re.M)

# ---------------------------------------------------------------------------
# 4f. leftover inline <img> tags (non-figure includegraphics)
# ---------------------------------------------------------------------------


def img_repl(m: re.Match) -> str:
    src = m.group(1)
    if "/" not in src:
        src = "figures/" + src
    pct = re.search(r"width:([\d.]+)%", m.group(0))
    width = f' width="{round(float(pct.group(1)) * 9.5)}"' if pct else ""
    return f'<img src="{src}"{width}>'


body = re.sub(r'<img src="([^"]+)"[^>]*/?>', img_repl, body)

# ---------------------------------------------------------------------------
# 4h. collapsible Lean appendices
# ---------------------------------------------------------------------------


def collapse_appendices(text: str) -> str:
    lines = text.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        if re.match(r"^## (?:[A-Z] )?Lean formalization", line):
            out.append("")
            out.append("<details>")
            out.append("<summary><b>Click to expand the Lean appendix</b></summary>")
            out.append("")
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if re.match(r"^## ", nxt) or re.match(r"^\[\^\d+\]:", nxt):
                    break
                out.append(nxt)
                i += 1
            out.append("</details>")
            out.append("")
            continue
        i += 1
    return "\n".join(out)


body = collapse_appendices(body)

# ---------------------------------------------------------------------------
# 4i. table of contents
# ---------------------------------------------------------------------------

TOC_TEX = [
    (r"\\tfrac12", "1/2"), (r"\\tfrac15", "1/5"), (r"\\tfrac45", "4/5"),
    (r"\\tfrac\{?(\d)\}?\{?(\d)\}?", r"\1/\2"),
    (r"\\sigma", "σ"), (r"\\Sigma", "Σ"), (r"\\zeta", "ζ"),
    (r"\\vartheta", "ϑ"), (r"\\chi", "χ"), (r"\\neq", "≠"),
    (r"\\approx", "≈"), (r"\\to\b", "→"), (r"\\infty", "∞"),
    (r"\\mathrm\{([^}]*)\}", r"\1"),
    (r"\\left|\\right|\\!", ""),
    (r"_\{([^}]*)\}", r"\1"), (r"_(\w)", r"\1"),
    (r"\\\{", "{"), (r"\\\}", "}"),
    (r"\\[,;:> ]", ""),      # thin spaces
    (r"[{}]", ""),           # grouping braces have no meaning in the TOC
]


def clean_toc_text(text: str) -> str:
    s = re.sub(r"\$`([^`]*)`\$", r"\1", text)
    for pat, rep in TOC_TEX:
        s = re.sub(pat, rep, s)
    s = s.replace("*", "").strip()
    if "\\" in s:
        print(f"TOC: unconverted LaTeX in heading: {s}", file=sys.stderr)
    return s


# ---------------------------------------------------------------------------
# 5a. footnotes: lift the definitions out of the body
# ---------------------------------------------------------------------------

FOOTNOTE_DEF = re.compile(r"^\[\^(\d+)\]: (.*(?:\n(?![\[#]).*)*)", re.M)
footnotes = {m.group(1): m.group(0).rstrip() for m in FOOTNOTE_DEF.finditer(body)}
body = FOOTNOTE_DEF.sub("", body).rstrip() + "\n"

# ---------------------------------------------------------------------------
# 5b. split into one page per top-level section
# ---------------------------------------------------------------------------


GREEK_SLUG = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
    "ζ": "zeta", "η": "eta", "θ": "theta", "ϑ": "theta", "κ": "kappa",
    "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi", "π": "pi", "ρ": "rho",
    "σ": "sigma", "τ": "tau", "φ": "phi", "χ": "chi", "ψ": "psi",
    "ω": "omega", "Σ": "sigma", "Φ": "phi", "Ψ": "psi", "Ω": "omega",
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
}


def slugify(number: str | None, text: str) -> str:
    s = clean_toc_text(text).lower()
    s = "".join(GREEK_SLUG.get(c, c) for c in s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:48].rstrip("-")
    if number is None:
        return s or "section"
    n = number.zfill(2) if number.isdigit() else number.lower()
    return f"{n}-{s}"


# Split on every "## ", not only the ones carrying an anchor: References and
# Acknowledgments come from \section*{...} and so have no \label.
HEADING_RE = re.compile(r"^## (.+)$", re.M)
ANCHOR_BEFORE = re.compile(r'<a id="([^"]+)"></a>\n\n\Z')

starts = []
for m in HEADING_RE.finditer(body):
    am = ANCHOR_BEFORE.search(body[:m.start()])
    pos = am.start() if am else m.start()
    starts.append((pos, am.group(1) if am else None, m.group(1)))
if not starts:
    sys.exit("no '## ' sections found; nothing to split")

sections: list[dict] = []
for i, (pos, aid, full_title) in enumerate(starts):
    end = starts[i + 1][0] if i + 1 < len(starts) else len(body)
    nm = re.match(r"(\d+|[A-Z]) (.+)$", full_title)
    number = nm.group(1) if nm else None
    heading = nm.group(2) if nm else full_title
    sections.append({
        "anchor": aid,
        "number": number,
        "title": heading,
        "content": body[pos:end].rstrip() + "\n",
        "file": slugify(number, heading) + ".md",
    })

# where does each anchor live?
anchor_home: dict[str, str] = {}
for sec in sections:
    for aid in re.findall(r'<a id="([^"]+)"></a>', sec["content"]):
        anchor_home[aid] = sec["file"]
anchor_home["top"] = "README.md"

missing_targets: set[str] = set()


def link_rewriter(from_file: str):
    """Point every #anchor link at the page that actually holds it."""
    def repl(m: re.Match) -> str:
        text, aid = m.group(1), m.group(2)
        home = anchor_home.get(aid)
        if home is None:
            missing_targets.add(aid)
            return f"[{text}](#{aid})"
        if home == from_file:
            return f"[{text}](#{aid})"
        if from_file == "README.md":
            target = f"sections/{home}"
        elif home == "README.md":
            target = "../README.md"
        else:
            target = home
        return f"[{text}]({target}#{aid})"

    return lambda text: re.sub(r"\[([^\]]*)\]\(#([^)]+)\)", repl, text)


# ---------------------------------------------------------------------------
# 5c. table of contents
# ---------------------------------------------------------------------------

toc_lines = ["## Contents", ""]
for sec in sections:
    label = f"{sec['number']} {clean_toc_text(sec['title'])}".strip() \
        if sec["number"] else clean_toc_text(sec["title"])
    toc_lines.append(f"- [{label}](sections/{sec['file']})")
    for m2 in re.finditer(
        r'^<a id="([^"]+)"></a>\n\n### (.+)$', sec["content"], re.M
    ):
        toc_lines.append(
            f"  - [{clean_toc_text(m2.group(2))}](sections/{sec['file']}#{m2.group(1)})"
        )
toc = "\n".join(toc_lines) + "\n"

# ---------------------------------------------------------------------------
# 5d. write the pages
# ---------------------------------------------------------------------------

BANNER = (
    "*A GitHub-flavored Markdown rendering of the paper. The authoritative\n"
    "version is the LaTeX source and PDF in the parent directory; figures,\n"
    "equation numbers and section numbers all match the PDF.*"
)

SEC_DIR.mkdir(exist_ok=True)
for old in SEC_DIR.glob("*.md"):
    old.unlink()

written: list[tuple[str, int]] = []
for i, sec in enumerate(sections):
    text = sec["content"]

    # Footnotes have to be attached before the links are rewritten -- they
    # carry cross-references of their own.
    used = sorted({n for n in re.findall(r"\[\^(\d+)\]", text)}, key=int)
    if used:
        text = text.rstrip() + "\n\n---\n\n" + "\n\n".join(
            footnotes[n] for n in used if n in footnotes
        ) + "\n"

    text = link_rewriter(sec["file"])(text)
    text = text.replace('src="figures/', 'src="../figures/')

    def nav_label(s: dict) -> str:
        name = clean_toc_text(s["title"])
        if len(name) > 42:
            name = name[:41].rstrip() + "…"
        return f"{s['number']} {name}".strip() if s["number"] else name

    nav = ["[← Contents](../README.md)"]
    if i:
        nav.append(f"[← {nav_label(sections[i-1])}]({sections[i-1]['file']})")
    if i + 1 < len(sections):
        nav.append(f"[{nav_label(sections[i+1])} →]({sections[i+1]['file']})")
    nav_line = " · ".join(nav)

    page = f"{nav_line}\n\n---\n\n{text.rstrip()}\n\n---\n\n{nav_line}\n"
    # Explicit newline: write_text would otherwise emit CRLF on Windows, and
    # the rest of the repository is LF.
    (SEC_DIR / sec["file"]).write_text(page, encoding="utf-8", newline="\n")
    written.append((sec["file"], len(page)))

# The abstract came out of the YAML header, so it has not been through the
# math pipeline that the body has.
abstract = re.sub(
    r"^([ ]*)``` ?math\n(.*?)\n[ ]*```", fix_math_block, abstract, flags=re.S | re.M
)
abstract = outside_fences(
    abstract,
    lambda t: re.sub(
        r"\$`([^`]*)`\$", lambda m: "$`" + sanitize_math(m.group(1)) + "`$", t
    ),
)

readme = (
    f'<a id="top"></a>\n\n'
    f"# {title}\n\n"
    f"**Paul Stahura** — `paul+zeta@stahura.net`\n\n"
    f"{BANNER}\n\n"
    f"## Abstract\n\n"
    f"{link_rewriter('README.md')(abstract)}\n\n"
    f"{toc}\n"
)
(MD_DIR / "README.md").write_text(readme, encoding="utf-8", newline="\n")

# ---------------------------------------------------------------------------
# 6. copy figures
# ---------------------------------------------------------------------------

all_text = readme + "".join(
    (SEC_DIR / f).read_text(encoding="utf-8") for f, _ in written
)

FIG_DST.mkdir(exist_ok=True)
copied = 0
for m3 in re.finditer(r'src="(?:\.\./)?figures/([^"]+)"', all_text):
    name = m3.group(1)
    src = FIG_SRC / name
    if src.exists():
        shutil.copy2(src, FIG_DST / name)
        copied += 1
    else:
        print(f"MISSING FIGURE: {name}", file=sys.stderr)

# ---------------------------------------------------------------------------
# 7. check every page against GitHub's math budget
# ---------------------------------------------------------------------------


def math_cost(text: str) -> tuple[int, int, int]:
    """(expressions, GitHub cost, worst single expression)."""
    exprs = re.findall(r"^[ ]*```math\n(.*?)\n[ ]*```", text, re.S | re.M)
    exprs += re.findall(r"\$`([^`]*)`\$", text)
    costs = [e.count("{") + 1 for e in exprs]
    return len(exprs), sum(costs), max(costs, default=0)


def banned_in(text: str) -> set[str]:
    exprs = re.findall(r"^[ ]*```math\n(.*?)\n[ ]*```", text, re.S | re.M)
    exprs += re.findall(r"\$`([^`]*)`\$", text)
    joined = "\n".join(exprs)
    return {b for b in BANNED_MACROS + UNAVAILABLE_MACROS if "\\" + b in joined}


pre_tex.unlink()
raw_md.unlink()

over_budget: list[str] = []
worst_page = ("", 0)
total_cost = 0
all_banned: set[str] = set()
indented_fences: list[str] = []
dollars_in_math: list[str] = []

for name, _ in [("README.md", 0)] + written:
    path = MD_DIR / name if name == "README.md" else SEC_DIR / name
    text = path.read_text(encoding="utf-8")
    n, cost, worst_expr = math_cost(text)
    total_cost += cost
    if cost > worst_page[1]:
        worst_page = (name, cost)
    if cost > MATH_BUDGET or worst_expr > MATH_BUDGET_PER_EXPR:
        over_budget.append(f"{name}: cost {cost} (worst expression {worst_expr})")
    all_banned |= banned_in(text)

    # An indented ```math fence is silently downgraded to a code block when
    # the surrounding list item also contains inline math.
    for m in re.finditer(r"^[ ]+```math$", text, re.M):
        indented_fences.append(f"{name}:{text[:m.start()].count(chr(10)) + 1}")
    # A "$" inside math becomes "\$" once GitHub wraps the block in $$...$$.
    for m in re.finditer(r"^```math\n(.*?)\n```", text, re.S | re.M):
        if "$" in m.group(1):
            dollars_in_math.append(f"{name}:{text[:m.start()].count(chr(10)) + 1}")
    for m in re.finditer(r"\$`([^`]*)`\$", text):
        if "$" in m.group(1):
            dollars_in_math.append(f"{name}:{text[:m.start()].count(chr(10)) + 1}")

print(f"pages written      : {len(written) + 1}  (README.md + {len(written)} sections)")
print(f"figures copied     : {copied}")
print(f"labels numbered    : {len(LABELS)}")
print(f"inline math spans  : {inline_spans}"
      + ("" if SIMPLIFY_INLINE_MATH else "  (simplification off)"))
print(f"display math blocks without a number: {unnumbered_eq}")
print(f"GitHub math cost   : {total_cost} total, "
      f"worst page {worst_page[0]} at {worst_page[1]} (budget {MATH_BUDGET}/page)")
if missing_targets:
    print(f"UNRESOLVED LINK TARGETS: {len(missing_targets)}", file=sys.stderr)
    for t in sorted(missing_targets)[:10]:
        print(f"   #{t}", file=sys.stderr)
if all_banned:
    print(f"BANNED MACROS STILL PRESENT: {sorted(all_banned)}", file=sys.stderr)
if indented_fences:
    print(f"INDENTED ```math FENCES (GitHub renders these as code): "
          f"{len(indented_fences)}", file=sys.stderr)
    for s in indented_fences[:10]:
        print("   " + s, file=sys.stderr)
if dollars_in_math:
    print(f'LITERAL "$" INSIDE MATH (GitHub escapes it to \\$): '
          f"{len(dollars_in_math)}", file=sys.stderr)
    for s in dollars_in_math[:10]:
        print("   " + s, file=sys.stderr)
if over_budget or indented_fences or dollars_in_math or all_banned:
    print("OVER GITHUB'S MATH BUDGET:" if over_budget else "", file=sys.stderr)
    for s in over_budget:
        print("   " + s, file=sys.stderr)
    sys.exit(1)
if aux_labels:
    print(f"main.aux cross-check: {len(aux_mismatch)} mismatches")
    for s in aux_mismatch[:10]:
        print("  " + s)
else:
    print("main.aux absent; numbering derived from main.tex")
