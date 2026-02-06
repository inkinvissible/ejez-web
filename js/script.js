(function () {

  "use strict";

  // Sticky header reveal after initial scroll
  var headerWrap = document.getElementById("header-wrap");
  var header = document.getElementById("header");
  if (headerWrap && header) {
    var stickyTrigger = 84;
    var scrollTicking = false;
    var stickyTimeout = null;

    function syncHeaderHeight() {
      headerWrap.style.setProperty("--header-height", header.offsetHeight + "px");
    }

    function updateHeaderState() {
      var currentScroll = window.scrollY || window.pageYOffset;

      if (currentScroll > stickyTrigger) {
        if (!headerWrap.classList.contains("is-sticky")) {
          headerWrap.classList.add("is-sticky");
          window.requestAnimationFrame(function () {
            headerWrap.classList.add("is-visible");
          });
        } else {
          headerWrap.classList.add("is-visible");
        }
      } else {
        headerWrap.classList.remove("is-sticky");
        headerWrap.classList.remove("is-visible");
      }
      scrollTicking = false;
    }

    window.addEventListener("scroll", function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateHeaderState);
        scrollTicking = true;
      }
    }, { passive: true });

    window.addEventListener("resize", function () {
      if (stickyTimeout) {
        window.clearTimeout(stickyTimeout);
      }
      stickyTimeout = window.setTimeout(syncHeaderHeight, 80);
    }, { passive: true });

    syncHeaderHeight();
    updateHeaderState();
  }

  // Hero math-sheet hover lines
  var heroBanner = document.querySelector("#billboard .main-banner");
  if (heroBanner && window.matchMedia("(hover: hover)").matches) {
    var hoverFrame = null;
    var pointerX = 50;
    var pointerY = 50;

    function paintHeroPointer() {
      heroBanner.style.setProperty("--mx", pointerX + "%");
      heroBanner.style.setProperty("--my", pointerY + "%");
      hoverFrame = null;
    }

    heroBanner.addEventListener("mousemove", function (event) {
      var rect = heroBanner.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width) * 100;
      pointerY = ((event.clientY - rect.top) / rect.height) * 100;
      if (!hoverFrame) {
        hoverFrame = window.requestAnimationFrame(paintHeroPointer);
      }
    }, { passive: true });

    heroBanner.addEventListener("mouseleave", function () {
      heroBanner.style.setProperty("--mx", "50%");
      heroBanner.style.setProperty("--my", "50%");
    });
  }

  // Scroll indicator on hero
  var scrollIndicator = document.querySelector(".scroll-indicator");
  var aboutSection = document.getElementById("about");
  if (scrollIndicator && aboutSection) {
    scrollIndicator.addEventListener("click", function () {
      aboutSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }


  // Tab Section
  const tabs = document.querySelectorAll('[data-tab-target]');
  const tabContents = document.querySelectorAll('[data-tab-content]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = document.querySelector(tab.dataset.tabTarget);
      tabContents.forEach(tabContent => {
        tabContent.classList.remove('active');
      });
      tabs.forEach(tab => {
        tab.classList.remove('active');
      });
      tab.classList.add('active');
      target.classList.add('active');
    });
  });

  // Load heavy plugin bundle lazily (AOS + other vendor plugins)
  var optionalPluginsRequested = false;
  var optionalPluginsReady = false;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existingScript = document.querySelector('script[src="' + src + '"]');
      if (existingScript) {
        if (existingScript.dataset.loaded === "true") {
          resolve();
          return;
        }
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.addEventListener("load", function () {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.body.appendChild(script);
    });
  }

  var optionalDependenciesPromise = null;

  function ensureOptionalDependencies() {
    if (optionalDependenciesPromise) {
      return optionalDependenciesPromise;
    }

    optionalDependenciesPromise = (window.jQuery ? Promise.resolve() : loadScript("js/jquery-1.11.0.min.js"))
      .then(function () {
        return loadScript("js/plugins.js");
      });

    return optionalDependenciesPromise;
  }

  function initOptionalEnhancements() {
    if (optionalPluginsReady) {
      return;
    }

    var $ = window.jQuery;
    if (!$) {
      optionalPluginsRequested = false;
      return;
    }

    optionalPluginsReady = true;

    if ($.fn && $.fn.slick && $('.project-grid').length) {
      $('.project-grid').slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 1,
        dots: true,
        responsive: [
          {
            breakpoint: 1200,
            settings: {
              slidesToShow: 2
            }
          },
          {
            breakpoint: 900,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1,
              arrows: false
            }
          }
        ]
      });
    }

    if ($.fn && $.fn.slick && $('.testimonial-slider').length) {
      $('.testimonial-slider').slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        fade: true,
        prevArrow: $('.prev'),
        nextArrow: $('.next')
      });
    }

    if (typeof AOS !== "undefined") {
      AOS.init({
        duration: 900,
        once: true
      });
    }
  }

  function requestOptionalPlugins() {
    if (optionalPluginsRequested) {
      return;
    }
    optionalPluginsRequested = true;
    ensureOptionalDependencies()
      .then(initOptionalEnhancements)
      .catch(function () {
        optionalPluginsRequested = false;
      });
  }

  var sectionToObserve = document.getElementById("projects") || document.getElementById("testimonial");
  if ("IntersectionObserver" in window && sectionToObserve) {
    var pluginObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          requestOptionalPlugins();
          pluginObserver.disconnect();
        }
      });
    }, { rootMargin: "300px 0px" });
    pluginObserver.observe(sectionToObserve);
  } else if ("requestIdleCallback" in window) {
    requestIdleCallback(requestOptionalPlugins, { timeout: 1800 });
  } else {
    window.setTimeout(requestOptionalPlugins, 1400);
  }

  // Backstop trigger to load plugins as soon as the user interacts
  var pluginBootEvents = ["touchstart", "mousemove", "keydown", "scroll"];
  pluginBootEvents.forEach(function (eventName) {
    window.addEventListener(eventName, requestOptionalPlugins, { once: true, passive: true });
  });

  // Responsive Navigation with Button
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.getElementById("primary-menu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", mobileMenu);
    hamburger.setAttribute("aria-expanded", "false");
  }

  function setMenuState(isOpen) {
    if (!hamburger || !navMenu) {
      return;
    }
    hamburger.classList.toggle("active", isOpen);
    navMenu.classList.toggle("responsive", isOpen);
    document.body.classList.toggle("no-scroll", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    hamburger.setAttribute("aria-label", isOpen ? "Close main menu" : "Open main menu");
  }

  function mobileMenu() {
    setMenuState(!navMenu.classList.contains("responsive"));
  }

  const navLink = document.querySelectorAll(".nav-link");

  navLink.forEach(n => n.addEventListener("click", closeMenu));

  function closeMenu() {
      setMenuState(false);
  }

  document.addEventListener("click", function (event) {
    if (!hamburger || !navMenu) {
      return;
    }
    var clickInsideMenu = navMenu.contains(event.target);
    var clickOnHamburger = hamburger.contains(event.target);
    if (!clickInsideMenu && !clickOnHamburger) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1180) {
      closeMenu();
    }
  });



})();
