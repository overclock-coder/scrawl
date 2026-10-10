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

subs = {
    "VENITE": data(ROOT / "assets/fonts/VeniteAdoremus.ttf", "font/ttf"),
    "LOGO": data(ROOT / "assets/logo.png", "image/png"),
    "TRAIL": data(ROOT / "exports/nyan-cat-rainbow-4x.png", "image/png"),
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
