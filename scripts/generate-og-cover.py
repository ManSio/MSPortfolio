#!/usr/bin/env python3
"""Generate public/og-cover.png (1200x630) for social link previews.

Reproduces the portfolio's dark visual identity: #0a0a0a background,
cyan accent (#00d9ff), blue primary (#0066ff) ambient blobs, mono labels.

Usage:
    python scripts/generate-og-cover.py            # writes public/og-cover.png
"""
import sys
from pathlib import Path

try:
    if sys.stdout.encoding != "utf-8":
        # pyright stub for TextIO lacks `reconfigure`; it exists at runtime.
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore  # noqa

    from PIL import Image, ImageDraw, ImageFont

    W, H = 1200, 630
    Color = tuple[int, int, int, int]
    INK: Color = (10, 10, 10, 255)        # --color-ink (dark)
    PAPER: Color = (250, 250, 250, 255)   # --color-paper
    MUTED: Color = (182, 191, 204, 255)   # --color-muted
    FAINT: Color = (122, 132, 148, 255)   # --color-faint
    ACCENT: Color = (0, 217, 255, 255)    # --color-accent (dark theme)
    PRIMARY: Color = (0, 102, 255, 255)   # --color-primary
    LINE: Color = (35, 42, 51, 255)       # --color-line (dark theme)

    FONTS = Path("C:/Windows/Fonts")
    def font(name: str, size: int) -> ImageFont.FreeTypeFont:
        return ImageFont.truetype(str(FONTS / name), size)

    f_badge = font("consola.ttf", 22)
    f_name = font("segoeuib.ttf", 108)
    f_role = font("segoeuib.ttf", 52)
    f_sub = font("segoeui.ttf", 27)
    f_foot = font("consola.ttf", 21)

    img = Image.new("RGBA", (W, H), INK)

    # ── Ambient blobs (center-white radial gradient masked to a color) ──
    def blob(size: int, color: Color, peak: float, x: int, y: int) -> None:
        grad = Image.radial_gradient("L").resize((size, size), Image.Resampling.LANCZOS)
        layer = Image.new("RGBA", (size, size), color)
        layer.putalpha(grad.point(lambda v: int(v * peak)))
        img.alpha_composite(layer, (x, y))

    blob(720, ACCENT, 0.16, -240, -260)   # top-left cyan
    blob(620, PRIMARY, 0.18, 760, 340)    # bottom-right blue

    d = ImageDraw.Draw(img)

    # ── Badge chip: rounded rect + mono label ──
    badge_txt = "MCP-NATIVE PORTFOLIO"
    bx, by = 90, 84
    bw = d.textlength(badge_txt, font=f_badge) + 44
    bh = 46
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=23, outline=LINE, width=2)
    d.text((bx + 22, by + 11), badge_txt, font=f_badge, fill=ACCENT)

    # ── Name ──
    d.text((90, 168), "Mikhail", font=f_name, fill=PAPER)

    # ── Role (gradient accent → primary, hand-drawn per glyph) ──
    role = "AI / Backend Engineer"
    rx, ry = 92, 342
    widths = []
    x = rx
    for ch in role:
        widths.append(d.textlength(ch, font=f_role))
        x += widths[-1]
    total = sum(widths)
    mask = Image.new("L", (int(total) + 4, 80), 0)
    dm = ImageDraw.Draw(mask)
    x = 0
    for ch, cw in zip(role, widths):
        dm.text((x, 0), ch, font=f_role, fill=255)
        x += cw
    grad = Image.new("RGBA", mask.size)
    for px in range(mask.size[0]):
        t = px / max(1, mask.size[0] - 1)
        r = int(ACCENT[0] + (PRIMARY[0] - ACCENT[0]) * t)
        g = int(ACCENT[1] + (PRIMARY[1] - ACCENT[1]) * t)
        b = int(ACCENT[2] + (PRIMARY[2] - ACCENT[2]) * t)
        for py in range(mask.size[1]):
            grad.putpixel((px, py), (r, g, b, 255))
    img.paste(grad, (rx, ry), mask)

    # ── Subtitle (wrapped) ──
    sub = (
        "Live metrics, decision logs, an interactive architecture simulator — "
        "and an MCP server any AI agent can query."
    )
    sub_font = f_sub
    max_w = 1010
    words = sub.split()
    lines, cur = [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if d.textlength(trial, font=sub_font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w_
    lines.append(cur)
    sy = 448
    for ln in lines[:2]:
        d.text((92, sy), ln, font=sub_font, fill=MUTED)
        sy += 40

    # ── Footer ──
    d.text((90, 566), "github.com/ManSio", font=f_foot, fill=FAINT)
    right = "claude mcp add  msp-portfolio"
    rw = d.textlength(right, font=f_foot)
    d.text((W - 90 - rw, 566), right, font=f_foot, fill=ACCENT)

    out = Path("public/og-cover.png")
    img.convert("RGB").save(out, "PNG")
    print(f"wrote {out.resolve()} ({W}x{H})")
except Exception:
    import traceback

    traceback.print_exc()
    sys.exit(1)
