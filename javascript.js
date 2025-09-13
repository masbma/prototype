// Unified JavaScript code for the website
// Includes functionality for both index and 404 pages

// Register GSAP plugins
gsap.registerPlugin(Draggable, ScrollTrigger, Physics2DPlugin, InertiaPlugin);

// ========== INDEX PAGE FUNCTIONS ==========

function initBasicGSAPSlider() {
  console.log('initBasicGSAPSlider called');
  
  const sliders = document.querySelectorAll('[data-gsap-slider-init]');
  console.log('Found sliders:', sliders.length);
  
  sliders.forEach(root => {
    console.log('Processing slider:', root);
    
    if (root._sliderDraggable) root._sliderDraggable.kill();

    const collection = root.querySelector('[data-gsap-slider-collection]');
    const track      = root.querySelector('[data-gsap-slider-list]');
    const items      = Array.from(root.querySelectorAll('[data-gsap-slider-item]'));
    const controls   = Array.from(root.querySelectorAll('[data-gsap-slider-control]'));

    console.log('Slider elements:', { collection, track, items: items.length, controls: controls.length });

    // Inject aria attributes
    root.setAttribute('role','region');
    root.setAttribute('aria-roledescription','carousel');
    root.setAttribute('aria-label','Slider');
    collection.setAttribute('role','group');
    collection.setAttribute('aria-roledescription','Slides List');
    collection.setAttribute('aria-label','Slides');
    items.forEach((slide,i) => {
      slide.setAttribute('role','group');
      slide.setAttribute('aria-roledescription','Slide');
      slide.setAttribute('aria-label',`Slide ${i+1} of ${items.length}`);
      slide.setAttribute('aria-hidden','true');
      slide.setAttribute('aria-selected','false');
      slide.setAttribute('tabindex','-1');
    });
    controls.forEach(btn => {
      const dir = btn.getAttribute('data-gsap-slider-control');
      btn.setAttribute('role','button');
      btn.setAttribute('aria-label', dir==='prev' ? 'Previous Slide' : 'Next Slide');
      btn.disabled = true;
      btn.setAttribute('aria-disabled','true');
    });

    // Determine if slider runs
    const styles      = getComputedStyle(root);
    const statusVar   = styles.getPropertyValue('--slider-status').trim();
    let   spvVar      = parseFloat(styles.getPropertyValue('--slider-spv'));
    const rect        = items[0].getBoundingClientRect();
    const marginRight = parseFloat(getComputedStyle(items[0]).marginRight);
    const slideW      = rect.width + marginRight;
    if (isNaN(spvVar)) {
      spvVar = collection.clientWidth / slideW;
    }
    const spv           = Math.max(1, Math.min(spvVar, items.length));
    const sliderEnabled = statusVar==='on' && spv < items.length;
    root.setAttribute('data-gsap-slider-status', sliderEnabled ? 'active' : 'not-active');

    if (!sliderEnabled) {
      // Teardown when disabled
      track.removeAttribute('style');
      track.onmouseenter = null;
      track.onmouseleave = null;
      track.removeAttribute('data-gsap-slider-list-status');
      root.removeAttribute('role');
      root.removeAttribute('aria-roledescription');
      root.removeAttribute('aria-label');
      collection.removeAttribute('role');
      collection.removeAttribute('aria-roledescription');
      collection.removeAttribute('aria-label');
      items.forEach(slide => {
        slide.removeAttribute('role');
        slide.removeAttribute('aria-roledescription');
        slide.removeAttribute('aria-label');
        slide.removeAttribute('aria-hidden');
        slide.removeAttribute('aria-selected');
        slide.removeAttribute('tabindex');
        slide.removeAttribute('data-gsap-slider-item-status');
      });
      controls.forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('role');
        btn.removeAttribute('aria-label');
        btn.removeAttribute('aria-disabled');
        btn.removeAttribute('data-gsap-slider-control-status');
      });
      return;
    }

    // Track hover state
    track.onmouseenter = () => {
      track.setAttribute('data-gsap-slider-list-status','grab');
    };
    track.onmouseleave = () => {
      track.removeAttribute('data-gsap-slider-list-status');
    };

    //Ccalculate bounds and snap points
    const vw        = collection.clientWidth;
    const tw        = track.scrollWidth;
    const maxScroll = Math.max(tw - vw, 0);
    const minX      = -maxScroll;
    const maxX      = 0;
    const maxIndex  = maxScroll / slideW;
    const full      = Math.floor(maxIndex);
    const snapPoints = [];
    for (let i = 0; i <= full; i++) {
      snapPoints.push(-i * slideW);
    }
    if (full < maxIndex) {
      snapPoints.push(-maxIndex * slideW);
    }

    let activeIndex    = 0;
    const setX         = gsap.quickSetter(track,'x','px');
    let collectionRect = collection.getBoundingClientRect();

    function updateStatus(x) {
      if (x > maxX || x < minX) {
        return;
      }

      // Clamp and find closest snap
      const calcX = x > maxX ? maxX : (x < minX ? minX : x);
      let closest = snapPoints[0];
      snapPoints.forEach(pt => {
        if (Math.abs(pt - calcX) < Math.abs(closest - calcX)) {
          closest = pt;
        }
      });
      activeIndex = snapPoints.indexOf(closest);

      // Update Slide Attributes
      items.forEach((slide,i) => {
        const r           = slide.getBoundingClientRect();
        const leftEdge    = r.left - collectionRect.left;
        const slideCenter = leftEdge + r.width/2;
        const inView      = slideCenter > 0 && slideCenter < collectionRect.width;
        const status      = i === activeIndex ? 'active' : inView ? 'inview' : 'not-active';

        slide.setAttribute('data-gsap-slider-item-status', status);
        slide.setAttribute('aria-selected',    i === activeIndex ? 'true' : 'false');
        slide.setAttribute('aria-hidden',      inView ? 'false' : 'true');
        slide.setAttribute('tabindex',         i === activeIndex ? '0'    : '-1');
      });

      // Update Controls - always enable for circular navigation
      controls.forEach(btn => {
        const dir = btn.getAttribute('data-gsap-slider-control');
        
        btn.disabled = false;
        btn.setAttribute('aria-disabled', 'false');
        btn.setAttribute('data-gsap-slider-control-status', 'active');
      });
    }

    controls.forEach(btn => {
      const dir = btn.getAttribute('data-gsap-slider-control');
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        
        let target;
        if (dir === 'next') {
          // If at last slide, go to first slide (circular)
          target = activeIndex >= snapPoints.length - 1 ? 0 : activeIndex + 1;
        } else {
          // If at first slide, go to last slide (circular)
          target = activeIndex <= 0 ? snapPoints.length - 1 : activeIndex - 1;
        }
        
        gsap.to(track, {
          duration: 0.4,
          x: snapPoints[target],
          onUpdate: () => updateStatus(gsap.getProperty(track,'x'))
        });
      });
    });

    // Initialize Draggable
    root._sliderDraggable = Draggable.create(track, {
      type: 'x',
      bounds: {minX, maxX},
      edgeResistance: 0.75,
      snap: {x: snapPoints},
      onPress() {
        track.setAttribute('data-gsap-slider-list-status','grabbing');
        collectionRect = collection.getBoundingClientRect();
      },
      onDrag() {
        setX(this.x);
        updateStatus(this.x);
      },
      onRelease() {
        setX(this.x);
        updateStatus(this.x);
        track.setAttribute('data-gsap-slider-list-status','grab');
      }
    })[0];

    // Initial state
    setX(0);
    updateStatus(0);
  });
}

