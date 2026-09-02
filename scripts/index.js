/* ══════════════════════════════════════════
   LICENCE MODAL
══════════════════════════════════════════ */
function openLicence(){
  var el = document.getElementById('licence-overlay');
  el.classList.add('open');
  document.addEventListener('keydown', licenceKeyHandler);
}
function closeLicence(){
  document.getElementById('licence-overlay').classList.remove('open');
  document.removeEventListener('keydown', licenceKeyHandler);
}
function closeLicenceOnBg(e){
  if(e.target === document.getElementById('licence-overlay')) closeLicence();
}
function licenceKeyHandler(e){
  if(e.key === 'Escape') closeLicence();
}

/* ══════════════════════════════════════════
   I18N
══════════════════════════════════════════ */
var i18n = {
  en: {
    projects: 'Projects',
    vivaceDesc: 'A small program to learn note names, from open string to 4<sup>th</sup> finger on the violin.',
    lang: 'en'
  },
  fr: {
    projects: 'Projets',
    vivaceDesc: 'Un petit programme pour apprendre le nom des notes, de la corde à vide au 4<sup>e</sup> doigt sur le violon.',
    lang: 'fr'
  }
};

var currentLang = 'en';

function setLang(lang){
  currentLang = lang;
  var d = i18n[lang];
  document.documentElement.lang = lang;
  document.getElementById('label-projects').textContent = d.projects;
  document.getElementById('vivace-desc').innerHTML = d.vivaceDesc;
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-fr').classList.toggle('active', lang === 'fr');
}

/* ══════════════════════════════════════════
   SKETCHY FLAGS  (drawn with rough.js on small canvases)
══════════════════════════════════════════ */
function drawFlags(){
  if (!window.rough) return;

  /* ── UK flag (Union Jack simplified — blue + white cross + red cross) ── */
  (function(){
    var c = document.getElementById('flag-en');
    var ctx2 = c.getContext('2d');
    var rc2 = rough.canvas(c);
    var W = c.width, H = c.height;

    // blue background
    ctx2.fillStyle = '#012169';
    ctx2.fillRect(0,0,W,H);

    // white diagonals (St Patrick + St Andrew raw, slightly wide for sketch feel)
    ctx2.strokeStyle = '#ffffff';
    ctx2.lineWidth = 4;
    ctx2.beginPath(); ctx2.moveTo(0,0); ctx2.lineTo(W,H); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(W,0); ctx2.lineTo(0,H); ctx2.stroke();

    // thin red diagonals
    ctx2.strokeStyle = '#C8102E';
    ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.moveTo(0,0); ctx2.lineTo(W,H); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(W,0); ctx2.lineTo(0,H); ctx2.stroke();

    // white cross
    ctx2.fillStyle='#ffffff';
    ctx2.fillRect(W/2-4,0,8,H);
    ctx2.fillRect(0,H/2-4,W,8);

    // red cross
    ctx2.fillStyle='#C8102E';
    ctx2.fillRect(W/2-2.5,0,5,H);
    ctx2.fillRect(0,H/2-2.5,W,5);

    // rough border overlay
    rc2.rectangle(0,0,W,H,{
      stroke:'#cccccc',
      strokeWidth:1.2,
      roughness:1.6,
      fill:'none',
      seed:42
    });
  })();

  /* ── French flag ── */
  (function(){
    var c = document.getElementById('flag-fr');
    var ctx2 = c.getContext('2d');
    var rc2 = rough.canvas(c);
    var W = c.width, H = c.height;
    var third = W/3;

    ctx2.fillStyle='#002395'; ctx2.fillRect(0,0,third,H);
    ctx2.fillStyle='#ffffff'; ctx2.fillRect(third,0,third,H);
    ctx2.fillStyle='#ED2939'; ctx2.fillRect(third*2,0,third,H);

    // sketch borders between bands
    rc2.line(third,  0, third,  H, {stroke:'#aaaaaa',strokeWidth:0.8,roughness:1.4,seed:7});
    rc2.line(third*2,0, third*2,H, {stroke:'#aaaaaa',strokeWidth:0.8,roughness:1.4,seed:8});

    // rough outer border
    rc2.rectangle(0,0,W,H,{
      stroke:'#cccccc',
      strokeWidth:1.2,
      roughness:1.6,
      fill:'none',
      seed:43
    });
  })();
}

