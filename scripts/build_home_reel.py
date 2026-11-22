#!/usr/bin/env python3
"""Build the home page reel from data/home-reel.json.

Each slide is a simple original drawing (inline SVG) with the joke as real text below it, so screen readers and
search engines get the words and the picture is described in the drawing's title. The reel is written into
index.html between <!--reel--> and <!--/reel-->, wherever those markers sit; since November 22, 2026 (owner direction) that is
right after the state map at the top of the page. The crisis lines are a small side note near the bottom.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'data/home-reel.json').read_text())
E = lambda s: html.escape(s, quote=True)

SKIN = ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#5c3a1e', '#ffdbac']
INK = '#20313a'
GROUND = 172


def head(x, y, skin, hair=None, hair_style='short', glasses=False, face=1):
    s = [f'<circle cx="{x}" cy="{y}" r="13" fill="{skin}"/>']
    if hair and hair_style == 'short':
        s.append(f'<path d="M{x-13} {y-2} a13 13 0 0 1 26 0 q-6 -7 -13 -7 q-7 0 -13 7z" fill="{hair}"/>')
    elif hair and hair_style == 'long':
        s.append(f'<path d="M{x-14} {y+10} q-2 -24 14 -24 q16 0 14 24 q-4 -12 -14 -14 q-10 2 -14 14z" fill="{hair}"/>')
    elif hair and hair_style == 'bun':
        s.append(f'<circle cx="{x}" cy="{y-15}" r="6" fill="{hair}"/><path d="M{x-13} {y-2} a13 13 0 0 1 26 0 q-6 -6 -13 -6 q-7 0 -13 6z" fill="{hair}"/>')
    elif hair and hair_style == 'gray':
        s.append(f'<path d="M{x-13} {y-1} a13 13 0 0 1 26 0 q-3 -5 -6 -4 q-7 -4 -14 0 q-3 -1 -6 4z" fill="#d9dcd6"/>')
    d = face
    s.append(f'<circle cx="{x-4*d}" cy="{y-1}" r="1.6" fill="{INK}"/><circle cx="{x+5*d if d>0 else x+4*d}" cy="{y-1}" r="1.6" fill="{INK}"/>' if d else '')
    if glasses:
        s.append(f'<rect x="{x-9}" y="{y-5}" width="8" height="6" rx="2" fill="#20313a"/><rect x="{x+1}" y="{y-5}" width="8" height="6" rx="2" fill="#20313a"/><line x1="{x-1}" y1="{y-2}" x2="{x+1}" y2="{y-2}" stroke="#20313a" stroke-width="1.5"/>')
    s.append(f'<path d="M{x-4} {y+5} q4 3 8 0" stroke="{INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>')
    return ''.join(s)


def standing(x, skin, shirt, pants, hair=None, hair_style='short', arms=('down', 'down'), prosthetic=None, glasses=False, lean=0, skirt=False):
    """A standing person centred on x. arms: per side, one of down, out, up, forward, sign, phone, cane."""
    hx = x + lean
    s = [head(hx, 58, skin, hair, hair_style, glasses)]
    s.append(f'<path d="M{x-13} {75} q0 -4 4 -4 h18 q4 0 4 4 v42 h-26z" fill="{shirt}"/>')
    if skirt:
        s.append(f'<path d="M{x-14} 112 h28 l5 26 h-38z" fill="{pants}"/>')
        legs = [(x-8, 138), (x+3, 138)]
        for lx, top in legs:
            s.append(f'<rect x="{lx}" y="{top}" width="5" height="{GROUND-top-2}" fill="{skin}"/>')
    else:
        for i, lx in enumerate((x-10, x+2)):
            if prosthetic == ('left' if i == 0 else 'right'):
                s.append(f'<rect x="{lx}" y="114" width="8" height="24" rx="2" fill="{pants}"/>'
                         f'<rect x="{lx+1}" y="137" width="6" height="6" rx="1.5" fill="#7d8a90"/>'
                         f'<rect x="{lx+2.5}" y="142" width="3" height="{GROUND-146}" fill="#9aa7ae"/>')
            else:
                s.append(f'<rect x="{lx}" y="114" width="8" height="{GROUND-116}" rx="2" fill="{pants}"/>')
    s.append(f'<ellipse cx="{x-6}" cy="{GROUND-1}" rx="7" ry="3" fill="{INK}"/><ellipse cx="{x+6}" cy="{GROUND-1}" rx="7" ry="3" fill="{INK}"/>')
    for side, kind in zip((-1, 1), arms):
        sx, sy = x + side*12, 78
        ends = {'down': (sx+side*3, 112), 'out': (sx+side*22, 92), 'up': (sx+side*10, 52), 'forward': (sx+side*24, 96),
                'sign': (x+side*6, 92), 'phone': (hx+side*9, 64), 'cane': (sx+side*12, 110), 'reach': (sx+side*28, 104)}
        ex, ey = ends[kind]
        s.append(f'<path d="M{sx} {sy} L{ex} {ey}" stroke="{shirt}" stroke-width="7" stroke-linecap="round"/>')
        s.append(f'<circle cx="{ex}" cy="{ey}" r="4" fill="{skin}"/>')
        if kind == 'phone':
            s.append(f'<rect x="{ex-3}" y="{ey-8}" width="6" height="11" rx="1.5" fill="{INK}"/>')
    return ''.join(s)


def wheelchair(x, skin, shirt, pants, hair=None, hair_style='short', facing=1, arm='wheel', glasses=False):
    """A seated wheelchair user; facing 1 = right, -1 = left."""
    f = facing
    s = []
    hx = x
    s.append(f'<path d="M{x-f*16} 96 v48" stroke="#4a565c" stroke-width="4" stroke-linecap="round"/>')
    s.append(f'<path d="M{x-f*16} 96 h{-f*8}" stroke="#4a565c" stroke-width="4" stroke-linecap="round"/>')
    s.append(head(hx, 80, skin, hair, hair_style, glasses, face=1 if f > 0 else -1))
    s.append(f'<path d="M{x-11} 97 q0 -4 4 -4 h14 q4 0 4 4 v36 h-22z" fill="{shirt}"/>')
    s.append(f'<rect x="{min(x, x+f*30)}" y="128" width="30" height="11" rx="4" fill="{pants}"/>')
    lx = x + f*26 - 4
    s.append(f'<rect x="{lx}" y="134" width="9" height="24" rx="3" fill="{pants}"/>')
    s.append(f'<ellipse cx="{lx+4+f*4}" cy="160" rx="7" ry="3" fill="{INK}"/>')
    s.append(f'<path d="M{x} 140 h{f*36}" stroke="#4a565c" stroke-width="3"/>')
    s.append(f'<circle cx="{x-f*2}" cy="148" r="23" fill="none" stroke="#4a565c" stroke-width="4"/>')
    s.append(f'<circle cx="{x-f*2}" cy="148" r="18" fill="none" stroke="#9aa7ae" stroke-width="1.5"/>')
    for a, b in ((0, 1), (1, 0), (.7, .7), (-.7, .7)):
        s.append(f'<line x1="{x-f*2-18*a}" y1="{148-18*b}" x2="{x-f*2+18*a}" y2="{148+18*b}" stroke="#9aa7ae" stroke-width="1.2"/>')
    s.append(f'<circle cx="{x+f*34}" cy="{GROUND-5}" r="5" fill="none" stroke="#4a565c" stroke-width="3"/>')
    if arm == 'wheel':
        s.append(f'<path d="M{x} 100 L{x+f*8} 128" stroke="{shirt}" stroke-width="7" stroke-linecap="round"/><circle cx="{x+f*8}" cy="128" r="4" fill="{skin}"/>')
    elif arm == 'sign':
        s.append(f'<path d="M{x} 100 L{x+f*14} 104" stroke="{shirt}" stroke-width="7" stroke-linecap="round"/><circle cx="{x+f*16}" cy="103" r="4" fill="{skin}"/>')
    elif arm == 'lap':
        s.append(f'<path d="M{x} 100 L{x+f*16} 124" stroke="{shirt}" stroke-width="7" stroke-linecap="round"/><circle cx="{x+f*17}" cy="125" r="4" fill="{skin}"/>')
    return ''.join(s)


def cane(x, y):
    return (f'<line x1="{x}" y1="{y}" x2="{x+14}" y2="{GROUND}" stroke="#f4f4f4" stroke-width="3.5" stroke-linecap="round"/>'
            f'<line x1="{x}" y1="{y}" x2="{x+14}" y2="{GROUND}" stroke="#20313a" stroke-width="0.6" stroke-opacity=".4"/>'
            f'<line x1="{x+11}" y1="{GROUND-12}" x2="{x+14}" y2="{GROUND}" stroke="#c0392b" stroke-width="3.5" stroke-linecap="round"/>')


def walker(x):
    return (f'<path d="M{x} 106 h26 M{x+2} 106 L{x} {GROUND-4} M{x+24} 106 L{x+26} {GROUND-4} M{x+1} 140 h24" stroke="#7d8a90" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
            f'<circle cx="{x}" cy="{GROUND-3}" r="4" fill="#c7d64a"/><circle cx="{x+26}" cy="{GROUND-3}" r="4" fill="#c7d64a"/>')


def crutch(x, top=96):
    return (f'<line x1="{x}" y1="{top}" x2="{x+4}" y2="{GROUND}" stroke="#7d8a90" stroke-width="3.5" stroke-linecap="round"/>'
            f'<path d="M{x-5} {top+2} q5 -6 10 0" stroke="#7d8a90" stroke-width="3.5" fill="none"/><line x1="{x+1}" y1="{top+16}" x2="{x+8}" y2="{top+16}" stroke="#7d8a90" stroke-width="3"/>')


def dog(x, vest='#bb8e36'):
    return (f'<path d="M{x+26} 148 q10 -6 8 -16" stroke="#6b4a2b" stroke-width="4" fill="none" stroke-linecap="round"/>'
            f'<ellipse cx="{x+8}" cy="146" rx="22" ry="11" fill="#8a5a33"/>'
            f'<rect x="{x-6}" y="138" width="24" height="13" rx="3" fill="{vest}"/>'
            f'<line x1="{x-2}" y1="144" x2="{x+14}" y2="144" stroke="#fff" stroke-width="2"/>'
            + ''.join(f'<rect x="{x+dx}" y="152" width="5" height="{GROUND-153}" rx="2" fill="#8a5a33"/>' for dx in (-10, -2, 16, 23))
            + f'<circle cx="{x-14}" cy="134" r="10" fill="#8a5a33"/><ellipse cx="{x-24}" cy="137" rx="6" ry="4" fill="#8a5a33"/>'
            f'<circle cx="{x-28}" cy="136" r="2" fill="{INK}"/><path d="M{x-10} 126 q6 4 2 14" fill="#6b4a2b"/><circle cx="{x-17}" cy="131" r="1.6" fill="{INK}"/>')


def ground(color='#cdd8cf'):
    return f'<rect x="0" y="{GROUND}" width="320" height="{200-GROUND}" fill="{color}"/>'


def sign(x, y, w, lines, fill='#183449', color='#fff', size=10):
    t = ''.join(f'<text x="{x+w/2}" y="{y+14+i*(size+3)}" font-size="{size}" font-family="system-ui,sans-serif" font-weight="700" fill="{color}" text-anchor="middle">{E(l)}</text>' for i, l in enumerate(lines))
    return f'<rect x="{x}" y="{y}" width="{w}" height="{10+len(lines)*(size+3)}" rx="4" fill="{fill}"/>{t}'


def waves(x, y, d=1, color='#bb8e36', n=3):
    return ''.join(f'<path d="M{x+d*i*7} {y-6-i*3} q{d*6} {6+i*3} 0 {12+i*6}" stroke="{color}" stroke-width="2.5" fill="none" stroke-linecap="round"/>' for i in range(n))


def scene(slide):
    sid = slide['id']
    bg = '#eef3ef'
    p = []
    if sid == 'around-back':
        bg = '#f3eee2'
        p += [ground('#d8d2c2'),
              ''.join(f'<rect x="{170+i*18}" y="{GROUND-14-i*14}" width="{150-i*18}" height="{14+i*14}" fill="#b9b2a2"/>' for i in range(5)),
              '<rect x="262" y="40" width="40" height="62" fill="#183449"/><circle cx="294" cy="74" r="2.5" fill="#bb8e36"/>',
              sign(150, 28, 104, ['Accessible entrance', 'around back →'], fill='#335947'),
              wheelchair(92, SKIN[0], '#8a2a1f', '#183449', hair='#20313a')]
    elif sid == 'louder':
        p += [ground(), standing(96, SKIN[3], '#335947', '#183449', hair='#6b3e1f', hair_style='long', arms=('down', 'cane'), glasses=True, skirt=True),
              cane(118, 110), standing(222, SKIN[5], '#bb8e36', '#4a565c', hair='#9b6a3c', arms=('out', 'down'), lean=-8),
              waves(196, 60, d=-1, color='#8a2a1f', n=4),
              '<text x="150" y="40" font-size="22" font-family="Georgia,serif" font-weight="700" fill="#8a2a1f" text-anchor="middle">HELLO!!</text>']
    elif sid == 'window':
        bg = '#f3eee2'
        p += [ground('#d8d2c2'), '<rect x="148" y="20" width="24" height="152" fill="#9aa7ae"/>',
              '<rect x="152" y="24" width="16" height="148" fill="#cfe3ea" opacity=".9"/>',
              standing(92, SKIN[1], '#2d6a7a', '#20313a', hair='#20313a', hair_style='bun', arms=('sign', 'sign')),
              standing(228, SKIN[4], '#bb8e36', '#183449', hair='#20313a', arms=('sign', 'sign')),
              waves(110, 86, color='#335947', n=2), waves(210, 86, d=-1, color='#335947', n=2),
              '<rect x="236" y="120" width="56" height="8" rx="2" fill="#7a5c3c"/><rect x="260" y="128" width="6" height="44" fill="#7a5c3c"/>']
    elif sid == 'parking':
        p += [ground('#c9cdcf'), '<rect x="20" y="164" width="150" height="8" fill="#2a6fb0"/>',
              '<g transform="translate(70 120)"><circle cx="0" cy="0" r="18" fill="#2a6fb0"/><circle cx="-1" cy="-9" r="3" fill="#fff"/><path d="M-1 -5 v8 h7 l3 7" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M-6 0 a8 8 0 1 0 10 9" stroke="#fff" stroke-width="2.5" fill="none"/></g>',
              '<path d="M30 150 q4 -26 30 -28 h50 q22 0 34 26 v14 h-114z" fill="#8a2a1f"/><rect x="48" y="128" width="30" height="14" rx="3" fill="#cfe3ea"/><rect x="84" y="128" width="30" height="14" rx="3" fill="#cfe3ea"/>'
              '<circle cx="56" cy="164" r="10" fill="#20313a"/><circle cx="128" cy="164" r="10" fill="#20313a"/>',
              standing(176, SKIN[2], '#4a565c', '#20313a', hair='#20313a', arms=('down', 'phone')),
              wheelchair(260, SKIN[4], '#bb8e36', '#183449', hair='#20313a', hair_style='long', facing=-1, arm='lap')]
    elif sid == 'security':
        bg = '#eef1f3'
        p += [ground('#d4d9dc'), '<path d="M130 172 V40 h70 V172" stroke="#9aa7ae" stroke-width="12" fill="none"/>',
              standing(165, SKIN[0], '#183449', '#4a565c', hair='#20313a', arms=('up', 'up'), prosthetic='right'),
              standing(262, SKIN[3], '#2d6a7a', '#20313a', hair='#9b6a3c', arms=('down', 'down')),
              '<rect x="246" y="86" width="14" height="8" rx="1" fill="#bb8e36"/>',
              '<rect x="20" y="130" width="70" height="42" fill="#b9b2a2"/><rect x="28" y="116" width="40" height="18" rx="3" fill="#8a2a1f"/>']
    elif sid == 'upstairs':
        bg = '#f3eee2'
        p += [ground('#d8d2c2'),
              ''.join(f'<rect x="{190+i*16}" y="{GROUND-12-i*12}" width="{130-i*16}" height="{12+i*12}" fill="#b9b2a2"/>' for i in range(8)),
              sign(170, 22, 120, ['Restroom', '2nd floor, back ↑'], fill='#183449'),
              '<rect x="20" y="120" width="56" height="10" rx="3" fill="#335947"/><rect x="24" y="130" width="4" height="42" fill="#335947"/><rect x="68" y="130" width="4" height="42" fill="#335947"/>'
              '<path d="M30 120 q18 -40 36 0" fill="#bb8e36"/>',
              standing(124, SKIN[5], '#6b4a6e', '#4a565c', hair='#d9dcd6', hair_style='gray', arms=('forward', 'forward'), glasses=True, skirt=True),
              walker(136)]
    elif sid == 'dont-push':
        p += [ground(), wheelchair(150, SKIN[1], '#335947', '#183449', hair='#20313a', hair_style='long', facing=1, arm='lap'),
              standing(92, SKIN[5], '#bb8e36', '#4a565c', hair='#9b6a3c', arms=('forward', 'forward'), lean=6),
              '<path d="M224 120 h40 M232 134 h34 M226 148 h40" stroke="#9aa7ae" stroke-width="3" stroke-linecap="round"/>',
              '<text x="150" y="44" font-size="26" font-family="Georgia,serif" font-weight="700" fill="#8a2a1f" text-anchor="middle">?!</text>']
    elif sid == 'service-dog':
        p += [ground(), standing(110, SKIN[4], '#183449', '#4a565c', hair='#20313a', arms=('down', 'forward')),
              '<path d="M134 96 Q160 120 160 138" stroke="#8a2a1f" stroke-width="2.5" fill="none"/>',
              dog(176),
              standing(266, SKIN[3], '#bb8e36', '#20313a', hair='#d9a441', hair_style='long', arms=('reach', 'down'), lean=-6, skirt=True)]
    elif sid == 'drive-thru':
        bg = '#eef1f3'
        p += [ground('#c9cdcf'), '<rect x="232" y="70" width="44" height="80" rx="8" fill="#183449"/><circle cx="254" cy="94" r="12" fill="#4a565c"/>'
              '<rect x="250" y="150" width="8" height="22" fill="#4a565c"/>', waves(222, 96, d=-1, color='#8a2a1f', n=3),
              '<text x="190" y="54" font-size="20" font-family="Georgia,serif" font-weight="700" fill="#8a2a1f" text-anchor="middle">krrsshh…</text>',
              '<path d="M14 168 q2 -60 50 -64 h70 q30 0 46 30 v36 h-166z" fill="#335947"/><path d="M70 112 h58 q20 0 30 22 h-88z" fill="#cfe3ea"/>',
              head(110, 124, SKIN[2], '#20313a'), '<path d="M121 119 q6 2 4 9" stroke="#bb8e36" stroke-width="3" fill="none"/>',
              '<circle cx="46" cy="170" r="12" fill="#20313a"/><circle cx="150" cy="170" r="12" fill="#20313a"/>']
    elif sid == 'repair':
        p += [ground(), wheelchair(96, SKIN[2], '#8a2a1f', '#183449', hair='#6b3e1f', arm='lap', glasses=True),
              '<rect x="186" y="34" width="110" height="96" rx="6" fill="#fff" stroke="#9aa7ae" stroke-width="2"/><rect x="186" y="34" width="110" height="18" rx="6" fill="#8a2a1f"/>'
              + ''.join(f'<path d="M{196+c*20} {60+r*16} l10 9 M{206+c*20} {60+r*16} l-10 9" stroke="#8a2a1f" stroke-width="2"/>' for r in range(4) for c in range(5)),
              '<rect x="196" y="140" width="64" height="32" fill="#c9a36b"/><path d="M196 140 l10 -10 h64 l-10 10" fill="#dbb985"/>',
              '<text x="228" y="160" font-size="9" font-family="system-ui,sans-serif" font-weight="700" fill="#20313a" text-anchor="middle">SHIPS IN</text>'
              '<text x="228" y="170" font-size="9" font-family="system-ui,sans-serif" font-weight="700" fill="#20313a" text-anchor="middle">6 WEEKS</text>']
    elif sid == 'elevator':
        bg = '#eef1f3'
        p += [ground('#d4d9dc'), '<rect x="110" y="24" width="100" height="148" fill="#9aa7ae"/><line x1="160" y1="28" x2="160" y2="172" stroke="#7d8a90" stroke-width="3"/>',
              sign(118, 70, 84, ['OUT OF', 'ORDER'], fill='#8a2a1f', size=12),
              wheelchair(42, SKIN[4], '#335947', '#183449', hair='#20313a', arm='lap'),
              standing(250, SKIN[5], '#6b4a6e', '#4a565c', hair='#d9dcd6', hair_style='gray', arms=('forward', 'forward'), skirt=True), walker(262),
              standing(110, SKIN[1], '#bb8e36', '#20313a', hair='#20313a', hair_style='bun', arms=('down', 'down')), crutch(94), crutch(124),
              standing(296, SKIN[2], '#2d6a7a', '#20313a', hair='#20313a', arms=('cane', 'down'), glasses=True), cane(272, 110)]
    else:
        raise SystemExit(f'no drawing for slide {sid}')
    return bg, ''.join(p)


def slide_html(i, n, s):
    bg, art = scene(s)
    tid = f'reel-t-{s["id"]}'
    link = f' <a href="{E(s["link"]["href"])}">{E(s["link"]["text"])}</a>' if s.get('link') else ''
    return (f'<div class="reel-slide" role="group" aria-roledescription="slide" aria-label="{i} of {n}" id="reel-{E(s["id"])}"><figure>'
            f'<svg viewBox="0 0 320 200" role="img" aria-labelledby="{tid}" focusable="false"><title id="{tid}">{E(s["alt"])}</title>'
            f'<rect width="320" height="200" fill="{bg}"/>{art}</svg>'
            f'<figcaption>{E(s["joke"])}{link}</figcaption></figure></div>')


def build():
    slides = DATA['slides']
    n = len(slides)
    body = ''.join(slide_html(i + 1, n, s) for i, s in enumerate(slides))
    return (f'<!--reel--><section class="reel" aria-roledescription="carousel" aria-labelledby="reel-h">'
            f'<div class="reel-head"><h2 id="reel-h">{E(DATA["title"])}</h2><p class="lead">{E(DATA["lead"])}</p></div>'
            f'<div class="reel-track" id="reel-track" tabindex="0" aria-label="Slides; scroll sideways or use the buttons">{body}</div>'
            f'<div class="reel-controls"><button type="button" class="secondary" id="reel-prev" aria-controls="reel-track">‹ Previous</button>'
            f'<span id="reel-count" aria-live="polite">1 of {n}</span>'
            f'<button type="button" class="secondary" id="reel-next" aria-controls="reel-track">Next ›</button>'
            f'<button type="button" id="reel-play" aria-pressed="false" hidden>Play</button></div>'
            f'</section><script src="assets/home-reel.js" defer></script><!--/reel-->')


def main():
    p = ROOT / 'index.html'
    t = p.read_text()
    block = build()
    if '<!--reel-->' in t:
        a, b = t.index('<!--reel-->'), t.index('<!--/reel-->') + len('<!--/reel-->')
        t = t[:a] + block + t[b:]
    else:
        anchor = '<section id="start"'  # after the needs panel, before the next-step finder
        assert anchor in t, 'home page anchor missing'
        t = t.replace(anchor, block + anchor, 1)
    p.write_text(t)
    print(f'Home reel: {len(DATA["slides"])} slides')


if __name__ == '__main__':
    main()
