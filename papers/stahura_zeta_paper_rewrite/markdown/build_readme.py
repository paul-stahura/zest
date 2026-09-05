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
ROOT = MD_DIR.parent  # .../stahura_zeta_paper_rewrite
FIG_DST = MD_DIR / "figures"
SEC_DIR = MD_DIR / "sections"

# This rewrite ships only a handful of its own figures; the rest are still
# the ones generated for the earlier draft. Searched in order, first hit wins.
PAPERS = ROOT.parent
FIG_DIRS = [
    ROOT / "figures",
    PAPERS / "my main paper" / "final_in" / "figures",
    PAPERS / "N-star" / "figures",
    PAPERS / "l-functions-dirichlet" / "figures",
]


def find_figure(name: str) -> Path | None:
    for d in FIG_DIRS:
        p = d / name
        if p.exists():
            return p
    return None

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
# \raisebox{drop}{\includegraphics{...}} likewise hides an inline image;
# pandoc drops it and the sentence ends up with an empty "()".
tex = unwrap_macro(tex, "raisebox", 2)

# ---------------------------------------------------------------------------
# coloured text
# ---------------------------------------------------------------------------
#
# Markdown cannot colour prose -- GitHub strips style attributes -- but it
# will colour *math*: \textcolor survives its banned-macro list, and the
# "color" package is not among the ones it disables. So a coloured run is
# moved inside a math span. MathJax rejects the [HTML] colour model and
# accepts [RGB], hence the conversion.

COLOR_NAMES: dict[str, tuple[int, int, int]] = {}
for _m in re.finditer(r"\\definecolor\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}", tex):
    _name, _model, _spec = _m.group(1), _m.group(2).strip(), _m.group(3)
    try:
        if _model.upper() == "RGB":
            COLOR_NAMES[_name] = tuple(int(x) for x in _spec.split(","))  # type: ignore
        elif _model.upper() == "HTML":
            COLOR_NAMES[_name] = tuple(
                int(_spec[i:i + 2], 16) for i in (0, 2, 4)
            )  # type: ignore
        elif _model.lower() == "rgb":
            COLOR_NAMES[_name] = tuple(
                round(float(x) * 255) for x in _spec.split(",")
            )  # type: ignore
    except ValueError:
        pass

uncoloured: list[str] = []


def resolve_color(model: str | None, spec: str) -> tuple[int, int, int] | None:
    spec = spec.strip()
    if model is None:
        return COLOR_NAMES.get(spec)
    model = model.strip().upper()
    try:
        if model == "HTML" and len(spec) == 6:
            return tuple(int(spec[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore
        if model == "RGB":
            return tuple(int(x) for x in spec.split(","))  # type: ignore
        if model == "GRAY":
            v = round(float(spec) * 255)
            return (v, v, v)
    except ValueError:
        return None
    return None


def rewrite_textcolor(s: str) -> str:
    out: list[str] = []
    i = 0
    while True:
        j = s.find("\\textcolor", i)
        if j < 0:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:j])
        k = j + len("\\textcolor")
        model = None
        if k < len(s) and s[k] == "[":
            close = s.find("]", k)
            model, k = s[k + 1:close], close + 1
        spec, k = braced_arg(s, k)
        body, k = braced_arg(s, k)
        rgb = resolve_color(model, spec)
        inner = body.strip()
        bm = re.fullmatch(r"\$(.+)\$", inner, re.S)
        if rgb is None:
            out.append(body)
        elif bm:
            out.append(f"$\\textcolor[RGB]{{{rgb[0]},{rgb[1]},{rgb[2]}}}"
                       f"{{{bm.group(1)}}}$")
        elif "$" not in inner and "\\" not in inner:
            out.append(f"$\\textcolor[RGB]{{{rgb[0]},{rgb[1]},{rgb[2]}}}"
                       f"{{\\text{{{inner}}}}}$")
        else:
            uncoloured.append(inner[:60])
            out.append(body)
        i = k


tex = rewrite_textcolor(tex)


def strip_col_decorations(s: str) -> str:
    """Remove >{...} / <{...} column decorations from tabular specs.

    Pandoc gives up on a tabular whose column spec carries them (this paper
    uses >{\\columncolor{gray!15}}), emitting the spec as literal text and
    the rows as backslash-terminated lines. \\columncolor is in colortbl,
    which GitHub disables anyway.
    """
    out: list[str] = []
    i = 0
    while i < len(s):
        if s[i] in "><" and i + 1 < len(s) and s[i + 1] == "{":
            _, end = braced_arg(s, i + 1)
            i = end
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def expand_shortstack(s: str) -> str:
    r"""\shortstack[c]{Last\\ summand} -> Last summand."""
    token = "\\shortstack"
    out: list[str] = []
    i = 0
    while True:
        j = s.find(token, i)
        if j < 0:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:j])
        body, end = braced_arg(s, j + len(token))
        out.append(" ".join(re.split(r"\\\\", body)).strip())
        i = end


