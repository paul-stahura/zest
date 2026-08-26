-- readme-filter.lua
-- Pandoc Lua filter used by build_readme.py.
--
-- GitHub-oriented transformations that are easiest at the AST level:
--   * Lift display math out of paragraphs. Pandoc's LaTeX reader puts the
--     \[...\] of a theorem body inside the same Para as the statement text,
--     wrapped in the Emph that amsthm's "plain" style implies. The gfm writer
--     then emits `*text ```math ... ``` more text*`, and the closing fence
--     comes out as "```*", which CommonMark does not accept as a closing
--     fence -- the block never closes and swallows the prose that follows.
--     Splitting the Para into text / display-math / text blocks, and
--     re-applying the emphasis to each text run separately, keeps the
--     emphasis and gives every fence a line of its own.
--   * Insert <a id="..."></a> anchors before headers, theorem divs and
--     figures so cross-reference links have a target (GitHub prefixes ids
--     with "user-content-" but resolves plain #id links via frontend JS).
--   * Replace each Figure with a centered raw <img> plus the caption as a
--     plain markdown paragraph, so caption math survives as GitHub math
--     spans instead of being downgraded to HTML <em>/<sub> markup.
--   * Tag Lean source listings so GitHub syntax-highlights them.

local fig_count = 0

-- Set from build_readme.py with -M simplify-inline-math=true|false.
local simplify_inline = true

function Meta(m)
  local v = m['simplify-inline-math']
  if v ~= nil then
    simplify_inline = (pandoc.utils.stringify(v) == 'true')
  end
  return m
end

local function anchor_id(id)
  return (id:gsub('[:%.]', '-'))
end

local function anchor(id)
  return pandoc.RawBlock('html', '<a id="' .. anchor_id(id) .. '"></a>')
end

-- ---------------------------------------------------------------------------
-- one-symbol inline math -> text
-- ---------------------------------------------------------------------------
--
-- GitHub stops rendering math part-way through a page carrying several
-- thousand expressions, and most of this paper's spans are a single letter.
-- Writing those as text cuts the count by about a quarter.
--
-- This has to happen on the AST rather than on the markdown, because the
-- replacement for a Latin letter is emphasis, and a theorem statement is
-- already wholly emphasized: emitting *T* inside *...* would close the outer
-- span early. Inside emphasis the letter is already slanted, so it is
-- emitted bare.

local GREEK = {
  alpha = 'α', beta = 'β', gamma = 'γ', delta = 'δ', epsilon = 'ε',
  varepsilon = 'ε', zeta = 'ζ', eta = 'η', theta = 'θ', vartheta = 'ϑ',
  iota = 'ι', kappa = 'κ', lambda = 'λ', mu = 'μ', nu = 'ν', xi = 'ξ',
  pi = 'π', rho = 'ρ', sigma = 'σ', tau = 'τ', upsilon = 'υ', phi = 'φ',
  varphi = 'φ', chi = 'χ', psi = 'ψ', omega = 'ω', Gamma = 'Γ',
  Delta = 'Δ', Theta = 'Θ', Lambda = 'Λ', Xi = 'Ξ', Pi = 'Π',
  Sigma = 'Σ', Upsilon = 'Υ', Phi = 'Φ', Psi = 'Ψ', Omega = 'Ω',
  infty = '∞',
}

local SUBSCRIPT = {
  ['0'] = '₀', ['1'] = '₁', ['2'] = '₂', ['3'] = '₃', ['4'] = '₄',
  ['5'] = '₅', ['6'] = '₆', ['7'] = '₇', ['8'] = '₈', ['9'] = '₉',
}

-- Returns text, italic  (nil when the expression is not a bare symbol).
local function simple_symbol(tex)
  local base, sub = tex:match('^(.-)_{(%d+)}$')
  if not base then base, sub = tex:match('^(.-)_(%d)$') end
  if not base then base, sub = tex, nil end

  local text, italic
  if base:match('^[A-Za-z]$') then
    text, italic = base, true
  else
    local name = base:match('^\\(%a+)$')
    if name and GREEK[name] then
      text, italic = GREEK[name], false
    else
      return nil
    end
  end

  if sub then
    for d in sub:gmatch('%d') do text = text .. SUBSCRIPT[d] end
  end
  return text, italic
end

local convert_inlines

-- Elements whose .content is a list of inlines we may descend into.
local INLINE_CONTAINERS = {
  Strong = true, Strikeout = true, Superscript = true, Subscript = true,
  SmallCaps = true, Quoted = true, Link = true, Span = true, Cite = true,
}

convert_inlines = function(inlines, in_italic)
  if not simplify_inline then return inlines end
  local out = pandoc.List()
  for _, il in ipairs(inlines) do
    if il.t == 'Math' and il.mathtype == 'InlineMath' then
      local text, italic = simple_symbol(il.text)
      if text == nil then
        out:insert(il)
      elseif italic and not in_italic then
        out:insert(pandoc.Emph({ pandoc.Str(text) }))
      else
        out:insert(pandoc.Str(text))
      end
    elseif il.t == 'Emph' then
      out:insert(pandoc.Emph(convert_inlines(il.content, true)))
    elseif INLINE_CONTAINERS[il.t] then
      il.content = convert_inlines(il.content, in_italic)
      out:insert(il)
    else
      out:insert(il)
    end
  end
  return out
end

function Plain(el)
  el.content = convert_inlines(el.content, false)
  return el
end

function Header(el)
  el.content = convert_inlines(el.content, false)
  if el.identifier and el.identifier ~= '' then
    return { anchor(el.identifier), el }
  end
  return el
end

-- ---------------------------------------------------------------------------
-- display math inside paragraphs
-- ---------------------------------------------------------------------------

local function has_display_math(inlines)
  local found = false
  pandoc.walk_inline(pandoc.Span(inlines), {
    Math = function(m)
      if m.mathtype == 'DisplayMath' then found = true end
    end,
  })
  return found
end

-- Drop the whitespace that sat next to a display equation inside the Para.
local function trim(inlines)
  local first, last = 1, #inlines
  while first <= last do
    local t = inlines[first].t
    if t == 'Space' or t == 'SoftBreak' or t == 'LineBreak' then
      first = first + 1
    else
      break
    end
  end
  while last >= first do
    local t = inlines[last].t
    if t == 'Space' or t == 'SoftBreak' or t == 'LineBreak' then
      last = last - 1
    else
      break
    end
  end
  local out = pandoc.List()
  for i = first, last do out:insert(inlines[i]) end
  return out
end

-- Flatten Emph/Strong wrappers that contain display math, so the display
-- math ends up at the top level of the inline list and each surrounding run
-- of text keeps its own copy of the wrapper.
local function flatten(inlines)
  local out = pandoc.List()
  for _, il in ipairs(inlines) do
    if (il.t == 'Emph' or il.t == 'Strong') and has_display_math(il.content) then
      local rebuild = (il.t == 'Emph') and pandoc.Emph or pandoc.Strong
      local run = pandoc.List()
      for _, x in ipairs(flatten(il.content)) do
        if x.t == 'Math' and x.mathtype == 'DisplayMath' then
          local t = trim(run)
          if #t > 0 then out:insert(rebuild(t)) end
          run = pandoc.List()
          out:insert(x)
        else
          run:insert(x)
        end
      end
      local t = trim(run)
      if #t > 0 then out:insert(rebuild(t)) end
    else
      out:insert(il)
    end
  end
  return out
end

function Para(el)
  el.content = convert_inlines(el.content, false)
  if not has_display_math(el.content) then return el end

  local blocks = pandoc.List()
  local run = pandoc.List()

  local function flush()
    local t = trim(run)
    if #t > 0 then blocks:insert(pandoc.Para(t)) end
    run = pandoc.List()
  end

  for _, il in ipairs(flatten(el.content)) do
    if il.t == 'Math' and il.mathtype == 'DisplayMath' then
      flush()
      blocks:insert(pandoc.Para({ il }))
    else
      run:insert(il)
    end
  end
  flush()
  return blocks
end

-- ---------------------------------------------------------------------------
-- lists that contain display math
-- ---------------------------------------------------------------------------
--
-- GitHub's markdown extension fails to recognise an indented ```math fence
-- inside a list item whose text also contains inline math: the fence comes
-- out as a plain code block instead of an equation. Checked against
-- GitHub's own /markdown API --
--
--    list item + indented fence                    -> <math-renderer>
--    list item + inline math + indented fence      -> <pre><code>     (bug)
--    list item + inline math + fence at column 0   -> <math-renderer>
--
-- so a list carrying display math is flattened into numbered paragraphs,
-- which puts every display fence at column 0. build_readme.py asserts that
-- no indented math fence survives.

local function item_has_display(blocks)
  for _, b in ipairs(blocks) do
    if b.t == 'Para' or b.t == 'Plain' then
      for _, il in ipairs(b.content) do
        if il.t == 'Math' and il.mathtype == 'DisplayMath' then return true end
      end
    end
  end
  return false
end

local function list_has_display(el)
  for _, item in ipairs(el.content) do
    if item_has_display(item) then return true end
  end
  return false
end

local function flatten_items(items, marker_for)
  local out = pandoc.List()
  for i, item in ipairs(items) do
    local blocks = pandoc.List(item)
    local placed = false
    for k, b in ipairs(blocks) do
      if not placed and (b.t == 'Para' or b.t == 'Plain') then
        local inl = pandoc.List()
        inl:insert(pandoc.Strong({ pandoc.Str(marker_for(i)) }))
        inl:insert(pandoc.Space())
        inl:extend(b.content)
        blocks[k] = pandoc.Para(inl)
        placed = true
      end
    end
    out:extend(blocks)
  end
  return out
end

function OrderedList(el)
  if not list_has_display(el) then return nil end
  local start = el.start or 1
  return flatten_items(el.content,
    function(i) return tostring(start + i - 1) .. '.' end)
end

function BulletList(el)
  if not list_has_display(el) then return nil end
  return flatten_items(el.content, function() return '•' end)
end

-- ---------------------------------------------------------------------------
-- anchors, figures, listings
-- ---------------------------------------------------------------------------

function Div(el)
  if el.identifier and el.identifier ~= '' then
    return { anchor(el.identifier), el }
  end
end

function Table(el)
  if el.identifier and el.identifier ~= '' then
    return { anchor(el.identifier), el }
  end
end

function Figure(el)
  fig_count = fig_count + 1
  local blocks = pandoc.List()
  if el.identifier and el.identifier ~= '' then
    blocks:insert(anchor(el.identifier))
  end

  el.content[1]:walk({
    Image = function(im)
      local src = im.src
      if not src:match('%.%a+$') then src = src .. '.png' end
      src = 'figures/' .. src
      -- LaTeX width fractions arrive as percentages; README column is
      -- ~950 px wide, and GitHub caps images at 100% anyway.
      local px = 760
      local pct = (im.attributes['width'] or ''):match('([%d%.]+)%%')
      if pct then px = math.floor(tonumber(pct) * 9.5 + 0.5) end
      blocks:insert(pandoc.RawBlock('html',
        string.format('<p align="center"><img src="%s" width="%d"></p>', src, px)))
    end
  })

  local cap = pandoc.utils.blocks_to_inlines(el.caption.long)
  if #cap > 0 then
    local inlines = pandoc.List()
    inlines:insert(pandoc.Strong({ pandoc.Str('Figure ' .. fig_count .. ':') }))
    inlines:insert(pandoc.Space())
    inlines:extend(convert_inlines(cap, false))
    blocks:insert(pandoc.Para(inlines))
  end
  return blocks
end

function CodeBlock(el)
  -- The only large verbatim blocks in the paper are the Lean listings.
  if #el.classes == 0 and (el.text:match('theorem') or el.text:match('lemma')) and el.text:match(':=') then
    el.classes = { 'lean' }
    return el
  end
end
