#!/usr/bin/env python3
"""Shared pieces of page chrome used by more than one build script, so the wording stays the same everywhere."""
import html, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
E = lambda s: html.escape(str(s), quote=True)

# Urgent help strip: the first thing on any page that lists programs
URGENT = ('<aside class="urgent" aria-labelledby="urgent-h"><h2 id="urgent-h">In crisis or unsafe right now?</h2>'
          '<p><a href="tel:988">Call 988</a> or <a href="sms:988">text 988</a>, any time. Deaf or hard of hearing: call 988 from your videophone, text 988, or dial 711 and then 988. In immediate danger, call 911.</p>'
          '<p><a href="local-help.html?category=crisis">See all crisis, safety and abuse reporting lines</a></p></aside>')

# Phone numbers are the main contact on this site, so say how to use them without a voice call
RELAY = ('<p class="relay"><strong>Deaf, hard of hearing or have a speech disability?</strong> <a href="tel:711">Dial 711</a> to place a free relay call to any phone number listed here.</p>')

ABOUT_LINK = '<a href="about.html">About, sources and accessibility</a>'


def guides():
    """Category guides: chip label, blurb, what to have ready, what to ask."""
    return json.loads((ROOT / 'data/category-guides.json').read_text())


def prep_html(guide, level=3):
    """Static 'Before you call' block for one category."""
    if not guide or not guide.get('ready'): return ''
    h = f'h{level}'
    out = '<details class="prep"><summary>Before you call: what to have ready and what to ask</summary>'
    out += f'<{h}>Have ready</{h}><ul>' + ''.join(f'<li>{E(x)}</li>' for x in guide['ready']) + '</ul>'
    if guide.get('ask'): out += f'<{h}>Ask</{h}><ul>' + ''.join(f'<li>{E(x)}</li>' for x in guide['ask']) + '</ul>'
    return out + '<p class="meta">These are general reminders. Each program sets its own rules, so ask what it needs.</p></details>'


