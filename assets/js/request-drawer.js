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
    if (!name || !isFinite(price) || price <= 0 || price > 1e6 || !/^assets\/[\w\-./]+$/.test(img)) return null;
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
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} counts(); };
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
    return { act: a.getAttribute('data-act'), i: a.getAttribute('data-i'), opt: a.getAttribute('data-opt'), q: a.getAttribute('data-q'), cls: a.className, tag: a.tagName };
  }
  function restoreFocus(k) {
    var el = null, sel;
    if (k) {
      if (k.opt !== null) sel = '[data-opt="' + k.opt + '"]';
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
      '<div class="rq-b"><div class="rq-prow"><div class="im"><img src="' + ROOT + p.img + '" alt="' + esc(p.name) + '"></div><div><h3>' + p.name + '</h3><div class="m">' + p.sub + '</div><div class="pr">' + fmt(p.price) + ' <span>/ ' + p.per + '</span></div></div></div>' +
      opts + '<div class="rq-lbl">Quantity <span>' + (p.pcs ? 'Cartons of ' + p.pcs.toLocaleString('en-US') : 'Priced per carton') + '</span></div>' +
      '<div class="rq-step"><button data-act="dec" aria-label="Fewer">−</button><div class="v">' + cur.qty + '<small>cartons</small></div><button data-act="inc" aria-label="More">+</button></div>' +
      '<div class="rq-qk">' + QUICK.map(function (q) { return '<button class="rq-o' + (cur.qty === q ? ' on' : '') + '" data-q="' + q + '">' + q + (q === 50 ? ' · free delivery' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="rq-est"><span>' + (p.pcs ? (cur.qty * p.pcs).toLocaleString('en-US') + ' ' + p.unit + ' · ' : '') + 'indicative price</span><b>' + fmt(line) + '</b></div></div>' +
      '<div class="rq-f"><div class="rq-sum"><span>Your request after adding: <b style="font-size:14px">' + after + ' item' + (after > 1 ? 's' : '') + '</b></span><span>Est. <b>' + fmt(afterTotal) + '</b></span></div>' +
      '<button class="rq-btn" data-act="add">Add to request · ' + cur.qty + ' cartons</button><div class="rq-note">No payment now. Our team confirms price and delivery.</div></div>';
    announce(cur.qty + ' carton' + (cur.qty > 1 ? 's' : '') + ', ' + (p.pcs ? (cur.qty * p.pcs).toLocaleString('en-US') + ' ' + p.unit + ', ' : '') + fmt(line));
  }

  function viewReview() {
    if (!items.length) {
      box.innerHTML = header('Your request', null) + '<div class="rq-b"><div class="rq-empty"><p><b>Your request is empty.</b></p><p style="margin-top:6px">Add products and send one request for everything.</p></div></div><div class="rq-f"><button class="rq-btn" data-act="close">Browse products</button></div>';
      announce('Your request is empty');
      return;
    }
    var list = items.map(function (i, idx) {
      var p = PRODUCTS[i.id];
      return '<div class="rq-it"><div class="im"><img src="' + ROOT + p.img + '" alt=""></div><div><h4>' + p.name + '</h4><div class="m">' + (p.pcs ? (i.qty * p.pcs).toLocaleString('en-US') + ' ' + p.unit : i.qty + ' carton' + (i.qty > 1 ? 's' : '')) + '</div>' +
        '<div class="st"><button data-act="idec" data-i="' + idx + '" aria-label="Fewer">−</button><span>' + i.qty + '</span><button data-act="iinc" data-i="' + idx + '" aria-label="More">+</button></div></div>' +
        '<div class="pr">' + fmt(p.price * i.qty) + '<button data-act="rm" data-i="' + idx + '">Remove</button></div></div>';
    }).join('');
    box.innerHTML = header('Your request', null, items.length + ' item' + (items.length > 1 ? 's' : '')) +
      '<div class="rq-b"><div class="rq-sl"><span>Items</span><a data-act="more">+ Add more products</a></div>' + list +
      '<div class="rq-tot"><span>Estimated total</span><b>' + fmt(total()) + '</b></div>' +
      '<div class="rq-two rq-fld"><div id="f-name"><label for="rq-name">Contact name</label><input id="rq-name" autocomplete="name"><div class="rq-err">Enter your name</div></div>' +
      '<div id="f-phone"><label for="rq-phone">WhatsApp / phone</label><input id="rq-phone" autocomplete="tel" inputmode="tel" placeholder="+974"><div class="rq-err">Enter a phone number</div></div></div>' +
      '<div class="rq-fld"><label for="rq-area">Delivery area</label><select id="rq-area"><option>West Bay, Doha</option><option>The Pearl, Doha</option><option>Lusail</option><option>Al Wakrah</option><option>Al Khor</option><option>Other (tell us in the note)</option></select></div>' +
      '<div class="rq-fld"><label for="rq-note">Note for our team <span>(optional)</span></label><textarea id="rq-note" placeholder="Delivery date, custom printing, anything we should know"></textarea></div></div>' +
      '<div class="rq-f"><button class="rq-btn" data-act="send">Send request</button><div class="rq-note">No payment now. We reply on WhatsApp within 1 working day.</div></div>';
    announce(items.length + ' item' + (items.length > 1 ? 's' : '') + ', estimated total ' + fmt(total()));
    var s = (function () { try { var c = JSON.parse(localStorage.getItem(KEY + '-contact') || '{}'); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } })();
    if (typeof s.name === 'string' && s.name) document.getElementById('rq-name').value = s.name;
    if (typeof s.phone === 'string' && s.phone) document.getElementById('rq-phone').value = s.phone;
  }

  function viewSent(n, t) {
    box.innerHTML = header('', null) +
      '<div class="rq-b rq-done"><div class="rq-ok">' + ICON.ok + '</div><h2 id="rq-title" tabindex="-1">Request sent</h2><p class="sub">Thanks. Our team will review your items and reply on WhatsApp within 1 working day.</p><span class="rq-ref">' + lastRef + '</span>' +
      '<div class="rq-est" style="margin-top:24px"><span>' + n + ' item' + (n > 1 ? 's' : '') + ' · estimated, to be confirmed</span><b>' + fmt(t) + '</b></div>' +
      '<div class="rq-nx"><div class="h">What happens next</div>' +
      '<div class="rq-s"><div class="n on">✓</div><div><b>Request received</b><span>Saved to your request history.</span></div></div>' +
      '<div class="rq-s"><div class="n">2</div><div><b>Our team confirms price and delivery</b><span>We check stock, delivery date and any custom printing.</span></div></div>' +
      '<div class="rq-s"><div class="n">3</div><div><b>You approve, then pay by bank transfer or LPO</b><span>Nothing is charged until you agree to the final quote.</span></div></div></div></div>' +
      '<div class="rq-f"><div class="rq-fb"><button class="rq-btn alt" data-act="close">Keep browsing</button><a class="rq-btn" href="' + ROOT + 'quotes-history.html">View my requests</a></div></div>';
    announce('Request sent. Reference ' + lastRef);
  }

  box.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-opt],[data-q]'); if (!t) return;
    var act = t.getAttribute('data-act'), i = +t.getAttribute('data-i');
    if (t.hasAttribute('data-opt')) { var o = t.getAttribute('data-opt').split(':'); cur.sel[+o[0]] = +o[1]; return rerender(viewProduct, t); }
    if (t.hasAttribute('data-q')) { cur.qty = +t.getAttribute('data-q'); return rerender(viewProduct, t); }
    switch (act) {
      case 'close': return close();
      case 'dec': cur.qty = Math.max(1, cur.qty - 1); return rerender(viewProduct, t);
      case 'inc': cur.qty = Math.min(999, cur.qty + 1); return rerender(viewProduct, t);
      case 'add':
        var ex = items.filter(function (x) { return x.id === cur.id; })[0];
        if (ex) { ex.qty = cur.qty; ex.sel = cur.sel; } else items.push({ id: cur.id, qty: cur.qty, sel: cur.sel });
        save(); return rerender(viewReview, t);
      case 'more': return close();
      case 'idec': items[i].qty = Math.max(1, items[i].qty - 1); save(); return rerender(viewReview, t);
      case 'iinc': items[i].qty = Math.min(999, items[i].qty + 1); save(); return rerender(viewReview, t);
      case 'rm': items.splice(i, 1); save(); return rerender(viewReview, t);
      case 'send':
        var name = document.getElementById('rq-name'), phone = document.getElementById('rq-phone'), ok = true;
        [['f-name', name], ['f-phone', phone]].forEach(function (p) { var bad = !p[1].value.trim(); document.getElementById(p[0]).classList.toggle('err', bad); if (bad) ok = false; });
        if (!ok) { (name.value.trim() ? phone : name).focus(); return; }
        try { localStorage.setItem(KEY + '-contact', JSON.stringify({ name: name.value, phone: phone.value })); } catch (e) {}
        lastRef = 'REQ-' + (20000 + Math.floor(Math.random() * 9999));
        var n = items.length, t2 = total(); items = []; save(); return rerender(function () { viewSent(n, t2); }, t);
    }
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); e.stopPropagation(); var id = a.getAttribute('data-add'), ex = items.filter(function (x) { return x.id === id; })[0];
      cur = { id: id, qty: ex ? ex.qty : 5, sel: ex ? ex.sel.slice() : PRODUCTS[id].opts.map(function (g) { return g[2]; }) }; viewProduct(); return open(a); }
    var r = e.target.closest('[data-open-request]');
    if (r) { e.preventDefault(); e.stopPropagation(); viewReview(); open(r); }
  }, true);

  // Direct add without opening the drawer: used by the home page product cards.
  // Adds one carton with default options (or one more carton if already added). Returns the line count.
  window.opRequest = window.opRequest || {};
  window.opRequest.quickAdd = function (id, def) {
    if (!Object.prototype.hasOwnProperty.call(PRODUCTS, id) && def) {
      var n = normDef(id, def);
      if (n) { PRODUCTS[id] = n; defs[id] = n.def; try { localStorage.setItem(DEFKEY, JSON.stringify(defs)); } catch (e) {} }
    }
    var p = PRODUCTS[id]; if (!p) return items.length;
    var ex = items.filter(function (x) { return x.id === id; })[0];
    if (ex) ex.qty = Math.min(999, ex.qty + 1);
    else items.push({ id: id, qty: 1, sel: p.opts.map(function (g) { return g[2]; }) });
    save();
    announce('Added to cart: ' + p.name + '. ' + items.length + (items.length === 1 ? ' item' : ' items') + ' in cart.');
    return items.length;
  };

  counts();
})();
