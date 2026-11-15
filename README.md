# Mobility Resources & Advocacy

A free, national (all 50 states and D.C.), source-linked site for people facing mobility barriers: wheelchair and equipment repair, coverage denials, home access, vehicles, transit and public access. It also helps people ask lawmakers for change.

Created and maintained by Travis Vought. Corrections: travis@vethomeguard.org.

## Pages
- `index.html`: home page with a state and barrier picker
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

## Related
Local county and veteran referrals stay in the [Veteran Resource Guide](https://github.com/travisvought-byte/vhg-veteran-resident-guide) (guide.vethomeguard.org). This site links to it for local help.

## License
Data CC BY 4.0, code MIT. See `LICENSE`.