// Debouncer: For resizing the window
function debounceOnWidthChange(fn, ms) {
  let last = innerWidth, timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initDynamicCurrentTime() {
  const defaultTimezone = "Europe/Amsterdam";

  // Helper function to format numbers with leading zero
  const formatNumber = (number) => number.toString().padStart(2, '0');

  // Function to create a time formatter with the correct timezone
  const createFormatter = (timezone) => {
    return new Intl.DateTimeFormat([], {
      timeZone: timezone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Optional: Remove to match your simpler script
    });
  };

  // Function to parse the formatted string into parts
  const parseFormattedTime = (formattedDateTime) => {
    const match = formattedDateTime.match(/(\d+):(\d+):(\d+)\s*([\w+]+)/);
    if (match) {
      return {
        hours: match[1],
        minutes: match[2],
        seconds: match[3],
        timezone: match[4], // Handles both GMT+X and CET cases
      };
    }
    return null;
  };

  // Function to update the time for all elements
  const updateTime = () => {
    document.querySelectorAll('[data-current-time]').forEach((element) => {
      const timezone = element.getAttribute('data-current-time') || defaultTimezone;
      const formatter = createFormatter(timezone);
      const now = new Date();
      const formattedDateTime = formatter.format(now);

      const timeParts = parseFormattedTime(formattedDateTime);
      if (timeParts) {
        const {
          hours,
          minutes,
          seconds,
          timezone
        } = timeParts;

        // Update child elements if they exist
        const hoursElem = element.querySelector('[data-current-time-hours]');
        const minutesElem = element.querySelector('[data-current-time-minutes]');
        const secondsElem = element.querySelector('[data-current-time-seconds]');
        const timezoneElem = element.querySelector('[data-current-time-timezone]');

        if (hoursElem) hoursElem.textContent = hours;
        if (minutesElem) minutesElem.textContent = minutes;
        if (secondsElem) secondsElem.textContent = seconds;
        if (timezoneElem) timezoneElem.textContent = timezone;
      }
    });
  };

  // Initial update and interval for subsequent updates
  updateTime();
  setInterval(updateTime, 1000);
}

// Dark/Light mode functionality
function initCookieDarkLight() {

  // Function to toggle theme
  function initThemeCheck() {
    // Get the element that has [data-theme-status] attribute
    const dashThemeElement = document.querySelector('[data-theme-status]');
    if (!dashThemeElement) return;

    // Toggle between light/dark
    const currentTheme = dashThemeElement.getAttribute('data-theme-status');
    const newTheme = (currentTheme === 'light') ? 'dark' : 'light';

    dashThemeElement.setAttribute('data-theme-status', newTheme);
    Cookies.set('theme', newTheme, { expires: 365 });
  }

  // Keydown to toggle theme when Shift + T is pressed
  document.addEventListener('keydown', function(e) {
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || e.target.isContentEditable) {
      return; // Do nothing if typing into a field
    }

    if (e.shiftKey && e.keyCode === 84) { // Shift+T
      e.preventDefault();
      initThemeCheck();
    }
  });

  // For all elements with [data-theme-toggle], add click handler
  document.querySelectorAll('[data-theme-toggle]').forEach(function(button) {
    button.addEventListener('click', initThemeCheck);
  });

  // If theme cookie is 'dark', set theme to dark
  if (Cookies.get('theme') === 'dark') {
    const themeElement = document.querySelector('[data-theme-status]');
    if (themeElement) {
      themeElement.setAttribute('data-theme-status', 'dark');
    }
  }
}