# Phone number to a call link. An extension is dialed after a pause ("tel:8454523913,105"), and a lettered
# number is turned into its keypad digits ("800-75-SEALS" -> tel:8007573257), so tapping Call reaches the right line.
_KEYPAD = str.maketrans('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '22233344455566677778889999')
def tel(p):
    parts = re.split(r'\s*(?:ext\.?|extension|x)\s*(?=\d)', str(p), maxsplit=1, flags=re.I)
    main = re.sub(r'[^0-9+]', '', parts[0].upper().translate(_KEYPAD))
    ext = re.sub(r'\D', '', parts[1]) if len(parts) > 1 else ''
    return 'tel:' + main + (',' + ext if ext else '') if main else None


# Small line icons, drawn inline so no icon font or outside file is loaded. Each is decorative (aria-hidden):
# the words beside it always say the same thing, so nothing is told by the picture alone.
ICON_PATHS = {
    'ramps_home': '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5.5h4V20"/>',
    'equipment': '<circle cx="11" cy="4" r="1.8"/><path d="M11 7.5v5.5h5l2.5 6"/><path d="M8 10.5a6.2 6.2 0 1 0 8.6 7"/>',
    'transportation': '<rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 11h16M7.5 18v2.5M16.5 18v2.5M8 14.5h.01M16 14.5h.01"/>',
    'benefits': '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6"/>',
    'funding': '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M12 9v6M9 12h6"/>',
    'daily_living': '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
    'housing': '<circle cx="8" cy="15.5" r="4.2"/><path d="M11 12.5l9-9M16.5 7l2.5 2.5M14 9.5l2 2"/>',
    'work_school': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.2C9 4.5 9.5 4 10.2 4h3.6c.7 0 1.2.5 1.2 1.2V7M3 13h18"/>',
    'children': '<circle cx="12" cy="13.5" r="7"/><path d="M9.5 13h.01M14.5 13h.01M10 16.4c1.2.9 2.8.9 4 0M12 6.5c0-1.6 1-2.8 2.4-2.8"/>',
    'sensory': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'independent_living': '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.2" cy="9" r="2.4"/><path d="M16.5 14.1c2.7-.3 4.8 1.8 4.8 4.9"/>',
    'navigation': '<path d="M12 3v18M9 21h6"/><path d="M5 6h11l3 3-3 3H5z"/>',
    'rights_legal': '<path d="M12 4v16M7.5 20h9M5 7h14"/><path d="M5 7l-3 6.2a3 3 0 0 0 6 0zM19 7l-3 6.2a3 3 0 0 0 6 0z"/>',
    'crisis': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.8"/><path d="M5.6 5.6l3.7 3.7M14.7 14.7l3.7 3.7M18.4 5.6l-3.7 3.7M9.3 14.7l-3.7 3.7"/>',
    'peer_support': '<path d="M4 4.5h10.5c.6 0 1 .4 1 1V12c0 .6-.4 1-1 1H9l-4 3v-3H4c-.6 0-1-.4-1-1V5.5c0-.6.4-1 1-1z"/><path d="M15.5 8.5H20c.6 0 1 .4 1 1V16c0 .6-.4 1-1 1h-1v3l-3.8-3H11c-.6 0-1-.4-1-1v-1"/>',
    'dd_board': '<path d="M3 9l9-5 9 5M5 9.5V18M9.7 9.5V18M14.3 9.5V18M19 9.5V18M3 20.5h18"/>',
    'veterans': '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1-5.4-3-5.4 3 1.1-6.1-4.5-4.2 6.1-.8z"/>',
    'map_pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    'language': '<path d="M3.5 5h9M8 3v2M5.5 5c.6 3 2.7 5.6 5.5 7M10.5 5c-.8 3.4-3.4 6.4-7 8"/><path d="M12 21l4.5-10 4.5 10M13.7 17.4h5.6"/>',
    # Added November 24, 2026 for the guide pages (service animals, rights, vision and hearing, ramps, country pages)
    'service_dog': '<path d="M5.4 10.2c-1 .1-1.9 1-2.3 2.6"/><path d="M5.4 9.8h10.4l1.2-3.5c.3-.7.9-1.1 1.6-1.1h1.2l2.4 2-.7 1.8h-2.2l-.8 3v2.3H5.4z"/><path d="M6.9 14.3v6.2M9.3 14.3v6.2M14.6 14.3v6.2M17.1 14.3v6.2"/><path d="M13.3 9.8L11 4.6H8.8"/>',
    'comfort': '<path d="M12 19.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 6.5a4.3 4.3 0 0 1 7.5 2.8C19.5 14.9 12 19.5 12 19.5z"/><path d="M9.3 12.2l1.7 1.6 3.7-3.6"/>',
    'store': '<path d="M3.5 9.5L5 4.5h14l1.5 5z"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5.5h4V20"/>',
    'plane': '<path d="M21 15.5l-7.5-4.6V5.3a1.5 1.5 0 0 0-3 0v5.6L3 15.5v1.7l7.5-2.3v3.6L8.6 20v1.2l3.4-1 3.4 1V20l-1.9-1.5v-3.6l7.5 2.3z"/>',
    'phone': '<path d="M5 3.5h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 5.3 5.3l1.3-2.1 4.2 1.6V17a2.5 2.5 0 0 1-2.7 2.5A15.5 15.5 0 0 1 2.5 6.2 2.5 2.5 0 0 1 5 3.5z"/>',
    'ballot': '<path d="M3.5 13h17v7.5h-17z"/><path d="M7.5 13V3.5h9V13"/><path d="M9.8 8.4l1.6 1.6 3-3.2"/><path d="M3.5 16.5h17"/>',
    'medical': '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 7.8v8.4M7.8 12h8.4"/>',
    'school': '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.6c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4V11"/><path d="M21.5 9v5.5"/>',
    'shield': '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M12 8v5.2M12 16.3h.01"/>',
    'book': '<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5V20"/>',
    'cane': '<circle cx="10" cy="4.3" r="1.8"/><path d="M10 7.6l-1.2 5.9 2.6 3 .6 4.5M8.8 13.5l-2.3 7M10.2 9l2.8 2.6"/><path d="M13 11.6l5 9"/>',
    'device': '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7.5h8v5h-4.5L9 14.5v-2H8z"/><path d="M10.5 18h3"/>',
    'clock': '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.2V12l3.2 2.2"/>',
    'chat_q': '<path d="M4 4.5h16v11.5H10l-6 4.5z"/><path d="M10 8.6a2 2 0 1 1 2.7 1.9c-.4.2-.7.5-.7 1v.6M12 13.7h.01"/>',
    'document': '<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 12.5h7M9 16.5h7"/>',
    'camera': '<path d="M3.5 8h3.7l1.6-2.7h6.4L16.8 8h3.7v11.5h-17z"/><circle cx="12" cy="13.5" r="3.4"/>',
    'lock': '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9M12 14.5v2"/>',
    'yes': '<circle cx="12" cy="12" r="9"/><path d="M7.8 12.4l2.8 2.8 5.6-5.8"/>',
    'no': '<circle cx="12" cy="12" r="9"/><path d="M8.9 8.9l6.2 6.2M15.1 8.9l-6.2 6.2"/>',
    'differs': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.7 5.6 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.6-3.7-9S9.6 5.6 12 3z"/>',
    'door_out': '<path d="M13.5 4H5.5v16h8"/><path d="M10.5 12h10M17.5 8.8l3.2 3.2-3.2 3.2"/>',
    'search': '<circle cx="10.5" cy="10.5" r="6.3"/><path d="M15.2 15.2l5.3 5.3"/>',
    'wrench': '<path d="M14.6 3.6a5 5 0 0 0-4.9 6.3l-6 6a2.1 2.1 0 0 0 3 3l6-6a5 5 0 0 0 6.3-4.9l-2.8 2.8-3-.6-.6-3z"/>',
    'reuse': '<path d="M19.5 10.5A7.8 7.8 0 0 0 6 6.6L4.5 8"/><path d="M4.5 3.8V8h4.2"/><path d="M4.5 13.5A7.8 7.8 0 0 0 18 17.4l1.5-1.4"/><path d="M19.5 20.2V16h-4.2"/>',
    'sliders': '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    # Added November 25, 2026 for the visuals on the directory, Spanish, advocacy, handout, about and privacy pages
    'food': '<path d="M7 3v7.5M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M7 10v11"/><path d="M17.5 21V3c-2.2 1.3-3.5 3.8-3.5 7v3.5h3.5"/>',
    'send': '<path d="M21 3L10.2 13.8"/><path d="M21 3l-6.6 18-4.2-7.2L3 9.6z"/>',
    'link': '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.6 6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6"/>',
    'printer': '<path d="M7 8V3.5h10V8"/><rect x="3.5" y="8" width="17" height="8.5" rx="2"/><path d="M7 13.5h10V21H7z"/>',
    'chart': '<path d="M3.5 20.5h17"/><path d="M6 20.5v-6h3v6M10.5 20.5V7.5h3v13M15 20.5v-9h3v9"/>',
    'server': '<rect x="4" y="3.5" width="16" height="7" rx="1.5"/><rect x="4" y="13.5" width="16" height="7" rx="1.5"/><path d="M7.5 7h.01M7.5 17h.01M11 7h5.5M11 17h5.5"/>',
    'megaphone': '<path d="M3.5 10v4h3l9.5 5V5l-9.5 5z"/><path d="M6.5 14l1.6 6h3l-1.4-5.3M19 9.5a3.5 3.5 0 0 1 0 5"/>',
    'keyboard': '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.8h.01M9.3 9.8h.01M12.6 9.8h.01M15.9 9.8h.01M18 9.8h.01M6 14.2h.01M18 14.2h.01M9 14.2h6"/>',
}


def icon(name, cls='ic'):
    """One decorative inline icon. Unknown names give an empty string, so a new category never breaks a page."""
    paths = ICON_PATHS.get(name)
    if not paths: return ''
    return (f'<svg class="{cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{paths}</svg>')


# The same icons as one shared file, assets/icons.svg (written by finalize_pages.py), for pages that repeat them many
# times or are built by the hundred (the vision and hearing guides, country pages). A page then carries a short <use>
# reference instead of the drawing, and the browser loads the file once. Still decorative: hidden from screen readers.
def sprite():
    syms = ''.join(f'<symbol id="{k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
                   f'stroke-linecap="round" stroke-linejoin="round">{p}</symbol>' for k, p in ICON_PATHS.items())
    return ('<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Mobility Talk line icons (scripts/site_parts.py ICON_PATHS). '
            'Generated by scripts/finalize_pages.py; do not edit by hand. -->\n' + syms + '\n</svg>\n')


def icon_use(name, cls='ic', pre=''):
    """One decorative icon drawn from assets/icons.svg. `pre` is the path back to the site root ('../' on subpages)."""
    if name not in ICON_PATHS: return ''
    return (f'<svg class="{cls}" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">'
            f'<use href="{pre}assets/icons.svg#{name}"/></svg>')


# The crisis lines as a small side note, not a banner (owner direction, November 22, 2026, repeated November 23):
# wide screens pin it to the right edge, narrower screens show it as one quiet block after the page's own help.
SIDE_HELP = '<div class="side-help">' + URGENT + '</div>'

# Landing copy: who arrives on each root page and what the page says to them first (data/landing.json).
LANDING = json.loads((ROOT / 'data/landing.json').read_text())['pages']


def lede(intro, actions, plain=False):
    """The opening a page speaks to its visitor with: one or two sentences, then the actions they most likely came for.
    `plain` uses the button classes of the pages that do not load site.css (the route finder and advocacy pages)."""
    out = f'<p class="lede">{E(intro)}</p>'
    if actions:
        cls = (lambda i: 'button' if i == 0 else 'button secondary') if plain else (lambda i: 'button gold' if i == 0 else 'button ghost')
        out += '<div class="actions hero-actions">' + ''.join(
            f'<a class="{cls(i)}" href="{E(a["href"])}"' + (f' lang="{E(a["lang"])}"' if a.get('lang') else '') + f'>{E(a["label"])}</a>'
            for i, a in enumerate(actions)) + '</div>'
    return '<!--lede-->' + out + '<!--/lede-->'


def iam(items):
    """The home page's "I'm here as" chooser: one link per kind of visitor, each to a page or filter that already exists."""
    lis = ''.join(f'<li><a href="{E(x["href"])}"' + (f' lang="{E(x["lang"])}" hreflang="{E(x["lang"])}"' if x.get('lang') else '') + f'>{E(x["label"])}</a></li>' for x in items)
    return ('<!--iam--><nav class="iam" aria-labelledby="iam-h"><h2 id="iam-h">I’m here as…</h2>'
            f'<ul>{lis}</ul></nav><!--/iam-->')
