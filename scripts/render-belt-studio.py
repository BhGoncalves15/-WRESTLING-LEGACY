"""Render the original studio models with Blender 4.3.

blender -b -t 4 -P scripts/render-belt-studio.py -- --out /tmp/belt-studio
Use --brand or --variant to render a simulated edition. Use --catalog to render
the per-title reference models, or --title ID to render one reference.
The shipped WebP files are offline assets.
"""

import argparse
import json
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
SERIF_PATH = FONT_PATH.with_name('DejaVuSerif-Bold.ttf')

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


def lettering(text, x, y, z, size, max_width, mat, font_path=FONT_PATH):
    font = bpy.data.curves.new(text, 'FONT')
    if font_path.exists():
        font.font = bpy.data.fonts.load(str(font_path), check_existing=True)
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

    render_studio(scene, output / f'{brand}-{variant}.png', samples, width)


def render_studio(scene, path, samples, width, contrast=False):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.adaptive_threshold = .019
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = 'AgX'
    if contrast:
        scene.view_settings.look = 'AgX - Medium High Contrast'
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
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


NETWORK = [(-1, .79), (-.76, .96), (-.54, .97), (-.42, 1), (.42, 1), (.54, .97), (.76, .96),
           (1, .79), (.94, -.40), (.70, -.61), (.36, -.80), (0, -1), (-.36, -.80), (-.70, -.61), (-.94, -.40)]
SHIELD = [(-1, .50), (-.57, .77), (-.23, .99), (.23, .99), (.57, .77), (1, .50),
          (.97, -.28), (.68, -.57), (0, -1), (-.68, -.57), (-.97, -.28)]
ARCH = [(-1, .20), (-.90, .52), (-.62, .80), (-.31, .92), (0, 1), (.31, .92),
        (.62, .80), (.90, .52), (1, .20), (1, -.37), (.82, -.67), (.45, -.85),
        (0, -.94), (-.45, -.85), (-.82, -.67), (-1, -.37)]
WINGS = [(-1, .83), (-.65, .75), (-.46, .63), (-.31, .80), (0, 1), (.31, .80), (.46, .63),
         (.65, .75), (1, .83), (.98, .43), (.75, .13), (.91, -.14), (.74, -.53),
         (.37, -.71), (0, -1), (-.37, -.71), (-.74, -.53), (-.91, -.14), (-.75, .13), (-.98, .43)]
DIAMOND = [(-1, .10), (-.80, .43), (-.33, .78), (0, 1), (.33, .78), (.80, .43), (1, .10),
           (.82, -.34), (.42, -.70), (0, -1), (-.42, -.70), (-.82, -.34)]
HEXAGON = [(-1, .04), (-.52, .93), (.52, .93), (1, .04), (.52, -.93), (-.52, -.93)]
SHAPES = {
    'baroque': BAROQUE, 'circle': ELLIPSE, 'oval': ELLIPSE, 'crest': CREST, 'network': NETWORK,
    'octagon': OCTAGON, 'shield': SHIELD, 'arch': ARCH, 'hex': HEXAGON, 'plaque': PLAQUE,
    'wings': WINGS, 'winged': WINGS, 'diamond': DIAMOND, 'sun': SUNSTONE,
}
FINISHES = {
    'gold': ('a97f43', 'cda561', 'ecd195', '8c6536'),
    'silver': ('82858a', 'b8bcc3', 'e1e2df', '6a6a70'),
    'bronze': ('845838', 'a97b50', 'e1bb83', '614433'),
}


def border(name, points, z, stroke, metal):
    piping(name, [[(x, y, z) for x, y in points]], stroke, metal, True)


def star_points(rays=5):
    return [(math.sin(i * math.pi / rays) * (1 if i % 2 == 0 else .44),
             math.cos(i * math.pi / rays) * (1 if i % 2 == 0 else .44))
            for i in range(rays * 2)]


def world_emblem(x, y, rx, ry, z, metal, inset):
    solid('Globe enamel', at(ELLIPSE[::2], rx, ry, x, y), z, .04, inset, .016)
    for scale in (.34, .66, .96):
        border('Geographic meridian', at(ELLIPSE[::3], rx * scale, ry * .93, x, y), z + .042, .013, metal)
    for latitude in (-.51, 0, .51):
        width = rx * math.sqrt(1 - latitude * latitude) * .96
        piping('Geographic parallel', [[(x + t * width / 10,
               y + ry * (latitude + (1 - (t / 10) ** 2) * abs(latitude) * .17), z + .046)
               for t in range(-10, 11)]], .013, metal)
    border('Globe flange', at(ELLIPSE[::2], rx, ry, x, y), z + .045, .029, metal)


