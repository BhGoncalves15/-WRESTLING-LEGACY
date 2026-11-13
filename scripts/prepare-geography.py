"""Build the offline catalog from local checkouts of the sources in public/geography/SOURCES.md."""
import csv
import gzip
import hashlib
import io
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image

world, brazil, flags = map(Path, sys.argv[1:4])
output = Path(__file__).resolve().parents[1] / 'public' / 'geography'
output.mkdir(parents=True, exist_ok=True)


def source(repo, path):
    return subprocess.check_output(['git', '-C', repo, 'show', 'HEAD:' + path])


def save(data, path, compress=False):
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    (output / path).write_bytes(gzip.compress(raw, compresslevel=9, mtime=0) if compress else raw + b'\n')


def translated(row):
    names = row.get('translations') or {}
    return names.get('pt-BR') or names.get('pt') or row['name']


def brazilian_rows(file):
    return csv.DictReader(io.StringIO(source(brazil, 'csv/' + file).decode('utf-8-sig')))


states = {row['id']: row for row in json.loads(source(world, 'json/states.json'))}
municipalities = defaultdict(list)
for row in brazilian_rows('municipios.csv'):
    municipalities[row['codigo_uf']].append([int(row['codigo_ibge']), row['nome']])

data = json.loads(source(world, 'json/countries+states+cities.json'))
other_cities = {row['name']: row.get('cities', []) for row in json.loads(source(world, 'json/countries+cities.json'))}
countries = sorted(data, key=lambda row: row['iso2'])
index = []
buckets = []
for country in countries:
    code = country['iso2']
    if code == 'BR':
        regions = [[int(row['codigo_uf']), row['nome'], 'state', municipalities[row['codigo_uf']]] for row in brazilian_rows('estados.csv')]
        cities = []
    else:
        regions = [[row['id'], translated(states.get(row['id'], row)), row.get('type') or '',
                    [[city['id'], city['name']] for city in row.get('cities', [])]]
                   for row in country.get('states', [])]
        assigned = {city[1] for region in regions for city in region[3]}
        cities = [[int(hashlib.sha256((code + '/' + name).encode()).hexdigest()[:12], 16), name]
                  for name in other_cities.get(country['name'], []) if name not in assigned]
    buckets.append((code, [regions, cities]))
    index.append([code, translated(country), country['name'], None])

# Shard by estimated encoded size. Each request loads only one group of countries.
shards = []
for code, value in sorted(buckets, key=lambda pair: len(json.dumps(pair[1])), reverse=True):
    size = len(json.dumps(value, ensure_ascii=False))
    available = next((shard for shard in shards if shard[0] + size <= 190_000), None)
    if available is None:
        available = [0, {}]
        shards.append(available)
    available[0] += size
    available[1][code] = value
locations = {code: shard for shard, (_, entries) in enumerate(shards) for code in entries}
for entry in index:
    entry[3] = locations[entry[0]]
for number, (_, entries) in enumerate(shards):
    save(entries, f'places-{number}.json.gz', True)
save(index, 'countries.json')

sprite = Image.new('RGBA', (24 * 16, 18 * ((len(index) + 15) // 16)))
with TemporaryDirectory() as temp, ThreadPoolExecutor(max_workers=8) as pool:
    def render(code):
        flag = flags / 'flags' / '4x3' / (code.lower() + '.svg')
        if not flag.exists():
            flag = flags / 'flags' / '4x3' / 'xx.svg'
        image = Path(temp) / (code + '.png')
        subprocess.run(['inkscape', flag, '--export-type=png', '--export-width=24', '--export-height=18',
                        '--export-filename=' + str(image)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return Image.open(image).convert('RGBA')

    for position, image in enumerate(pool.map(render, [row[0] for row in index])):
        sprite.paste(image, (position % 16 * 24, position // 16 * 18))
sprite.save(output / 'flags.webp', lossless=True)
(output / 'ODbL.txt').write_bytes(source(world, 'LICENSE'))
(output / 'MIT-Brazil.txt').write_bytes(source(brazil, 'LICENSE'))
(output / 'MIT-Flags.txt').write_bytes(source(flags, 'LICENSE'))
print(len(index), 'países e territórios,', sum(len(item[0]) for _, item in buckets), 'subdivisões,',
      sum(sum(len(region[3]) for region in item[0]) + len(item[1]) for _, item in buckets), 'localidades,', len(shards), 'arquivos.')
