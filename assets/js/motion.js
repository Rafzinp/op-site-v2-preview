/* Mild shared motion: scroll fades + hover text-swap. No libraries. */
(function(){
  document.querySelectorAll('.yk-hd nav a,.yk-top a,.yk-fg li a,.btn,.yk-btn').forEach(function(e){
    if(e.children.length||!e.textContent.trim())return;
    var t=e.textContent.trim().replace(/"/g,'&quot;');
    if(!e.hasAttribute('aria-label'))e.setAttribute('aria-label',e.textContent.trim()); /* name once; the swap layer is visual only */
    e.innerHTML='<span class="mts" aria-hidden="true" data-t="'+t+'"><span>'+t+'</span></span>';
  });
  if(matchMedia('(prefers-reduced-motion:reduce)').matches||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(en){
    en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('min');io.unobserve(x.target)}});
  },{rootMargin:'0px 0px -6% 0px',threshold:.06});
  var sel='body>*:not(script):not(svg):not(style):not(.yk-top):not(.yk-hd):not(.yk-footer):not(.yk-wa):not(main):not([class^="rq-"]),body>main>*:not(script):not(style),.pad>[style*="grid-template-columns"]>*';
  document.querySelectorAll(sel).forEach(function(e){
    var i=[].indexOf.call(e.parentNode.children,e);
    e.style.setProperty('--mi',Math.min(i,5));
    e.classList.add('mrv');io.observe(e);
  });
})();