// Custom Cursor Functionality
function initVelocityBasedCustomCursor() {
  const cursor = document.querySelector(".cursor");
  if (!cursor) return; // Exit if cursor element doesn't exist
  
  const innerElements = cursor.querySelectorAll(".cursor-inner");
  
  innerElements.forEach(el => el.style.transformOrigin = "50% 50%");
  
  let currentRotation = 0;
  let targetRotation = 0;
  let lastX = 0;
  let lastTime = performance.now();
  
  document.addEventListener("mousemove", e => {
    // Make the cursor follow the actual client position
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    
    // Get current time in miliseconds
    const currentTime = performance.now();
    
    // Calculate ellasped time since last move
    const timeDifference = currentTime - lastTime;
    
    if (timeDifference > 0) {
      const positionDifference = e.clientX - lastX;
      const velocityX = positionDifference / timeDifference;
      
      // Clamp the rotation between -70 and 70 degrees
      targetRotation = Math.max(Math.min(velocityX * 100, 70), -70);
    }
    lastX = e.clientX;
    lastTime = currentTime;
  });
  
  // Use a RAF method to match display refresh rate for smoothest result
  function animateRotation() {
    currentRotation += (targetRotation - currentRotation) * 0.1;
    targetRotation += (0 - targetRotation) * 0.05;
    innerElements.forEach(el => el.style.transform = `rotate(${currentRotation}deg)`);
    requestAnimationFrame(animateRotation);
  }
  animateRotation();
}

// Scroll Progress Counter functionality
function initScrollProgressNumber() {  
  const progressCounter = document.querySelector('[data-progress-nr]');
  if (!progressCounter) return; // Exit if element doesn't exist

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      const progress = Math.round(self.progress * 100); // Calculate progress as a percentage
      progressCounter.textContent = progress.toString().padStart(2, '0'); // Update counter
    },
  });
}

function initCSSMarquee() {
  const pixelsPerSecond = 75; // Set the marquee speed (pixels per second)
  const marquees = document.querySelectorAll('[data-css-marquee]');
  
  // Duplicate each [data-css-marquee-list] element inside its container
  marquees.forEach(marquee => {
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      const duplicate = list.cloneNode(true);
      marquee.appendChild(duplicate);
    });
  });

  // Create an IntersectionObserver to check if the marquee container is in view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.querySelectorAll('[data-css-marquee-list]').forEach(list => 
        list.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
      );
    });
  }, { threshold: 0 });
  
  // Calculate the width and set the animation duration accordingly
  marquees.forEach(marquee => {
    marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      list.style.animationDuration = (list.offsetWidth / pixelsPerSecond) + 's';
      list.style.animationPlayState = 'paused';
    });
    observer.observe(marquee);
  });
}

