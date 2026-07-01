#!/usr/bin/env python3
"""Tercera pasada: limpia los rgba sin cero inicial y border sub-propiedades."""

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

# ─── Opacidades sin cero inicial en props de JSX ────────────────────────────
# color="rgba(255,255,255,0.8)" (sin 0 intermedio) y similares
JSX_NOLEAD = [
    # Alta opacidad → textPrimary
    (r'color="rgba\(255,255,255,0\.9\)"',  'color="#565E32"'),
    (r'color="rgba\(255,255,255,0\.8\)"',  'color="#565E32"'),
    # Media → textMuted
    (r'color="rgba\(255,255,255,0\.7\)"',  'color="#87835C"'),
    (r'color="rgba\(255,255,255,0\.6\)"',  'color="#87835C"'),
    (r'color="rgba\(255,255,255,0\.5\)"',  'color="rgba(135,131,92,0.72)"'),
    (r'color="rgba\(255,255,255,0\.4\)"',  'color="rgba(135,131,92,0.58)"'),
    (r'color="rgba\(255,255,255,0\.3\)"',  'color="rgba(135,131,92,0.45)"'),
    (r'color="rgba\(255,255,255,0\.25\)"', 'color="rgba(135,131,92,0.38)"'),
    (r'color="rgba\(255,255,255,0\.2\)"',  'color="rgba(135,131,92,0.30)"'),
]

# ─── Opacidades sin cero en StyleSheet color: ───────────────────────────────
SS_NOLEAD = [
    (r"(color:\s*)'rgba\(255,255,255,0\.9\)'",  r"\1'#565E32'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.8\)'",  r"\1'#565E32'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.7\)'",  r"\1'#87835C'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.6\)'",  r"\1'#87835C'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.5\)'",  r"\1'rgba(135,131,92,0.72)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.4\)'",  r"\1'rgba(135,131,92,0.58)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.3\)'",  r"\1'rgba(135,131,92,0.45)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.2\)'",  r"\1'rgba(135,131,92,0.30)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.1\)'",  r"\1'rgba(135,131,92,0.18)'"),
]

# ─── borderBottomColor / borderTopColor / shadowColor adjustments ────────────
BORDER_SUB = [
    (r"(borderBottomColor:\s*)'rgba\(255,255,255,0\.15\)'", r"\1'rgba(86,94,50,0.14)'"),
    (r"(borderBottomColor:\s*)'rgba\(255,255,255,0\.10\)'", r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderBottomColor:\s*)'rgba\(255,255,255,0\.1\)'",  r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderBottomColor:\s*)'rgba\(255,255,255,0\.20\)'", r"\1'rgba(86,94,50,0.16)'"),
    (r"(borderBottomColor:\s*)'rgba\(255,255,255,0\.2\)'",  r"\1'rgba(86,94,50,0.16)'"),
    (r"(borderTopColor:\s*)'rgba\(255,255,255,0\.15\)'",    r"\1'rgba(86,94,50,0.14)'"),
    (r"(borderTopColor:\s*)'rgba\(255,255,255,0\.10\)'",    r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderTopColor:\s*)'rgba\(255,255,255,0\.1\)'",     r"\1'rgba(86,94,50,0.10)'"),
    (r"(borderTopColor:\s*)'rgba\(255,255,255,0\.12\)'",    r"\1'rgba(86,94,50,0.12)'"),
]

# ─── borderTopWidth / borderBottomWidth bg colors ───────────────────────────
BORDER_BG_SUB = [
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.15\)'",  r"\1'rgba(86,94,50,0.12)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.16\)'",  r"\1'rgba(86,94,50,0.12)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.05\)'",  r"\1'rgba(86,94,50,0.06)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.06\)'",  r"\1'rgba(86,94,50,0.06)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.07\)'",  r"\1'rgba(86,94,50,0.07)'"),
    (r"(backgroundColor:\s*)'rgba\(255,255,255,0\.09\)'",  r"\1'rgba(86,94,50,0.08)'"),
]

# ─── Remaining icon colors in JSX with {...} syntax and no-lead zero ─────────
JSX_CURLY_NOLEAD = [
    (r"(color=\{')rgba\(255,255,255,0\.8\)('\})",  r"\1#565E32\2"),
    (r"(color=\{')rgba\(255,255,255,0\.7\)('\})",  r"\1#87835C\2"),
    (r"(color=\{')rgba\(255,255,255,0\.6\)('\})",  r"\1#87835C\2"),
    (r"(color=\{')rgba\(255,255,255,0\.5\)('\})",  r"\1rgba(135,131,92,0.72)\2"),
    (r"(color=\{')rgba\(255,255,255,0\.4\)('\})",  r"\1rgba(135,131,92,0.58)\2"),
    (r"(color=\{')rgba\(255,255,255,0\.3\)('\})",  r"\1rgba(135,131,92,0.45)\2"),
    (r"(color=\{')rgba\(255,255,255,0\.25\)('\})", r"\1rgba(135,131,92,0.38)\2"),
]

# ─── Ternary expressions color values ────────────────────────────────────────
# Handles: "rgba(255,255,255,0.20)" in non-color: context (ternaries)
TERNARY = [
    (r'"rgba\(255,255,255,0\.20\)"', '"rgba(135,131,92,0.30)"'),
    (r'"rgba\(255,255,255,0\.2\)"',  '"rgba(135,131,92,0.30)"'),
    (r'"rgba\(255,255,255,0\.25\)"', '"rgba(135,131,92,0.38)"'),
    (r'"rgba\(255,255,255,0\.3\)"',  '"rgba(135,131,92,0.45)"'),
]

# ─── StrokeColor in ternary or prop ─────────────────────────────────────────
STROKE = [
    (r'strokeColor="rgba\(255,255,255,0\.', 'strokeColor="rgba(135,131,92,0.'),
]

ALL_RULES = JSX_NOLEAD + SS_NOLEAD + BORDER_SUB + BORDER_BG_SUB + JSX_CURLY_NOLEAD + TERNARY


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

print(f"\n✅  {len(changed)} archivos actualizados en tercera pasada:")
for f in changed:
    print(f"  · {f}")
