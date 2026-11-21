/* Shared UI: accordions with measured height, blog category filter. No libraries. */
(function(){
  var root=document.documentElement,accs=[].slice.call(document.querySelectorAll('.acc'));
  root.classList.add('noacc'); /* no animation while measuring on load */
  function setH(a){var p=a.querySelector(':scope>p');if(p)p.style.maxHeight=a.classList.contains('open')?p.scrollHeight+'px':'0px'}
  /* collapsed panels: hidden from AT and not focusable (inert is applied after the collapse transition) */
  function setState(a,p,instant){
    var open=a.classList.contains('open');
    clearTimeout(p._it);
    if(open){p.removeAttribute('inert');p.removeAttribute('aria-hidden')}
    else{p.setAttribute('aria-hidden','true');
      if(instant)p.setAttribute('inert','');
      else p._it=setTimeout(function(){if(!a.classList.contains('open'))p.setAttribute('inert','')},450)}
  }
  accs.forEach(function(a,n){
    var h=a.firstElementChild;if(!h)return;
    var p=a.querySelector(':scope>p');
    h.setAttribute('role','button');h.tabIndex=0;h.setAttribute('aria-expanded',a.classList.contains('open'));
    if(p){if(!p.id)p.id='acc-panel-'+n;h.setAttribute('aria-controls',p.id);setState(a,p,true)}
    setH(a);
    function toggle(){a.classList.toggle('open');h.setAttribute('aria-expanded',a.classList.contains('open'));setH(a);if(p)setState(a,p,false)}
    h.addEventListener('click',function(e){if(!e.target.closest('a'))toggle()});
    h.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ')return;
      if(e.target!==h&&e.target.closest('a,button,input,select,textarea'))return; /* inner links/controls keep their own keys */
      e.preventDefault();toggle()});
  });
  function remeasure(){accs.forEach(function(a){if(a.classList.contains('open'))setH(a)})}
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(remeasure);
  requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.remove('noacc')})});
  var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){accs.forEach(function(a){if(a.classList.contains('open'))setH(a)})},120)});
  /* blog: category pills filter the cards */
  var f=document.getElementById('f'),cards=[].slice.call(document.querySelectorAll('.bp'));
  if(f&&cards.length){
    var pills=[].slice.call(f.querySelectorAll('.pill')),empty=document.createElement('p');
    empty.className='pad';empty.hidden=true;empty.setAttribute('role','status');
    empty.style.cssText='margin-top:40px;color:var(--muted,#5b6472)';empty.textContent='No posts in this category.';
    cards[0].parentNode.insertAdjacentElement('afterend',empty);
    pills.forEach(function(b){b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false')});
    f.addEventListener('click',function(e){
      var b=e.target.closest('.pill');if(!b)return;var c=b.textContent.trim(),shown=0;
      pills.forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false')});
      cards.forEach(function(k){var m=k.querySelector('.mono'),on=c==='All'||(m&&m.textContent.trim()===c);
        k.style.display=on?'':'none';if(on)shown++});
      empty.hidden=shown>0;
    });
  }
})();