function initGlowingInteractiveDotsGrid() {
  document.querySelectorAll('[data-dots-container-init]').forEach(container => {
    const isFullscreen  = container.hasAttribute('data-dots-fullscreen');
    const colors         = { base: "#245E51", active: "#A8FF51" };
    const threshold      = isFullscreen ? 260 : 200; // bigger radius for background
    const speedThreshold = 100;
    const shockRadius    = isFullscreen ? 380 : 325; // slightly wider shock for bg
    const shockPower     = 5;
    const maxSpeed       = 5000;
    const centerHole     = isFullscreen ? false : true; // Discover section retains hole

    let dots       = [];
    let dotCenters = [];

    function buildGrid() {
      container.innerHTML = "";
      dots = [];
      dotCenters = [];

      const style = getComputedStyle(container);
      const dotPx = parseFloat(style.fontSize);
      const gapPx = dotPx * 2;
      const contW = container.clientWidth;
      const contH = container.clientHeight;

      const cols  = Math.floor((contW + gapPx) / (dotPx + gapPx));
      const rows  = Math.floor((contH + gapPx) / (dotPx + gapPx));
      const total = cols * rows;

      const holeCols = centerHole ? (cols % 2 === 0 ? 4 : 5) : 0;
      const holeRows = centerHole ? (rows % 2 === 0 ? 4 : 5) : 0;
      const startCol = (cols - holeCols) / 2;
      const startRow = (rows - holeRows) / 2;

      for (let i = 0; i < total; i++) {
        const row    = Math.floor(i / cols);
        const col    = i % cols;
        const isHole = centerHole &&
          row >= startRow && row < startRow + holeRows &&
          col >= startCol && col < startCol + holeCols;

        const d = document.createElement("div");
        d.classList.add("dot");

        if (isHole) {
          d.style.visibility = "hidden";
          d._isHole = true;
        } else {
          gsap.set(d, { x: 0, y: 0, backgroundColor: colors.base, autoAlpha: 0.9 });
          d._inertiaApplied = false;
        }

        container.appendChild(d);
        dots.push(d);
      }

      requestAnimationFrame(() => {
        dotCenters = dots
          .filter(d => !d._isHole)
          .map(d => {
            const r = d.getBoundingClientRect();
            return {
              el: d,
              x:  r.left + window.scrollX + r.width  / 2,
              y:  r.top  + window.scrollY + r.height / 2
            };
          });
      });
    }

    window.addEventListener("resize", buildGrid);
    buildGrid();

    let lastTime = 0, lastX = 0, lastY = 0;

    const onMouseMove = e => {
      const now   = performance.now();
      const dt    = now - lastTime || 16;
      let   dx    = e.pageX - lastX;
      let   dy    = e.pageY - lastY;
      let   vx    = dx / dt * 1000;
      let   vy    = dy / dt * 1000;
      let   speed = Math.hypot(vx, vy);

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale; vy *= scale; speed = maxSpeed;
      }

      lastTime = now;
      lastX    = e.pageX;
      lastY    = e.pageY;

      requestAnimationFrame(() => {
        dotCenters.forEach(({ el, x, y }) => {
          const dist = Math.hypot(x - e.pageX, y - e.pageY);
          const t    = Math.max(0, 1 - dist / threshold);
          const col  = gsap.utils.interpolate(colors.base, colors.active, t);
          gsap.set(el, { backgroundColor: col });

          if (speed > speedThreshold && dist < threshold && !el._inertiaApplied) {
            el._inertiaApplied = true;
            const pushX = (x - e.pageX) + vx * 0.005;
            const pushY = (y - e.pageY) + vy * 0.005;

            gsap.to(el, {
              inertia: { x: pushX, y: pushY, resistance: 750 },
              onComplete() {
                gsap.to(el, {
                  x: 0,
                  y: 0,
                  duration: 1.5,
                  ease: "elastic.out(1,0.75)"
                });
                el._inertiaApplied = false;
              }
            });
          }
        });
      });
    };

    window.addEventListener("mousemove", onMouseMove);

    // Reset dots when mouse leaves the window
    window.addEventListener("mouseleave", () => {
      dots.forEach(d => {
        if (!d._isHole) {
          gsap.to(d, { x: 0, y: 0, backgroundColor: colors.base, duration: 0.6, ease: "power2.out" });
          d._inertiaApplied = false;
        }
      });
    });

    window.addEventListener("click", e => {
      dotCenters.forEach(({ el, x, y }) => {
        const dist = Math.hypot(x - e.pageX, y - e.pageY);
        if (dist < shockRadius && !el._inertiaApplied) {
          el._inertiaApplied = true;
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX   = (x - e.pageX) * shockPower * falloff;
          const pushY   = (y - e.pageY) * shockPower * falloff;

          gsap.to(el, {
            inertia: { x: pushX, y: pushY, resistance: 750 },
            onComplete() {
              gsap.to(el, {
                x: 0,
                y: 0,
                duration: 1.5,
                ease: "elastic.out(1,0.75)"
              });
              el._inertiaApplied = false;
            }
          });
        }
      });
    });
  });
}

function initCenterButtons() {
  // Add click events for center buttons
  const centerButtons = document.querySelectorAll('.center-btn');
  centerButtons.forEach(button => {
    const buttonText = button.querySelector('.btn-bounce-text').textContent.trim();
    
    if (buttonText === 'Discover Music') {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.youtube.com/@sharedamusic/playlists', '_blank');
      });
    } else if (buttonText === 'Discover Anime') {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.crunchyroll.com/de/videos/popular', '_blank');
      });
    }
  });
}

// Document title change on tab focus/blur
function initDocumentTitleChange() {
  const documentTitleStore = document.title;
  const documentTitleOnBlur = "See you next time"; // Define your custom title here

  // Set original title if user is on the site
  window.addEventListener("focus", () => {
    document.title = documentTitleStore;
  });

  // If user leaves tab, set the alternative title
  window.addEventListener("blur", () => {
    document.title = documentTitleOnBlur;
  });
}

// Subtle background parallax using a CSS variable
function initSubtleBackgroundParallax(){
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (rm) return;
  const STRENGTH = 60; // px range for parallax shift
  const update = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = window.scrollY / maxScroll; // 0..1
    const offset = (p - 0.5) * STRENGTH;
    document.body.style.setProperty('--bg-parallax', `${offset.toFixed(2)}px`);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// Soft reveal for main surfaces and content boxes
function initSoftScrollReveals(){
  const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('main, .anime-slider-main, .content-box');
  if (!targets.length) return;

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined'){
    // Fallback with IntersectionObserver
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e => {
        if (e.isIntersecting){
          e.target.style.transition = 'transform .6s ease, opacity .6s ease';
          e.target.style.transform = 'translateY(0)';
          e.target.style.opacity = '1';
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1});

    targets.forEach(t => {
      t.style.transform = 'translateY(24px)';
      t.style.opacity = '0';
      io.observe(t);
    });
    return;
  }

  targets.forEach(t => {
    gsap.set(t, { y: rm ? 0 : 24, autoAlpha: rm ? 1 : 0 });
    ScrollTrigger.create({
      trigger: t,
      start: 'top 85%',
      once: true,
      onEnter: ()=> gsap.to(t, { y: 0, autoAlpha: 1, duration: rm ? 0.01 : 0.8, ease: 'power3.out' })
    });
  });
}

