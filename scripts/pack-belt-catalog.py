"""Pack the title reference images as offline WebP files. Requires Pillow."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SIZE = (1150, 460)
ART_LIMIT = (1058, 390)


def main():
    designs = json.loads(Path(__file__).with_name('belt-catalog-designs.json').read_text(encoding='utf-8'))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('renders', type=Path, help='Directory of PNGs made by the Blender script')
    parser.add_argument('--art', type=Path, help='Optional directory of curated studio artwork by title ID')
    parser.add_argument('--title', action='append', choices=designs, help='Pack this catalog ID only. May be repeated.')
    parser.add_argument('--out', type=Path, default=ROOT / 'public' / 'belts' / 'catalog')
    args = parser.parse_args()

    overrides = {path.stem: path for path in args.art.glob('*.png')} if args.art else {}
    if unknown := overrides.keys() - designs.keys():
        parser.error('Unknown artwork IDs: ' + ', '.join(sorted(unknown)))
    sources = {title: overrides.get(title, args.renders / (title + '.png')) for title in args.title or designs}
    if missing := [title for title, path in sources.items() if not path.is_file()]:
        parser.error('Missing PNGs: ' + ', '.join(missing))
    args.out.mkdir(parents=True, exist_ok=True)
    for title, path in sources.items():
        with Image.open(path) as original:
            loaded = original.convert('RGBA')
            if title in overrides:
                loaded = ImageOps.contain(loaded, ART_LIMIT, Image.Resampling.LANCZOS)
            elif loaded.size != SIZE:
                parser.error(f'{title}: expected {SIZE}, found {loaded.size}')
            frame = Image.new('RGB', SIZE, '#ffffff')
            offset = tuple((whole - part) // 2 for whole, part in zip(SIZE, loaded.size))
            frame.paste(loaded, offset, loaded)
            frame.save(args.out / (title + '.webp'), method=6, quality=91)
    print(f'{len(sources)} images, {len(sources.keys() & overrides.keys())} curated studio scenes.')


if __name__ == '__main__':
    main()
