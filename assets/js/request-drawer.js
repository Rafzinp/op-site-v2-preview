/* "Add to request" drawer. No payment: customers send a request and the team follows up.
   Triggers:  [data-add="cup|box|bag|bagasse"]  opens the product step
              [data-open-request]               opens the review step
   Counter:   any element with [data-request-count] shows the number of items. */
(function () {
  // Site root relative to this page (works from / and /industries/), derived from this script's own URL.
  var cs = document.currentScript, ROOT = '';
  try { ROOT = new URL('../../', cs.src).href; } catch (e) { ROOT = /\/industries\//.test(location.pathname) ? '../' : ''; }
  var PRODUCTS = {
    cup:     { name: 'Paper cup 8 oz', sub: 'Single-wall · FSC paper · Ø 80 mm', per: 'carton of 1,000', unit: 'cups', pcs: 1000, price: 148, img: 'assets/img/cup.jpg', tag: 'Best seller',
               opts: [['Size', ['4 oz', '8 oz', '12 oz', '16 oz'], 1], ['Lid', ['No lid', 'White PP lid', 'Fibre lid'], 1]] },
    box:     { name: 'Kraft takeaway box', sub: 'Kraft board · grease-resistant', per: 'carton of 300', unit: 'pcs', pcs: 300, price: 210, img: 'assets/img/box.jpg',
               opts: [['Style', ['With window', 'Plain'], 0]] },
    // Placeholder carton size (copied from the takeaway box) - confirm with the product team.
    deli:    { name: 'Kraft deli box (KDB)', sub: 'Kraft board · grease-resistant', per: 'carton of 300', unit: 'pcs', pcs: 300, price: 96, img: 'assets/img/doop/_bXvhZgME-.webp',
               opts: [['Size', ['Small', 'Medium'], 0]] },
    bag:     { name: 'Kraft paper bag, medium', sub: 'Recycled kraft · twisted handle', per: 'carton of 250', unit: 'pcs', pcs: 250, price: 96, img: 'assets/img/bag.jpg',
               opts: [['Print', ['Plain', 'Custom logo (from 500 pcs)'], 0]] },
    bagasse: { name: 'Bagasse container 750 ml', sub: 'Sugarcane fibre · home compostable', per: 'carton of 500', unit: 'pcs', pcs: 500, price: 260, img: 'assets/img/bagasse.jpg', tag: 'Compostable',
               opts: [['Size', ['500 ml', '750 ml', '1000 ml'], 1]] }
  };
  var QUICK = [1, 5, 10, 20, 50];
  var KEY = 'oslopack-request';
  // Products registered by shop cards (name/price/image come from the card). Stored so saved items survive a reload.
  var DEFKEY = KEY + '-defs';
  var normDef = function (id, d) {
    if (!/^[a-z0-9-]{1,80}$/.test(id) || !d || typeof d !== 'object') return null;
    var price = Number(d.price), name = typeof d.name === 'string' ? d.name.slice(0, 120) : '', img = typeof d.img === 'string' ? d.img : '';
    if (!name || !isFinite(price) || price < 0 || price > 1e6 || !/^assets\/[\w\-./]+$/.test(img)) return null;
    var sizes = Array.isArray(d.sizes) ? d.sizes.filter(function (z) { return typeof z === 'string' && z; }).slice(0, 8).map(function (z) { return z.slice(0, 30); }) : [];
    return { name: name, sub: '', per: 'carton', unit: 'pcs', pcs: 0, price: price, img: img, opts: sizes.length ? [['Size', sizes, 0]] : [], def: { name: name, price: price, img: img, sizes: sizes } };
  };
  var defs = {};
  try {
    var rd = JSON.parse(localStorage.getItem(DEFKEY) || '{}');
    if (rd && typeof rd === 'object' && !Array.isArray(rd)) Object.keys(rd).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(PRODUCTS, k)) return;
      var n = normDef(k, rd[k]); if (n) { PRODUCTS[k] = n; defs[k] = n.def; }
    });
  } catch (e) {}
  var items = [];
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(raw)) items = raw.filter(function (x) {
      return x && typeof x === 'object' && typeof x.id === 'string' && Object.prototype.hasOwnProperty.call(PRODUCTS, x.id) &&
        typeof x.qty === 'number' && isFinite(x.qty) && x.qty >= 1;
    }).map(function (x) {
      var def = PRODUCTS[x.id].opts.map(function (g) { return g[2]; });
      var sel = Array.isArray(x.sel) ? def.map(function (d, gi) { var v = x.sel[gi]; return (typeof v === 'number' && v >= 0 && v < PRODUCTS[x.id].opts[gi][1].length) ? v : d; }) : def;
      return { id: x.id, qty: Math.min(999, Math.floor(x.qty)), sel: sel };
    });
  } catch (e) { items = []; }

  var ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>'
  };
  var fmt = function (n) { return 'QAR ' + n.toLocaleString('en-US'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} if (items.length) ensureNo(); else resetMeta(); counts(); };
  // Items with no price ("price on request") are left out of the total and flagged instead.
  var totalTxt = function () {
    var unpriced = items.some(function (i) { return !PRODUCTS[i.id].price; }), t = items.reduce(function (s, i) { return s + PRODUCTS[i.id].price * i.qty; }, 0);
    return t ? fmt(t) + (unpriced ? ' + items on request' : '') : (unpriced ? 'Price on request' : fmt(0));
  };
  var total = function () { return items.reduce(function (s, i) { return s + PRODUCTS[i.id].price * i.qty; }, 0); };
  var counts = function () {
    var n = items.length;
    document.querySelectorAll('[data-request-count]').forEach(function (el) { el.textContent = n; });
    document.querySelectorAll('[data-add]').forEach(function (b) {
      var it = items.filter(function (i) { return i.id === b.getAttribute('data-add'); })[0];
      if (!b.dataset.label) b.dataset.label = b.innerHTML;
      b.innerHTML = it ? '✓ In request · ' + it.qty : b.dataset.label;
      b.classList.toggle('in', !!it);
    });
  };

  var scrim = document.createElement('div'); scrim.className = 'rq-scrim';
  var box = document.createElement('aside'); box.className = 'rq'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'rq-title');
  var live = document.createElement('div'); live.className = 'rq-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(scrim); document.body.appendChild(box); document.body.appendChild(live);
  // Announce count/total changes to screen readers (cleared first so identical text is re-read).
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  // Page behind the dialog is inert while open.
  var inerted = [];
  function setInert(on) {
    if (on) {
      inerted = [].filter.call(document.body.children, function (el) { return el !== box && el !== scrim && el !== live && el.tagName !== 'SCRIPT' && !el.inert; });
      inerted.forEach(function (el) { el.inert = true; });
    } else { inerted.forEach(function (el) { el.inert = false; }); inerted = []; }
  }
  // After a re-render keep focus on the same control (same data-act / index / option), else the first control.
  function focusKey(trg) {
    var a = trg || document.activeElement;   // Safari does not focus buttons on click, so prefer the clicked control
    if (!a || a === box || !box.contains(a)) return null;
    return { act: a.getAttribute('data-act'), i: a.getAttribute('data-i'), id: a.getAttribute('data-id'), opt: a.getAttribute('data-opt'), q: a.getAttribute('data-q'), cls: a.className, tag: a.tagName };
  }
  function restoreFocus(k) {
    var el = null, sel;
    if (k) {
      if (k.id !== null && k.act) sel = '[data-act="' + k.act + '"][data-id="' + k.id + '"]';
      else if (k.opt !== null) sel = '[data-opt="' + k.opt + '"]';
      else if (k.q !== null) sel = '[data-q="' + k.q + '"]';
      else if (k.act) sel = '[data-act="' + k.act + '"]' + (k.i !== null ? '[data-i="' + k.i + '"]' : '');
      if (sel) el = box.querySelector(sel);
      if (!el && k.act && k.i !== null) { var all = box.querySelectorAll('[data-act="' + k.act + '"]'); el = all.length ? all[Math.min(+k.i, all.length - 1)] : null; }
    }
    if (!el) el = box.querySelector('.rq-done h2') || [].filter.call(box.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; })[0];
    if (el) el.focus({ preventScroll: true }); else box.focus({ preventScroll: true });
  }
  function rerender(view, trg) { var k = focusKey(trg); view(); restoreFocus(k); }

  var cur = null;       // product step draft {id, qty, sel[]}
  var lastRef = '';

  var opener = null, lockPad = '', padded = false;
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
  var isOpen = function () { return box.classList.contains('on'); };
  function open(from) {
    if (!isOpen()) opener = from || document.activeElement;
    if (!isOpen()) {
      var w = document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      var gap = document.documentElement.clientWidth - w;   // scrollbar width lost; compensate so the page does not shift
      if (gap > 0) { lockPad = document.body.style.paddingRight; document.body.style.paddingRight = gap + 'px'; padded = true; }
      setInert(true);
    }
    scrim.classList.add('on'); box.classList.add('on');
    if (!box.contains(document.activeElement)) { box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }
  }
  function close() {
    if (busy) return;
    var was = isOpen();
    scrim.classList.remove('on'); box.classList.remove('on'); document.body.style.overflow = '';
    if (padded) { document.body.style.paddingRight = lockPad; padded = false; }
    setInert(false);
    if (was && opener && opener.focus && document.contains(opener)) opener.focus();
    if (was) opener = null;
  }
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    var f = [].filter.call(box.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; });
    if (!f.length) { e.preventDefault(); box.focus(); return; }
    var a = document.activeElement, first = f[0], last = f[f.length - 1];
    if (!box.contains(a) || a === box) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });

  function header(title, back, count) {
    return '<div class="rq-h"><div class="t">' + (back ? '<button class="rq-ib" data-act="' + back + '" aria-label="Back">' + ICON.back + '</button>' : '') +
      (title ? '<h2 id="rq-title">' + title + '</h2>' : '') + '</div>' + (count ? '<span class="cnt">' + count + '</span>' : '') +
      (!back ? '<button class="rq-ib" data-act="close" aria-label="Close">' + ICON.x + '</button>' : '') + '</div>';
  }

  function viewProduct() {
    var p = PRODUCTS[cur.id], line = p.price * cur.qty;
    var opts = p.opts.map(function (g, gi) {
      return '<div class="rq-lbl">' + g[0] + '</div><div class="rq-opt">' + g[1].map(function (o, oi) {
        return '<button class="rq-o' + (cur.sel[gi] === oi ? ' on' : '') + '" data-opt="' + gi + ':' + oi + '">' + o + '</button>'; }).join('') + '</div>';
    }).join('');
    var after = items.filter(function (i) { return i.id !== cur.id; }).length + 1;
    var afterTotal = items.filter(function (i) { return i.id !== cur.id; }).reduce(function (s, i) { return s + PRODUCTS[i.id].price * i.qty; }, 0) + line;
    box.innerHTML = header('Add to request') +
      '<div class="rq-b"><div class="rq-prow"><div class="im"><img src="' + ROOT + p.img + '" alt="' + esc(p.name) + '"></div><div><h3>' + p.name + '</h3><div class="m">' + p.sub + '</div><div class="pr">' + (p.price ? fmt(p.price) + ' <span>/ ' + p.per + '</span>' : 'Price on request') + '</div></div></div>' +
      opts + '<div class="rq-lbl">Quantity <span>' + (p.pcs ? 'Cartons of ' + p.pcs.toLocaleString('en-US') : 'Priced per carton') + '</span></div>' +
      '<div class="rq-step"><button data-act="dec" aria-label="Fewer">−</button><div class="v">' + cur.qty + '<small>cartons</small></div><button data-act="inc" aria-label="More">+</button></div>' +
      '<div class="rq-qk">' + QUICK.map(function (q) { return '<button class="rq-o' + (cur.qty === q ? ' on' : '') + '" data-q="' + q + '">' + q + (q === 50 ? ' · free delivery' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="rq-est"><span>' + (p.pcs ? (cur.qty * p.pcs).toLocaleString('en-US') + ' ' + p.unit + ' · ' : '') + 'indicative price</span><b>' + (p.price ? fmt(line) : 'On request') + '</b></div></div>' +
      '<div class="rq-f"><div class="rq-sum"><span>Your request after adding: <b style="font-size:14px">' + after + ' item' + (after > 1 ? 's' : '') + '</b></span><span>Est. <b>' + (afterTotal ? fmt(afterTotal) : 'On request') + '</b></span></div>' +
      '<button class="rq-btn" data-act="add">Add to request · ' + cur.qty + ' cartons</button><div class="rq-note">No payment now. Our team confirms price and delivery.</div></div>';
    announce(cur.qty + ' carton' + (cur.qty > 1 ? 's' : '') + ', ' + (p.pcs ? (cur.qty * p.pcs).toLocaleString('en-US') + ' ' + p.unit + ', ' : '') + (p.price ? fmt(line) : 'price on request'));
  }

  // ===================================================================
  // Request drawer (Paper design): Request / Wishlist tabs, free-delivery progress,
  // custom printing add-on, pairing suggestion, contact form with validation,
  // sending and sent states. Prices are never shown here: "Shared on WhatsApp after review".
  // ===================================================================
  var FREE_AT = 50;                       // cartons for free delivery in Doha
  var META = KEY + '-meta';               // request no., custom printing, note, LPO
  var WISHKEY = 'oslopack-wishlist';      // saved product ids (shared with the card hearts)
  var WDEFKEY = 'oslopack-wish-defs';     // name/price/image of saved products, read from the cards
  var CAT = { cup: 'CUPS', box: 'BOXES', deli: 'BOXES', bag: 'BAGS', bagasse: 'CONTAINERS' };
  var PAIR = { cup: 'drinks pairing', box: 'takeaway pairing', deli: 'takeaway pairing', bag: 'takeaway pairing', bagasse: 'eco pairing' };
  var AREAS = ['West Bay, Doha', 'The Pearl, Doha', 'Lusail', 'Al Wakrah', 'Al Khor', 'Other (tell us in the note)'];

  var sv = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>'; };
  var IC = {
    plus: sv('<path d="M12 5v14M5 12h14"/>'),
    x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: sv('<path d="M5 12l5 5 9-10"/>'),
    arrow: sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    box: sv('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'),
    bag: sv('<path d="M4.5 8h15l-1.2 12.5H5.7L4.5 8z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/>'),
    heart: sv('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>'),
    alert: sv('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>')
  };

  var meta = { no: '', print: false, note: '', lpo: '' };
  try {
    var mj = JSON.parse(localStorage.getItem(META) || '{}');
    if (mj && typeof mj === 'object') {
      if (/^OP-\d{4}$/.test(mj.no)) meta.no = mj.no;
      meta.print = mj.print === true;
      if (typeof mj.note === 'string') meta.note = mj.note.slice(0, 500);
      if (typeof mj.lpo === 'string') meta.lpo = mj.lpo.slice(0, 40);
    }
  } catch (e) {}
  var saveMeta = function () { try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) {} };
  var ensureNo = function () { if (!meta.no) { meta.no = 'OP-' + (2000 + Math.floor(Math.random() * 8000)); saveMeta(); } };
  var resetMeta = function () { meta = { no: '', print: false, note: '', lpo: '' }; saveMeta(); showNote = false; showLpo = false; };

  var form = { name: '', phone: '', area: AREAS[0] };
  try {
    var cj = JSON.parse(localStorage.getItem(KEY + '-contact') || '{}');
    if (cj && typeof cj === 'object') {
      if (typeof cj.name === 'string') form.name = cj.name.slice(0, 80);
      if (typeof cj.phone === 'string') form.phone = cj.phone.slice(0, 30);
    }
  } catch (e) {}
  var tab = 'request', errs = null, busy = false, sent = null, copied = false, showNote = !!meta.note, showLpo = !!meta.lpo;

  // ---- wishlist data: ids live under WISHKEY; names/images are read from the product cards on every page load
  var readWish = function () { try { var r = JSON.parse(localStorage.getItem(WISHKEY) || '[]'); return Array.isArray(r) ? r.filter(function (x) { return typeof x === 'string'; }) : []; } catch (e) { return []; } };
  var writeWish = function (a) { try { localStorage.setItem(WISHKEY, JSON.stringify(a)); } catch (e) {} };
  var wdefs = {};
  try {
    var rw = JSON.parse(localStorage.getItem(WDEFKEY) || '{}');
    if (rw && typeof rw === 'object' && !Array.isArray(rw)) Object.keys(rw).forEach(function (k) { var n = normDef(k, rw[k]); if (n) wdefs[k] = n.def; });
  } catch (e) {}
  function scanCards() {
    var changed = false;
    document.querySelectorAll('[data-wish]').forEach(function (h) {
      var id = h.getAttribute('data-wish'), c = h.parentElement && h.parentElement.querySelector('[data-name]');
      if (!c) return;
      var n = normDef(id, { name: c.dataset.name, price: c.dataset.price, img: c.dataset.img, sizes: (c.dataset.sizes || '').split('|').filter(Boolean) });
      if (n && JSON.stringify(wdefs[id]) !== JSON.stringify(n.def)) { wdefs[id] = n.def; changed = true; }
    });
    if (changed) { try { localStorage.setItem(WDEFKEY, JSON.stringify(wdefs)); } catch (e) {} }
  }
  var wishItems = function () { return readWish().filter(function (id) { return wdefs[id]; }); };

  // ---- adding items
  function addItem(id, def) {
    if (!Object.prototype.hasOwnProperty.call(PRODUCTS, id) && def) {
      var n = normDef(id, def);
      if (n) { PRODUCTS[id] = n; defs[id] = n.def; try { localStorage.setItem(DEFKEY, JSON.stringify(defs)); } catch (e) {} }
    }
    var p = PRODUCTS[id]; if (!p) return false;
    var ex = items.filter(function (x) { return x.id === id; })[0];
    if (ex) ex.qty = Math.min(999, ex.qty + 1); else items.push({ id: id, qty: 1, sel: p.opts.map(function (g) { return g[2]; }) });
    save(); return true;
  }
  var cartons = function () { return items.reduce(function (s, i) { return s + i.qty; }, 0); };
  var plural = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
  var inRequest = function (id) { return items.filter(function (i) { return i.id === id; })[0]; };
  var brandLine = function (id) { return 'OSLOPACK' + (CAT[id] ? ' · ' + CAT[id] : ''); };
  var itemMeta = function (p, qty) { return p.pcs ? p.pcs.toLocaleString('en-US') + ' pcs / carton · ' + (qty * p.pcs).toLocaleString('en-US') + ' pcs total' : plural(qty, 'carton'); };
  var thumb = function (p) { return '<div class="im"><img src="' + ROOT + p.img + '" alt=""></div>'; };
  function pairing() {
    var free = Object.keys(PRODUCTS).filter(function (k) { return !PRODUCTS[k].def && PRODUCTS[k].pcs && !inRequest(k); });
    return ['bag', 'cup', 'box', 'bagasse', 'deli'].filter(function (k) { return free.indexOf(k) > -1; })[0] || null;
  }

  // ---- shared header
  function tabsHeader(title) {
    var rc = items.length, wc = wishItems().length, d = busy ? ' disabled' : '';
    return '<div class="rq-h2"><h2 class="rq-vh" id="rq-title" tabindex="-1">' + title + '</h2><div class="rq-tabs" role="tablist">' +
      '<button class="rq-tab' + (tab === 'request' ? ' on' : '') + '" role="tab" aria-selected="' + (tab === 'request') + '" data-act="tab-request"' + d + '>Request' + (rc ? '<sup>' + rc + '</sup>' : '') + '</button>' +
      '<button class="rq-tab' + (tab === 'wish' ? ' on' : '') + '" role="tab" aria-selected="' + (tab === 'wish') + '" data-act="tab-wish"' + d + '>Wishlist' + (wc ? '<sup>' + wc + '</sup>' : '') + '</button></div>' +
      '<button class="rq-ib bare" data-act="close" aria-label="Close"' + d + '>' + IC.x + '</button></div>';
  }
  function subHeader() {
    if (items.length) ensureNo();
    return '<div class="rq-sub"><span>Request no.' + (items.length ? '<b>' + meta.no + '</b>' : '<em>Created when you add your first item</em>') + '</span>' +
      (items.length ? '<span class="st"><i></i>' + (busy ? 'Submitting' : 'Draft · saved automatically') + '</span>' : '') + '</div>';
  }

  // ---- empty request
  function viewEmpty() {
    tab = 'request';
    var lnk = function (t) { return '<a class="rq-chip" href="' + ROOT + 'products.html">' + t + '</a>'; };
    box.innerHTML = tabsHeader('Your request') + subHeader() +
      '<div class="rq-b"><div class="rq-em"><span class="ic">' + IC.box + '</span><h3>Your request is empty</h3>' +
      '<p>Add cups, boxes or bags by the carton. You\'ll get exact pricing and delivery on WhatsApp, with no payment now.</p>' +
      '<div class="rq-chips">' + lnk('Cups &amp; lids') + lnk('Boxes') + lnk('Bags') + lnk('Cutlery &amp; napkins') + '</div></div></div>' +
      '<div class="rq-f2"><a class="rq-btn blue" href="' + ROOT + 'products.html">Browse all products' + IC.arrow + '</a><div class="rq-note">Free delivery over 50 cartons</div></div>';
    announce('Your request is empty');
  }

  // ---- request (also used, read-only, while sending)
  function viewRequest() {
    tab = 'request';
    if (!items.length) return viewEmpty();
    var n = cartons(), left = Math.max(0, FREE_AT - n), unlocked = left === 0, pct = Math.min(100, Math.round(n / FREE_AT * 100)), d = busy ? ' disabled' : '';
    var banner = '';
    if (errs && (errs.name || errs.phone)) {
      banner = '<div class="rq-ban" role="alert">' + IC.alert + '<div><b>' + (errs.name && errs.phone ? 'We need two details to send your request' : 'We need one more detail to send your request') + '</b><span>' +
        (errs.name && errs.phone ? 'Add your name and a WhatsApp number so we can reply.' : errs.name ? 'Add your name so we know who to reply to.' : 'Add a WhatsApp number so we can reply.') + '</span></div></div>';
    }
    var progress = busy ? '' : (unlocked
      ? '<div class="rq-free ok">' + IC.check + '<span><b>Free delivery unlocked</b> · Doha, within 48 hours</span></div><div class="rq-bar ok"><i style="width:100%"></i></div>'
      : '<div class="rq-free"><b>' + plural(left, 'carton') + '</b> away from free delivery in Doha</div><div class="rq-bar"><i style="width:' + pct + '%"></i></div>');
    var print = busy ? '' : (meta.print
      ? '<div class="rq-okb" role="status"><span class="ic">' + IC.bag + '</span><div><b>Custom printing added</b><span>We\'ll ask for your logo on WhatsApp and include it in your quote.</span></div><button class="rq-ul" data-act="pr-undo">Undo</button></div>'
      : '<div class="rq-promo"><span class="ic">' + IC.bag + '</span><div><b>Add custom printing</b><span>Your logo from 500 pcs. We confirm artwork on WhatsApp.</span></div><button class="rq-plus" data-act="pr-add" aria-label="Add custom printing">' + IC.plus + '</button></div>');
    var list = items.map(function (it, idx) {
      var p = PRODUCTS[it.id];
      return '<div class="rq-li">' + thumb(p) + '<div class="bd"><span class="lb">' + brandLine(it.id) + '</span><b>' + esc(p.name) + '</b><span class="m">' + itemMeta(p, it.qty) + '</span>' +
        (busy ? '' : '<div class="qty"><button data-act="idec" data-i="' + idx + '" aria-label="Fewer ' + esc(p.name) + '">−</button><span>' + it.qty + '</span><button data-act="iinc" data-i="' + idx + '" aria-label="More ' + esc(p.name) + '">+</button></div>') + '</div>' +
        (busy ? '' : '<button class="rq-x" data-act="rm" data-i="' + idx + '" aria-label="Remove ' + esc(p.name) + '">' + IC.x + '</button>') + '</div>';
    }).join('');
    var pid = busy ? null : pairing(), pair = '';
    if (pid) {
      var pp = PRODUCTS[pid];
      pair = '<div class="rq-pl">Pairs well with</div><div class="rq-pair">' + thumb(pp) + '<div><b>' + esc(pp.name) + '</b><span>' + pp.pcs.toLocaleString('en-US') + ' pcs / carton · ' + (PAIR[pid] || 'pairing') + '</span></div>' +
        '<button class="rq-plus" data-act="pair" data-id="' + pid + '" aria-label="Add ' + esc(pp.name) + ' to your request">' + IC.plus + '</button></div>';
    }
    var links = busy ? '' : '<div class="rq-links">' + (showNote ? '' : '<button class="rq-ul" data-act="note">Add a note for our team</button>') + (showLpo ? '' : '<button class="rq-ul" data-act="lpo">Add LPO number</button>') + '</div>';
    var extra = (showNote ? '<div class="rq-fld"><label for="rq-note">Note for our team <span>(optional)</span></label><textarea id="rq-note" placeholder="Delivery date, custom printing, anything we should know"' + d + '>' + esc(meta.note) + '</textarea></div>' : '') +
      (showLpo ? '<div class="rq-fld"><label for="rq-lpo">LPO number <span>(optional)</span></label><input id="rq-lpo" autocomplete="off" value="' + esc(meta.lpo) + '"' + d + '></div>' : '');
    var fields = '<div class="rq-two rq-fld"><div id="f-name" class="' + (errs && errs.name ? 'err' : '') + '"><label for="rq-name">Contact name</label><input id="rq-name" autocomplete="name" placeholder="Your name" value="' + esc(form.name) + '"' + d + (errs && errs.name ? ' aria-invalid="true"' : '') + '><div class="rq-err">Enter your name</div></div>' +
      '<div id="f-phone" class="' + (errs && errs.phone ? 'err' : '') + '"><label for="rq-phone">WhatsApp / phone</label><input id="rq-phone" autocomplete="tel" inputmode="tel" placeholder="+974" value="' + esc(form.phone) + '"' + d + (errs && errs.phone ? ' aria-invalid="true"' : '') + '><div class="rq-err">Enter 8 digits after +974</div></div></div>' +
      '<div class="rq-fld"><label for="rq-area">Delivery area</label><select id="rq-area"' + d + '>' + AREAS.map(function (a) { return '<option' + (a === form.area ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></div>';
    var foot = '<div class="rq-f2"><div class="rq-pr"><span>Pricing' + (unlocked ? '<small class="ok">Delivery: free</small>' : '') + '</span><b>Shared on WhatsApp after review</b></div>' +
      (busy ? '<button class="rq-btn busy" disabled><i class="rq-spin"></i>Sending your request…</button><div class="rq-note">Please keep this window open for a moment.</div>'
            : '<button class="rq-btn" data-act="send">Send request' + IC.arrow + '</button><div class="rq-note">No payment now. We reply on WhatsApp within 1 working day.</div>') + '</div>';
    box.innerHTML = tabsHeader('Your request') + subHeader() + '<div class="rq-b">' + banner + progress + print + list + pair + links + extra + fields + '</div>' + foot;
    announce(busy ? 'Sending your request' : plural(items.length, 'item') + ' in your request. ' + (unlocked ? 'Free delivery unlocked.' : plural(left, 'carton') + ' away from free delivery.'));
  }

  // ---- wishlist
  function viewWishlist() {
    tab = 'wish';
    var ids = wishItems(), toAdd = ids.filter(function (id) { return !inRequest(id); });
    var body;
    if (!ids.length) {
      body = '<div class="rq-em"><span class="ic">' + IC.heart + '</span><h3>No saved items yet</h3><p>Tap the heart on any product to save it for later.</p></div>';
    } else {
      body = '<p class="rq-wn">Saved for later. Move items to your request when ready.</p>' + ids.map(function (id) {
        var w = wdefs[id], inq = inRequest(id);
        return '<div class="rq-li rq-wi">' + thumb({ img: w.img }) + '<div class="bd"><span class="lb">OSLOPACK</span><b>' + esc(w.name) + '</b><span class="m">' + (w.price ? 'From ' + fmt(w.price) + ' / carton' : 'Price on request') + '</span>' +
          (inq ? '<span class="rq-chipok">' + IC.check + 'In your request · ' + plural(inq.qty, 'carton') + '</span>' : '<button class="rq-sm" data-act="wadd" data-id="' + esc(id) + '">+ Add to request</button>') + '</div>' +
          '<button class="rq-heart" data-act="wrm" data-id="' + esc(id) + '" aria-pressed="true" aria-label="Remove ' + esc(w.name) + ' from wishlist">' + IC.heart + '</button></div>';
      }).join('');
    }
    var foot = ids.length
      ? '<div class="rq-f2">' + (toAdd.length ? '<button class="rq-btn" data-act="wall">Add ' + plural(toAdd.length, 'saved item') + ' to request' + IC.arrow + '</button>' : '<button class="rq-btn" data-act="tab-request">Back to your request' + IC.arrow + '</button>') + '<div class="rq-note">Saved on this device.</div></div>'
      : '<div class="rq-f2"><a class="rq-btn blue" href="' + ROOT + 'products.html">Browse all products' + IC.arrow + '</a></div>';
    box.innerHTML = tabsHeader('Wishlist') + subHeader() + '<div class="rq-b">' + body + '</div>' + foot;
    announce(plural(ids.length, 'saved item'));
  }

  // ---- sent
  function viewSent() {
    var first = (sent.name.split(/\s+/)[0] || '').trim();
    box.innerHTML = '<div class="rq-h2 end"><h2 class="rq-vh" id="rq-title" tabindex="-1">Request sent</h2><button class="rq-ib bare" data-act="close" aria-label="Close">' + IC.x + '</button></div>' +
      '<div class="rq-b rq-done"><div class="rq-ok">' + ICON.ok + '</div><h2 class="rq-sent-h">Request sent' + (first ? ', ' + esc(first) : '') + '.</h2>' +
      '<p class="sub">We\'ll reply on WhatsApp' + (sent.phone ? ' at ' + esc(sent.phone) : '') + ' within 1 working day with confirmed pricing and delivery. Nothing to pay yet.</p>' +
      '<div class="rq-sc"><div class="hd"><span>Request ' + esc(sent.ref) + '</span><button class="rq-ul" data-act="copy">' + (copied ? 'Copied' : 'Copy link') + '</button></div>' +
      sent.items.map(function (it) { var p = PRODUCTS[it.id]; return p ? '<div class="rw">' + thumb(p) + '<div><b>' + esc(p.name) + '</b><span>' + plural(it.qty, 'carton') + ' · ' + esc(sent.area) + '</span></div></div>' : ''; }).join('') + '</div>' +
      '<div class="rq-nx"><div class="h">What happens next</div>' +
      '<div class="rq-s"><div class="n on">1</div><div><b>We confirm price and stock</b><span>Our team checks quantities and any custom printing.</span></div></div>' +
      '<div class="rq-s"><div class="n on">2</div><div><b>You approve on WhatsApp</b><span>Reply to confirm. Pay by bank transfer or LPO.</span></div></div>' +
      '<div class="rq-s"><div class="n on">3</div><div><b>Delivered across Doha</b><span>Within 48 hours of confirmation.</span></div></div></div></div>' +
      '<div class="rq-f2"><button class="rq-btn" data-act="cont">Continue shopping</button><button class="rq-btn alt" data-act="edit">Edit this request</button></div>';
    announce('Request sent. Reference ' + sent.ref);
  }

  function finishSend() {
    sent = { items: items.map(function (i) { return { id: i.id, qty: i.qty, sel: i.sel }; }), name: form.name.trim(), phone: form.phone.trim(), area: form.area, ref: meta.no, print: meta.print, note: meta.note, lpo: meta.lpo };
    copied = false; lastRef = meta.no; items = []; busy = false; save();   // save() clears the request number and add-ons
    viewSent();
    var h = box.querySelector('#rq-title'); if (h) h.focus({ preventScroll: true });
  }
  function clearErr(k, input) {
    if (!errs || !errs[k]) return;
    errs[k] = false; var f = document.getElementById(k === 'name' ? 'f-name' : 'f-phone'); if (f) f.classList.remove('err'); input.removeAttribute('aria-invalid');
    if (!errs.name && !errs.phone) { errs = null; var b = box.querySelector('.rq-ban'); if (b) b.remove(); }
  }

  box.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'rq-name') { form.name = t.value; clearErr('name', t); }
    else if (t.id === 'rq-phone') { form.phone = t.value; clearErr('phone', t); }
    else if (t.id === 'rq-note') { meta.note = t.value; saveMeta(); }
    else if (t.id === 'rq-lpo') { meta.lpo = t.value; saveMeta(); }
  });
  box.addEventListener('change', function (e) { if (e.target.id === 'rq-area') form.area = e.target.value; });

  box.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-opt],[data-q]'); if (!t || t.disabled) return;
    var act = t.getAttribute('data-act'), i = +t.getAttribute('data-i'), id = t.getAttribute('data-id');
    if (t.hasAttribute('data-opt')) { var o = t.getAttribute('data-opt').split(':'); cur.sel[+o[0]] = +o[1]; return rerender(viewProduct, t); }
    if (t.hasAttribute('data-q')) { cur.qty = +t.getAttribute('data-q'); return rerender(viewProduct, t); }
    switch (act) {
      case 'close': return close();
      case 'tab-request': return rerender(viewRequest, t);
      case 'tab-wish': return rerender(viewWishlist, t);
      case 'dec': cur.qty = Math.max(1, cur.qty - 1); return rerender(viewProduct, t);
      case 'inc': cur.qty = Math.min(999, cur.qty + 1); return rerender(viewProduct, t);
      case 'add':   // product step -> request
        var ex = inRequest(cur.id);
        if (ex) { ex.qty = cur.qty; ex.sel = cur.sel; } else items.push({ id: cur.id, qty: cur.qty, sel: cur.sel });
        save(); errs = null; return rerender(viewRequest, t);
      case 'idec': items[i].qty = Math.max(1, items[i].qty - 1); save(); return rerender(viewRequest, t);
      case 'iinc': items[i].qty = Math.min(999, items[i].qty + 1); save(); return rerender(viewRequest, t);
      case 'rm': items.splice(i, 1); save(); return rerender(viewRequest, t);
      case 'pr-add': meta.print = true; saveMeta(); return rerender(viewRequest, t);
      case 'pr-undo': meta.print = false; saveMeta(); return rerender(viewRequest, t);
      case 'pair': addItem(id); return rerender(viewRequest, t);
      case 'note': showNote = true; viewRequest(); var ta = document.getElementById('rq-note'); if (ta) ta.focus(); return;
      case 'lpo': showLpo = true; viewRequest(); var lp = document.getElementById('rq-lpo'); if (lp) lp.focus(); return;
      case 'wadd': addItem(id, wdefs[id]); return rerender(viewWishlist, t);
      case 'wall': wishItems().forEach(function (w) { if (!inRequest(w)) addItem(w, wdefs[w]); }); return rerender(viewRequest, t);
      case 'wrm':
        writeWish(readWish().filter(function (x) { return x !== id; }));
        document.querySelectorAll('[data-wish]').forEach(function (h) { if (h.getAttribute('data-wish') === id) h.setAttribute('aria-pressed', 'false'); });
        return rerender(viewWishlist, t);
      case 'send':
        var digits = form.phone.replace(/\D/g, '').replace(/^974/, '');
        errs = { name: !form.name.trim(), phone: digits.length !== 8 };
        if (errs.name || errs.phone) { viewRequest(); var bad = box.querySelector('.err input'); if (bad) bad.focus(); return; }
        errs = null;
        try { localStorage.setItem(KEY + '-contact', JSON.stringify({ name: form.name, phone: form.phone })); } catch (e) {}
        busy = true; viewRequest(); box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true });
        setTimeout(finishSend, 1400);   // demo: nothing is sent yet
        return;
      case 'copy':
        var url = new URL('quotes-history.html', ROOT || location.href).href + '?ref=' + encodeURIComponent(sent.ref);
        try { navigator.clipboard.writeText(url); } catch (e) {}
        copied = true; rerender(viewSent, t); setTimeout(function () { copied = false; if (sent && box.querySelector('[data-act="copy"]')) box.querySelector('[data-act="copy"]').textContent = 'Copy link'; }, 1800); return;
      case 'cont': return close();
      case 'edit':
        items = sent.items; meta.no = sent.ref; meta.print = sent.print; meta.note = sent.note; meta.lpo = sent.lpo; showNote = !!meta.note; showLpo = !!meta.lpo; saveMeta();
        sent = null; save(); return rerender(viewRequest, t);
    }
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); e.stopPropagation(); var id = a.getAttribute('data-add'), ex = items.filter(function (x) { return x.id === id; })[0];
      cur = { id: id, qty: ex ? ex.qty : 5, sel: ex ? ex.sel.slice() : PRODUCTS[id].opts.map(function (g) { return g[2]; }) }; viewProduct(); return open(a); }
    var r = e.target.closest('[data-open-request]');
    if (r) { e.preventDefault(); e.stopPropagation(); sent = null; errs = null; viewRequest(); open(r); }
  }, true);

  // Product cards call this: add one carton (or one more) and show the request.
  window.opRequest = window.opRequest || {};
  window.opRequest.quickAdd = function (id, def, from) {
    if (!addItem(id, def)) return items.length;
    sent = null; errs = null; busy = false; viewRequest(); open(from || document.activeElement);
    return items.length;
  };
  window.opRequest.open = function (which, from) { sent = null; errs = null; (which === 'wish' ? viewWishlist : viewRequest)(); open(from); };

  scanCards();
  counts();
})();