// ========== 404 PAGE FUNCTIONS ==========

function initConfettiExplosion(x, y) {
  const dotCount = gsap.utils.random(10, 20, 1);
  const colors   = ["#131313", "#CEE675", "#68695F", "#92995C"];
  const container = document.querySelector('[data-minigame-init]');

  for (let i = 0; i < dotCount; i++) {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    container.appendChild(dot);

    gsap.set(dot, {
      left:  `${x}px`,
      top:   `${y}px`,
      scale: 0,
      backgroundColor: gsap.utils.random(colors)
    });

    gsap.timeline({ onComplete: () => dot.remove() })
      .to(dot, {
        scale:    gsap.utils.random(0.12, 0.4),
        duration: 0.3,
        ease:     "power3.out"
      })
      .to(dot, {
        duration: 2,
        physics2D: {
          velocity: gsap.utils.random(200, 400),
          angle:    gsap.utils.random(0, 360),
          gravity:  500
        },
        autoAlpha: 0,
        ease:      "none"
      }, "<");
  }
}

function init404Minigame() {
  const CONFIG = {
    dragToVelocityRatio: 0.02,
    inertiaResistance:   20,
    pullReset:           { duration: 0.8, ease: 'elastic.out(1,0.5)' },
    rocketFadeOut:       { duration: 0.5 },
    maxSpeed:            4000,
    flyMinDuration:      1.5,
    flyMaxDuration:      3,
    flyRotateDuration:   1
  };

  const container     = document.querySelector('[data-minigame-init]');
  if (!container) return; // Exit if not on 404 page
  
  const pull          = container.querySelector('[data-minigame-pull]');
  const rocket        = container.querySelector('[data-minigame-rocket]');
  const line          = container.querySelector('[data-minigame-line]');
  const statusEl      = container.querySelector('[data-minigame-status]');
  const scoreTimeSpan = container.querySelector('[data-minigame-score-time]');
  const resetButton   = container.querySelector('[data-minigame-reset]');
  const flies         = Array.from(container.querySelectorAll('[data-minigame-fly]'));

  let dragStart, rocketTween, isFlying = false;
  let containerRect, origin;
  let startTime = null;

  const rawTargets = [
    ...container.querySelectorAll('[data-minigame-target]'),
    ...flies
  ];
  const allTargets = rawTargets.filter(el => el && window.getComputedStyle(el).display !== 'none');
  const totalTargets = allTargets.length;
  console.log(`🎯 Targets on load: ${totalTargets}`);
  const hitTargets   = new Set();
  const flyTweens    = new Map();

  function resetGame() {
    hitTargets.clear();
    allTargets.forEach(el => {
      el.style.visibility    = '';
      el.style.opacity       = '';
      el.style.display       = '';
      el.style.pointerEvents = '';
    });

    startTime = null;
    statusEl.setAttribute('data-minigame-status','ready');
    scoreTimeSpan.textContent = '0.00';

    gsap.set([pull, rocket, line], {
      clearProps: 'all',
      x: 0, y: 0,
      opacity: 1,
      rotation: 0
    });
    isFlying = false;
    if (rocketTween) rocketTween.kill();

    containerRect = container.getBoundingClientRect();

    flies.forEach(fly => {
      if (flyTweens.has(fly)) flyTweens.get(fly).kill();

      const maxX = containerRect.width  - fly.offsetWidth;
      const maxY = containerRect.height - fly.offsetHeight;
      const startX = gsap.utils.random(0, maxX);
      const startY = gsap.utils.random(0, maxY);

      gsap.set(fly, { clearProps: 'x,y,rotation' });
      fly.style.left      = `${startX}px`;
      fly.style.top       = `${startY}px`;
      fly.style.transform = 'rotate(0deg)';

      moveFly(fly);
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      console.log('🔄 Resetting game');
      resetGame();
    });
  }
  
  resetGame();

  function moveFly(fly) {
    const maxX = containerRect.width  - fly.offsetWidth;
    const maxY = containerRect.height - fly.offsetHeight;
    const newX = gsap.utils.random(0, maxX);
    const newY = gsap.utils.random(0, maxY);

    const cur = fly.getBoundingClientRect();
    const curX = cur.left - containerRect.left;
    const curY = cur.top  - containerRect.top;
    const dx = newX - curX;
    const dy = newY - curY;
    const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;

    gsap.to(fly, {
      rotation: targetAngle,
      duration: CONFIG.flyRotateDuration,
      ease:     'elastic.out(1,0.75)'
    });

    const tween = gsap.to(fly, {
      left:     `${newX}px`,
      top:      `${newY}px`,
      duration: gsap.utils.random(CONFIG.flyMinDuration, CONFIG.flyMaxDuration),
      ease:     'power1.inOut',
      onComplete: () => moveFly(fly)
    });
    flyTweens.set(fly, tween);
  }

  function rectsOverlap(r1, r2) {
    return !(
      r2.left   > r1.right ||
      r2.right  < r1.left  ||
      r2.top    > r1.bottom||
      r2.bottom < r1.top
    );
  }

  function onRocketUpdate() {
    const rRect = rocket.getBoundingClientRect();
    const cRect = containerRect;
    if (
      rRect.right  < cRect.left   ||
      rRect.left   > cRect.right  ||
      rRect.bottom < cRect.top    ||
      rRect.top    > cRect.bottom
    ) {
      rocketTween.kill();
      isFlying = false;
      gsap.set(rocket, { opacity: 0 });
      return;
    }
    for (let t of allTargets) {
      if (hitTargets.has(t)) continue;
      const tRect = t.getBoundingClientRect();
      if (rectsOverlap(rRect, tRect)) {
        hitTargets.add(t);
        console.log(`🏹 Hit ${hitTargets.size}/${totalTargets}`);
        if (flies.includes(t) && flyTweens.has(t)) flyTweens.get(t).kill();
        explodeTarget(t, tRect);
        onHit();
        break;
      }
    }
  }

  function onHit() {
    if (hitTargets.size === totalTargets) {
      console.log('✅ All targets hit!');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      statusEl.setAttribute('data-minigame-status','finished');
      scoreTimeSpan.textContent = elapsed;
    }
  }

  function explodeTarget(el, tRect) {
    gsap.to(el, {
      scale:    0.95,
      opacity:  0,
      duration: 0.3,
      pointerEvents: 'none',
      onComplete: () => {
        el.style.visibility = 'hidden';
        el.style.display = 'none';
      }
    });
    const cx = tRect.left + tRect.width/2  + window.scrollX;
    const cy = tRect.top  + tRect.height/2 + window.scrollY;
    initConfettiExplosion(cx, cy);
  }

  if (pull) {
    Draggable.create(pull, {
      type: 'x,y',
      bounds: container,

      onPress() {
        if (isFlying) return this.endDrag();
        if (!startTime) {
          startTime = Date.now();
          statusEl.setAttribute('data-minigame-status','running');
        }
        if (rocketTween) { rocketTween.kill(); isFlying = false; }
        gsap.set(rocket, { clearProps:'all', x:0, y:0, opacity:0, rotation:0 });

        // Hide custom cursor during drag
        const cursor = document.querySelector('.cursor');
        if (cursor) cursor.style.display = 'none';

        containerRect         = container.getBoundingClientRect();
        this.hasDraggedEnough = false;

        const rb = rocket.getBoundingClientRect();
        origin = {
          x: (rb.left + rb.width/2) - containerRect.left,
          y: (rb.top  + rb.height/2) - containerRect.top
        };

        Object.assign(line.style, {
          left:            `${origin.x}px`,
          top:             `${origin.y}px`,
          width:           '0px',
          transform:       'rotate(0deg)',
          transformOrigin: '0 50%',
          opacity:         '0'
        });

        const pr = pull.getBoundingClientRect();
        dragStart = {
          x: pr.left + pr.width/2,
          y: pr.top  + pr.height/2
        };
        pull.classList.add('is--drag');
        pull.style.cursor = 'grabbing';
      },

      onDrag() {
        const pr = pull.getBoundingClientRect();
        const px = (pr.left + pr.width/2) - containerRect.left;
        const py = (pr.top  + pr.height/2) - containerRect.top;
        const dx = px - origin.x, dy = py - origin.y;
        const len = Math.hypot(dx, dy);
        if (len >= 24) this.hasDraggedEnough = true;

        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        line.style.width     = `${len}px`;
        line.style.transform = `rotate(${ang}deg)`;
        line.style.opacity   = '1';
        gsap.set(pull, { rotation: ang - 90 });
      },

      onRelease() {
        // Show custom cursor again after drag
        const cursor = document.querySelector('.cursor');
        if (cursor) cursor.style.display = 'block';

        pull.style.cursor = 'grab';
        pull.classList.remove('is--drag');

        if (!this.hasDraggedEnough || isFlying) {
          gsap.to(pull, { x:0, y:0, rotate:0, ...CONFIG.pullReset });
          gsap.to(line, { opacity:0, duration:0.2 });
          return;
        }

        gsap.to(line, { opacity:0, duration:0.2 });

        const pr   = pull.getBoundingClientRect();
        const dx0  = dragStart.x - (pr.left + pr.width/2);
        const dy0  = dragStart.y - (pr.top  + pr.height/2);
        const avg  = (containerRect.width + containerRect.height)/2;
        const scale= CONFIG.dragToVelocityRatio * avg;
        let vx = dx0 * scale, vy = dy0 * scale;
        const speed = Math.hypot(vx, vy);
        if (speed > CONFIG.maxSpeed) {
          const f = CONFIG.maxSpeed/speed;
          vx *= f; vy *= f;
        }

        const launchAngle = Math.atan2(vy, vx) * 180 / Math.PI;
        gsap.set(rocket, { rotation: launchAngle + 90 });
        gsap.to(pull, { x:0, y:0, rotate:0, ...CONFIG.pullReset });
        gsap.set(rocket, { x:0, y:0, opacity:1 });
        isFlying = true;

        rocketTween = gsap.to(rocket, {
          inertia: {
            x: { velocity: vx },
            y: { velocity: vy },
            resistance: CONFIG.inertiaResistance
          },
          onUpdate: onRocketUpdate,
          onComplete: () => {
            isFlying = false;
            gsap.to(rocket, { opacity:0, duration: CONFIG.rocketFadeOut.duration });
          }
        });
      }
    });
  }
}

