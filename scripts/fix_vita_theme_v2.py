#!/usr/bin/env python3
"""Segunda pasada: corrige casos que el primer script manejó mal."""

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

# ─── 1. PlaceholderTextColor ────────────────────────────────────────────────
# Todos los placeholderTextColor="rgba(255,255,255,X)" → olive muted
PLACEHOLDER = [
    (r'placeholderTextColor="rgba\(255,255,255,0\.38\)"', 'placeholderTextColor="rgba(135,131,92,0.45)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.35\)"', 'placeholderTextColor="rgba(135,131,92,0.45)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.40\)"', 'placeholderTextColor="rgba(135,131,92,0.45)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.4\)"',  'placeholderTextColor="rgba(135,131,92,0.45)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.30\)"', 'placeholderTextColor="rgba(135,131,92,0.40)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.3\)"',  'placeholderTextColor="rgba(135,131,92,0.40)"'),
    (r'placeholderTextColor="rgba\(255,255,255,0\.25\)"', 'placeholderTextColor="rgba(135,131,92,0.35)"'),
]

# ─── 2. borderColor 0.35 que el script no tocó ─────────────────────────────
BORDER_REMAINING = [
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.35\)'", r"\1'rgba(255,255,255,0.60)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.16\)'", r"\1'rgba(86,94,50,0.14)'"),
    (r"(borderColor:\s*)'rgba\(255,255,255,0\.30\)'", r"\1'rgba(255,255,255,0.58)'"),
]

# ─── 3. Texto que debe ser BLANCO (sobre fondos oscuros/coloreados) ─────────
# El script cambió color:'#FFFFFF' → '#565E32' en TODOS los casos,
# pero texto sobre fondo de color (avatar circles, dark buttons) debe ser blanco.
# Revertimos en esos style keys específicos.

# Regex: busca la key del objeto de estilo y su color resultante
# Solo para style keys que sabemos que tienen bg coloreado
AVATAR_TEXT_KEYS = [
    'sessionAvatarText', 'avatarInitial', 'avatarText', 'avatarLetter',
    'coachAvatarText', 'senderAvatarText', 'userAvatarText', 'coachInitialText',
    'badgeText', 'dotText', 'chipText', 'tagText', 'statusText',
    'appleBtnText',  # dark apple button
    'msgAvatarText', 'chatAvatarText',
]

def revert_avatar_text(content):
    for key in AVATAR_TEXT_KEYS:
        # Matches: keyName: { ... color: '#565E32' ... }
        # Uses a non-greedy block match within 10 lines
        pattern = r'(' + re.escape(key) + r':\s*\{[^}]*?)(color:\s*)\'#565E32\''
        replacement = r"\1\2'#FFFFFF'"
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    return content

# ─── 4. Text de botón primario CTA: era blanco en btn blanco, ahora btn olive ─
# color: '#1A1A2E' era para texto sobre btnActive=white → ahora btnActive=olive
# → texto debe ser cream '#F7EFE4'
CTA_TEXT = [
    (r"(color:\s*)'#1A1A2E'", r"\1'#F7EFE4'"),
]

# ─── 5. Colores de texto que quedaron con blanco en StyleSheet (0.38/0.35 etc)
REMAINING_TEXT_COLORS = [
    (r"(color:\s*)'rgba\(255,255,255,0\.38\)'", r"\1'rgba(135,131,92,0.52)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.33\)'", r"\1'rgba(135,131,92,0.48)'"),
    (r"(color:\s*)'rgba\(255,255,255,0\.15\)'", r"\1'rgba(135,131,92,0.22)'"),
]

# ─── 6. favBtn negro en conexiones (sobre foto placeholder) ─────────────────
FAV_BTN = [
    (r"(backgroundColor:\s*)'rgba\(0,0,0,0\.22\)'", r"\1'rgba(86,94,50,0.18)'"),
]

# ─── 7. Apple button background → keep dark but ensure correct look ─────────
# appleBtn background stays rgba(0,0,0,0.45) — it's valid on light bg
# but its text was wrongly changed to olive. Fixed in step 3 via appleBtnText.

# ─── 8. SalaScreen button text color fix ────────────────────────────────────
SALA_BTN = [
    # el botón "30min"/"60min" que usa rgba(255,255,255,0.30) como color
    (r'(color=\{roomUrl && isInVideoWindow \? ViveColors\.primary : ")rgba\(255,255,255,0\.30\)(")',
     r'\1rgba(135,131,92,0.52)\2'),
]

# ─── 9. dot.active backgroundColor que el script no alcanzó ─────────────────
# El script no cambiaba el active de dots. Buscar pattern: active: { ... '#FFFFFF' }
DOT_ACTIVE = [
    # Pattern: active: {\n  ...\n  backgroundColor: '#565E32'  (ya fue cambiado por script)
    # No hay nada que hacer acá — el script YA capturó backgroundColor:'#FFFFFF'→'#565E32'
    # pero para dots activos #565E32 (olive) es correcto en el nuevo diseño.
]

# ─── 10. bgGrad/tintColor lingering issues ──────────────────────────────────
BG_REMAINING = [
    # Fondo negro de some modals
    (r"(backgroundColor:\s*)'rgba\(15,10,40,0\.90\)'", r"\1'rgba(247,239,228,0.97)'"),
    (r"(backgroundColor:\s*)'rgba\(0,0,0,0\.70\)'", r"\1'rgba(247,239,228,0.97)'"),
    (r"(backgroundColor:\s*)'rgba\(0,0,0,0\.80\)'", r"\1'rgba(247,239,228,0.98)'"),
    (r"(backgroundColor:\s*)'rgba\(0,0,0,0\.85\)'", r"\1'rgba(247,239,228,0.98)'"),
    # search overlay
    (r"(backgroundColor:\s*)'rgba\(0,0,0,0\.35\)'", r"\1'rgba(86,94,50,0.12)'"),
]

ALL_RULES = PLACEHOLDER + BORDER_REMAINING + CTA_TEXT + REMAINING_TEXT_COLORS + FAV_BTN + SALA_BTN + BG_REMAINING


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
    updated = revert_avatar_text(updated)
    if updated != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)
        return True
    return False


changed = []
for path in files:
    if process_file(path):
        changed.append(os.path.relpath(path, ROOT))

print(f"\n✅  {len(changed)} archivos actualizados en segunda pasada:")
for f in changed:
    print(f"  · {f}")
