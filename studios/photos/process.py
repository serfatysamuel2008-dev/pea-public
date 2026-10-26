"""Prépare les visuels produits à partir des photos d'origine (photos/originals/<slug>.jpg).

Pour chaque paire, écrit dans public/products/ :
  <slug>.webp / <slug>-sm.webp              paire détourée (fond transparent), cadrage commun
  <slug>-photo.webp / <slug>-photo-sm.webp  photo d'origine
  <slug>-detail.webp                        gros plan (pont et verre gauche) recadré dans la photo d'origine

Usage : python photos/process.py [slug ...]
Nécessite : pip install "rembg[cpu]" pillow  (le modèle BiRefNet, ~1 Go, est téléchargé au premier lancement)
"""
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'photos' / 'originals'
OUT = ROOT / 'public' / 'products'
CACHE = ROOT / 'photos' / '.cutouts'


def cutout(slug, session):
    """Détourage BiRefNet, mis en cache (le calcul prend ~40 s par photo sur CPU)."""
    from rembg import remove
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / f'{slug}.png'
    if cached.exists():
        return Image.open(cached).convert('RGBA')
    im = Image.open(SRC / f'{slug}.jpg').convert('RGB')
    out = remove(im, session=session)
    out.save(cached)
    return out


def clean_alpha(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 10 else v)
    return Image.merge('RGBA', (r, g, b, a))


def main(slugs):
    from rembg import new_session
    session = new_session('birefnet-general')
    OUT.mkdir(parents=True, exist_ok=True)
    cuts = {}
    for slug in slugs:
        cut = clean_alpha(cutout(slug, session))
        bbox = cut.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        cuts[slug] = (cut, bbox)
        print('détouré', slug, bbox, flush=True)

    # Cadrage commun : toutes les paires à la même échelle, centrées sur une toile identique.
    W = int(max(b[2] - b[0] for _, b in cuts.values()) * 1.08)
    H = int(max(b[3] - b[1] for _, b in cuts.values()) * 1.12)
    for slug, (cut, (x0, y0, x1, y1)) in cuts.items():
        piece = cut.crop((x0, y0, x1, y1))
        rgb = piece.convert('RGB')
        rgb = ImageEnhance.Contrast(rgb).enhance(1.05)
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        piece = Image.merge('RGBA', (*rgb.split(), piece.getchannel('A')))
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.paste(piece, ((W - piece.width) // 2, (H - piece.height) // 2))
        canvas.save(OUT / f'{slug}.webp', quality=92, method=6)
        sm = canvas.resize((640, round(640 * H / W)), Image.LANCZOS)
        sm.save(OUT / f'{slug}-sm.webp', quality=88, method=6)

        photo = Image.open(SRC / f'{slug}.jpg').convert('RGB')
        photo.save(OUT / f'{slug}-photo.webp', quality=86, method=6)
        photo.resize((640, round(640 * photo.height / photo.width)), Image.LANCZOS).save(OUT / f'{slug}-photo-sm.webp', quality=84, method=6)

        w, h = x1 - x0, y1 - y0
        dx0, dx1 = max(0, x0 - 20), min(photo.width, x0 + int(w * 0.56))
        dy0, dy1 = max(0, y0 - 30), min(photo.height, y1 + 30)
        photo.crop((dx0, dy0, dx1, dy1)).save(OUT / f'{slug}-detail.webp', quality=88, method=6)
        print('écrit', slug, flush=True)
    print(f'canvas {W}x{H}')


if __name__ == '__main__':
    main(sys.argv[1:] or sorted(p.stem for p in SRC.glob('*.jpg')))