function initMagneticEffect() {
  const magnets = document.querySelectorAll('[data-magnetic-strength]');
  if (window.innerWidth <= 991) return;
  
  // Helper to kill tweens and reset an element.
  const resetEl = (el, immediate) => {
    if (!el) return;
    gsap.killTweensOf(el);
    (immediate ? gsap.set : gsap.to)(el, {
      x: "0em",
      y: "0em",
      rotate: "0deg",
      clearProps: "all",
      ...(!immediate && { ease: "elastic.out(1, 0.3)", duration: 1.6 })
    });
  };

  const resetOnEnter = e => {
    const m = e.currentTarget;
    resetEl(m, true);
    resetEl(m.querySelector('[data-magnetic-inner-target]'), true);
  };

  const moveMagnet = e => {
    const m = e.currentTarget,
      b = m.getBoundingClientRect(),
      strength = parseFloat(m.getAttribute('data-magnetic-strength')) || 25,
      inner = m.querySelector('[data-magnetic-inner-target]'),
      innerStrength = parseFloat(m.getAttribute('data-magnetic-strength-inner')) || strength,
      offsetX = ((e.clientX - b.left) / m.offsetWidth - 0.5) * (strength / 16),
      offsetY = ((e.clientY - b.top) / m.offsetHeight - 0.5) * (strength / 16);
    
    gsap.to(m, { x: offsetX + "em", y: offsetY + "em", rotate: "0.001deg", ease: "power4.out", duration: 1.6 });
    
    if (inner) {
      const innerOffsetX = ((e.clientX - b.left) / m.offsetWidth - 0.5) * (innerStrength / 16),
        innerOffsetY = ((e.clientY - b.top) / m.offsetHeight - 0.5) * (innerStrength / 16);
      gsap.to(inner, { x: innerOffsetX + "em", y: innerOffsetY + "em", rotate: "0.001deg", ease: "power4.out", duration: 2 });
    }
  };

  const resetMagnet = e => {
    const m = e.currentTarget,
      inner = m.querySelector('[data-magnetic-inner-target]');
    gsap.to(m, { x: "0em", y: "0em", ease: "elastic.out(1, 0.3)", duration: 1.6, clearProps: "all" });
    if (inner) {
      gsap.to(inner, { x: "0em", y: "0em", ease: "elastic.out(1, 0.3)", duration: 2, clearProps: "all" });
    }
  };

  magnets.forEach(m => {
    m.addEventListener('mouseenter', resetOnEnter);
    m.addEventListener('mousemove', moveMagnet);
    m.addEventListener('mouseleave', resetMagnet);
  });
}

