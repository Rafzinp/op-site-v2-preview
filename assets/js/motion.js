/* Mild shared motion: scroll fades + hover text-swap. No libraries. */
(function(){
  document.querySelectorAll('.yk-hd nav a,.yk-top a,.yk-fg li a,.btn,.yk-btn').forEach(function(e){
    if(e.children.length||!e.textContent.trim())return;
    var t=e.textContent.trim().replace(/"/g,'&quot;');
    if(!e.hasAttribute('aria-label'))e.setAttribute('aria-label',e.textContent.trim()); /* name once; the swap layer is visual only */
    e.innerHTML='<span class="mts" aria-hidden="true" data-t="'+t+'"><span>'+t+'</span></span>';
  });
  /* index.html runs its own .rv reveal system: do not stack a second one on top */
  if(document.documentElement.dataset.ownReveal)return;
  var SKIP='.rq,[class^="rq"],[class*=" rq"],.rq-scrim,.yk-top,.yk-hd,.yk-footer,.yk-wa,.top,header,footer,.wa';
  var all=[];
  /* print: never leave hidden blocks blank */
  addEventListener('beforeprint',function(){all.forEach(function(e){e.classList.add('min')})});
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(en){
    en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('min');io.unobserve(x.target)}});
  },{rootMargin:'0px 0px -6% 0px',threshold:0});
  var sel='body>*:not(script):not(svg):not(style):not(main),body>main>*:not(script):not(style),.pad>[style*="grid-template-columns"]>*';
  var vh=innerHeight||document.documentElement.clientHeight;
  /* anchor target (and its wrappers) must never start hidden */
  var hashEl=null;
  try{hashEl=location.hash.length>1?document.getElementById(decodeURIComponent(location.hash.slice(1))):null}catch(_){}
  document.querySelectorAll(sel).forEach(function(e){
    if(e.matches(SKIP)||e.closest(SKIP))return;
    /* already on screen at load (or above it): leave visible, avoid hide-then-reveal flash */
    if(e.getBoundingClientRect().top<vh)return;
    if(hashEl&&(e===hashEl||e.contains(hashEl)))return;
    var i=[].indexOf.call(e.parentNode.children,e);
    e.style.setProperty('--mi',Math.min(i,5));
    e.classList.add('mrv');all.push(e);io.observe(e);
  });
  addEventListener('hashchange',function(){
    var t=null;try{t=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch(_){}
    if(!t)return;
    all.forEach(function(e){if(e===t||e.contains(t)||t.contains(e)){e.classList.add('min');io.unobserve(e)}});
  });
})();
