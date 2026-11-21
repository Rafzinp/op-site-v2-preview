/* Shared UI: accordions with measured height, blog category filter. No libraries. */
(function(){
  var root=document.documentElement,accs=[].slice.call(document.querySelectorAll('.acc'));
  root.classList.add('noacc'); /* no animation while measuring on load */
  function setH(a){var p=a.querySelector(':scope>p');if(p)p.style.maxHeight=a.classList.contains('open')?p.scrollHeight+'px':'0px'}
  accs.forEach(function(a){
    var h=a.firstElementChild;if(!h)return;
    h.setAttribute('role','button');h.tabIndex=0;h.setAttribute('aria-expanded',a.classList.contains('open'));
    setH(a);
    function toggle(){a.classList.toggle('open');h.setAttribute('aria-expanded',a.classList.contains('open'));setH(a)}
    h.addEventListener('click',function(e){if(!e.target.closest('a'))toggle()});
    h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  });
  function remeasure(){accs.forEach(function(a){if(a.classList.contains('open'))setH(a)})}
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(remeasure);
  requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.remove('noacc')})});
  var t;addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){accs.forEach(function(a){if(a.classList.contains('open'))setH(a)})},120)});
  /* blog: category pills filter the cards */
  var f=document.getElementById('f'),cards=[].slice.call(document.querySelectorAll('.bp'));
  if(f&&cards.length)f.addEventListener('click',function(e){
    var b=e.target.closest('.pill');if(!b)return;var c=b.textContent.trim();
    cards.forEach(function(k){var m=k.querySelector('.mono'),on=c==='All'||(m&&m.textContent.trim()===c);
      k.style.display=on?'':'none'});
  });
})();
/* Mobile menu: toggles the header nav below 1000px. */
(function(){
  var hd=document.querySelector('.yk-hd')||document.querySelector('header'),b=hd&&hd.querySelector('.yk-mb');
  if(!b)return;
  var open='yk-open';
  function set(on){hd.classList.toggle(open,on);b.setAttribute('aria-expanded',on?'true':'false');b.setAttribute('aria-label',on?'Close menu':'Menu')}
  b.addEventListener('click',function(){set(!hd.classList.contains(open))});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&hd.classList.contains(open)){set(false);b.focus()}});
  document.addEventListener('click',function(e){if(hd.classList.contains(open)&&!hd.contains(e.target))set(false)});
  matchMedia('(min-width:1001px)').addEventListener&&matchMedia('(min-width:1001px)').addEventListener('change',function(m){if(m.matches)set(false)});
})();