// Flick Cards functionality
function initFlickCards() {
  const sliders = document.querySelectorAll('[data-flick-cards-init]');

  sliders.forEach(slider => {
    const list = slider.querySelector('[data-flick-cards-list]');
    const cards = Array.from(list.querySelectorAll('[data-flick-cards-item]'));
    const total = cards.length;
    let activeIndex = 0;

    const sliderWidth = slider.offsetWidth;
    const threshold = 0.1;

    // Generate draggers inside each card and store references
    const draggers = [];
    cards.forEach(card => {
      const dragger = document.createElement('div');
      dragger.setAttribute('data-flick-cards-dragger', '');
      card.appendChild(dragger);
      draggers.push(dragger);
    });

    // Set initial drag status
    slider.setAttribute('data-flick-drag-status', 'grab');

    function getConfig(i, currentIndex) {
      let diff = i - currentIndex;
      if (diff > total / 2) diff -= total;
      else if (diff < -total / 2) diff += total;

      switch (diff) {
        case  0: return { x: 0,   y: 0,   rot: 0,  s: 1,   o: 1, z: 5 };
        case  1: return { x: 25,  y: 1,   rot: 10, s: 0.9, o: 1, z: 4 };
        case -1: return { x: -25, y: 1,   rot: -10,s: 0.9, o: 1, z: 4 };
        case  2: return { x: 45,  y: 5,   rot: 15, s: 0.8, o: 1, z: 3 };
        case -2: return { x: -45, y: 5,   rot: -15,s: 0.8, o: 1, z: 3 };
        default:
          const dir = diff > 0 ? 1 : -1;
          return { x: 55 * dir, y: 5, rot: 20 * dir, s: 0.6, o: 0, z: 2 };
      }
    }

    function renderCards(currentIndex) {
      cards.forEach((card, i) => {
        const cfg = getConfig(i, currentIndex);
        let status;

        if (cfg.x === 0)        status = 'active';
        else if (cfg.x === 25)  status = '2-after';
        else if (cfg.x === -25) status = '2-before';
        else if (cfg.x === 45)  status = '3-after';
        else if (cfg.x === -45) status = '3-before';
        else                    status = 'hidden';

        card.setAttribute('data-flick-cards-item-status', status);
        card.style.zIndex = cfg.z;

        gsap.to(card, {
          duration: 0.6,
          ease: 'elastic.out(1.2, 1)',
          xPercent: cfg.x,
          yPercent: cfg.y,
          rotation: cfg.rot,
          scale: cfg.s,
          opacity: cfg.o
        });
      });
    }

    renderCards(activeIndex);

    if (total < 7) {
      console.log('Not minimum of 7 cards');
      return;
    }

    let pressX = 0;
    let pressY = 0;

    Draggable.create(draggers, {
      // Custom Cursor: Enable these to use a custom cursor
      // cursor: 'inherit',
      // activeCursor: 'inherit',
      type: 'x',
      edgeResistance: 0.8,
      bounds: { minX: -sliderWidth / 2, maxX: sliderWidth / 2 },
      inertia: false,

      onPress() {
        pressX = this.pointerX;
        pressY = this.pointerY;
        slider.setAttribute('data-flick-drag-status', 'grabbing');
      },

      onDrag() {
        const rawProgress = this.x / sliderWidth;
        const progress = Math.min(1, Math.abs(rawProgress));
        const direction = rawProgress > 0 ? -1 : 1;
        const nextIndex = (activeIndex + direction + total) % total;

        cards.forEach((card, i) => {
          const from = getConfig(i, activeIndex);
          const to = getConfig(i, nextIndex);
          const mix = prop => from[prop] + (to[prop] - from[prop]) * progress;

          gsap.set(card, {
            xPercent: mix('x'),
            yPercent: mix('y'),
            rotation: mix('rot'),
            scale: mix('s'),
            opacity: mix('o')
          });
        });
      },

      onRelease() {
        slider.setAttribute('data-flick-drag-status', 'grab');

        const releaseX = this.pointerX;
        const releaseY = this.pointerY;
        const dragDistance = Math.hypot(releaseX - pressX, releaseY - pressY);

        const raw = this.x / sliderWidth;
        let shift = 0;
        if (raw > threshold) shift = -1;
        else if (raw < -threshold) shift = 1;

        if (shift !== 0) {
          activeIndex = (activeIndex + shift + total) % total;
          renderCards(activeIndex);
        }

        gsap.to(this.target, {
          x: 0,
          duration: 0.3,
          ease: 'power1.out'
        });

        if (dragDistance < 4) {
          // Temporarily allow clicks to pass through
          this.target.style.pointerEvents = 'none';

          // Allow the DOM to register pointer-through
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const el = document.elementFromPoint(releaseX, releaseY);
              if (el) {
                const evt = new MouseEvent('click', {
                  view: window,
                  bubbles: true,
                  cancelable: true
                });
                el.dispatchEvent(evt);
              }

              // Restore pointer events
              this.target.style.pointerEvents = 'auto';
            });
          });
        }
      }
    });
  });
}

