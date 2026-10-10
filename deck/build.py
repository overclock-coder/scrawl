#!/usr/bin/env python3
"""Builds deck/index.html: template.html with every image and the headline font embedded as data URIs."""
import base64, io, pathlib
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

def data(path, mime, width=None):
    p = pathlib.Path(path)
    if width:
        im = Image.open(p).convert("RGB")
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, "PNG", optimize=True); raw = buf.getvalue()
    else:
        raw = p.read_bytes()
    return f"data:{mime};base64," + base64.b64encode(raw).decode()

COLORS = ["#ff0000", "#ff9900", "#ffff00", "#33ff00", "#0099ff", "#6633ff"]

def frame(phase):
    """One 48x66 tile of the rainbow: 24px segments alternate between two heights, swapped by `phase`."""
    rects = []
    for seg in range(2):
        off = 6 if (seg + phase) % 2 else 0
        for k, c in enumerate(COLORS):
            rects.append(f'<rect x="{seg*24}" y="{off + k*10}" width="24" height="10" fill="{c}"/>')
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="66" viewBox="0 0 48 66" shape-rendering="crispEdges">' + "".join(rects) + "</svg>"
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

subs = {
    "VENITE": data(ROOT / "assets/fonts/VeniteAdoremus.ttf", "font/ttf"),
    "LOGO": data(ROOT / "assets/logo.png", "image/png"),
    "NYAN_SHEET": data(HERE / "img/nyan-sheet.png", "image/png"),
    "FRAME_A": frame(0),
    "FRAME_B": frame(1),
    "DRAW": data(HERE / "img/draw.png", "image/png", 640),
    "ROUND": data(HERE / "img/round.png", "image/png", 640),
    "RESULT": data(HERE / "img/result.png", "image/png", 640),
}
for i in range(1, 6):
    subs[f"CHIP{i}"] = data(ROOT / f"assets/ui/chip-{i}.png", "image/png")

html = (HERE / "template.html").read_text()
# ASCII-only source: the published page and a bare file both render every symbol without a charset declaration
html = "".join(c if ord(c) < 128 else f"&#{ord(c)};" for c in html)
for k, v in subs.items():
    html = html.replace("{{" + k + "}}", v)
assert "{{" not in html, "unreplaced placeholder"
(HERE / "index.html").write_text(html)
print("wrote", HERE / "index.html", f"{len(html)/1e6:.2f} MB")
