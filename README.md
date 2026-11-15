# Mobility Talk

mobilitytalk.org: a mobility resources and advocacy directory and guide.

A free, national (all 50 states and D.C.), source-linked site for people facing mobility barriers: wheelchair and equipment repair, coverage denials, home access, vehicles, transit and public access. It also helps people ask lawmakers for change.

Created and maintained by Travis Vought. Corrections: travis@vethomeguard.org.

## Pages
- `index.html`: home page with a state and barrier picker
- `local-help.html`: searchable directory of ramp, home-modification, equipment, transportation, independent living, disability rights, DD board and county veterans office programs by state and county (built by `scripts/build_local_pages.py`, reads `data/local-programs.json` and `data/county-veterans-offices.json`)
- `ramps-home-access.html`: who pays for or provides ramps and home changes, with VA grant and Ohio waiver preparation checklists (`data/home-access-checklists.json`)
- `mobility-rights.html`: step-by-step finder (built from `templates/mobility-rights.html` and `data/mobility-routes.json`)
- `disability-advocacy.html`: five advocacy issues with state and federal message builder (built from `templates/disability-advocacy.html` and `data/disability-advocacy.json`)
- `mobility-independence.html`: repair and adapt equipment actions

## Build and test
```
npm install
npm run build        # regenerates the two built pages
npm test
python3 tests/mobility_routes.py && python3 scripts/validate_mobility_law_map.py && python3 tests/mobility_law_map.py
npm run test:browser # needs Playwright Chromium
```
Edit data or templates, never the built pages. `research/mobility-laws-2026-11-01/` holds the staged law research; only claims listed in `data/mobility-routes.json` are published.

## Data from the Veteran Resource Guide
`data/local-programs.json` (2,723 programs and agencies), `data/county-veterans-offices.json` (1,811 offices) and `data/home-access-checklists.json` are built with `python3 scripts/extract_local_programs.py PATH_TO_GUIDE_CHECKOUT`, which merges the guide data, the NDRN baseline and the sourced additions in `data/added-programs.json` (state and national lists such as the National RTAP Section 5310 and 5311 state lists, the CCAM Medicaid NEMT state profiles, the MSKTC Spinal Cord Injury and Traumatic Brain Injury Model System lists, the ADA National Network regional center list, the Hearing Loss Association of America state telephone equipment programs list, the U.S. Department of Education Rehabilitation Services Administration state blind-agency list, the Library of Congress NLS talking-book library list, the Social Security Ticket to Work pages (WIPA benefits counseling and PABSS), the FCC iCanConnect state pages for deaf-blind equipment, ADA.gov and Department of Transportation disability hotlines, the National Park Service Access Pass, the HUD fair housing hotline, Medicare equipment-repair and SHIP counseling routes, a Washington listing for Light Upon Light (from its own website and public Idealist profile), the Reeve Foundation peer support list, the U-Michigan Amputee Resource Guide, HomeMods.org state profiles, AUCD UCEDDs, AT Act programs, NASHIA brain injury leads, SILCs, DD Councils, USDA 504 offices, ombudsman programs and CIL county service areas). Each record keeps its own source link, review date and `origin` file. Every state and D.C. lists its Protection and Advocacy agency (from the National Disability Rights Network list, `data/ndrn-protection-advocacy.json`); every state also has statewide DD, independent living, assistive technology and brain injury entries, and 20 states have the guide's local ramp, equipment and independent living programs as well. Direct phone, email and intake-page details for records that only carried a source link are kept in `data/contact-overrides.json` (fills empty fields only), and each record gets a `link_kind` (official, government, directory, news, rule, social or source) so the page labels its main link honestly. Corrections are made at the source and re-extracted, not edited here.

## Related
Local county and veteran referrals stay in the [Veteran Resource Guide](https://github.com/travisvought-byte/vhg-veteran-resident-guide) (guide.vethomeguard.org). This site links to it for local help.

## License
Data CC BY 4.0, code MIT. See `LICENSE`.

## Partner page

`partner.html` lets visitors share the directory, print a handout, sponsor it at three flat yearly levels, give, or tell us how they help. There are no commissions: nobody is paid a percentage of gifts or sponsorships, and people who introduce a sponsor are thanked by name instead. Inquiries go by email; `assets/partner.js` only builds copyable links in the page and stores nothing. The give button is a PayPal donate link to Veteran Home Guardians, built in `assets/partner.js` so the account address is not written in the page source; replace it with a PayPal hosted button ID if one is created. Gifts and sponsorships are described as received by Veteran Home Guardians. `handout.html?state=XX` (script `assets/handout.js`) builds a printable help list for any state from the statewide records that have a phone number, plus national hotlines.

## State pages

`scripts/build_state_pages.py` writes `states/<state>.html` for all 50 states and D.C., plus `states/index.html`. Each page lists every non-veterans program for that state as plain HTML (statewide programs as cards, county programs as a compact list), so search engines and people without JavaScript can read them. The pages are generated from `data/local-programs.json`; do not edit them by hand. `npm run build` regenerates them and adds them to `sitemap.xml`. `tests/states.cjs` checks every record is present, no other state's records leak in, and links and metadata are valid.
