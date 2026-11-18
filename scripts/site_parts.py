#!/usr/bin/env python3
"""Shared pieces of page chrome used by more than one build script, so the wording stays the same everywhere."""
import html, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
E = lambda s: html.escape(str(s), quote=True)

# Urgent help strip: the first thing on any page that lists programs
URGENT = ('<aside class="urgent" aria-labelledby="urgent-h"><h2 id="urgent-h">In crisis or unsafe right now?</h2>'
          '<p><a href="tel:988">Call 988</a> or <a href="sms:988">text 988</a>, any time. Deaf or hard of hearing: call 988 from your videophone, text 988, or dial 711 and then 988. In immediate danger, call 911.</p>'
          '<p>No safe place to sleep tonight? <a href="tel:211">Dial 211</a> and press 6 for homeless services. Veterans: <a href="tel:18774243838">call 1-877-424-3838</a>, 24 hours a day.</p>'
          '<p><a href="local-help.html?category=crisis">See all crisis, safety and abuse reporting lines</a> · <a href="local-help.html?category=housing">Shelter and housing help</a></p></aside>')

# Suicide and homelessness help, directly above the footer of every page (owner direction, November 17, 2026).
# Each line was read on its source page on November 17, 2026:
#   988lifeline.org: call or text 988, any time.            veteranscrisisline.net: dial 988, then press 1.
#   hud.gov/contactus: dial 2-1-1 and press 6 for homeless services; the Find Shelter tool.
#   usa.gov/emergency-housing: National Call Center for Homeless Veterans, 1-877-424-3838, 24 hours a day.
# Spanish wording follows pages written for Spanish speakers, read the same day: 988lifeline.org (text and chat in
# Spanish) and samhsa.gov/encuentra-apoyo (call 211 for local help; veterans call 877-424-3838). It names only those.
# Styles are inline because two pages do not load site.css. Short links never break across lines; a long link
# (the Find Shelter tool, the Spanish text link) may wrap, so the block never pushes a narrow screen sideways.
_HELP_BOX = ('box-sizing:border-box;width:100%;margin:28px 0 0;padding:12px 16px;border:1px solid #9aa7ae;border-left:8px solid #8a2a1f;'
             'border-radius:10px;background:#fff;color:#1b1b1b;font:400 16px/1.5 system-ui,sans-serif;text-align:left')
_HELP_WRAP = ' style="color:#183449;font-weight:700;text-decoration:underline"'
_HELP_LINK = ' style="color:#183449;font-weight:700;text-decoration:underline;white-space:nowrap"'
HELP_NOW = {
    'en': ('Need help now?',
           '<strong>Need help now?</strong> Thinking about suicide, or in any crisis: '
           '<a href="tel:988"{link}>call</a> or <a href="sms:988"{link}>text 988</a>, any time. '
           'Veterans: dial 988, then press 1. No safe place to sleep tonight: '
           '<a href="tel:211"{link}>dial 211</a> and press 6 for homeless services, or use '
           '<a href="https://www.hud.gov/findshelter"{wrap}>HUD’s Find Shelter tool</a>. Veterans: '
           '<a href="tel:18774243838"{link}>1-877-424-3838</a>, 24 hours a day.'),
    'es': ('¿Necesita ayuda ahora?',
           '<strong>¿Necesita ayuda ahora?</strong> Si piensa en el suicidio o está en crisis: '
           '<a href="tel:988"{link}>llame</a> o <a href="sms:988"{wrap}>envíe un mensaje de texto al 988</a>, a cualquier hora. '
           'Si no tiene un lugar seguro donde dormir esta noche: '
           '<a href="tel:211"{link}>llame al 211</a> para encontrar ayuda en su comunidad. Veteranos: llame al '
           '<a href="tel:18774243838"{link}>1-877-424-3838</a>, las 24 horas.'),
}


def help_now(lang='en', no_print=False):
    """The help block for one page. `no_print` keeps it off a printed handout, like that page's own footer."""
    label, body = HELP_NOW[lang]
    cls = 'help-now no-print' if no_print else 'help-now'
    return (f'<aside class="{cls}" aria-label="{label}" style="{_HELP_BOX}">'
            + body.format(link=_HELP_LINK, wrap=_HELP_WRAP) + '</aside>')

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
