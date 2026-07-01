#!/usr/bin/env python3
"""Cuarta pasada: cubre variantes cortas (0.1, 0.2, etc.) y props especiales."""

import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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

EXCLUDE = {"_layout.tsx"}
def should_skip(p): return os.path.basename(p) in EXCLUDE

# Para todas las variantes cortas que quedaron sin reemplazar
# Agrupamos por tipo de propiedad CSS

BG_SHORT = [
    # Divider-style: rgba(255,255,255,0.1) → olive faint
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.1\)'",  r"\1'rgba(86,94,50,0.08)'"),
    # Light container: 0.2 → glass light
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.2\)'",  r"\1'rgba(255,248,240,0.65)'"),
    # Slightly more opaque
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.3\)'",  r"\1'rgba(86,94,50,0.12)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.4\)'",  r"\1'rgba(86,94,50,0.14)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.5\)'",  r"\1'rgba(255,248,240,0.72)'"),
]

BORDER_SHORT = [
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.1\)'",    r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.18\)'",   r"\1'rgba(86,94,50,0.14)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.2\)'",    r"\1'rgba(255,255,255,0.55)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.3\)'",    r"\1'rgba(255,255,255,0.60)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.4\)'",    r"\1'rgba(255,255,255,0.68)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.45\)'",   r"\1'rgba(255,255,255,0.70)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.5\)'",    r"\1'rgba(255,255,255,0.72)'"),
]

COLOR_SHORT = [
    (r"(color:\s*)'rgba\(255,255,255,0\.42\)'", r"\1'rgba(135,131,92,0.60)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.48\)'", r"\1'rgba(135,131,92,0.68)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.1\)'",  r"\1'rgba(135,131,92,0.18)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.2\)'",  r"\1'rgba(135,131,92,0.30)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.3\)'",  r"\1'rgba(135,131,92,0.45)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.4\)'",  r"\1'rgba(135,131,92,0.58)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.5\)'",  r"\1'rgba(135,131,92,0.72)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.6\)'",  r"\1'#87835C'"),
]

BORDER_BOTTOM_SHORT = [
    (r"(borderBottomColor:\s*)'rgba\(255,255,255,0\.1\)'",  r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderTopColor:\s*)'rgba\(255,255,255,0\.1\)'",     r"\1'rgba(86,94,50,0.10)'"),
]

# iconColor prop (FirstTimeTooltip y otros que usan prop iconColor)
ICON_COLOR_PROP = [
    (r'iconColor="rgba\(255,255,255,0\.75\)"', 'iconColor="#87835C"'),
    (r'iconColor="rgba\(255,255,255,0\.7\)"',  'iconColor="#87835C"'),
    (r'iconColor="rgba\(255,255,255,0\.65\)"', 'iconColor="#87835C"'),
    (r'iconColor="rgba\(255,255,255,0\.60\)"', 'iconColor="#87835C"'),
    (r'iconColor="rgba\(255,255,255,0\.8\)"',  'iconColor="#565E32"'),
    (r'iconColor="rgba\(255,255,255,0\.85\)"', 'iconColor="#565E32"'),
    (r'iconColor="#FFFFFF"',                   'iconColor="#565E32"'),
]

# placeholderTextColor que quedó (con opacidad sin cero)
PLACEHOLDER_SHORT = [
    (r'placeholderTextColor="rgba\(255,255,255,0\.45\)"', 'placeholderTextColor="rgba(135,131,92,0.55)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.5\)"',  'placeholderTextColor="rgba(135,131,92,0.55)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.3\)"',  'placeholderTextColor="rgba(135,131,92,0.42)"'),
]

# JSX inline ternary string values
TERNARY_STRS = [
    # isCurrentMonth ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'
    (r"'\s*rgba\(255,255,255,0\.2\)\s*'",  "'rgba(135,131,92,0.30)'"),
    (r"'\s*rgba\(255,255,255,0\.22\)\s*'", "'rgba(255,255,255,0.60)'"),
    (r"'\s*rgba\(255,255,255,0\.12\)\s*'", "'rgba(255,248,240,0.48)'"),
]

# RegisterScreen: color={acceptedTerms ? ViveColors.primary : "rgba(255,255,255,0.45)"}
CONDITIONAL = [
    (r'"rgba\(255,255,255,0\.45\)"', '"rgba(135,131,92,0.55)"'),
]

ALL_RULES = (
    BG_SHORT + BORDER_SHORT + COLOR_SHORT + BORDER_BOTTOM_SHORT +
    ICON_COLOR_PROP + PLACEHOLDER_SHORT + TERNARY_STRS + CONDITIONAL
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
for path in files:
    if process_file(path):
        changed.append(os.path.relpath(path, ROOT))

print(f"\n✅  {len(changed)} archivos actualizados en cuarta pasada:")
for f in changed:
    print(f"  · {f}")