tex = strip_col_decorations(tex)
tex = expand_shortstack(tex)
# \hphantom pads cells for alignment; it is also on GitHub's banned list.
for _name in ("hphantom", "vphantom"):
    _tok = "\\" + _name
    while _tok in tex:
        _i = tex.find(_tok)
        _, _end = braced_arg(tex, _i + len(_tok))
        tex = tex[:_i] + tex[_end:]

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


def label_bare_rows(s: str) -> str:
    r"""Give each row of an unlabelled align/gather its own \label.

    LaTeX numbers every row of these environments, but a row with no \label
    leaves nothing to hang the number on, so the whole block came out
    unnumbered. Rows are split on the \\ that sit at the top level -- not
    the ones inside a nested array, matrix or cases.
    """
    global _autoeq
    envs = "align|gather|alignat|flalign|eqnarray"
    out: list[str] = []
    pos = 0
    for m in re.finditer(rf"\\begin\{{({envs})\}}(\{{[^}}]*\}})?", s):
        env = m.group(1)
        start = m.end()
        end = s.find(f"\\end{{{env}}}", start)
        if end < 0:
            continue
        body = s[start:end]
        if "\\label{" in body or "\\nonumber" in body or "\\notag" in body:
            continue

        rows: list[str] = []
        depth_env = depth_brace = 0
        last = 0
        i = 0
        while i < len(body):
            if body.startswith("\\begin{", i):
                depth_env += 1
                i += 7
                continue
            if body.startswith("\\end{", i):
                depth_env -= 1
                i += 5
                continue
            c = body[i]
            if c == "{":
                depth_brace += 1
            elif c == "}":
                depth_brace -= 1
            elif body.startswith("\\\\", i) and depth_env == 0 and depth_brace == 0:
                rows.append(body[last:i])
                j = i + 2
                if j < len(body) and body[j] == "[":  # \\[4pt]
                    j = body.find("]", j) + 1
                rows.append(None)  # marker: row break at body[i:j]
                rows.append(body[i:j])
                last = j
                i = j
                continue
            i += 1
        rows.append(body[last:])

        rebuilt: list[str] = []
        k = 0
        while k < len(rows):
            if rows[k] is None:
                rebuilt.append(rows[k + 1])
                k += 2
                continue
            _autoeq += 1
            rebuilt.append(rows[k].rstrip() + f"\\label{{autoeq:{_autoeq}}}")
            k += 1
        out.append(s[pos:start])
        out.append("".join(rebuilt))
        pos = end
    out.append(s[pos:])
    return "".join(out)


tex = label_bare_rows(tex)

# \qedhere only nudges the end-of-proof box; MathJax has no such macro and
# GitHub renders an unknown one as red text.
tex = tex.replace("\\qedhere", "")


