#!/usr/bin/env python3
"""Shared pieces of page chrome used by more than one build script, so the wording stays the same everywhere."""
import html, json
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
