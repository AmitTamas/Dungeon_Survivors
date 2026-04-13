// ═══════════════════════════════════════════════════════════
//  LOADING SCREEN CONTROLLER
// ═══════════════════════════════════════════════════════════
(function(){
  const bar      = document.getElementById('ldBarFill');
  const statusEl = document.getElementById('ldStatusText');
  const pctEl    = document.getElementById('ldPercent');
  const enterBtn = document.getElementById('ldEnter');
  const screen   = document.getElementById('loadScreen');
  const dots     = document.querySelectorAll('#ldDots span');

  const steps = [
    { pct:8,  label:'LOADING ENGINE...',        delay:400  },
    { pct:19, label:'BUILDING DUNGEON...',       delay:280  },
    { pct:31, label:'SPAWNING ENEMIES...',       delay:320  },
    { pct:44, label:'FORGING WEAPONS...',        delay:260  },
    { pct:55, label:'LOADING AUDIO...',          delay:350  },
    { pct:63, label:'DRAWING PIXEL ART...',      delay:240  },
    { pct:74, label:'TUNING WAVE MODIFIERS...', delay:300  },
    { pct:82, label:'CALIBRATING NOVA...',       delay:260  },
    { pct:91, label:'POLISHING SKULLS...',       delay:220  },
    { pct:97, label:'ALMOST READY...',           delay:380  },
    { pct:100,label:'READY.',                    delay:180  },
  ];

  let dotIdx = 0;
  const dotInterval = setInterval(()=>{
    dots.forEach((d,i) => d.classList.toggle('lit', i === dotIdx % dots.length));
    dotIdx++;
  }, 250);

  let elapsed = 0;
  steps.forEach(step => {
    elapsed += step.delay;
    setTimeout(()=>{
      bar.style.width = step.pct + '%';
      statusEl.textContent = step.label;
      pctEl.textContent = step.pct + '%';
      if(step.pct >= 100){
        clearInterval(dotInterval);
        dots.forEach(d => d.classList.add('lit'));
        setTimeout(()=>{
          enterBtn.classList.add('visible');
        }, 300);
      }
    }, elapsed);
  });

  // ── INTRO MUSIC ──────────────────────────────────────────
  let introAudio = null;
  let musicStarted = false;  // guard: play only once

  function playIntroMusic(){
    if(musicStarted) return;  // already playing or played — bail out
    musicStarted = true;

    try {
      introAudio = new Audio('sounds/dragon-studio-sword-slice-2-393845.mp3');
      introAudio.volume = 0;
      introAudio.loop = false;

      function startFade(){
        let vol = 0;
        const fadeIn = setInterval(()=>{
          vol = Math.min(0.55, vol + 0.055);
          if(introAudio) introAudio.volume = vol;
          if(vol >= 0.55) clearInterval(fadeIn);
        }, 80);
      }

      introAudio.play().then(()=>{
        startFade();
      }).catch(()=>{
        // Autoplay blocked — wait for first user gesture, then play once
        const unlock = () => {
          document.removeEventListener('click',   unlock);
          document.removeEventListener('keydown', unlock);
          introAudio.play().then(()=> startFade()).catch(()=>{});
        };
        document.addEventListener('click',   unlock);
        document.addEventListener('keydown', unlock);
      });
    } catch(e){}
  }

  function stopIntroMusic(cb){
    if(!introAudio){ cb && cb(); return; }
    let vol = introAudio.volume;
    const fadeOut = setInterval(()=>{
      vol = Math.max(0, vol - 0.07);
      if(introAudio) introAudio.volume = vol;
      if(vol <= 0){
        clearInterval(fadeOut);
        try{ introAudio.pause(); introAudio.currentTime=0; } catch(e){}
        introAudio = null;
        cb && cb();
      }
    }, 40);
  }

  // Try immediately on page load; browsers that allow autoplay will start right away.
  // Those that don't will wait for the first user gesture via the unlock listeners above.
  playIntroMusic();

  function dismissLoader(){
    stopIntroMusic();
    screen.classList.add('fade-out');
    setTimeout(()=>{ screen.style.display='none'; }, 850);
  }

  enterBtn.addEventListener('click', dismissLoader);

  document.addEventListener('keydown', e=>{
    if((e.key==='Enter'||e.key===' ') && enterBtn.classList.contains('visible')){
      e.preventDefault();
      dismissLoader();
    }
  });
})();