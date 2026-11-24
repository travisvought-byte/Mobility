// Mobility Talk: the help map on the home page and the local help page.
// Draws real state and county outlines (data/geo/, from the U.S. Census Bureau's boundary files) over
// OpenStreetMap's map pictures. On the local help page every county looks the same: the map is a way to pick a
// county and see its help, not a ranking (owner direction, November 23, 2026: no county is shaded or labeled by how
// many programs list it). A list of the counties (or states) in view sits beside the map, so everything on the map can also
// be reached with a keyboard or a screen reader. "Use my location" finds your state and county inside this
// page: the location is never stored or sent. Without JavaScript or without this file, the pages work as
// before: the state picker, the county menu and the plain state pages.
(function () {
  'use strict';
  var L = window.L;
  var ok = !!(L && L.Browser && (L.Browser.svg || L.Browser.canvas) && window.fetch && document.querySelector);
  var api = window.MTMap = { ok: function () { return ok; } };
  if (!ok) return;

  var $ = function (id) { return document.getElementById(id); };
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var US = [[24.4, -124.9], [49.4, -66.9]];
  // Outline colors that stand out on the light map and on the darkened one
  var dark = window.matchMedia && matchMedia('screen and (prefers-color-scheme: dark)').matches;
  var EDGE = dark ? '#0d1519' : '#41545e', PICKED = dark ? '#f0d58f' : '#183449';
  var cache = {};
  function getJSON(u) {
    if (!cache[u]) cache[u] = fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); });
    return cache[u];
  }
  var states = function () { return getJSON('data/geo/states.json'); };
  var counties = function (st) { return getJSON('data/geo/' + st + '.json'); };
  api.counties = counties;
  var nk = function (x) { return String(x == null ? '' : x).toLowerCase().replace(/\bsaint\b/g, 'st').replace(/[^a-z0-9]/g, ''); };
  // the outline files are [longitude, latitude], as in GeoJSON; Leaflet wants [latitude, longitude]
  var latlngs = function (polys) { return polys.map(function (poly) { return poly.map(function (r) { return r.map(function (p) { return [p[1], p[0]]; }); }); }); };
  var box = function (b) { return L.latLngBounds([b[1], b[0]], [b[3], b[2]]); };

  // --- where a point is: ray casting, counting every ring so holes work
  function inRing(x, y, r) {
    var inside = false;
    for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
      var xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function inside(polys, x, y) {
    return polys.some(function (poly) { return poly.filter(function (r) { return inRing(x, y, r); }).length % 2 === 1; });
  }
  var inBox = function (b, x, y) { return x >= b[0] - 0.05 && x <= b[2] + 0.05 && y >= b[1] - 0.05 && y <= b[3] + 0.05; };
  // Resolves to {state, county}; county is '' when the point is in a state but on no county outline (on the water, say).
  function whereIs(lat, lon) {
    var xs = [lon, lon - 360]; // western Aleutians are stored past -180
    return states().then(function (S) {
      var hit = S.states.filter(function (s) { return xs.some(function (x) { return inBox(s.b, x, lat) && inside(s.p, x, lat); }); });
      var near = S.states.filter(function (s) { return hit.indexOf(s) < 0 && xs.some(function (x) { return inBox(s.b, x, lat); }); });
      var tries = hit.concat(near);
      var i = 0;
      function next() {
        if (i >= tries.length) return hit.length ? { state: hit[0].id, county: '' } : null;
        var s = tries[i++];
        return counties(s.id).then(function (C) {
          for (var k = 0; k < C.counties.length; k++) {
            if (xs.some(function (x) { return inside(C.counties[k].p, x, lat); })) return { state: s.id, county: C.counties[k].n };
          }
          return next();
        }, next);
      }
      return next();
    });
  }

  function status(t) { var s = $('map-status'); if (s) s.textContent = t; }

  function makeMap(el) {
    var map = L.map(el, { zoomSnap: 0.25, scrollWheelZoom: false, zoomAnimation: !calm, fadeAnimation: !calm, markerZoomAnimation: !calm, worldCopyJump: false });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    // The page keeps scrolling over the map until someone clicks or tabs into it; the + and - buttons always work.
    map.on('focus click', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });
    map.fitBounds(US, { animate: false });
    return map;
  }
  function fit(map, bounds, max) {
    map.fitBounds(bounds, { padding: [12, 12], maxZoom: max || 11, animate: !calm });
  }

  // Your own spot, drawn only on this page
  var youMark = null;
  function markYou(map, lat, lon) {
    if (youMark) map.removeLayer(youMark);
    youMark = L.circleMarker([lat, lon], { radius: 9, color: '#ffffff', weight: 3, fillColor: '#b3261e', fillOpacity: 1, interactive: false }).addTo(map);
  }
  function askWhere(map, done) {
    if (!navigator.geolocation) { status('This browser cannot share a location. Choose your state from the list instead.'); return; }
    status('Finding where you are…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      markYou(map, lat, lon);
      whereIs(lat, lon).then(function (w) {
        if (!w) { status('That location is not in a U.S. state or territory. Choose a state from the list, or see help in other countries on the Worldwide page.'); return; }
        done(w, lat, lon);
      }).catch(function () { status('The map outlines could not load, so your county could not be found. Choose your state from the list instead.'); });
    }, function () {
      status('Location was not shared. That is fine: choose your state from the list or the menu.');
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  // ---------- Home page: pick a state on the map, or find yours, and go to its programs
  api.home = function () {
    var el = $('home-map');
    if (!el) return;
    var sec = el.closest('section');
    var map;
    try { map = makeMap(el); } catch (e) { return; }
    if (sec) sec.classList.add('has-map');
    el.parentElement.hidden = false;
    map.invalidateSize(false);
    map.fitBounds(US, { animate: false });
    var go = function (st, county) { location.href = 'local-help.html?state=' + encodeURIComponent(st) + (county ? '&county=' + encodeURIComponent(county) : ''); };
    states().then(function (S) {
      S.states.forEach(function (s) {
        L.polygon(latlngs(s.p), { color: '#ffffff', weight: 1.2, fillColor: '#335947', fillOpacity: 0.32 })
          .bindTooltip(s.n, { sticky: true, direction: 'top' })
          .on('mouseover', function () { this.setStyle({ fillOpacity: 0.6, weight: 2.5 }); })
          .on('mouseout', function () { this.setStyle({ fillOpacity: 0.32, weight: 1.2 }); })
          .on('click', function () { go(s.id); })
          .addTo(map);
      });
    }).catch(function () { status('The state outlines could not load. Choose your state from the list.'); });
    var b = $('map-locate');
    if (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        askWhere(map, function (w, lat, lon) {
          map.setView([lat, lon], 9, { animate: !calm });
          status('Opening help for ' + (w.county ? w.county + ' County, ' : '') + w.state + '…');
          go(w.state, w.county);
        });
      });
    }
  };

  // ---------- Local help page: the map follows the filters, and choosing on the map sets them
  var H = null;
  function helpSetup() {
    var el = $('map-wrap');
    if (!el) return null;
    var map = makeMap(el);
    H = { map: map, layer: L.featureGroup().addTo(map), shapes: [], key: '', opts: null, boundsKey: '' };
    map.on('moveend', function () { if (H.opts) list(); });
    $('map-locate').addEventListener('click', function () {
      askWhere(map, function (w) {
        status('You are in ' + (w.county ? w.county + ' County, ' : '') + (H.opts.names[w.state] || w.state) + '. The list below now shows the help there.');
        counties(w.state).then(function (geo) { H.opts.onLocate(w.state, w.county, geo); }, function () { H.opts.onLocate(w.state, '', null); });
      });
    });
    $('map-back').addEventListener('click', function () {
      if (H.opts.county) H.opts.onCounty(H.opts.county); else H.opts.onState('');
    });
    return H;
  }

  function list() {
    var o = H.opts, ul = $('map-list'), view = H.map.getBounds().pad(0.02);
    var items = H.shapes.filter(function (x) { return view.intersects(x.bounds); });
    if (!items.length) items = H.shapes;
    items.sort(function (a, b) { return a.name.localeCompare(b.name); });
    $('map-list-h').textContent = (o.state ? 'Counties' : 'States and territories') + ' on the map';
    ul.textContent = '';
    items.forEach(function (x) {
      var li = document.createElement('li'), btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maphit';
      var name = document.createElement('span'), sub = document.createElement('span');
      name.className = 'mh-name';
      name.textContent = x.name;
      sub.className = 'mh-sub';
      sub.textContent = x.note;
      btn.append(name, sub);
      if (o.state) btn.setAttribute('aria-pressed', o.county && nk(o.county) === nk(x.name) ? 'true' : 'false');
      btn.addEventListener('click', function () { x.pick(); });
      li.append(btn);
      ul.append(li);
    });
  }

  function draw() {
    var o = H.opts, map = H.map;
    H.layer.clearLayers();
    H.shapes = [];
    if (!o.state) {
      return states().then(function (S) {
        if (H.opts !== o) return;
        S.states.forEach(function (s) {
          var shape = L.polygon(latlngs(s.p), { color: '#ffffff', weight: 1.2, fillColor: '#335947', fillOpacity: 0.32 })
            .bindTooltip(s.n, { sticky: true, direction: 'top' })
            .on('mouseover', function () { this.setStyle({ fillOpacity: 0.6, weight: 2.5 }); })
            .on('mouseout', function () { this.setStyle({ fillOpacity: 0.32, weight: 1.2 }); })
            .on('click', function () { o.onState(s.id); });
          H.layer.addLayer(shape);
          H.shapes.push({ name: s.n, note: 'Show its programs', bounds: box(s.b), pick: function () { o.onState(s.id); } });
        });
        list();
      });
    }
    var geo = o.geo, sel = nk(o.county), chosen = null;
    geo.counties.forEach(function (c) {
      var on = sel && [c.n].concat(c.a || []).some(function (a) { return nk(a) === sel; });
      // one fill for every county; the chosen county and the one under the pointer stand out
      var base = { color: on ? PICKED : EDGE, weight: on ? 4 : 0.8, fillColor: '#335947', fillOpacity: on ? 0.55 : 0.22 };
      var shape = L.polygon(latlngs(c.p), base)
        .bindTooltip(c.n, { sticky: true, direction: 'top' })
        .on('mouseover', function () { this.setStyle({ weight: on ? 4 : 2.6, color: PICKED, fillOpacity: 0.45 }); })
        .on('mouseout', function () { this.setStyle(base); })
        .on('click', function () { o.onCounty(c.n); });
      H.layer.addLayer(shape);
      if (on) chosen = shape;
      H.shapes.push({ name: c.n, note: on ? 'Chosen: showing its help' : 'Show help here', bounds: shape.getBounds(), pick: function () { o.onCounty(c.n); } });
    });
    if (chosen) chosen.bringToFront();
    return Promise.resolve(chosen);
  }

  // opts: {state, county, geo (county outlines, or null without a state), names (code -> name), onState(code), onCounty(name), onLocate(state, county, geo)}
  api.help = function (opts) {
    if (!H && !helpSetup()) return false;
    var key = opts.state + '|' + nk(opts.county);
    H.opts = opts;
    $('map-back').hidden = !opts.state;
    $('map-back').textContent = opts.county ? 'Show all of ' + (opts.names[opts.state] || opts.state) : 'See all states';
    $('map-wrap').setAttribute('aria-label', opts.state
      ? 'Map of ' + (opts.names[opts.state] || opts.state) + ' by county. The same counties are listed next to the map.'
      : 'Map of the United States. The same states and territories are listed next to the map.');
    if (key === H.key) { list(); return true; }
    H.key = key;
    // Leaflet measures the map when it is drawn; the section may just have been shown.
    H.map.invalidateSize(false);
    draw().then(function (chosen) {
      if (H.opts !== opts) return;
      var where = opts.state + '|' + nk(opts.county);
      if (where === H.boundsKey) { list(); return; }
      H.boundsKey = where;
      if (chosen) fit(H.map, chosen.getBounds().pad(0.6), 10);
      else if (opts.state) fit(H.map, box(opts.geo.b), 9);
      else H.map.fitBounds(US, { animate: !calm });
      list();
    });
    return true;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', api.home);
  else api.home();
}());
