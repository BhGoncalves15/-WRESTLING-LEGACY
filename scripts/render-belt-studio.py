"""Render the original studio models with Blender 4.3.

blender -b -t 4 -P scripts/render-belt-studio.py -- --out /tmp/belt-studio
Use --brand or --variant to render a subset. The shipped WebP files are offline assets.
"""

import argparse
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Vector


# Lower y values correspond to the lower edge in the product photograph.
WORLD = [(-.99, .47), (-.76, .83), (-.42, .94), (.42, .94), (.76, .83), (.99, .47),
         (.94, -.51), (.65, -.79), (0, -1), (-.65, -.79), (-.94, -.51)]
BAROQUE = [(-1, .35), (-.83, .47), (-.78, .68), (-.49, .69), (-.38, .85), (0, 1),
           (.38, .85), (.49, .69), (.78, .68), (.83, .47), (1, .35), (.96, -.40),
           (.79, -.51), (.69, -.75), (.43, -.77), (0, -1), (-.43, -.77), (-.69, -.75),
           (-.79, -.51), (-.96, -.40)]
CREST = [(-1, .31), (-.92, .57), (-.65, .76), (-.31, .86), (0, .99), (.31, .86),
         (.65, .76), (.92, .57), (1, .31), (.97, -.32), (.73, -.64), (.38, -.79),
         (0, -.96), (-.38, -.79), (-.73, -.64), (-.97, -.32)]
PLAQUE = [(-1, .46), (-.74, .85), (-.46, .85), (-.38, .96), (.38, .96), (.46, .85),
          (.74, .85), (1, .46), (1, -.46), (.71, -.87), (.32, -.87), (0, -1),
          (-.32, -.87), (-.71, -.87), (-1, -.46)]
OCTAGON = [(-1, .49), (-.68, .94), (.68, .94), (1, .49), (1, -.49), (.68, -.94),
           (-.68, -.94), (-1, -.49)]
SUNSTONE = [(math.sin(i * math.tau / 36) * (1 if i % 3 else .93),
             math.cos(i * math.tau / 36) * (1 if i % 3 else .93)) for i in range(36)]
ELLIPSE = [(math.sin(i * math.tau / 96), math.cos(i * math.tau / 96)) for i in range(96)]

FONT_PATH = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')

BRANDS = {
    'wwe': ('WWE', WORLD, (2.06, 1.96), '1a1720', '1c1920', 'eb2634', 'diamond', OCTAGON),
    'nxt': ('NXT', OCTAGON, (2.00, 1.83), '19191d', '171b21', 'ffbd22', 'facet', WORLD),
    'aew': ('AEW', BAROQUE, (2.32, 2.02), '18171c', '2a2628', 'ca9c4f', 'scroll', CREST),
    'njpw': ('NJPW', CREST, (2.15, 1.97), '261317', '320e19', 'ac1831', 'laurel', ELLIPSE),
    'tna': ('TNA', PLAQUE, (2.20, 1.90), '1b1822', '2a151b', 'bd2240', 'facet', OCTAGON),
    'aaa': ('AAA', SUNSTONE, (2.20, 2.05), '3a141c', '441620', 'b92336', 'sun', SUNSTONE),
    'roh': ('ROH', OCTAGON, (2.03, 1.84), '191722', '221d29', '62416b', 'diamond', PLAQUE),
    'bwf': ('BWF', ELLIPSE, (2.23, 1.87), '16221b', '123b27', 'dfaa39', 'laurel', CREST),
}
VARIANTS = ('standard', 'unified', 'redesign', 'tribute')
REDESIGN_OUTLINES = {
    'wwe': OCTAGON, 'nxt': PLAQUE, 'aew': CREST, 'njpw': ELLIPSE,
    'tna': OCTAGON, 'aaa': CREST, 'roh': WORLD, 'bwf': PLAQUE,
}
TRIBUTE_LEATHER = {
    'wwe': '2f1422', 'nxt': '2b2015', 'aew': '2e1825', 'njpw': '471823',
    'tna': '291421', 'aaa': '522024', 'roh': '251c39', 'bwf': '19382a',
}