/* ══════════════════════════════════════════
   SCENE ANIMATION
══════════════════════════════════════════ */
(function(){
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var W, H, DPR, rc;

  function resize(){
    DPR = Math.min(window.devicePixelRatio||1,2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W*DPR;
    canvas.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    if (window.rough){ rc = rough.canvas(canvas); drawFlags(); }
    initStars();
    initMotes();
  }

  // stars
  var stars=[];
  function initStars(){
    stars=[];
    var n=Math.floor((W*H)/7000);
    for(var i=0;i<n;i++) stars.push({
      x:Math.random()*W, y:Math.random()*H,
      r:Math.random()*1.4+0.4,
      phase:Math.random()*Math.PI*2,
      speed:0.25+Math.random()*0.8
    });
  }

  // comets
  var comets=[];
  function spawnComet(){
    if(comets.length>2)return;
    var fl=Math.random()<0.5;
    comets.push({
      x:fl?-60:W+60, y:Math.random()*H*0.55,
      vx:(fl?1:-1)*(0.9+Math.random()*1.1),
      vy:0.25+Math.random()*0.5,
      life:0, maxLife:280+Math.random()*160
    });
  }
  if(!reducedMotion) setInterval(function(){ if(Math.random()<0.5)spawnComet(); },5200);

  // motes
  var motes=[];
  function initMotes(){
    motes=[];
    var n=Math.floor((W*H)/45000)+10;
    for(var i=0;i<n;i++) motes.push({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.12, vy:-0.04-Math.random()*0.1,
      size:1.6+Math.random()*2.6,
      type:Math.random()<0.55?'asterisk':'ring',
      phase:Math.random()*Math.PI*2
    });
  }

  // nebulae
  var nebulae=[
    {x:0.20,y:0.28,r:0.40,color:'120,180,255',speed:0.015,phase:0},
    {x:0.82,y:0.68,r:0.36,color:'255,190,140',speed:0.020,phase:2},
    {x:0.35,y:0.78,r:0.30,color:'255,220,160',speed:0.012,phase:4}
  ];

  function drawBackground(){
    ctx.fillStyle='#060606';
    ctx.fillRect(0,0,W,H);
    var g=ctx.createRadialGradient(W*.55,H*.45,0,W*.55,H*.45,Math.max(W,H)*.75);
    g.addColorStop(0,'rgba(255,255,255,0.05)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  }
  function drawNebulae(t){
    for(var i=0;i<nebulae.length;i++){
      var n=nebulae[i];
      var cx=(n.x+Math.sin(t*n.speed+n.phase)*0.03)*W;
      var cy=(n.y+Math.cos(t*n.speed*.8+n.phase)*0.02)*H;
      var r=n.r*Math.max(W,H);
      var g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,'rgba('+n.color+',0.07)');
      g.addColorStop(1,'rgba('+n.color+',0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    }
  }
  function drawStars(t){
    for(var i=0;i<stars.length;i++){
      var s=stars[i];
      ctx.globalAlpha=0.25+0.65*Math.abs(Math.sin(t*s.speed+s.phase));
      ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function drawComets(){
    for(var i=comets.length-1;i>=0;i--){
      var c=comets[i];
      c.x+=c.vx; c.y+=c.vy; c.life++;
      if(c.life>c.maxLife){comets.splice(i,1);continue;}
      var op=1-c.life/c.maxLife;
      ctx.strokeStyle='rgba(255,255,255,'+(0.55*op)+')';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(c.x-c.vx*9,c.y-c.vy*9); ctx.stroke();
    }
  }
  function drawMotes(t){
    for(var i=0;i<motes.length;i++){
      var m=motes[i];
      if(!reducedMotion){
        m.x+=m.vx; m.y+=m.vy;
        if(m.y<-10)m.y=H+10;
        if(m.x<-10)m.x=W+10;
        if(m.x>W+10)m.x=-10;
      }
      var op=0.25+0.35*Math.abs(Math.sin((reducedMotion?.5:t)*.8+m.phase));
      ctx.save(); ctx.globalAlpha=op; ctx.strokeStyle='#cfcfcf'; ctx.lineWidth=1;
      if(m.type==='asterisk'){
        var s=m.size;
        ctx.beginPath();
        ctx.moveTo(m.x-s,m.y); ctx.lineTo(m.x+s,m.y);
        ctx.moveTo(m.x,m.y-s); ctx.lineTo(m.x,m.y+s);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(m.x,m.y,m.size,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawOrbit(cx,cy,rx,ry,tilt,sd){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(tilt);
    rc.ellipse(0,0,rx*2,ry*2,{stroke:'#666',strokeWidth:1,roughness:1.5,seed:sd,fill:'none',strokeLineDash:[5,9]});
    ctx.restore();
  }
  function drawJets(cx,cy,t,sd,tilt){
    var w=Math.sin(t*.9)*5, jl=H*.4;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(tilt); ctx.globalAlpha=.85;
    rc.line(0,-18, 12+w,-jl,{stroke:'#8fd3ff',strokeWidth:1.3,roughness:1.8,seed:sd+1});
    rc.line(0,-18,-12-w,-jl,{stroke:'#8fd3ff',strokeWidth:1.3,roughness:1.8,seed:sd+2});
    rc.line(0, 18, 12-w, jl,{stroke:'#ff9d7a',strokeWidth:1.3,roughness:1.8,seed:sd+3});
    rc.line(0, 18,-12+w, jl,{stroke:'#ff9d7a',strokeWidth:1.3,roughness:1.8,seed:sd+4});
    ctx.restore(); ctx.globalAlpha=1;
  }
  function drawDisk(cx,cy,t,sd,tilt){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(tilt);
    var rings=[
      {base:42,color:'#ffd98a',dir:1},
      {base:64,color:'#8fd3ff',dir:-1},
      {base:86,color:'#c9c9c9',dir:1}
    ];
    for(var i=0;i<rings.length;i++){
      var rg=rings[i];
      ctx.save(); ctx.rotate(t*.1*rg.dir+i);
      rc.ellipse(0,0,rg.base*2,rg.base*.68,{stroke:rg.color,strokeWidth:1.1,roughness:1.6,seed:sd+10+i,fill:'none'});
      ctx.restore();
    }
    ctx.restore();
  }
  function drawCore(cx,cy,t,sd){
    var pulse=13+Math.sin(t*.6)*1.2;
    rc.circle(cx,cy,pulse*2,{fill:'#fff2c9',fillStyle:'hachure',hachureGap:2.4,hachureAngle:35+t*.8,stroke:'#fff2c9',strokeWidth:1,roughness:1.1,seed:sd+20});
  }

  var shipPeriod=16;
  function drawShip(cx,cy,rx,ry,tilt,t,sd){
    var angle=(t/shipPeriod)*Math.PI*2;
    var ex=Math.cos(angle)*rx, ey=Math.sin(angle)*ry;
    var x=cx+ex*Math.cos(tilt)-ey*Math.sin(tilt);
    var y=cy+ex*Math.sin(tilt)+ey*Math.cos(tilt);
    var dx=-Math.sin(angle)*rx, dy=Math.cos(angle)*ry;
    var tx=dx*Math.cos(tilt)-dy*Math.sin(tilt);
    var ty=dx*Math.sin(tilt)+dy*Math.cos(tilt);
    var behind=Math.sin(angle)>0;
    ctx.save();
    ctx.globalAlpha=behind?.55:1;
    ctx.translate(x,y);
    ctx.rotate(Math.atan2(ty,tx)+Math.PI/2);
    rc.polygon([[0,-15],[6,9],[0,4],[-6,9]],{stroke:'#eaeaea',strokeWidth:1.3,roughness:1.2,fill:'#eaeaea',fillStyle:'hachure',hachureGap:2,seed:sd+55});
    rc.circle(0,-1,6,{stroke:'#eaeaea',strokeWidth:1,roughness:1.1,fill:'none',seed:sd+56});
    rc.line(-3,9,0,17+Math.sin(t*4)*1.5,{stroke:'#ffb37a',strokeWidth:1.2,roughness:1.8,seed:sd+57});
    rc.line( 3,9,0,17+Math.cos(t*4)*1.5,{stroke:'#ffb37a',strokeWidth:1.2,roughness:1.8,seed:sd+58});
    ctx.restore(); ctx.globalAlpha=1;
  }

  var seed=Math.floor(Math.random()*10000), seedTimer=0;
  var coreSeed=Math.floor(Math.random()*10000), coreSeedTimer=0;
  var lastTime=performance.now(), startTime=lastTime;

  function frame(now){
    var t=(now-startTime)/1000;
    seedTimer+=(now-lastTime);
    coreSeedTimer+=(now-lastTime);
    lastTime=now;
    if(!reducedMotion&&seedTimer>2400){ seed=Math.floor(Math.random()*10000); seedTimer=0; }
    if(!reducedMotion&&coreSeedTimer>2400){ coreSeed=Math.floor(Math.random()*10000); coreSeedTimer=0; }

    drawBackground();
    drawNebulae(reducedMotion?0:t);
    drawStars(reducedMotion?.6:t);
    drawMotes(reducedMotion?0:t);
    if(!reducedMotion)drawComets();

    if(rc){
      var cx=W*.56,cy=H*.44;
      var orbitRX=Math.min(W,H)*.33, orbitRY=orbitRX*.42;
      var tilt=-0.58, tt=reducedMotion?0:t;
      drawOrbit(cx,cy,orbitRX,orbitRY,tilt,seed);
      drawJets(cx,cy,tt,seed,tilt);
      drawDisk(cx,cy,tt,seed,tilt);
      drawCore(cx,cy,tt,coreSeed);
      drawShip(cx,cy,orbitRX,orbitRY,tilt,tt,seed);
    }
    if(!reducedMotion)requestAnimationFrame(frame);
  }

  window.addEventListener('resize',resize);
  resize();
  requestAnimationFrame(frame);
})();