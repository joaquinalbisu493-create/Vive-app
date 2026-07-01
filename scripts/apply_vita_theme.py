#!/usr/bin/env python3
"""Aplica el sistema visual VITA a todos los archivos de screens/app."""

import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Archivos a procesar
PATTERNS = [
    f"{ROOT}/screens/*.tsx",
    f"{ROOT}/app/(tabs)/*.tsx",
    f"{ROOT}/app/(coach)/*.tsx",
    f"{ROOT}/app/*.tsx",
]

files = []
for p in PATTERNS:
    files.extend(glob.glob(p))
files = sorted(set(files))

# Excluir layouts (ya editados manualmente)
EXCLUDE = {"_layout.tsx"}

def should_skip(path):
    return os.path.basename(path) in EXCLUDE

# ─── Sustituciones ordenadas (más específico primero) ─────────────────────────

# 1. StatusBar
STATUS_BAR = [
    (r'barStyle="light-content"', 'barStyle="dark-content"'),
]

# 2. Constantes GLASS al tope de archivo (antes de los StyleSheets)
GLASS_CONSTS = [
    # const GLASS = 'rgba(255,255,255,0.14)'  →  glassBg
    (r"(const\s+GLASS\s*=\s*)'rgba\(255,255,255,0\.14\)'", r"\1'rgba(255,248,240,0.55)'"),
    (r"(const\s+GLASS_BORDER\s*=\s*)'rgba\(255,255,255,0\.28\)'", r"\1'rgba(255,255,255,0.65)'"),
    (r"(const\s+GLASS\s*=\s*)'rgba\(255,255,255,0\.12\)'", r"\1'rgba(255,248,240,0.48)'"),
]

# 3. Text colors  (color: 'X')
TEXT_COLORS = [
    # Pure white text → textPrimary
    (r"(color:\s*)'#FFFFFF'", r"\1'#565E32'"),
    (r"(color:\s*)'#ffffff'", r"\1'#565E32'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.85\)'", r"\1'#565E32'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.80\)'", r"\1'#565E32'"),
    # High opacity white text → textMuted
    (r"(color:\s*)'rgba\(255,255,255,0\.75\)'", r"\1'#87835C'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.70\)'", r"\1'#87835C'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.65\)'", r"\1'#87835C'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.60\)'", r"\1'#87835C'"),
    # Medium opacity → rgba muted
    (r"(color:\s*)'rgba\(255,255,255,0\.55\)'", r"\1'rgba(135,131,92,0.80)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.50\)'", r"\1'rgba(135,131,92,0.72)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.45\)'", r"\1'rgba(135,131,92,0.65)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.40\)'", r"\1'rgba(135,131,92,0.58)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.35\)'", r"\1'rgba(135,131,92,0.52)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.30\)'", r"\1'rgba(135,131,92,0.45)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.25\)'", r"\1'rgba(135,131,92,0.38)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.20\)'", r"\1'rgba(135,131,92,0.30)'"),
]

# 4. Background colors (backgroundColor: 'X')
BG_COLORS = [
    # Dark solid bg → transparent (AppBg handles background now)
    (r"(backgroundColor:\s*)'#0D0D0D'", r"\1'transparent'"),
    (r"(backgroundColor:\s*)'#111122'", r"\1'transparent'"),
    # Glass cards
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.14\)'", r"\1'rgba(255,248,240,0.55)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.12\)'", r"\1'rgba(255,248,240,0.48)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.10\)'", r"\1'rgba(255,248,240,0.40)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.08\)'", r"\1'rgba(255,248,240,0.32)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.18\)'", r"\1'rgba(255,248,240,0.62)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.20\)'", r"\1'rgba(255,248,240,0.65)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.22\)'", r"\1'rgba(255,248,240,0.68)'"),
    # Active bubbles / tints → subtle olive
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.25\)'", r"\1'rgba(86,94,50,0.10)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.30\)'", r"\1'rgba(86,94,50,0.12)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.32\)'", r"\1'rgba(86,94,50,0.14)'"),
    # Pure white bg (e.g. active pill) → pilliActiveBg
    (r"(backgroundColor:\s*)'#FFFFFF'", r"\1'#565E32'"),
]

# 5. Border colors (borderColor: 'X')
BORDER_COLORS = [
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.28\)'", r"\1'rgba(255,255,255,0.65)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.22\)'", r"\1'rgba(255,255,255,0.60)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.38\)'", r"\1'rgba(255,255,255,0.70)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.40\)'", r"\1'rgba(255,255,255,0.72)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.55\)'", r"\1'rgba(255,255,255,0.80)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.32\)'", r"\1'rgba(255,255,255,0.68)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.25\)'", r"\1'rgba(255,255,255,0.60)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.20\)'", r"\1'rgba(255,255,255,0.55)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.15\)'", r"\1'rgba(86,94,50,0.14)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.10\)'", r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.08\)'", r"\1'rgba(86,94,50,0.08)'"),
    (r"(borderColor:\s*)'#FFFFFF'", r"\1'rgba(255,255,255,0.70)'"),
]

