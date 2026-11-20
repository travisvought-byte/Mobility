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
}


def icon(name, cls='ic'):
    """One decorative inline icon. Unknown names give an empty string, so a new category never breaks a page."""
    paths = ICON_PATHS.get(name)
    if not paths: return ''
    return (f'<svg class="{cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{paths}</svg>')
