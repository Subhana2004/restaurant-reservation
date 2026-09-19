"use strict";
/* Mesa Dining Edition: photo-first discovery and useful lightweight interactions.
   Reservations stay governed by app.js/API; this layer never invents inventory. */
(() => {
  const $ = id => document.getElementById(id);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Remote editorial photography has a built-in local illustration fallback for
  // offline demos, limited campus networks and browser privacy blockers.
  function fallbackPhoto(img) {
    if (!img || img.tagName !== "IMG" || !img.dataset.fallback ||
        img.dataset.fallback === img.getAttribute("src")) return;
    img.src = img.dataset.fallback;
    img.classList.add("is-fallback");
    img.alt = "Stylized illustration representing sample restaurant food";
  }
  document.addEventListener("error", event => {
    if (event.target?.tagName === "IMG") fallbackPhoto(event.target);
  }, true);
  function checkAlreadyFailed() {
    document.querySelectorAll("img[data-fallback]").forEach(img => {
      if (img.complete && img.naturalWidth === 0) fallbackPhoto(img);
    });
  }

  // Reuses the existing details-dialog handler in studio.js. Photo interactions
  // always lead to real venue information, not a fake 'recipe' feature.
  const previousRender = renderRestaurants;
  renderRestaurants = function renderDiningCollection() {
    previousRender();
    $("restaurant-grid").querySelectorAll(".restaurant-card").forEach(card => {
      if (card.querySelector(".photo-open")) return;
      const id = Number(card.dataset.venueId);
      if (!Number.isSafeInteger(id)) return;
      const image = card.querySelector(".card-image");
      if (!image) return;
      const row = state.restaurants.find(place => place.id === id);
      if (!row) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "photo-open";
      button.dataset.details = String(id);
      button.setAttribute("aria-label", "Explore " + row.name);
      button.textContent = "Explore place ↗";
      image.append(button);
    });
    checkAlreadyFailed();
  };

  function activeNav(key) {
    document.querySelectorAll(".workspace-tab[data-work-nav]").forEach(link => {
      const active = link.dataset.workNav === key;
      link.classList.toggle("is-current", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  function initDining() {
    checkAlreadyFailed();
    const nav = document.querySelectorAll(".workspace-tab[data-work-nav]");
    nav.forEach(link => link.addEventListener("click", () => activeNav(link.dataset.workNav)));
    if ("IntersectionObserver" in window) {
      const zones = [["explore","plan"],["places","places"],["how-it-works","how"]];
      const io = new IntersectionObserver(entries => {
        const sorted=entries.filter(entry=>entry.isIntersecting)
          .sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
        if (sorted.length) {
          const match = zones.find(([id])=>id === sorted[0].target.id);
          if (match) activeNav(match[1]);
        }
      }, {rootMargin:"-17% 0px -63% 0px",threshold:0});
      zones.forEach(([id]) => {const el = $(id); if(el) io.observe(el)});
    }
    activeNav(location.hash==="#places"?"places":location.hash==="#how-it-works"?"how":"plan");

    const share = $("share-plan");
    if (share) share.addEventListener("click", async () => {
      const selected = criteria();
      if (!validCriteria(selected)) {
        toast("Choose a future date and time before sharing your plan.");
        return;
      }
      const mood = document.querySelector("[data-vibe][aria-pressed=true]");
      const labels={all:"Anything goes",catchup:"A long catch-up",comfort:"Comfort food",fresh:"Something fresh"};
      const message = [
        "Our Mesa plan",
        "When: "+formatDate(selected.date)+" at "+selected.time+" UTC",
        "Table for: "+selected.guests,
        "Occasion: "+(labels[mood?.dataset.vibe]||"Anything goes"),
        "This is a plan, not a confirmed reservation."
      ].join("\n");
      try {
        if (navigator.share) {
          await navigator.share({title:"Our Mesa table plan",text:message});
          toast("Plan shared — see you at the table.");
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          toast("Your plan is copied. Send it to your people.");
        } else {
          $("copy-plan").click();
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        $("copy-plan").click();
      }
    });
  }
  document.addEventListener("DOMContentLoaded",initDining);
})();