def split_intertext(s: str) -> str:
    r"""Break an align at \intertext, putting the text between two aligns.

    \intertext comes from mathtools, which GitHub does not load -- it shows
    up as red \intertext followed by the run-together argument. Ending the
    environment, setting the text as an ordinary paragraph and reopening is
    what the PDF looks like anyway.
    """
    envs = "align|gather|alignat|flalign|eqnarray"
    out: list[str] = []
    pos = 0
    for m in re.finditer(rf"\\begin\{{({envs})\}}(\{{[^}}]*\}})?", s):
        env, arg = m.group(1), m.group(2) or ""
        start = m.end()
        end = s.find(f"\\end{{{env}}}", start)
        if end < 0 or "\\intertext" not in s[start:end]:
            continue
        body = s[start:end]
        pieces: list[str] = []
        i = 0
        while True:
            j = body.find("\\intertext", i)
            if j < 0:
                pieces.append(body[i:])
                break
            text, k = braced_arg(body, j + len("\\intertext"))
            head = body[i:j]
            # drop the row break that ended the preceding row
            head = re.sub(r"\\\\(\[[^\]]*\])?\s*$", "", head.rstrip())
            pieces.append(head)
            pieces.append(("TEXT", text))
            i = k
        rebuilt: list[str] = []
        for p in pieces:
            if isinstance(p, tuple):
                rebuilt.append(
                    f"\n\\end{{{env}}}\n\n{p[1].strip()}\n\n"
                    f"\\begin{{{env}}}{arg}\n"
                )
            else:
                rebuilt.append(p)
        out.append(s[pos:start])
        out.append("".join(rebuilt))
        pos = end
    out.append(s[pos:])
    return "".join(out)


tex = split_intertext(tex)

# \lstinputlisting is a listings-package macro pandoc knows nothing about, so
# both Lean appendices came out with an empty "Source listing". Inline the
# file as verbatim, which pandoc turns into a code block and readme-filter.lua
# then tags as Lean for highlighting.
LISTING_DIRS = [ROOT] + [d.parent for d in FIG_DIRS[1:]]
missing_listings: list[str] = []


def inline_listing(m: re.Match) -> str:
    name = m.group(1)
    for d in LISTING_DIRS:
        p = d / name
        if p.exists():
            src = p.read_text(encoding="utf-8").rstrip()
            return "\\begin{verbatim}\n" + src + "\n\\end{verbatim}"
    missing_listings.append(name)
    return ""


