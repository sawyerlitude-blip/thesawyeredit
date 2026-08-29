// ── shared chrome: cursor, slide-in menu, cross-page wipe transition,
// ambient butterfly swarm, reveal-on-scroll. Included on every page. ──

// custom cursor - a plain growing circle by default, but on a few key nav
// elements it morphs into a small text pill instead (same "cursor follows
// and labels the link" feel as unseen.co), then back to the plain circle
// for every other link/button so the effect stays a light touch, not noise.
(function(){
  const cursor = document.getElementById('cursor');
  if(!cursor) return;
  const label = document.createElement('span');
  label.className = 'cursor-label';
  cursor.appendChild(label);

  window.addEventListener('pointermove', e=>{
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  // CTA pill buttons already have their own hover animation (the label
  // slides up into a filled colour), so they keep the plain growing-circle
  // cursor instead of a competing text pill - just logo/menu get one.
  const LABELS = [['.mark', 'Home'], ['.menu-btn', 'Menu'], ['.menu-close', 'Close']];
  const labelled = new Set();
  LABELS.forEach(([sel, text])=>{
    document.querySelectorAll(sel).forEach(el=>{
      labelled.add(el);
      el.addEventListener('mouseenter', ()=>{ label.textContent = text; cursor.classList.add('label'); });
      el.addEventListener('mouseleave', ()=> cursor.classList.remove('label'));
    });
  });

  document.querySelectorAll('a, button, .hero-s-stage').forEach(el=>{
    if(labelled.has(el)) return;
    el.addEventListener('mouseenter', ()=> cursor.classList.add('grow'));
    el.addEventListener('mouseleave', ()=> cursor.classList.remove('grow'));
  });
})();

// slide-in menu
(function(){
  const menuOverlay = document.getElementById('menuOverlay');
  const openBtn = document.getElementById('menuOpenBtn');
  const closeBtn = document.getElementById('menuCloseBtn');
  if(!menuOverlay) return;
  if(openBtn) openBtn.addEventListener('click', ()=> menuOverlay.classList.add('open'));
  if(closeBtn) closeBtn.addEventListener('click', ()=> menuOverlay.classList.remove('open'));
})();

// reveal on scroll
(function(){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in'); });
  },{threshold:.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
})();

// cross-page wipe transition: the wipe sits off-screen by default (plain
// CSS, no JS required), so the page is always visible even if this script
// fails to load. Any internal link marked data-transition intercepts its
// click, plays the wipe closed, then does the real navigation - so it still
// plays "the same transition between pages" on the way OUT of a page, even
// though this is a plain multi-page site rather than a SPA.
(function(){
  const wipe = document.getElementById('wipe');
  if(!wipe) return;

  function go(href, label){
    wipe.textContent = label;
    wipe.classList.add('show');
    setTimeout(()=>{ window.location.href = href; }, 650);
  }

  document.querySelectorAll('a[data-transition]').forEach(a=>{
    a.addEventListener('click', e=>{
      const href = a.getAttribute('href');
      if(!href || href.startsWith('#') || a.target === '_blank') return;
      e.preventDefault();
      go(href, a.dataset.label || 'Loading —');
    });
  });
})();

// landing-only scroll lock (added via body class on the home page markup itself)
// - "View my work" is the only way to move on, matching unseen.co's own
// body:not(.is-touch){overflow-y:hidden}. Skipped entirely on touch devices.
(function(){
  if(!document.body.classList.contains('scroll-locked')) return;
  const isTouch = matchMedia('(pointer:coarse)').matches;
  if(isTouch) document.body.classList.remove('scroll-locked');
})();

// ambient butterfly swarm - trails the cursor tightly, wanders independently
// across the whole page when idle. Frame-rate independent easing throughout.
(function(){
  const canvas = document.getElementById('petalCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const butterflyImg = new Image();
  let imgReady = false;
  butterflyImg.onload = ()=>{ imgReady = true; };
  butterflyImg.src = 'assets/butterfly.png';

  let w, h, dpr;
  function resize(){
    // capping the pixel ratio lower on phones trades a touch of sharpness
    // for meaningfully less canvas fill-rate to push every frame
    dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  let leaderX = w/2, leaderY = h/2, targetX = w/2, targetY = h/2;
  let mouseOnPage = false;
  let lastMoveTime = -Infinity;
  const IDLE_AFTER_MS = 550;
  window.addEventListener('pointermove', e=>{
    targetX = e.clientX; targetY = e.clientY;
    mouseOnPage = true; lastMoveTime = performance.now();
  });
  window.addEventListener('pointerleave', ()=>{ mouseOnPage = false; });

  // phones get fewer sprites, and skip the per-sprite hue/brightness canvas
  // filter entirely below - ctx.filter is CPU-bound (not GPU-accelerated) in
  // most mobile browsers, and re-applying a different filter per sprite per
  // frame for a hundred-plus sprites was the single biggest source of jank
  // on phones. Desktop keeps the full, richer effect.
  const isSmallScreen = window.innerWidth < 760;
  const COUNT = isSmallScreen ? 70 : 220;
  const petals = [];
  const aspect = 369/324; // butterfly sprite's own width/height ratio
  for(let i=0;i<COUNT;i++){
    const angle = (i / COUNT) * Math.PI * 2;
    petals.push({
      x: w/2 + Math.cos(angle)*160, y: h/2 + Math.sin(angle)*160,
      vx: 0, vy: 0,
      heading: angle,
      size: 16 + Math.random()*20,
      depth: 0.5 + Math.random()*0.7,
      orbitRadius: 4 + Math.random()*70,
      orbitAngle: Math.random()*Math.PI*2,
      orbitSpeed: 0.008 + Math.random()*0.014,
      flapPhase: Math.random()*Math.PI*2,
      flapSpeed: 0.14 + Math.random()*0.12,
      wanderX: Math.random()*w, wanderY: Math.random()*h,
      wanderTimer: Math.random()*3,
      filterStr: `hue-rotate(${((Math.random()-0.5)*26).toFixed(1)}deg) brightness(${(0.9+Math.random()*0.25).toFixed(2)}) saturate(1.15)`
    });
  }

  let lastTime = performance.now();
  function drawPetal(p, wingScale){
    if(!imgReady) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.heading);
    ctx.scale(1, wingScale);
    ctx.globalAlpha = Math.min(1, 0.5 * p.depth + 0.35);
    if(!isSmallScreen) ctx.filter = p.filterStr;
    const hgt = p.size * 2;
    const wid = hgt * aspect;
    ctx.drawImage(butterflyImg, -wid/2, -hgt/2, wid, hgt);
    ctx.restore();
  }

  function tick(now){
    requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 16.6667, 3);
    lastTime = now;
    ctx.clearRect(0,0,w,h);

    const haveMouse = mouseOnPage && (now - lastMoveTime < IDLE_AFTER_MS);
    const leadEase = 1 - Math.pow(1 - 0.34, dt);
    if(haveMouse){
      leaderX += (targetX - leaderX) * leadEase;
      leaderY += (targetY - leaderY) * leadEase;
    }

    for(const p of petals){
      let targetPX, targetPY, steerEase, maxSpeed;
      if(haveMouse){
        p.orbitAngle += p.orbitSpeed * dt;
        targetPX = leaderX + Math.cos(p.orbitAngle) * p.orbitRadius * p.depth;
        targetPY = leaderY + Math.sin(p.orbitAngle) * p.orbitRadius * p.depth;
        steerEase = 0.09 + p.depth * 0.09;
        maxSpeed = 10 * p.depth;
      } else {
        p.wanderTimer -= 0.016 * dt;
        if(p.wanderTimer <= 0){
          p.wanderX = Math.random()*w;
          p.wanderY = Math.random()*h;
          p.wanderTimer = 2.5 + Math.random()*4;
        }
        targetPX = p.wanderX; targetPY = p.wanderY;
        steerEase = 0.012 + p.depth * 0.012;
        maxSpeed = 2.6 * p.depth;
      }

      const dx = targetPX - p.x, dy = targetPY - p.y;
      p.vx += dx * steerEase * dt * 0.1;
      p.vy += dy * steerEase * dt * 0.1;
      p.vx *= Math.pow(0.88, dt); p.vy *= Math.pow(0.88, dt);
      const speed = Math.hypot(p.vx, p.vy);
      if(speed > maxSpeed){ p.vx = p.vx/speed*maxSpeed; p.vy = p.vy/speed*maxSpeed; }
      p.x += p.vx * dt; p.y += p.vy * dt;

      if(speed > 0.05){
        const desired = Math.atan2(p.vy, p.vx) + Math.PI/2;
        let diff = desired - p.heading;
        while(diff > Math.PI) diff -= Math.PI*2;
        while(diff < -Math.PI) diff += Math.PI*2;
        p.heading += diff * Math.min(1, 0.2 * dt);
      }

      p.flapPhase += p.flapSpeed * dt;
      const wingScale = 0.55 + Math.abs(Math.sin(p.flapPhase)) * 0.5;
      drawPetal(p, wingScale);
    }
  }
  requestAnimationFrame(tick);
})();