def cast_wwe(x, y, width, height, z, metal, inset, accent):
    main = [(-.94, .68), (-.69, .68), (-.39, -.14), (0, .64), (.39, -.14), (.69, .68),
            (.94, .68), (.46, -.63), (0, .23), (-.46, -.63)]
    # Real steps in the casting cast shadows around the credential.
    for spread, level, layer in ((1.035, 0, inset), (1, .026, metal)):
        upper = at(main, width * spread, height * spread, x, y)
        solid('Raised double W', upper, z + level, .037, layer, .012)
    lower = [(-.67, -.62), (-.47, -.76), (0, -.44), (.47, -.76), (.67, -.62), (.47, -.86),
             (0, -.61), (-.47, -.86)]
    solid('Lower W fillet', at(lower, width, height, x, y), z + .028, .031, metal, .010)
    piping('Scarlet enamel underline', [[(x - .65 * width, y - .80 * height, z + .06),
                                         (x + .61 * width, y - .65 * height, z + .06)]], .040, accent)


def relief_emblem(kind, mark, y, z, metal, face, accent, dark, pale):
    if kind in ('wwe', 'wwe-globe'):
        if kind == 'wwe-globe':
            world_emblem(0, y, 1.11, 1.00, z, pale, dark)
        cast_wwe(0, y + .08, 1.88 if kind == 'wwe' else 1.10, 1.40 if kind == 'wwe' else .95,
                 z + .073, pale, dark, accent)
        return
    if kind == 'intercontinental':
        for x in (-1.40, 1.40):
            world_emblem(x, y, .47, .64, z, metal, accent)
        world_emblem(0, y, .79, 1.02, z + .004, metal, dark)
        cast_wwe(0, y + .09, .62, .60, z + .073, pale, dark, accent)
        return
    if kind in ('world', 'continent'):
        world_emblem(0, y, 1.08, .67, z, metal, accent)
        if kind == 'continent':
            coast = [(-.60,.45),(-.34,.58),(.10,.58),(.36,.46),(.05,.25),(.08,.03),(.45,-.14),
                     (.51,-.31),(.32,-.45),(.17,-.71),(.00,-.86),(-.13,-.63),(-.19,-.30),
                     (-.44,-.17),(-.52,.10),(-.71,.28)]
            solid('Die struck silhouette of the Americas', at(coast, 1.03, .69, y=y), z + .057, .032, pale, .012)
        return
    if kind in ('eagle', 'winged'):
        for side in (-1, 1):
            feather = [(.08,-.15),(.33,.13),(.75,.29),(1.56,.48),(1.39,.28),(1.28,.12),
                       (1.12,-.07),(.93,-.26),(.66,-.32),(.30,-.29)]
            solid('Cast wing', [(side * x, y + t) for x, t in (feather if side == 1 else reversed(feather))], z, .077, metal, .026)
            strokes = [[(side * (.18 + i * .12), y - .13, z + .082),
                        (side * (.65 + i * .12), y + .20 + i * .039, z + .082)] for i in range(6)]
            piping('Feather engraving', strokes, .012, face)
        solid('Eagle body', at(CREST, .25, .38, y=y - .10), z + .06, .046, pale, .016)
        if kind == 'eagle':
            piping('Enamel stripes', [[(x, y - .23, z + .112), (x, y - .42 + abs(x) * .45, z + .112)]
                                      for x in (-.16, -.08, 0, .08, .16)], .024, accent)
        else:
            lettering(mark, 0, y + .12, z + .085, .40, 1.26, dark)
        return
    if kind == 'brazil':
        solid('Flag enamel', at(DIAMOND, 1.26, .70, y=y), z, .044, metal, .018)
        world_emblem(0, y, .47, .43, z + .05, pale, dark)
        return
    if kind in ('star', 'compass', 'sun'):
        rays = {'star': 5, 'compass': 8, 'sun': 12}[kind]
        solid('Radiant backing', at(ELLIPSE, .81, .70, y=y), z, .043, accent, .017)
        solid('Coin relief', at(star_points(rays), .95, .70, y=y), z + .043, .039, metal, .018)
        solid('Center cabochon', at(ELLIPSE[::4], .28, .24, y=y), z + .078, .042, pale, .015)
        return
    if kind == 'crown':
        crown = [(-1,-.36),(-.96,.36),(-.49,.06),(-.37,.45),(-.16,.24),(0,.65),(.16,.24),
                 (.37,.45),(.49,.06),(.96,.36),(1,-.36),(.78,-.53),(-.78,-.53)]
        solid('Crown bezel', at(list(reversed(crown)), 1.03, .94, y=y), z, .072, metal, .028)
        solid('Crown enamel', at(list(reversed(crown)), .90, .78, y=y), z + .07, .026, accent, .012)
        gems([(x, y - .21, z + .107, .062) for x in (-.64, -.32, 0, .32, .64)], pale, 15)
        return
    if kind in ('twins', 'trio', 'split'):
        xs = (-.71, .71) if kind != 'trio' else (-.90, 0, .90)
        for index, x in enumerate(xs):
            emblem = SHIELD if kind != 'split' else DIAMOND
            solid('Team escutcheon', at(emblem, .46, .53, x, y), z, .057, metal, .016)
            solid('Team enamel', at(emblem, .38, .44, x, y), z + .056, .031, accent if index % 2 == 0 else dark, .009)
            lettering(('I', 'II', 'III')[index], x, y, z + .089, .39, .47, pale, SERIF_PATH)
        return
    if kind == 'wave':
        for i in range(3):
            piping('Wave chasing', [[(x / 18, y + .17 * i - .19 + .13 * math.sin(x / 3.4 + i * .28), z + .035)
                                    for x in range(-21, 22)]], .048 - i * .008, (metal, pale, accent)[i])
        return
    if kind == 'network-lines':
        for i in range(1, 4):
            piping('Broadcast arcs', [[(math.sin(t * .073) * i * .32, y + math.cos(t * .073) * i * .21 - .36, z)
                                      for t in range(-16, 17)]], .036, pale)
        gems([(0, y - .32, z, .098)], metal, 17)
        return
    if kind == 'cross':
        for slope in (-1, 1):
            piping('X relief', [[(-1.06, y - .59 * slope, z), (1.06, y + .59 * slope, z)]], .145, accent)
            piping('X polished stripe', [[(-1.03, y - .56 * slope, z + .13),
                                          (1.03, y + .56 * slope, z + .13)]], .040, pale)
        return
    if kind == 'laurel':
        paths = []
        for side in (-1, 1):
            for i in range(8):
                theta = (i + 1) * math.pi / 11
                x, t = side * .98 * math.sin(theta), -.54 * math.cos(theta)
                paths.append([(a, b, z) for a, b in at(DIAMOND, .14 + i * .004, .08, x, y + t)])
        piping('Laurel leaf clusters', paths, .021, metal, True)
        lettering(mark, 0, y, z, .40, 1.14, pale)
        return
    emblem = SHIELD if kind == 'crest' else OCTAGON
    if kind in ('television', 'network-tv'):
        emblem = smooth_outline(PLAQUE, 2)
        solid('Cabinet frame', at(emblem, 1.29, .64, y=y), z, .071, metal, .025)
        solid('Screen enamel', at(emblem, 1.13, .49, y=y), z + .067, .034, accent, .014)
        lettering(mark if kind == 'network-tv' else 'TV', 0, y + .01, z + .106, .54, 1.79, pale)
        return
    solid('Badge casting', at(emblem, 1.24, .63, y=y), z, .048, metal, .020)
    solid('Badge insert', at(emblem, 1.13, .54, y=y), z + .045, .035, accent, .012)
    lettering(mark, 0, y + .015, z + .082, .59, 1.95, pale)


