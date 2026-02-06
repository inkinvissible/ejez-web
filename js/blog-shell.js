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
})();