# 6. Dot/pagination active color
DOT_COLORS = [
    # Dot pagination active: white → olive
    (r"(backgroundColor:\s*)'#FFFFFF'(\s*,?\s*//\s*dot|,?\s*\n.*?dot\.active)", r"\1'#565E32'\2"),
]

# 7. Venn circles & icon fills that use ViveColors.primary → already handled by ViveColors update
# But stroke="rgba(255,255,255,X)" in SVG elements → olive
SVG_STROKES = [
    (r'stroke="rgba\(255,255,255,0\.7\)"', 'stroke="rgba(86,94,50,0.55)"'),
    (r'stroke="rgba\(255,255,255,0\.5\)"', 'stroke="rgba(86,94,50,0.40)"'),
    (r'stroke="rgba\(255,255,255,1\)"',    'stroke="rgba(86,94,50,0.80)"'),
    (r'stroke="#FFFFFF"',                   'stroke="#565E32"'),
    (r'fill="#FFFFFF"',                     'fill="#565E32"'),
]

# 8. Icon colors passed as props (color="..." or color={'...'})
ICON_PROP_COLORS = [
    (r"""(color=")#FFFFFF(")""",                                   r"""\1#565E32\2"""),
    (r"""(color=")rgba\(255,255,255,0\.85\)(")""",                r"""\1#565E32\2"""),
    (r"""(color=")rgba\(255,255,255,0\.80\)(")""",                r"""\1#565E32\2"""),
    (r"""(color=")rgba\(255,255,255,0\.75\)(")""",                r"""\1#87835C\2"""),
    (r"""(color=")rgba\(255,255,255,0\.70\)(")""",                r"""\1#87835C\2"""),
    (r"""(color=")rgba\(255,255,255,0\.65\)(")""",                r"""\1#87835C\2"""),
    (r"""(color=")rgba\(255,255,255,0\.60\)(")""",                r"""\1#87835C\2"""),
    (r"""(color=")rgba\(255,255,255,0\.55\)(")""",                r"""\1rgba(135,131,92,0.80)\2"""),
    (r"""(color=")rgba\(255,255,255,0\.50\)(")""",                r"""\1rgba(135,131,92,0.72)\2"""),
    (r"""(color=")rgba\(255,255,255,0\.45\)(")""",                r"""\1rgba(135,131,92,0.65)\2"""),
    (r"""(color=")rgba\(255,255,255,0\.35\)(")""",                r"""\1rgba(135,131,92,0.52)\2"""),
    (r"""(color=")rgba\(255,255,255,0\.30\)(")""",                r"""\1rgba(135,131,92,0.45)\2"""),
    # color={' ... '}
    (r"""(color=\{')#FFFFFF('\})""",                              r"""\1#565E32\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.85\)('\})""",           r"""\1#565E32\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.75\)('\})""",           r"""\1#87835C\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.70\)('\})""",           r"""\1#87835C\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.65\)('\})""",           r"""\1#87835C\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.60\)('\})""",           r"""\1#87835C\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.55\)('\})""",           r"""\1rgba(135,131,92,0.80)\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.50\)('\})""",           r"""\1rgba(135,131,92,0.72)\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.45\)('\})""",           r"""\1rgba(135,131,92,0.65)\2"""),
    (r"""(color=\{')rgba\(255,255,255,0\.35\)('\})""",           r"""\1rgba(135,131,92,0.52)\2"""),
]

# 9. Dot pagination — standalone active dot (no context)
ACTIVE_DOT = [
    # active: { ... backgroundColor: '#FFFFFF' ...} in dot StyleSheets
    (r"(active:\s*\{[^}]*backgroundColor:\s*)'#FFFFFF'", r"\1'#565E32'"),
    # simple standalone dot in row array
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.25\)'(\s*,\s*//.*dot)", r"\1'rgba(86,94,50,0.20)'\2"),
]

ALL_RULES = (
    STATUS_BAR + GLASS_CONSTS + TEXT_COLORS + BG_COLORS + BORDER_COLORS +
    SVG_STROKES + ICON_PROP_COLORS
)


def apply_rules(content, rules):
    for pattern, replacement in rules:
        content = re.sub(pattern, replacement, content)
    return content


def process_file(path):
    if should_skip(path):
        return False
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()
    updated = apply_rules(original, ALL_RULES)
    if updated != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)
        return True
    return False


changed = []
skipped = []
for path in files:
    if process_file(path):
        changed.append(os.path.relpath(path, ROOT))
    else:
        skipped.append(os.path.relpath(path, ROOT))

print(f"\n✅  {len(changed)} archivos actualizados:")
for f in changed:
    print(f"  · {f}")
print(f"\n⏭   {len(skipped)} archivos sin cambios (ya limpios o excluidos).")