def rgb(code):
    srgb = [int(code[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4 for c in srgb], 1)


def material(name, code, metallic, roughness, grain=0, scale=100, coat=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    finish = tree.nodes.get('Principled BSDF')
    finish.inputs['Base Color'].default_value = rgb(code)
    finish.inputs['Metallic'].default_value = metallic
    finish.inputs['Roughness'].default_value = roughness
    finish.inputs['Coat Weight'].default_value = coat
    finish.inputs['Coat Roughness'].default_value = .24
    if grain:
        noise = tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = scale
        noise.inputs['Roughness'].default_value = .72
        coords = tree.nodes.new('ShaderNodeTexCoord')
        tree.links.new(coords.outputs['Object'], noise.inputs['Vector'])
        bump = tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = grain
        bump.inputs['Distance'].default_value = .032
        tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        tree.links.new(bump.outputs['Normal'], finish.inputs['Normal'])
    return mat


def smooth_outline(points, iterations=1):
    for _ in range(iterations):
        points = [tuple(a * weight + b * (1 - weight) for a, b in zip(first, second))
                  for first, second in zip(points, points[1:] + points[:1])
                  for weight in (.84, .16)]
    return points


def at(points, sx, sy, x=0, y=0):
    return [(x + a * sx, y + b * sy) for a, b in points]


def solid(name, points, bottom, height, mat, bevel):
    points = list(reversed(points))
    n = len(points)
    verts = [(x, y, z) for z in (bottom, bottom + height) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    edge = obj.modifiers.new('Rounded edges', 'BEVEL')
    edge.width = bevel
    edge.segments = 3
    edge.affect = 'EDGES'
    obj.modifiers.new('Face normals', 'WEIGHTED_NORMAL')
    return obj


def piping(name, paths, depth, mat, closed=False):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = depth
    curve.bevel_resolution = 2
    for path in paths:
        spline = curve.splines.new('POLY')
        spline.points.add(len(path) - 1)
        for point, (x, y, z) in zip(spline.points, path):
            point.co = (x, y, z, 1)
        spline.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)


def around(points, spacing):
    length = 0
    for (x, y), (a, b) in zip(points, points[1:] + points[:1]):
        segment = math.hypot(a - x, b - y)
        while length <= segment:
            yield x + (a - x) * length / segment, y + (b - y) * length / segment, (a - x) / segment, (b - y) / segment
            length += spacing
        length -= segment


def lettering(text, x, y, z, size, max_width, mat):
    font = bpy.data.curves.new(text, 'FONT')
    if FONT_PATH.exists():
        font.font = bpy.data.fonts.load(str(FONT_PATH), check_existing=True)
    font.body = text
    font.align_x = 'CENTER'
    font.align_y = 'CENTER'
    font.size = size
    font.extrude = .016
    font.bevel_depth = .005
    label = bpy.data.objects.new(text, font)
    bpy.context.collection.objects.link(label)
    label.location = (x, y, z)
    label.data.materials.append(mat)
    bpy.context.view_layer.update()
    if label.dimensions.x > max_width:
        label.scale.x = max_width / label.dimensions.x


def gems(points, mat, seed):
    rng = random.Random(seed)
    verts, faces = [], []
    for x, y, z, r in points:
        start = len(verts)
        angle = rng.random() * math.tau
        verts += [(x + math.cos(angle + i * math.tau / 8) * radius * r,
                   y + math.sin(angle + i * math.tau / 8) * radius * r, z + rise * r)
                  for radius, rise in ((1, 0), (.53, .52)) for i in range(8)]
        faces.append(tuple(start + i for i in range(8, 16)))
        faces.extend(tuple(start + i for i in face) for face in
                     [(i, (i + 1) % 8, (i + 1) % 8 + 8, i + 8) for i in range(8)])
    mesh = bpy.data.meshes.new('Individually set stones')
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new('Individually set stones', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)


def filigree(style, mat, width):
    lines = []
    for side in (-1, 1):
        for index in range(5):
            y = .84 - index * .29
            x = width * (.74 + .03 * math.sin(index * .8))
            if style in ('scroll', 'laurel'):
                lines.append([(side * (x + math.cos(i / 16 * math.tau) * (.18 - i * .004)),
                               y + math.sin(i / 16 * math.tau) * (.10 - i * .002), .519) for i in range(22)])
            else:
                lines.append([(side * (x + .22 * math.cos(i * math.tau / (6 if style == 'sun' else 4))),
                               y + .095 * math.sin(i * math.tau / (6 if style == 'sun' else 4)), .520)
                              for i in range(7 if style == 'sun' else 5)])
    piping('Struck ornament', lines, .016, mat)


def source_light(name, location, power, width, height, color=(1, 1, 1)):
    light = bpy.data.lights.new(name, 'AREA')
    light.shape = 'RECTANGLE'
    light.energy = power
    light.size = width
    light.size_y = height
    light.color = color
    fixture = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(fixture)
    fixture.location = location
    fixture.rotation_euler = (Vector((0, 0, .25)) - fixture.location).to_track_quat('-Z', 'Y').to_euler()


def studio(brand, variant, output, samples, width):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    mark, outline, (mw, mh), leather, enamel, accent, ornament, side = BRANDS[brand]
    unified = variant == 'unified'
    redesigned = variant == 'redesign'
    tribute = variant == 'tribute'
    if redesigned:
        outline = REDESIGN_OUTLINES[brand]
        mw, mh = mw * 1.08, mh * .93
    if tribute:
        leather = TRIBUTE_LEATHER[brand]
    # Recessed enamel is distinct from polished relief and the satin face.
    gold = (brand in ('roh', 'nxt')) if redesigned else brand not in ('roh', 'nxt') or unified or tribute
    edge = material('Machined edge', 'd7b16e' if gold else 'c5c9cf', .92, .22)
    plate = material('Brushed alloy', 'c29a58' if gold else 'a7abb4', .86, .34, .13, 85)
    lip = material('Polished raised relief', 'e5c282' if gold else 'd7dde5', .95, .24)
    secondary = material('Medallion ring', 'babec7' if gold else 'b78b4e', .92, .26)
    engraving = material('Antiqued engraved leaves', '96713d' if gold else '72767f', .83, .31)
    dark = material('Enamel', enamel, .16, .34, .03, 90, .18)
    painted = material('Colored enamel', accent, .34, .28, coat=.27)
    hide = material('Grained leather', leather, .01, .67, .19, 120, .03)
    hide.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value = .23
    thread = material('Saddle thread', '65534a' if brand != 'aaa' else '9e6351', .08, .62)
    edging = material('Burnished edge', '110e13', .04, .38)
    stone = material('Cut crystal', 'b6bac4', .65, .18, coat=.20)

    strap = [(0, 1.96), (1.85, 1.76), (3.10, .97), (4.63, .84), (6.25, .73), (6.82, .59),
             (6.86, -.59), (6.28, -.74), (4.63, -.85), (3.10, -.97), (1.87, -1.76), (0, -1.96),
             (-1.87, -1.76), (-3.10, -.97), (-4.63, -.88), (-6.28, -.78), (-6.77, -.65),
             (-6.86, .58), (-6.36, .74), (-4.63, .87), (-3.10, .97), (-1.85, 1.76)]
    strap = smooth_outline(strap, 3)
    solid('Leather blank', strap, .07, .16, hide, .045)
    piping('Burnished leather edge', [[(x, y, .137) for x, y in strap]], .04, edging, True)
    seam = at(strap, .984, .929)
    piping('Saddle stitch', [[(x - .024 * dx, y - .024 * dy, .231), (x + .024 * dx, y + .024 * dy, .231)]
                            for x, y, dx, dy in around(seam, .092)], .010, thread)
    for sign in (-1, 1):
        for i in range(3):
            for y in (-.30, .28):
                x = sign * (5.98 + i * .24)
                solid('Snap rim', at(ELLIPSE[::6], .085, .085, x, y), .222, .044, secondary, .015)
                solid('Snap center', at(ELLIPSE[::6], .045, .045, x, y), .262, .011, edging, .006)

    main = smooth_outline(list(outline), 1)
    solid('Center plate cast blank', at(main, mw, mh), .230, .205, edge, .045)
    solid('Satin offset', at(main, mw * .94, mh * .94), .402, .081, plate, .022)
    bg = dark if brand in ('nxt', 'tna', 'roh') else plate
    solid('Stamped inset', at(main, mw * .746, mh * .775), .476, .036, bg, .016)
    rails = (.765, .88, .94) if tribute else (.765, .94)
    piping('Polished borders', [[(x, y, .483) for x, y in at(main, mw * factor, mh * factor)]
                                for factor in rails], .026, lip, True)
    filigree(ornament, engraving if bg is plate else lip, mw * .90)
    wreath = []
    for side_sign in (-1, 1):
        for i in range(7):
            y = -.63 + i * .24
            x = (mw * .62 + .17 * math.sin(math.pi * i / 6)) * side_sign
            for direction in (-1, 1):
                wreath.append([(x + side_sign * direction * math.sin(t * math.pi / 10) * .215,
                                y + t * .021, .516) for t in range(11)])
    piping('Fine leaf engraving', wreath, .010, engraving if bg is plate else secondary)
    gems([(x, y, .49, .034 if unified else .026) for x, y, _, _ in around(at(main, mw * .874, mh * .881), .171)
          if ornament in ('diamond', 'sun') or abs(y) > 1.02], stone, 53)

    # Central medallion and cast lettering use actual geometry for the shadows.
    center = ELLIPSE if ornament in ('laurel', 'sun', 'scroll') else OCTAGON
    solid('Logo bezel', at(center, 1.27, .74, y=.23), .510, .074, lip, .018)
    solid('Logo enamel', at(center, 1.19, .66, y=.23), .572, .032, dark, .011)
    piping('Medallion inner rim', [[(x, y, .607) for x, y in at(center, 1.155, .624, y=.23)]], .013, secondary, True)
    if brand == 'wwe':
        piping('Cast double W', [[(x, y, .63) for x, y in path] for path in [
            [(-.77, .59), (-.43, .13), (0, .61), (.43, .13), (.77, .59)],
            [(-.64, .64), (-.38, .31), (0, .71), (.38, .31), (.64, .64)]
        ]], .043, lip)
        piping('Red enamel accent', [[(-.61, .09, .631), (.66, .19, .631)]], .027, painted)
    else:
        lettering(mark, 0, .32, .612, .76, 1.94, lip)
    inscription = {'aew': 'ALL ELITE', 'njpw': 'KING OF SPORTS', 'tna': 'TOTAL NONSTOP ACTION',
                   'aaa': 'LUCHA LIBRE', 'roh': 'RING OF HONOR', 'bwf': 'BRAZILIAN WRESTLING',
                   'nxt': 'NXT WRESTLING', 'wwe': 'WORLD WRESTLING'}
    lettering(inscription[brand], 0, 1.105, .529, .132, 1.85, engraving if bg is plate else lip)
    lettering('UNIFICADO' if unified else 'HOMENAGEM' if tribute else 'CHAMPIONSHIP' if brand != 'bwf' else 'CAMPEONATO',
              0, -.135, .611, .16, 1.30, secondary)
    solid('Inset inscription strip', at(smooth_outline(PLAQUE, 1), 1.30, .29, y=-.91), .512, .048, lip, .014)
    solid('Title inscription surface', at(smooth_outline(PLAQUE, 1), 1.24, .238, y=-.91), .548, .026, dark, .010)

    for sign in (-1, 1):
        plates = [(3.18, .90), (4.89, .68)] if unified or tribute else [(3.63, 1.07)]
        for index, (location, size) in enumerate(plates):
            x = sign * location
            contour = smooth_outline(list(side), 1)
            solid('Side cast blank', at(contour, size, .74, x), .226, .123, edge, .032)
            solid('Side polished lip', at(contour, size * .92, .675, x), .337, .054, lip, .017)
            solid('Side satin metal', at(contour, size * .85, .595, x), .382, .035, plate, .010)
            solid('Side medallion', at(center, size * .50, .43, x), .41, .061, secondary, .016)
            solid('Side colored enamel', at(center, size * .416, .345, x), .464, .025, painted, .009)
            lettering(mark if index == 0 else '★' if tribute else 'I I', x, 0, .489, .245, size * .681, lip)
            gems([(a, b, .418, .027) for a, b, _, _ in around(at(contour, size * .74, .54, x), .158)], stone, 31)

    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.adaptive_threshold = .019
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = 'AgX'
    scene.world = bpy.data.worlds.new('Studio ambient')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .50
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
    bpy.context.object.is_shadow_catcher = True
    scene.render.film_transparent = True
    source_light('Left softbox', (-5, 5, 7), 1900, 8, 3.4, (1, .95, .90))
    source_light('Right key', (6, 2, 6.5), 1100, 5.0, 2.4, (.90, .94, 1))
    source_light('Long bottom reflector', (0, -5, 6), 900, 10, 2.1)
    source_light('Top strip', (0, 4.6, 8), 1050, 12, 1.1)
    camera = bpy.data.cameras.new('Frontal lens')
    camera.type = 'ORTHO'
    camera.ortho_scale = 14.95
    view = bpy.data.objects.new('Frontal lens', camera)
    bpy.context.collection.objects.link(view)
    view.location = (0, 0, 17)
    scene.camera = view

    # Composite over exact white while retaining the light contact shadow.
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    layers = tree.nodes.new('CompositorNodeRLayers')
    composite = tree.nodes.new('CompositorNodeComposite')
    over = tree.nodes.new('CompositorNodeAlphaOver')
    over.inputs[1].default_value = (18, 18, 18, 1)
    tree.links.new(layers.outputs['Image'], over.inputs[2])
    tree.links.new(over.outputs[0], composite.inputs['Image'])
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width * .4)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.filepath = str(output / f'{brand}-{variant}.png')
    bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--brand', choices=BRANDS)
    parser.add_argument('--variant', choices=VARIANTS)
    parser.add_argument('--samples', type=int, default=90)
    parser.add_argument('--width', type=int, default=1150)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.out.mkdir(exist_ok=True, parents=True)
    for brand in [args.brand] if args.brand else BRANDS:
        for variant in [args.variant] if args.variant else VARIANTS:
            studio(brand, variant, args.out, args.samples, args.width)


if __name__ == '__main__':
    main()
