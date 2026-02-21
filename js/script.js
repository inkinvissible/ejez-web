(function () {

  "use strict";

  // Sticky header reveal after initial scroll
  var headerWrap = document.getElementById("header-wrap");
  var header = document.getElementById("header");
  if (headerWrap && header) {
    var stickyTrigger = 84;
    var scrollTicking = false;

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

  function refreshActiveProjectGrid(targetPanel) {
    var $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.slick || !targetPanel) {
      return;
    }

    window.requestAnimationFrame(function () {
      var $targetGrid = $(targetPanel).find('.project-grid');
      if ($targetGrid.length && $targetGrid.hasClass('slick-initialized')) {
        $targetGrid.slick('setPosition');
      }
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = document.querySelector(tab.dataset.tabTarget);
      if (!target) {
        return;
      }

      tabContents.forEach(tabContent => {
        tabContent.classList.remove('active');
      });
      tabs.forEach(tab => {
        tab.classList.remove('active');
      });
      tab.classList.add('active');
      target.classList.add('active');
      refreshActiveProjectGrid(target);
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
      $('.project-grid').each(function () {
        var $projectGrid = $(this);
        var totalProjects = $projectGrid.children('.project-style').length;

        // Don't initialize Slick when there are 3 or fewer projects;
        // the CSS layout already handles them at the correct size.
        if (totalProjects <= 3) {
          return;
        }

        var shouldLoop = totalProjects > 3;

        $projectGrid.slick({
          infinite: shouldLoop,
          slidesToShow: 3,
          slidesToScroll: 1,
          dots: shouldLoop,
          arrows: shouldLoop,
          responsive: [
            {
              breakpoint: 1200,
              settings: {
                slidesToShow: 2,
                arrows: totalProjects > 2
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

  function scrollToSection(sectionId) {
    var target = document.getElementById(sectionId);
    if (!target) {
      return;
    }
    var headerOffset = header ? Math.round(header.getBoundingClientRect().height) + 12 : 96;
    var targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth"
    });
  }

  function setActiveNavSection(sectionId) {
    navLink.forEach(function (link) {
      var menuItem = link.closest(".menu-item");
      var isCurrent = link.getAttribute("href") === "#" + sectionId;
      if (menuItem) {
        menuItem.classList.toggle("active", isCurrent);
      }
      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  var navSections = [];
  var sectionVisibility = {};
  navLink.forEach(function (link) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#") {
      return;
    }
    var targetSection = document.getElementById(href.slice(1));
    if (targetSection) {
      navSections.push(targetSection);
    }
  });

  if (navSections.length) {
    setActiveNavSection(navSections[0].id);
  }

  if ("IntersectionObserver" in window && navSections.length) {
    var currentActiveNavSectionId = navSections[0].id;
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionVisibility[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      var activeSectionId = currentActiveNavSectionId;
      var strongestRatio = 0;
      navSections.forEach(function (section) {
        var ratio = sectionVisibility[section.id] || 0;
        if (ratio > strongestRatio) {
          strongestRatio = ratio;
          activeSectionId = section.id;
        }
      });

      if (activeSectionId) {
        currentActiveNavSectionId = activeSectionId;
        setActiveNavSection(activeSectionId);
      }
    }, {
      threshold: [0.2, 0.4, 0.55, 0.75],
      rootMargin: "-18% 0px -52% 0px"
    });

    navSections.forEach(function (section) {
      navObserver.observe(section);
    });
  }

  navLink.forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (href && href.charAt(0) === "#") {
        event.preventDefault();
        var sectionId = href.slice(1);
        setActiveNavSection(sectionId);
        scrollToSection(sectionId);
      }
      closeMenu();
    });
  });

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


  // Service Accordion for Mobile
  const serviceCards = document.querySelectorAll('.service-card');
  
  serviceCards.forEach(card => {
    const header = card.querySelector('.service-card-top');
    if (header) {
      header.addEventListener('click', () => {
        // Only activate on mobile/tablet where the layout changes
        if (window.innerWidth > 860) return;

        const isActive = card.classList.contains('active');
        
        // Close all others to mimic accordion behavior
        serviceCards.forEach(c => c.classList.remove('active'));
        
        // If it wasn't active, open it. If it was active, it stays closed (toggled off above)
        if (!isActive) {
          card.classList.add('active');
        }
      });
    }
  });

  // Timeline Scroll Animation
  const timelineContainer = document.querySelector('.timeline-container');
  const timelineItems = document.querySelectorAll('.timeline-item');
  const timelineProgress = document.querySelector('.timeline-progress');

  if (timelineContainer && timelineItems.length) {
    // 1. Scroll Triggered (Reveal Items)
    const observerOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };

    const timelineObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        } else {
          // If element is leaving towards the bottom (top > 0), it means we scrolled UP past it.
          // Remove the class to allow re-animation when scrolling back down.
          if (entry.boundingClientRect.top > 0) {
            entry.target.classList.remove('visible');
          }
        }
      });
    }, observerOptions);

    timelineItems.forEach(item => {
      timelineObserver.observe(item);
    });

    // 2. Scroll Linked (Progress Line)
    let timelineTicking = false;

    function updateTimelineProgress() {
      const rect = timelineContainer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress: 0% when top of container is at center of screen, 
      // 100% when bottom of container is at center of screen.
      // Formula: (WindowCenter - ContainerTop) / ContainerHeight
      
      const viewportCenter = windowHeight / 2;
      const distFromTop = viewportCenter - rect.top;
      let percentage = (distFromTop / rect.height) * 100;
      
      // Clamp between 0 and 100
      percentage = Math.max(0, Math.min(100, percentage));
      
      if (timelineProgress) {
        timelineProgress.style.height = percentage + '%';
      }
      timelineTicking = false;
    }

    window.addEventListener('scroll', () => {
      if (!timelineTicking) {
        window.requestAnimationFrame(updateTimelineProgress);
        timelineTicking = true;
      }
    }, { passive: true });
    
    // Initial call
    updateTimelineProgress();
  }

})();
