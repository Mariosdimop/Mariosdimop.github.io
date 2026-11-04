(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Theme: dark / light (editorial) ----------
     The initial value is set by the inline script in <head>. */
  const themeBtn = document.getElementById("theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const systemLight = window.matchMedia("(prefers-color-scheme: light)");
  const THEME_COLORS = { dark: "#0a0a0a", light: "#faf9f6" };

  const readStored = () => {
    try { return localStorage.getItem("theme"); } catch { return null; }
  };
  const store = (t) => {
    try { localStorage.setItem("theme", t); } catch { /* private mode: not remembered */ }
  };

  const applyTheme = (t) => {
    root.setAttribute("data-theme", t);
    if (themeMeta) themeMeta.setAttribute("content", THEME_COLORS[t]);
    if (themeBtn) {
      themeBtn.setAttribute("aria-label", t === "light" ? "Switch to dark mode" : "Switch to light mode");
      themeBtn.setAttribute("aria-pressed", String(t === "light"));
    }
  };

  const switchTheme = (t) => {
    if (document.startViewTransition && !reduceMotion.matches) {
      document.startViewTransition(() => applyTheme(t));
    } else {
      applyTheme(t);
    }
  };

  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");

  themeBtn?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    store(next);
    switchTheme(next);
  });
  // follow the OS setting until the visitor picks a theme themselves
  systemLight.addEventListener("change", (e) => {
    const saved = readStored();
    if (saved !== "light" && saved !== "dark") switchTheme(e.matches ? "light" : "dark");
  });

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Grade bars: size is static, growth is a transform ---------- */
  document.querySelectorAll(".grade-list li").forEach((li) => {
    const g = parseFloat(li.dataset.grade);
    if (!Number.isNaN(g)) li.style.setProperty("--grade", g);
    // 40ms cascade within each year card
    const bar = li.querySelector(".bar i");
    const indexInList = [...li.parentElement.children].indexOf(li);
    if (bar) bar.style.transitionDelay = `${indexInList * 40}ms`;
  });

  /* ---------- Entrance on scroll ----------
     Stagger 50ms among siblings revealed together, capped so nothing waits long.
     Delay is cleared after the entrance so hover transitions stay instant. */
  const revealEls = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        visible.forEach((el, i) => {
          el.style.transitionDelay = `${Math.min(i, 4) * 50}ms`;
          el.classList.add("is-visible");
          const clear = (e) => {
            if (e.target !== el) return; // ignore transitions bubbling up from children
            el.style.transitionDelay = "";
            el.removeEventListener("transitionend", clear);
          };
          el.addEventListener("transitionend", clear);
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Active nav link follows the section in view ---------- */
  const links = [...document.querySelectorAll(".nav-link")];
  const sections = links.map((l) => document.getElementById(l.dataset.section)).filter(Boolean);
  let activeId = null;

  const updateActive = () => {
    const probe = window.innerHeight * 0.35;
    let current = sections[0].id;
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= probe) current = s.id;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1].id;
    }
    if (current === activeId) return;
    activeId = current;
    links.forEach((l) => {
      const on = l.dataset.section === current;
      l.classList.toggle("is-active", on);
      if (on) l.setAttribute("aria-current", "true");
      else l.removeAttribute("aria-current");
    });
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
    },
    { passive: true }
  );
  updateActive();

  /* ---------- Copy email: blur-masked label swap ---------- */
  const copyBtn = document.getElementById("copy-email");
  if (copyBtn) {
    const label = copyBtn.querySelector(".btn-label");
    const swap = (text) => {
      label.classList.add("is-swapping");
      setTimeout(() => {
        label.textContent = text;
        label.classList.remove("is-swapping");
      }, reduceMotion.matches ? 0 : 120);
    };
    let resetTimer;
    copyBtn.addEventListener("click", async () => {
      const email = copyBtn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        window.location.href = `mailto:${email}`;
        return;
      }
      swap("Copied");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => swap("Copy email"), 1600);
    });
  }
})();