// ========== UNIFIED INITIALIZATION ==========

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    console.log('GSAP available:', typeof gsap !== 'undefined');
    console.log('Draggable available:', typeof Draggable !== 'undefined');
    console.log('InertiaPlugin available:', typeof InertiaPlugin !== 'undefined');
    
    // Check if we're on the 404 page
    const is404Page = document.querySelector('[data-minigame-init]');
    
    if (is404Page) {
        console.log('404 page detected - initializing 404-specific functions');
        // Initialize 404 Error Minigame
        init404Minigame();
        initMagneticEffect();
    } else {
        console.log('Index page detected - initializing index-specific functions');
        
        // Check if slider elements exist
        const sliderElement = document.querySelector('[data-gsap-slider-init]');
        console.log('Slider element found:', !!sliderElement);
        
        // Initialize Basic GSAP Slider with delay to ensure GSAP is loaded
        setTimeout(() => {
            console.log('Initializing GSAP slider...');
            initBasicGSAPSlider();
        }, 100);
        
        // Initialize index page specific functions
        initScrollProgressNumber();
        initCSSMarquee();
        initGlowingInteractiveDotsGrid();
        initCenterButtons();
        initFlickCards();
        initSubtleBackgroundParallax();
        initSoftScrollReveals();
    }
    
    // Initialize common functions for both pages
    initDynamicCurrentTime();
    initCookieDarkLight();
    initVelocityBasedCustomCursor();
    initDocumentTitleChange();
    
    // Add resize listener for slider
    window.addEventListener('resize', debounceOnWidthChange(initBasicGSAPSlider, 200));
    
    // Example: Add click event to header
    const header = document.querySelector('header h1');
    if (header) {
        header.addEventListener('click', function() {
            console.log('Header clicked!');
            // Add your custom functionality here
        });
    }
});

// Example function
function exampleFunction() {
    console.log('This is an example function');
    // Add your custom code here
}

// Example: Handle window resize
window.addEventListener('resize', function() {
    console.log('Window resized');
    // Add responsive behavior here
});
