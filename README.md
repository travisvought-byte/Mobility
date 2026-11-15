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
`data/local-programs.json` (2,278 programs and agencies), `data/county-veterans-offices.json` (1,811 offices) and `data/home-access-checklists.json` are built with `python3 scripts/extract_local_programs.py PATH_TO_GUIDE_CHECKOUT`, which merges the guide data, the NDRN baseline and the sourced additions in `data/added-programs.json` (state and national lists such as the National RTAP Section 5310 state list, the CCAM Medicaid NEMT state profiles, HomeMods.org state profiles, AUCD UCEDDs, AT Act programs, NASHIA brain injury leads, SILCs, DD Councils, USDA 504 offices, ombudsman programs and CIL county service areas). Each record keeps its own source link, review date and `origin` file. Every state and D.C. lists its Protection and Advocacy agency (from the National Disability Rights Network list, `data/ndrn-protection-advocacy.json`); every state also has statewide DD, independent living, assistive technology and brain injury entries, and 20 states have the guide's local ramp, equipment and independent living programs as well. Corrections are made at the source and re-extracted, not edited here.

## Related
Local county and veteran referrals stay in the [Veteran Resource Guide](https://github.com/travisvought-byte/vhg-veteran-resident-guide) (guide.vethomeguard.org). This site links to it for local help.

## License
Data CC BY 4.0, code MIT. See `LICENSE`.