tex = re.sub(
    r"\\lstinputlisting(?:\[[^\]]*\])?\{([^}]*)\}", inline_listing, tex
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
    """Extract a metadata value, block scalar or plain/quoted scalar.

    A block scalar may contain blank lines -- the abstract has display
    equations in it, which the filter lifts into blocks of their own -- so
    the run of indented lines cannot simply stop at the first empty one. The
    last line of the last key has no trailing newline, hence the (?:\n|$).
    Pandoc only uses a block scalar when the value spans lines; a one-line
    title comes back as `title: "..."`.
    """
    bm = re.search(rf"^{key}: \|\n((?:[ ]{{2}}.*(?:\n|$)|\n)*)", yaml, re.M)
    if bm:
        return "\n".join(
            line[2:] if line.startswith("  ") else line
            for line in bm.group(1).splitlines()
        ).strip()
    sm = re.search(rf"^{key}: (.+)$", yaml, re.M)
    if not sm:
        return ""
    val = sm.group(1).strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
        val = val[1:-1]
    return val.strip()


def pdf_date() -> str:
    """The date printed on main.pdf's title page.

    The source says \\date{\\today}, so pandoc reports the date of *this*
    build, which would disagree with the PDF sitting next to it.
    """
    pdf = ROOT / "main.pdf"
    if not pdf.exists():
        return ""
    try:
        import pymupdf  # optional
    except ImportError:
        return ""
    try:
        text = pymupdf.open(pdf)[0].get_text()
    except Exception:
        return ""
    m = re.search(
        r"\b(January|February|March|April|May|June|July|August|September|"
        r"October|November|December)\s+\d{1,2},\s+\d{4}\b",
        text,
    )
    return m.group(0) if m else ""


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


# Macros whose argument is typeset as text, so nested $...$ inside them is
# real math and has to be lifted back out.
TEXT_MACROS = ["intertext", "shortintertext", "textrm", "textit", "textbf",
               "text", "mbox"]


def fix_text_dollars(tex_math: str) -> str:
    r"""\text{a $x$ b} -> \text{a }x\text{ b}.

    GitHub wraps a ```math block's content in $$...$$ and escapes every inner
    "$" to "\$" so it cannot break out. That turns nested math inside a
    text-mode macro into a literal dollar sign and leaves the symbols in text
    mode, which MathJax rejects with "\theta is only supported in math mode".
    """
    for macro in TEXT_MACROS:
        token = "\\" + macro + "{"
        out: list[str] = []
        i = 0
        while True:
            j = tex_math.find(token, i)
            if j < 0:
                out.append(tex_math[i:])
                break
            out.append(tex_math[i:j])
            body, end = braced_arg(tex_math, j + len(token) - 1)
            if "$" in body:
                parts = re.split(r"\$([^$]*)\$", body)
                # parts alternate text, math, text, math, ...
                out.append("".join(
                    (part if k % 2 else f"\\{macro}{{{part}}}")
                    for k, part in enumerate(parts) if part
                ))
            else:
                out.append(f"\\{macro}{{{body}}}")
            i = end
        tex_math = "".join(out)
    return tex_math


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

    # \eqref/\ref survive inside math (pandoc only resolves them in text) and
    # would render as a dangling reference; substitute the number.
    def ref_in_math(m: re.Match) -> str:
        num = LABELS.get(m.group(2))
        if num is None:
            return m.group(0)
        return f"({num})" if m.group(1) == "eqref" else num

    tex_math = re.sub(r"\\(eqref|ref)\{([^}]*)\}", ref_in_math, tex_math)

    tex_math = shrink_braces(tex_math)
    return tex_math.strip("\n")


unnumbered_eq = 0


def fix_math_block(m: re.Match) -> str:
    global unnumbered_eq
    indent, inner = m.group(1), m.group(2)
    inner = re.sub(r"\\begin\{equation\*?\}\n?", "", inner)
    inner = re.sub(r"\\end\{equation\*?\}\n?", "", inner)

    labels_here = re.findall(r"\\label\{([^}]+)\}", inner)
    numbered = [l for l in labels_here if l in LABELS]

    if len(numbered) > 1:
        # An align: pandoc hands back all its rows as one block, and each
        # row carries its own number in the PDF. The \label sits at the end
        # of its row, so replacing it in place numbers the rows individually
        # instead of stamping the last row's number on the whole block.
        def label_to_number(lm: re.Match) -> str:
            num = LABELS.get(lm.group(1))
            return f"\\qquad\\text{{({num})}}" if num else ""

        inner = re.sub(r"\\label\{([^}]+)\}", label_to_number, inner)
        inner, _ = pop_tag(inner)
        inner = sanitize_math(inner)
    else:
        inner = re.sub(r"\\label\{[^}]+\}\n?", "", inner)
        inner, tag_number = pop_tag(inner)
        inner = sanitize_math(inner)
        number = LABELS[numbered[0]] if numbered else tag_number
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
# 4c2. figure and table numbers: take them from the counters, not the filter
# ---------------------------------------------------------------------------
#
# readme-filter.lua numbers figures and tables by counting the elements it
# sees, which drifts whenever pandoc emits one that LaTeX did not number (a
# bare tabular, say). The label map is authoritative.

CAPTION_RE = re.compile(
    r'(<a id="(fig|tab)-([^"]+)"></a>\n'
    r'(?:(?!<a id=)[^\n]*\n){0,40}?'
    r'\*\*)(Figure|Table) (\d+):'
)


def fix_caption_number(m: re.Match) -> str:
    label = f"{m.group(2)}:{m.group(3)}"
    num = LABELS.get(label)
    if num is None:
        # the anchor was built by replacing ":" and "." with "-"
        num = next(
            (v for k, v in LABELS.items() if anchor_of(k) == f"{m.group(2)}-{m.group(3)}"),
            None,
        )
    return f"{m.group(1)}{m.group(4)} {num or m.group(5)}:"


body = CAPTION_RE.sub(fix_caption_number, body)

# ---------------------------------------------------------------------------
# 4d. theorem-class divs: strip wrappers, renumber to the PDF scheme
# ---------------------------------------------------------------------------

# Section numbers first: the theorem counter below is keyed to them.
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

# Theorem-class environments share one counter that resets each section, so
# an unlabelled one still takes the next number. Its number cannot be looked
# up, so the counter is run alongside and resynced whenever a labelled block
# supplies the authoritative value.
SECTION_HEAD = re.compile(r"^## (?:(\d+|[A-Z]) )?")
cur_section: str | None = None
thm_counter = 0

for line in lines:
    hm = SECTION_HEAD.match(line)
    if hm:
        cur_section = hm.group(1)
        thm_counter = 0
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
        thm_counter += 1
        num = LABELS.get(pending_label) if pending_label else None
        if num:
            minor = num.rsplit(".", 1)[-1]
            if minor.isdigit():
                thm_counter = int(minor)
        elif cur_section:
            num = f"{cur_section}.{thm_counter}"
        if num:
            line = BOLD_NUM.sub(
                lambda b: f"**{b.group(1)} {num}**", line, count=1
            )
        pending_label = None
    out.append(line)

body = "\n".join(out)

# ---------------------------------------------------------------------------
# 4f. leftover inline <img> tags (non-figure includegraphics)
# ---------------------------------------------------------------------------


# \includegraphics options, by image basename. Pandoc keeps width fractions
# but drops an "ex" height, which is what makes the inline taijitu glyph the
# size of a letter rather than a full-width figure.
IMG_OPTS = {
    Path(m.group(2)).stem: m.group(1) or ""
    for m in re.finditer(
        r"\\includegraphics(?:\[([^\]]*)\])?\{([^}]*)\}", tex_raw
    )
}


def img_repl(m: re.Match) -> str:
    src = m.group(1)
    if "/" not in src:
        src = "figures/" + src
    pct = re.search(r"width:([\d.]+)%", m.group(0))
    size = f' width="{round(float(pct.group(1)) * 9.5)}"' if pct else ""
    if not size:
        opts = IMG_OPTS.get(Path(src).stem, "")
        hm = re.search(r"height\s*=\s*([\d.]+)\s*ex", opts)
        if hm:
            # 1ex is about half the font size; GitHub's body text is 16px
            size = f' height="{max(8, round(float(hm.group(1)) * 8))}"'
    return f'<img src="{src}"{size}>'


body = re.sub(r'<img src="([^"]+)"[^>]*/?>', img_repl, body)

# ---------------------------------------------------------------------------
# 4g. "|" inside maths in a table row
# ---------------------------------------------------------------------------
#
# A bare "|" in a table cell is the cell separator, so \bigg|_{t=\gamma_n}
# tears the row apart and the maths is dropped entirely -- GitHub's markdown
# emits no math-renderer at all for that cell. Escaped as \| the cell stays
# whole and the renderer still receives a real "|" (checked against GitHub's
# /markdown API).


def escape_table_pipes(text: str) -> str:
    out: list[str] = []
    for line in text.split("\n"):
        if line.lstrip().startswith("|"):
            line = re.sub(
                r"\$`([^`]*)`\$",
                lambda m: "$`" + re.sub(r"(?<!\\)\|", r"\\|", m.group(1)) + "`$",
                line,
            )
        out.append(line)
    return "\n".join(out)


body = escape_table_pipes(body)

# ---------------------------------------------------------------------------
# 4h. tag the Lean listings for syntax highlighting
# ---------------------------------------------------------------------------
#
# Pandoc's gfm writer drops a code block's language unless the "attributes"
# extension is on, and that extension also starts emitting {#id} attributes
# on other elements (which is where a stray "{#tab:frac}" came from). Simpler
# to retag here: the paper's only verbatim blocks are the Lean listings.


def tag_lean_blocks(text: str) -> str:
    """Walk the fences so a closing one is never mistaken for an opener."""
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            info = line[3:].strip()
            j = i + 1
            while j < len(lines) and lines[j].rstrip() != "```":
                j += 1
            code = "\n".join(lines[i + 1:j])
            if not info and ("theorem" in code or "lemma" in code) and ":=" in code:
                out.append("```lean")
            else:
                out.append(line)
            out.extend(lines[i + 1:j])
            if j < len(lines):
                out.append(lines[j])
            i = j + 1
            continue
        out.append(line)
        i += 1
    return "\n".join(out)


body = tag_lean_blocks(body)

# pandoc turns the rule above \bottomrule into a row of empty cells; leave a
# blank line in its place so the caption stays a paragraph of its own
body = re.sub(r"^\|(?:\s*\|)+\s*$\n", "\n", body, flags=re.M)

# The Lean appendices are not collapsed: GitHub does not treat a ```math
# fence inside a <details> as maths (it falls back to a code block), so
# collapsing them cost the appendix its equations.

# ---------------------------------------------------------------------------
# 4i. table of contents
# ---------------------------------------------------------------------------

TOC_TEX = [
    (r"\\tfrac12", "1/2"), (r"\\tfrac15", "1/5"), (r"\\tfrac45", "4/5"),
    (r"\\tfrac\{?(\d)\}?\{?(\d)\}?", r"\1/\2"),
    (r"\\sigma", "σ"), (r"\\Sigma", "Σ"), (r"\\zeta", "ζ"),
    (r"\\vartheta", "ϑ"), (r"\\chi", "χ"), (r"\\neq", "≠"),
    (r"\\approx", "≈"), (r"\\to\b", "→"), (r"\\infty", "∞"),
    (r"\\tau", "τ"), (r"\\ast", "*"), (r"\\theta", "θ"), (r"\\omega", "ω"),
    (r"\\alpha", "α"), (r"\\beta", "β"), (r"\\lambda", "λ"), (r"\\mu", "μ"),
    (r"\\overline\{([^}]*)\}", r"\1"), (r"\\overline\s*", ""),
    (r"\\widetilde\{([^}]*)\}", r"\1"), (r"\\hat\{([^}]*)\}", r"\1"),
    (r"\\mathrm\{([^}]*)\}", r"\1"),
    (r"\\mathbb\{([^}]*)\}", r"\1"),
    (r"\\left|\\right|\\!", ""),
    (r"_\{([^}]*)\}", r"\1"), (r"_(\w)", r"\1"),
    (r"\\\{", "{"), (r"\\\}", "}"),
    (r"\\[,;:> ]", ""),      # thin spaces
    (r"[{}]", ""),           # grouping braces have no meaning in the TOC
]


def clean_toc_text(text: str) -> str:
    # A heading may itself contain a cross-reference ("Proof of Proposition
    # [4.1](#prop-weights)"). Contents entries and nav strips are themselves
    # links, and markdown has no nested links, so flatten to the link text.
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    s = re.sub(r"\$`([^`]*)`\$", r"\1", s)
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

DATE = pdf_date() or yaml_block("date")

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
    + (f"{DATE}\n\n" if DATE else "")
    + f"## Abstract\n\n"
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
missing_figures: list[str] = []
borrowed: list[str] = []
for m3 in re.finditer(r'src="(?:\.\./)?figures/([^"]+)"', all_text):
    name = m3.group(1)
    src = find_figure(name)
    if src is not None:
        shutil.copy2(src, FIG_DST / name)
        copied += 1
        if src.parent != FIG_DIRS[0] and name not in borrowed:
            borrowed.append(f"{name}  <- {src.parent.parent.name}")
    elif name not in missing_figures:
        missing_figures.append(name)

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
print(f"figures copied     : {copied}"
      + (f"  ({len(borrowed)} from another paper)" if borrowed else ""))
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
if borrowed:
    # A same-named file in another paper's folder can be an older or simply
    # different figure; two of them were, and were re-rendered from main.pdf
    # into this paper's own figures/. Listed so the rest stay checkable.
    print(f"figures taken from another paper ({len(borrowed)}) -- verify "
          f"against main.pdf if the paper's plots changed:")
    for s in borrowed:
        print("   " + s)
if uncoloured:
    print(f"colour dropped on {len(uncoloured)} run(s) that mix text and math "
          f"(markdown can only colour math):", file=sys.stderr)
    for s in uncoloured:
        print("   " + s, file=sys.stderr)
if missing_figures:
    print(f"MISSING FIGURES: {len(missing_figures)} (not in this repository)",
          file=sys.stderr)
    for s in missing_figures:
        print("   " + s, file=sys.stderr)
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