def catalog_studio(design, output, samples, width):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    brand = design['brand']
    brand_mark = BRANDS[brand][0]
    mark = design.get('mark', brand_mark)
    build = SHAPES[design['plate']]
    mw, mh = design['size']
    accent_code = design.get('accent', BRANDS[brand][5])
    z = .51
    edge_code, plate_code, lip_code, engrave_code = FINISHES[design['finish']]
    edge = material('Machined edge', edge_code, .94, .25)
    plate = material('Brushed plate', plate_code, .88, .31, .15, 125)
    lip = material('Polished raised relief', lip_code, .93, .22)
    bright = material('Mirror finish', 'e4e1dc' if brand in ('wwe', 'nxt') else lip_code, .89, .25)
    antique = material('Antiqued engraving', engrave_code, .88, .32)
    dark = material('Black enamel', '151b23', .14, .28, .05, 100, .23)
    accent = material('Colored enamel', accent_code, .34, .30, coat=.25)
    face = plate if design['face'] == 'gold' else material('Inset enamel', design['face'], .29, .29, .07, 90, .23)
    engraving = antique if face == plate else lip
    leather = design.get('leather', '1c181b')
    pale = int(leather, 16) >= 0xbbbbbb
    hide = material('Natural grained leather', leather, .01, .55, .25, 120, .08)
    hide.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value = .23
    thread = material('Tonal saddle thread', 'aa9d8d' if pale else '594c43', .04, .63)
    edging = material('Burnished leather edge', 'c2b9ac' if pale else '151011', .05, .37)
    stones = material('Cut glass stones', 'dadbdb', .62, .19, coat=.30)

    outer = 6.75 if design.get('wings') else 6.47
    top = [(0, mh + .15), (mw * .56, mh + .15), (mw * .82, mh * .81), (mw + .11, mh * .57),
           (3.78, 1.12), (4.89, .91), (outer - .37, .78), (outer, .59)]
    right = top + [(outer, -.59), (outer - .37, -.74), (4.89, -.89), (3.78, -1.09),
                   (mw + .11, -mh * .52), (mw * .62, -mh * .79), (0, -mh - .14)]
    strap = smooth_outline(right + [(-x, y) for x, y in reversed(right[1:-1])], 3)
    solid('Leather strap, full length', strap, .035, .18, hide, .051)
    border('Burnished strap edge', at(strap, .996, .986), .119, .040, edging)
    piping('Saddle stitches', [[(x - .024 * dx, y - .024 * dy, .217), (x + .024 * dx, y + .024 * dy, .217)]
                              for x, y, dx, dy in around(at(strap, .984, .945), .097)], .010, thread)
    for sign in (-1, 1):
        for i in range(3):
            for y in (-.29, .29):
                x = sign * (outer - .24 - i * .23)
                solid('Snaps', at(ELLIPSE[::5], .075, .075, x, y), .208, .04, edge, .014)
                solid('Recessed snap center', at(ELLIPSE[::6], .038, .038, x, y), .246, .014, edging, .006)

    main = smooth_outline(build, 1)
    solid('Die cast center plate', at(main, mw, mh), .210, .205, edge, .042)
    solid('Satin face', at(main, mw * .96, mh * .96), .397, .074, plate, .022)
    solid('Struck center recess', at(main, mw * .83, mh * .84), .463, .035, face, .015)
    for factor, height, stroke in ((.94, .472, .032), (.869, .476, .012), (.821, .500, .019)):
        border('Continuous chased rim', at(main, mw * factor, mh * factor), height, stroke, lip)
    if design['detail'] in ('jewels', 'sun', 'rays'):
        gems([(x, y, .477, .035 if design['detail'] == 'jewels' else .022)
              for x, y, _, _ in around(at(main, mw * .903, mh * .907), .131)], stones, 40)
    if design['detail'] in ('scroll', 'laurel', 'sun'):
        filigree(design['detail'], engraving, mw * .90)
    # Engraved line work follows the shoulders of the plate.
    engraving_paths = []
    for sign in (-1, 1):
        for i in range(7):
            theta = .19 + i * .21
            x, y = sign * mw * (.64 + .044 * math.sin(i)), .87 - .235 * i
            if design['detail'] == 'scroll':
                path = [(x + sign * (.20 - .007 * t) * math.cos(t * .43 + theta),
                         y + (.103 - .003 * t) * math.sin(t * .43 + theta), z) for t in range(24)]
            else:
                path = [(x, y - .118, z), (x + sign * .19, y + .02, z), (x + sign * .028, y + .105, z)]
            engraving_paths.append(path)
    piping('Marginal chasing', engraving_paths, .010, engraving)

    kind = design['emblem']
    usa = brand == 'wwe' and kind == 'eagle'
    emblem_y = -.83 if usa else .37
    relief_emblem(kind, mark, emblem_y, z + .022, lip, engraving, accent, dark, bright)
    show_mark = kind != 'wwe' and kind != 'wwe-globe' and (kind != 'mark' or mark != brand_mark)
    if show_mark and not usa:
        lettering(brand_mark, 0, mh * .62, z, .157, 1.54, engraving)
    if kind == 'wwe-globe':
        for sign in (-1, 1):
            for level in range(4):
                x, y = sign * (1.56 + .11 * math.sin(level)), 1.03 - level * .44
                for radius in (.19, .30, .42):
                    points = [(x + sign * radius * (1 - t / 50) * math.cos(t * .32),
                               y + radius * .58 * (1 - t / 50) * math.sin(t * .32), z + .012)
                              for t in range(26)]
                    piping('Cast foliate scroll', [points], .018 if radius > .28 else .013, engraving)
                for i in range(5):
                    angle = i * math.pi / 5
                    solid('Raised flower petal', at(DIAMOND, .07, .12, x + math.sin(angle) * .14,
                                                    y + math.cos(angle) * .12), z + .005, .039, lip, .012)

    lines = design['text']
    text_y = {'wwe': -1.10, 'wwe-globe': -.87, 'intercontinental': -.76}.get(kind, -.56)
    lens = min(mw * 1.38, 3.64)
    font_path = SERIF_PATH if design['detail'] in ('scroll', 'laurel') else FONT_PATH
    if usa:
        lettering(lines[0], 0, .83, z + .016, .27, 3.10, dark)
        lettering(lines[1], 0, .25, z + .016, .64, 3.80, accent)
        red = material('Scarlet enamel', '95212a', .20, .27)
        cast_wwe(0, 1.35, .53, .36, z + .012, bright, dark, red)
        for sign in (-1, 1):
            for i in range(4):
                piping('Inlaid flag ribbons', [[(sign * (.33 + t * .100), -1.46 - i * .082 + .043 * t, z + .013)
                                                 for t in range(15)]], .026, bright if i % 2 else red)
            for i in range(4):
                solid('Struck star', at(star_points(), .072, .076, sign * (.70 + i * .25), 1.24 - i * .11),
                      z + .015, .028, bright, .006)
    else:
        text_metal = dark if brand == 'wwe' and face == plate else engraving
        for i, text in enumerate(lines):
            lettering(text, 0, text_y - .30 * i, z + .021, (.32 if i == 0 else .235),
                      lens * (1 if i == 0 else .88), text_metal, font_path)

    # Side plates share the same metal and fasteners as the center casting.
    contour = smooth_outline(SHAPES[design['sides']], 1)
    for sign in (-1, 1):
        sides = [(3.73, 1.05), (5.25, .55)] if design.get('wings') else [(3.88, 1.22)]
        for index, (side_x, size) in enumerate(sides):
            x = sign * side_x
            side_height = .92 if index == 0 else .65
            solid('Side plate cast flange', at(contour, size, side_height, x), .210, .148, edge, .036)
            solid('Side plate face', at(contour, size * .903, side_height * .884, x), .348, .055, plate, .017)
            border('Side polished rim', at(contour, size * .916, side_height * .893, x), .403, .027, lip)
            bezel = ELLIPSE[::2]
            solid('Side badge bezel', at(bezel, size * .57, side_height * .63, x), .400, .062, lip, .017)
            solid('Side badge enamel', at(bezel, size * .48, side_height * .53, x), .456, .037, accent, .013)
            border('Side inset beading', at(bezel, size * .508, side_height * .57, x), .487, .012, bright)
            if brand == 'wwe':
                cast_wwe(x, .026, size * .36, side_height * .43, .501, bright, dark, accent)
            elif index == 0:
                lettering(brand_mark, x, 0, .499, min(.285, size * .35), size * .66, bright)
            else:
                solid('Outer star insert', at(star_points(), size * .33, .25, x), .495, .035, bright, .008)
            if design['detail'] == 'jewels':
                gems([(a, b, .407, .026) for a, b, _, _ in around(at(contour, size * .80, side_height * .78, x), .145)], stones, 11)
    render_studio(scene, output, samples, width, contrast=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--brand', choices=BRANDS)
    parser.add_argument('--catalog', action='store_true')
    parser.add_argument('--title', action='append', help='Render the specified catalog ID. May be repeated.')
    parser.add_argument('--variant', choices=VARIANTS)
    parser.add_argument('--samples', type=int, default=90)
    parser.add_argument('--width', type=int, default=1150)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    args.out.mkdir(exist_ok=True, parents=True)
    if args.catalog or args.title:
        designs = json.loads(Path(__file__).with_name('belt-catalog-designs.json').read_text(encoding='utf-8'))
        for title_id in args.title or designs:
            design = designs[title_id]
            if not args.brand or args.brand == design['brand']:
                catalog_studio(design, args.out / f'{title_id}.png', args.samples, args.width)
        return
    for brand in [args.brand] if args.brand else BRANDS:
        for variant in [args.variant] if args.variant else VARIANTS:
            studio(brand, variant, args.out, args.samples, args.width)


if __name__ == '__main__':
    main()
