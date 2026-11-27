#!/usr/bin/env python3
"""Advertising slots. Ads live in data/ads.json, which is empty by default; with no active ad nothing is written.

finalize_pages.py calls apply() on every page. An ad shows only on the home page, the topic guides and the state
pages, at most one per page, after the page's main content (just before the footer or the end of <main>), never
inside a list, a card or a help section. Pages built around crisis or urgent help never carry one: the directory
(which holds the crisis lines), the printable help list, the Spanish help page and the "page not found" page, plus
the about, partner and privacy pages. An ad that names any other slot stops the build, so a typo cannot hide.

Each ad in data/ads.json:
  slot     "home", a topic page ("know-your-rights", "service-animals", ...), "state-<slug>" ("state-ohio"),
           "every-topic" or "every-state". A page takes its own slot first, then the matching "every-" slot,
           then the first active ad in file order.
  sponsor  who is advertising (shown in bold)
  text     one or two short sentences, at most 200 characters
  url      https link to the advertiser
  image    optional: an https address or a file under assets/; needs alt
  alt      text for the image
  start    optional first day shown, YYYY-MM-DD
  end      optional last day shown, YYYY-MM-DD. The site is static: a dated ad appears or drops off when the
           pages are next rebuilt, and the CI check flags pages that are out of date.

Google AdSense: data/ads.json may also hold "adsense_client" (ca-pub- and 16 digits). When it is set, the pages that may
carry an ad (the home page, the topic guides and the state pages) plus the country pages load Google's ad code in the
head, asking for non-personalized ads before the code loads; the crisis and help pages above never do. ads.txt at the
site root names the same publisher. Empty means no Google code anywhere and no ads.txt.

For tests: python3 scripts/ads.py --ads FILE --page NAME [--today YYYY-MM-DD] < page.html > page-with-ad.html
"""
import argparse, datetime, html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADS_FILE = ROOT / 'data/ads.json'
TOPICS = ['know-your-rights', 'ramps-home-access', 'mobility-rights', 'mobility-independence', 'disability-advocacy',
          'blind-low-vision', 'deaf-hard-of-hearing', 'service-animals', 'caregiver-respite',
          'accessible-vehicles', 'free-medical-equipment', 'social-security-disability', 'accessible-travel',
          'paid-family-caregiver', 'home-modifications',
          'vehiculos-adaptados', 'equipo-medico-gratis', 'incapacidad-seguro-social', 'cuidador-familiar-pagado',
          'modificaciones-hogar']
# pages that never carry an ad, whatever the data says
NO_ADS = {'local-help.html', 'handout.html', 'espanol.html', '404.html', 'about.html', 'partner.html', 'privacy.html',
          'states/index.html'}
STATE_SLUGS = sorted(p.stem for p in (ROOT / 'states').glob('*.html') if p.name != 'index.html')
SLOTS = {'home', 'every-topic', 'every-state', *TOPICS, *('state-' + s for s in STATE_SLUGS)}
FIELDS = {'slot', 'sponsor', 'text', 'url', 'image', 'alt', 'start', 'end'}
DATE = re.compile(r'\d{4}-\d{2}-\d{2}$')
CLIENT = re.compile(r'ca-pub-\d{16}$')
E = lambda s: html.escape(s, quote=True)


def validate(ads):
    for i, ad in enumerate(ads):
        where = f'data/ads.json ad {i + 1}'
        extra = set(ad) - FIELDS
        assert not extra, f'{where}: unknown fields {sorted(extra)}'
        assert ad.get('slot') in SLOTS, f'{where}: slot {ad.get("slot")!r} is not an ad slot (crisis and help pages have none)'
        for k in ('sponsor', 'text', 'url'):
            assert isinstance(ad.get(k), str) and ad[k].strip(), f'{where}: {k} is required'
        assert len(ad['text']) <= 200, f'{where}: text is over 200 characters'
        assert re.match(r'https://[^\s"<>]+$', ad['url']), f'{where}: url must be a plain https address'
        if ad.get('image'):
            assert re.match(r'(https://|assets/)[^\s"<>]+$', ad['image']), f'{where}: image must be https or under assets/'
            assert isinstance(ad.get('alt'), str) and ad['alt'].strip(), f'{where}: an image needs alt text'
        for k in ('start', 'end'):
            if ad.get(k) is not None:
                assert DATE.match(str(ad[k])), f'{where}: {k} must be YYYY-MM-DD'
                datetime.date.fromisoformat(ad[k])
        if ad.get('start') and ad.get('end'):
            assert ad['start'] <= ad['end'], f'{where}: start is after end'
    return ads


