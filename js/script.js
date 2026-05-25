(function () {

  "use strict";

  // Service Card Toggle (Mobile)
  try {
    const serviceCards = document.querySelectorAll('.service-card');
    const mobileServiceQuery = window.matchMedia('(max-width: 860px)');

    if (serviceCards.length) {
      const setExpandedState = (card, shouldExpand) => {
        const toggleButton = card.querySelector('.service-toggle-btn');
        const details = card.querySelector('.service-card-details');
        const toggleLabel = card.querySelector('.service-toggle-label');

        if (!toggleButton || !details) {
          return;
        }

        const isMobile = mobileServiceQuery.matches;
        const expanded = isMobile ? shouldExpand : true;

        card.classList.toggle('is-collapsible', isMobile);
        card.classList.toggle('active', isMobile && expanded);
        toggleButton.setAttribute('aria-expanded', String(expanded));
        details.setAttribute('aria-hidden', String(!expanded));

        if (toggleLabel) {
          toggleLabel.textContent = expanded ? 'Ocultar detalles' : 'Ver detalles';
        }
      };

      serviceCards.forEach((card) => {
        const toggleButton = card.querySelector('.service-toggle-btn');
        if (!toggleButton) {
          return;
        }

        toggleButton.addEventListener('click', () => {
          if (!mobileServiceQuery.matches) {
            return;
          }
          const nextState = !card.classList.contains('active');
          setExpandedState(card, nextState);
        });
      });

      const syncServiceCards = () => {
        serviceCards.forEach((card) => {
          const isActive = card.classList.contains('active');
          setExpandedState(card, isActive);
        });
      };

      if (typeof mobileServiceQuery.addEventListener === 'function') {
        mobileServiceQuery.addEventListener('change', syncServiceCards);
      } else if (typeof mobileServiceQuery.addListener === 'function') {
        mobileServiceQuery.addListener(syncServiceCards);
      }

      syncServiceCards();
    }
  } catch (e) {
    console.error("Service toggle init error:", e);
  }

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

        if (totalProjects < 1) {
          return;
        }

        var shouldLoop = totalProjects > 3;
        var showDots = totalProjects > 1;
        var showArrows = totalProjects > 1;

        $projectGrid.slick({
          infinite: shouldLoop,
          slidesToShow: Math.min(3, totalProjects),
          slidesToScroll: 1,
          dots: showDots,
          arrows: showArrows,
          prevArrow: '<button type="button" class="slick-prev slick-arrow" aria-label="Proyecto anterior"><i class="icon icon-arrow-left"></i></button>',
          nextArrow: '<button type="button" class="slick-next slick-arrow" aria-label="Siguiente proyecto"><i class="icon icon-arrow-right"></i></button>',
          responsive: [
            {
              breakpoint: 1200,
              settings: {
                slidesToShow: Math.min(2, totalProjects),
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

    if (typeof AOS !== "undefined") {
      AOS.init({
        duration: 900,
        once: true,
        offset: 50,
        easing: 'ease-out-cubic'
      });
      // Fix offset caching bug: refresh AOS when all images have loaded and Slick has initialized
      setTimeout(function() {
        AOS.refresh();
      }, 500);
      
      if (document.readyState === 'complete') {
        AOS.refresh();
      } else {
        window.addEventListener('load', function() {
          AOS.refresh();
        });
      }
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

  var sectionToObserve = document.getElementById("projects") || document.getElementById("nuestro-equipo");
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
    // Calculate scrollbar width before toggling overflow
    if (isOpen) {
      var scrollbarW = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-w', scrollbarW + 'px');
    } else {
      document.documentElement.style.setProperty('--scrollbar-w', '0px');
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

    // Use a scroll-position algorithm: pick the section whose top is closest
    // to the viewport band (top 30%). More reliable than ratio-based.
    var navScrollTicking = false;

    function updateActiveOnScroll() {
      navScrollTicking = false;
      var scrollY = window.scrollY || window.pageYOffset;
      var viewportH = window.innerHeight;
      var headerH = header ? Math.round(header.getBoundingClientRect().height) + 20 : 96;

      // If near bottom of page, activate last section
      if (scrollY + viewportH >= document.documentElement.scrollHeight - 40) {
        var lastId = navSections[navSections.length - 1].id;
        if (lastId !== currentActiveNavSectionId) {
          currentActiveNavSectionId = lastId;
          setActiveNavSection(lastId);
        }
        return;
      }

      // Standard scroll-spy: pick the last section whose top has scrolled past the trigger line
      var bestId = navSections[0].id;
      for (var i = 0; i < navSections.length; i++) {
        var rect = navSections[i].getBoundingClientRect();
        if (rect.top <= headerH + 60) {
          bestId = navSections[i].id;
        }
      }

      if (bestId !== currentActiveNavSectionId) {
        currentActiveNavSectionId = bestId;
        setActiveNavSection(bestId);
      }
    }

    window.addEventListener("scroll", function () {
      if (!navScrollTicking) {
        window.requestAnimationFrame(updateActiveOnScroll);
        navScrollTicking = true;
      }
    }, { passive: true });

    updateActiveOnScroll();
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

  var whatsappContactSection = document.getElementById('contact-whatsapp');
  var whatsappContactForm = document.getElementById('whatsapp-contact-form');

  if (whatsappContactSection && whatsappContactForm) {
    whatsappContactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var messageField = whatsappContactForm.querySelector('input[name="message"]');
      if (!messageField) {
        return;
      }

      var rawMessage = (messageField.value || '').trim();
      if (!rawMessage) {
        messageField.focus();
        return;
      }

      var cleanedNumber = (whatsappContactSection.getAttribute('data-whatsapp-number') || '').replace(/\D/g, '');
      var whatsappText = encodeURIComponent(rawMessage);
      var whatsappUrl = cleanedNumber
        ? 'https://wa.me/' + cleanedNumber + '?text=' + whatsappText
        : 'https://wa.me/?text=' + whatsappText;

      window.open(whatsappUrl, '_blank', 'noopener');
    });
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


  // Timeline Scroll Animation
  const timelineContainer = document.querySelector('.timeline-container');
  const timelineItems = document.querySelectorAll('.timeline-item');
  const timelineProgress = document.querySelector('.timeline-progress');

  if (timelineContainer && timelineItems.length) {
    timelineContainer.classList.add('js-active');

    const setItemVisible = (item, shouldBeVisible) => {
      item.classList.toggle('visible', shouldBeVisible);
    };

    const inRevealZone = (item) => {
      const rect = item.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      return rect.top <= viewportHeight * 0.82 && rect.bottom >= viewportHeight * 0.2;
    };

    timelineItems.forEach((item) => {
      item.style.setProperty('--timeline-delay', '0ms');
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      timelineItems.forEach((item) => setItemVisible(item, true));
    } else {
      timelineContainer.classList.add('is-enhanced');
      let revealTicking = false;

      const syncTimelineVisibility = () => {
        timelineItems.forEach((item) => {
          setItemVisible(item, inRevealZone(item));
        });
        revealTicking = false;
      };

      const onTimelineScroll = () => {
        if (revealTicking) {
          return;
        }
        window.requestAnimationFrame(syncTimelineVisibility);
        revealTicking = true;
      };

      window.requestAnimationFrame(() => {
        timelineContainer.classList.add('is-ready');
        syncTimelineVisibility();
      });
      window.addEventListener('scroll', onTimelineScroll, { passive: true });
      window.addEventListener('resize', onTimelineScroll);
    }

    // Scroll Linked (Progress Line)
    let timelineTicking = false;

    function updateTimelineProgress() {
      const rect = timelineContainer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const viewportCenter = windowHeight / 2;
      const distFromTop = viewportCenter - rect.top;
      if (rect.height <= 0) {
        timelineTicking = false;
        return;
      }
      let percentage = (distFromTop / rect.height) * 100;
      
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
    
    updateTimelineProgress();
  }

  // WhatsApp Floating Button Logic
  var whatsappFloat = document.getElementById("whatsapp-float");
  if (whatsappFloat) {
    var whatsappBtn = whatsappFloat.querySelector(".whatsapp-btn");
    var whatsappTooltip = whatsappFloat.querySelector(".whatsapp-tooltip");
    var phoneNumber = whatsappFloat.getAttribute("data-phone") || "5493512050889";
    var articleTitle = whatsappFloat.getAttribute("data-article-title") || "";
    
    var scrollTriggered = false;
    var tooltipShown = false;

    var baseMsg = articleTitle ? "Hola EJEZ! Estoy viendo el caso \"" + articleTitle + "\" y me gustaría hacerles una consulta: " : "Hola EJEZ! Me gustaría hacerles una consulta: ";
    var whatsappUrl = "https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(baseMsg);
    
    whatsappBtn.setAttribute("href", whatsappUrl);

    function checkScrollForWhatsapp() {
      if (scrollTriggered) return;
      var scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 25 || window.scrollY > 400) {
        whatsappFloat.classList.add("is-visible");
        scrollTriggered = true;
        
        if (whatsappTooltip && window.innerWidth > 768) {
          setTimeout(function() {
            whatsappTooltip.classList.add("is-active");
            tooltipShown = true;
            
            setTimeout(function() {
              whatsappTooltip.classList.remove("is-active");
            }, 6000);
          }, 1000);
        }
        
        window.removeEventListener("scroll", checkScrollForWhatsapp);
      }
    }

    if (whatsappTooltip) {
      whatsappBtn.addEventListener("mouseenter", function() {
        if (!tooltipShown && window.innerWidth > 768) {
          whatsappTooltip.classList.add("is-active");
        }
      });
      whatsappBtn.addEventListener("mouseleave", function() {
        whatsappTooltip.classList.remove("is-active");
      });
    }

    window.addEventListener("scroll", checkScrollForWhatsapp, { passive: true });
    checkScrollForWhatsapp();
  }

})();
