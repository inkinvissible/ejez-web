/* global document, window */
(function () {
  "use strict";

  // Sticky header reveal after initial scroll (same behavior as landing)
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

  var hamburger = document.querySelector(".hamburger");
  var navMenu = document.getElementById("primary-menu");

  if (!hamburger || !navMenu) {
    return;
  }

  function setMenuState(isOpen) {
    hamburger.classList.toggle("active", isOpen);
    navMenu.classList.toggle("responsive", isOpen);
    document.body.classList.toggle("no-scroll", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    hamburger.setAttribute("aria-label", isOpen ? "Cerrar menu principal" : "Abrir menu principal");
  }

  function toggleMenu() {
    setMenuState(!navMenu.classList.contains("responsive"));
  }

  function closeMenu() {
    setMenuState(false);
  }

  hamburger.addEventListener("click", toggleMenu);

  document.addEventListener("click", function (event) {
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

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") {
      return;
    }
    var link = target.closest("a[data-posthog-event]");
    if (!link || !window.posthog || typeof window.posthog.capture !== "function") {
      return;
    }

    window.posthog.capture(link.getAttribute("data-posthog-event"), {
      title: link.getAttribute("data-posthog-title") || "",
      detail: link.getAttribute("data-posthog-detail") || "",
      kind: link.getAttribute("data-posthog-kind") || "",
      slug: link.getAttribute("data-posthog-slug") || "",
      url: link.getAttribute("data-posthog-url") || ""
    });
  });

  // WhatsApp Floating Button Logic
  var whatsappFloat = document.getElementById("whatsapp-float");
  if (whatsappFloat) {
    var whatsappBtn = whatsappFloat.querySelector(".whatsapp-btn");
    var whatsappTooltip = whatsappFloat.querySelector(".whatsapp-tooltip");
    var phoneNumber = whatsappFloat.getAttribute("data-phone") || "5493512050889";
    var articleTitle = whatsappFloat.getAttribute("data-article-title") || "";
    
    var scrollTriggered = false;
    var tooltipShown = false;

    // Build the dynamic URL
    var baseMsg = "Hola EJEZ! Estoy leyendo su artículo \"" + articleTitle + "\" y me gustaría hacerles una consulta: ";
    if (!articleTitle) {
      baseMsg = "Hola EJEZ! Me gustaría hacerles una consulta: ";
    }
    var whatsappUrl = "https://wa.me/" + phoneNumber.replace(/\D/g, "") + "?text=" + encodeURIComponent(baseMsg);
    whatsappBtn.setAttribute("href", whatsappUrl);

    // Scroll Handler
    var checkScroll = function () {
      var scrollPos = window.scrollY || window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight > 0) {
        var scrollPercentage = (scrollPos / docHeight) * 100;
        
        // Show button after 30% scroll
        if (scrollPercentage >= 30) {
          if (!scrollTriggered) {
            whatsappFloat.classList.add("is-visible");
            scrollTriggered = true;
            
            // Show teaser tooltip after 1.2s delay
            setTimeout(function () {
              if (whatsappTooltip && !tooltipShown) {
                whatsappTooltip.classList.add("is-active");
                tooltipShown = true;
                
                // Hide tooltip after 5 seconds
                setTimeout(function () {
                  whatsappTooltip.classList.remove("is-active");
                }, 5000);
              }
            }, 1200);
          }
        }
      }
    };

    window.addEventListener("scroll", checkScroll, { passive: true });
    // Check initial scroll position
    checkScroll();
  }
})();
