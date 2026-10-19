-- Pandoc Lua filter for the PLAN.pdf build (typst writer).
--  * Images become root-relative ("/diagrams/x.png"); typst runs with --root docs/plan.
--  * <!-- landscape:on|off --> markers flip page orientation for the wide-table sections.
--  * <!-- screens:start --> ... <!-- screens:end --> turns the demo's phone screens into a three-column grid
--    (<!-- mockups:start --> ... <!-- mockups:end --> still gives the older two-column grid).
--  * "Part N · ..." headings become part divider pages (styled in plan-conf.typ).
--  * Other HTML comments and horizontal rules are dropped (sections already start on new pages).

local function is_url(src)
  return src:match("^%a[%w+.-]*:") ~= nil
end

-- Escape text for a Typst content block.
local function typst_text(s)
  return (s:gsub("([\\#%[%]%*_%$<>@`~])", "\\%1"))
end

function Image(el)
  if not is_url(el.src) and el.src:sub(1, 1) ~= "/" then
    el.src = "/" .. el.src
  end
  return el
end

function RawBlock(el)
  if el.format == "html" then
    if el.text:match("landscape:on") then
      return pandoc.RawBlock("typst", "#set page(flipped: true)")
    elseif el.text:match("landscape:off") then
      return pandoc.RawBlock("typst", "#set page(flipped: false)")
    elseif el.text:match("mockups:") or el.text:match("screens:") then
      return el -- handled in Blocks below
    end
    return {}
  end
end

function Header(el)
  local text = pandoc.utils.stringify(el.content)
  if text:match("^Part %d+ ·") then
    return pandoc.RawBlock("typst", "#heading(level: 1, supplement: [Part])[" .. typst_text(text) .. "]")
  end
end

local function figure_grid(figures, columns)
  local cells = {}
  for _, fig in ipairs(figures) do
    local src
    fig:walk({ Image = function(img) src = src or img.src end })
    local caption = pandoc.utils.stringify(fig.caption.long)
    cells[#cells + 1] = string.format('  figure(image("%s", width: 100%%), caption: [%s]),', src, typst_text(caption))
  end
  return pandoc.RawBlock("typst",
    "#grid(columns: (" .. string.rep("1fr, ", columns) .. "), column-gutter: 5mm, row-gutter: 3mm,\n" .. table.concat(cells, "\n") .. "\n)")
end

function Blocks(blocks)
  local out, collecting, figures, columns = {}, false, {}, 2
  for _, b in ipairs(blocks) do
    local start = b.t == "RawBlock" and b.format == "html" and (b.text:match("mockups:start") or b.text:match("screens:start"))
    if start then
      collecting, figures, columns = true, {}, b.text:match("screens:") and 3 or 2
    elseif b.t == "RawBlock" and b.format == "html" and (b.text:match("mockups:end") or b.text:match("screens:end")) then
      collecting = false
      out[#out + 1] = figure_grid(figures, columns)
    elseif collecting then
      if b.t == "Figure" then figures[#figures + 1] = b end
    else
      out[#out + 1] = b
    end
  end
  return out
end

function HorizontalRule()
  return {}
end