def load(path=ADS_FILE, today=None):
    """Active ads in file order. A missing file means no ads."""
    path = Path(path)
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    ads = validate(data.get('ads', []) if isinstance(data, dict) else data)
    today = (today or datetime.date.today()).isoformat() if not isinstance(today, str) else today
    return [a for a in ads if (not a.get('start') or a['start'] <= today) and (not a.get('end') or today <= a['end'])]


def load_client(path=ADS_FILE):
    """The AdSense publisher ID, or '' for none."""
    path = Path(path)
    data = json.loads(path.read_text()) if path.exists() else {}
    client = (data.get('adsense_client') or '') if isinstance(data, dict) else ''
    assert client == '' or (isinstance(client, str) and CLIENT.match(client)), \
        'data/ads.json: adsense_client must look like ca-pub-1234567890123456, or be empty'
    return client


def network_ok(name):
    """Whether a page may load Google's ad code: a page that takes an ad slot, or a country page. Never a help page."""
    return bool(slots_for(name)) or (name.startswith('countries/') and name.endswith('.html'))


def network_head(client):
    """Google's ad code for <head>, non-personalized ads asked for before the code loads. Empty without a client."""
    if not client:
        return ''
    return (f'<!--adnet--><meta name="google-adsense-account" content="{E(client)}">'
            '<script>(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1;</script>'
            f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={E(client)}" '
            'crossorigin="anonymous"></script><!--/adnet-->')


def ads_txt(client):
    """The ads.txt line for the publisher, or '' for none."""
    return f'google.com, pub-{client[len("ca-pub-"):]}, DIRECT, f08c47fec0942fa0\n' if client else ''


def slots_for(name):
    """Slot ids a page takes, most specific first; [] for pages that never carry an ad."""
    if name in NO_ADS:
        return []
    if name == 'index.html':
        return ['home']
    if name.startswith('states/'):
        return ['state-' + Path(name).stem, 'every-state']
    stem = Path(name).stem
    return [stem, 'every-topic'] if '/' not in name and stem in TOPICS else []


def pick(ads, name):
    for slot in slots_for(name):
        for ad in ads:
            if ad['slot'] == slot:
                return ad
    return None


def render(ad, pre=''):
    img = ''
    if ad.get('image'):
        src = ad['image'] if ad['image'].startswith('https://') else pre + ad['image']
        img = f'<img src="{E(src)}" alt="{E(ad["alt"])}" loading="lazy" decoding="async">'
    return ('<aside class="ad-slot" aria-label="Advertisement"><p class="ad-label">Advertisement</p>'
            f'<a class="ad-link" href="{E(ad["url"])}" target="_blank" rel="sponsored noopener">{img}'
            f'<strong class="ad-sponsor">{E(ad["sponsor"])}</strong> <span class="ad-text">{E(ad["text"])}</span>'
            ' <span class="ad-newtab">(new tab)</span></a>'
            f'<p class="ad-note">Ads are kept apart from the directory and never change what is listed. '
            f'<a href="{pre}privacy.html#ads">About ads</a></p></aside>')


def apply(t, name, ads, client=''):
    """Take out any earlier ad and ad code, then place the page's ad (if any) after the main content and Google's
    code (if set and allowed here) in the head. Idempotent."""
    t = re.sub(r'<!--ad-->.*?<!--/ad-->', '', t, flags=re.S)
    t = re.sub(r'<!--adcss-->.*?<!--/adcss-->', '', t, flags=re.S)
    t = re.sub(r'<!--adnet-->.*?<!--/adnet-->', '', t, flags=re.S)
    if client and network_ok(name):
        assert t.count('</head>') == 1, name
        # just before the site icon when the page already has one (as finalize_pages.py writes it), else before </head>
        at = '<!--icon-->' if '<!--icon-->' in t else '</head>'
        t = t.replace(at, network_head(client) + at, 1)
    ad = pick(ads, name)
    if not ad:
        return t
    pre = '../' if name.startswith(('states/', 'countries/')) else ''
    end = t.find('</main>')
    foot = t.find('<footer', t.find('<main'))
    at = foot if 0 <= foot < end else end
    assert at > 0, name + ': no place for the ad'
    t = t[:at] + '<!--ad-->' + render(ad, pre) + '<!--/ad-->' + t[at:]
    assert t.count('</head>') == 1, name
    return t.replace('</head>', f'<!--adcss--><link rel="stylesheet" href="{pre}assets/ads.css"><!--/adcss--></head>', 1)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--ads', default=str(ADS_FILE))
    ap.add_argument('--page', required=True)
    ap.add_argument('--today')
    a = ap.parse_args()
    sys.stdout.write(apply(sys.stdin.read(), a.page, load(a.ads, a.today), load_client(a.ads)))
