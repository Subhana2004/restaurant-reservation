"use strict";
/* Mesa Table Studio: interactive discovery on top of the existing real booking API.
   No extra backend endpoints, artificial reservations, or invented availability. */
(() => {
  const FAVORITES_KEY = "mesa-favorite-places-v1";
  const TIMES = ["17:00", "19:00", "21:00"];
  const VIBES = {
    all: "Any kind of gathering",
    catchup: "A long catch-up",
    comfort: "Comfort food",
    fresh: "Something fresh"
  };
  const VIBE_VENUES = {
    catchup: ["Olive Garden Bistro"],
    comfort: ["The Spice Table"],
    fresh: ["Seaside Kitchen"]
  };
  let currentVibe = "all";
  let detailsId = null;
  let timeline = {};
  let timelineLoading = false;

  function favorites() {
    try {
      const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      return Array.isArray(data) ? data.filter((name) => typeof name === "string") : [];
    } catch {
      return [];
    }
  }
  function saveFavorites(items) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(items)]));
    } catch {
      toast("This browser cannot save your shortlist. You can still explore.");
    }
  }
  function matchesVibe(name) {
    return currentVibe === "all" || (VIBE_VENUES[currentVibe] || []).includes(name);
  }
  function syncTimeChips() {
    const selected = byId("time").value;
    document.querySelectorAll("[data-slot]").forEach((button) => {
      const active = button.dataset.slot === selected;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active", active);
      button.disabled = !futureSlot({date: byId("date").value, time: button.dataset.slot});
      button.title = button.disabled ? "That UTC slot is in the past" : "";
    });
  }
  function ticket() {
    const selection = criteria();
    const date = selection.date && Number.isFinite(Date.parse(selection.date + "T12:00:00Z"))
      ? formatDate(selection.date) : "Pick a date";
    const guests = Number.isSafeInteger(selection.guests) && selection.guests > 0
      ? selection.guests + " " + (selection.guests === 1 ? "person" : "people") : "your people";
    byId("plan-summary").textContent = date + " · " + selection.time + " UTC · " + guests;
    byId("plan-hint").textContent = VIBES[currentVibe] + " · Changes refresh real availability.";
    syncTimeChips();
  }
  function selectTime(time) {
    const selection = {date: byId("date").value, time};
    if (!futureSlot(selection)) {
      toast("Choose a future UTC time slot.");
      return;
    }
    byId("time").value = time;
    byId("time").dispatchEvent(new Event("change", {bubbles: true}));
    ticket();
  }
  function resetFilters() {
    currentVibe = "all";
    state.filter = "all";
    byId("restaurant-query").value = "";
    document.querySelectorAll("[data-vibe]").forEach((button) => {
      const active = button.dataset.vibe === "all";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === "all";
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    ticket();
    renderRestaurants();
  }
  function safeTimeCell(row, time) {
    const value = timeline[time];
    const selected = criteria().time === time;
    const valid = futureSlot({date: byId("date").value, time});
    if (!valid) return '<span class="slot-pill slot-disabled">' + time + ' · Past</span>';
    if (!value) return '<span class="slot-pill slot-disabled">' + time + (timelineLoading ? ' · Checking' : ' · —') + '</span>';
    const match = value.find((candidate) => candidate.id === row.id);
    if (!match) return '<span class="slot-pill slot-disabled">' + time + ' · —</span>';
    const open = match.can_accommodate === true;
    if (selected) return '<span class="slot-pill slot-current">' + time + ' · ' + (open ? "Selected" : "Full") + '</span>';
    if (!open) return '<span class="slot-pill slot-disabled">' + time + ' · Full</span>';
    return '<button type="button" class="slot-pill slot-open" data-card-time="' + time + '" aria-label="See availability for ' + time + ' UTC">' + time + ' ↗</button>';
  }
  function timelineMarkup(row) {
    if (state.preview) return '<div class="slot-matrix slot-preview">Live times appear once persistent storage is connected.</div>';
    return '<div class="slot-matrix"><span class="slot-heading">OTHER TIMES · UTC</span><div class="slot-pills">' +
      TIMES.map((time) => safeTimeCell(row, time)).join("") + '</div></div>';
  }

  const originalRender = renderRestaurants;
  renderRestaurants = function interactiveRender() {
    originalRender();
    byId("favorite-count").textContent = String(favorites().length);
    const grid = byId("restaurant-grid");
    const saved = new Set(favorites());
    let showing = 0;
    grid.querySelectorAll(".restaurant-card").forEach((card) => {
      const title = card.querySelector("h3");
      const row = state.restaurants.find((restaurant) => restaurant.name === title?.textContent);
      if (!row || !matchesVibe(row.name) || (state.filter === "saved" && !saved.has(row.name))) {
        card.remove();
        return;
      }
      showing++;
      card.dataset.venueId = String(row.id);
      const image = card.querySelector(".card-image");
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "favorite-button" + (saved.has(row.name) ? " is-saved" : "");
      favorite.dataset.favorite = String(row.id);
      favorite.setAttribute("aria-pressed", String(saved.has(row.name)));
      favorite.setAttribute("aria-label", (saved.has(row.name) ? "Remove " : "Save ") + row.name + (saved.has(row.name) ? " from shortlist" : " to shortlist"));
      favorite.textContent = saved.has(row.name) ? "♥" : "♡";
      image.append(favorite);
      const main = card.querySelector(".card-main");
      const open = !state.preview && row.can_accommodate === true;
      const seats = Number.isFinite(row.available_seats) ? Math.max(0, row.available_seats) : null;
      if (seats !== null && !state.preview && row.capacity > 0) {
        const meter = document.createElement("div");
        meter.className = "seat-meter";
        meter.setAttribute("aria-label", seats + " seats remaining out of " + row.capacity + " for this exact slot");
        const percentage = Math.min(100, Math.round(100 * seats / row.capacity));
        meter.innerHTML = '<span class="meter-track"><span class="meter-fill" style="width:' + percentage + '%"></span></span><span class="meter-label">' + seats + ' / ' + row.capacity + ' seats</span>';
        main.querySelector(".card-status").before(meter);
      }
      main.querySelector(".card-status").insertAdjacentHTML("afterend", timelineMarkup(row));
      const preview = document.createElement("button");
      preview.type = "button";
      preview.className = "details-button";
      preview.dataset.details = String(row.id);
      preview.textContent = "Explore this place ↗";
      main.querySelector(".card-action").before(preview);
      card.classList.toggle("is-bookable", open);
    });
    byId("restaurant-count").textContent = String(showing).padStart(2, "0");
    if (showing === 0 && state.restaurants.length) {
      grid.innerHTML = '<div class="empty-results studio-empty"><span aria-hidden="true">✳</span><strong>Not this moment.</strong><p>No matches for your choices. Try a different mood, time, or group size.</p><button class="button button-outline" type="button" data-reset-filters>Show all places ↗</button></div>';
    }
    ticket();
  };

  const originalLoad = loadRestaurants;
  loadRestaurants = async function interactiveLoad() {
    timeline = {};
    timelineLoading = true;
    const input = criteria();
    if (!validCriteria(input)) {
      state.restaurants = [];
      state.preview = true;
      timelineLoading = false;
      await originalLoad();
      renderRestaurants();
      return;
    }
    state.restaurants = [];
    state.preview = true;
    byId("restaurant-grid").innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    const pending = originalLoad();
    const sequence = state.requestId;
    await pending;
    if (state.requestId !== sequence || state.preview) {
      timelineLoading = false;
      return;
    }
    timeline[input.time] = state.restaurants;
    const alternatives = TIMES.filter((time) => time !== input.time && futureSlot({date: input.date, time}));
    await Promise.all(alternatives.map(async (time) => {
      const params = new URLSearchParams({date: input.date, time, guests: String(input.guests)});
      try {
        const rows = await api("/restaurants?" + params);
        if (state.requestId === sequence && Array.isArray(rows)) timeline[time] = rows;
      } catch {
        // Unknown is not full: keep an unavailable-to-verify dash in the UI.
      }
    }));
    if (state.requestId === sequence) {
      timelineLoading = false;
      renderRestaurants();
      if (detailsId !== null) renderDetails(detailsId);
    }
  };

  function renderDetails(id) {
    const restaurant = state.restaurants.find((row) => row.id === id);
    if (!restaurant) return;
    const info = restaurantInfo(restaurant);
    byId("details-title").textContent = restaurant.name;
    byId("details-description").textContent = info.description;
    byId("details-image").src = "/v2-assets/" + info.image;
    byId("details-image").alt = "Illustrated dish for " + restaurant.name;
    const availability = state.preview ? "Booking is unavailable until persistent storage is configured." :
      restaurant.can_accommodate ?
      restaurant.available_seats + " seats remaining · " + formatDate(criteria().date) + " at " + criteria().time + " UTC" :
      "Not enough seats for " + criteria().guests + " at " + criteria().time + " UTC.";
    byId("details-live").innerHTML = '<strong>' + escapeHTML(availability) + '</strong>' + timelineMarkup(restaurant);
    byId("details-book").disabled = !restaurant.can_accommodate || state.preview;
    byId("details-book").textContent = restaurant.can_accommodate && !state.preview ? "Save this table ↗" : "Try another time";
  }
  function openDetails(id) {
    if (!state.restaurants.some((row) => row.id === id)) return;
    detailsId = id;
    renderDetails(id);
    openDialog("details-dialog");
  }
  window.mesaOpenDetails = openDetails;
  function surpriseMe() {
    const cards = [...byId("restaurant-grid").querySelectorAll(".restaurant-card")];
    const available = cards.filter((card) => card.classList.contains("is-bookable"));
    const pool = available.length ? available : cards;
    if (!pool.length) {
      toast("No matches for these choices. Try clearing a filter.");
      byId("restaurant-query").focus();
      return;
    }
    const id = Number(pool[Math.floor(Math.random() * pool.length)].dataset.venueId);
    openDetails(id);
    toast(state.preview ? "Explore this sample place · live booking isn't configured yet" : "A little discovery, just for you ✳");
  }
  async function copyPlan() {
    const selection = criteria();
    if (!validCriteria(selection)) {
      toast("Choose a future UTC slot before copying your plan.");
      return;
    }
    const message = [
      "Mesa · our table plan",
      "When: " + formatDate(selection.date) + " at " + selection.time + " UTC",
      "Guests: " + selection.guests,
      "Mood: " + VIBES[currentVibe],
      "This is a plan, not a confirmed reservation."
    ].join("\n");
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        copied = true;
      } else {
        const input = document.createElement("textarea");
        input.value = message;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        copied = document.execCommand("copy");
        input.remove();
      }
    } catch {
      copied = false;
    }
    if (copied) {
      toast("Plan copied · share the details, then confirm the booking here.");
      const button = byId("copy-plan");
      button.firstChild.textContent = "Copied! ";
      clearTimeout(copyPlan.timer);
      copyPlan.timer = setTimeout(() => {button.firstChild.textContent = "Copy this plan ";}, 1900);
    } else {
      toast("Copy unavailable in this browser. You can select the plan summary.");
      byId("copy-plan").focus();
    }
  }
  function initStudio() {
    ticket();
    byId("copy-plan").addEventListener("click", copyPlan);
    byId("date").addEventListener("change", ticket);
    byId("time").addEventListener("change", ticket);
    byId("guests").addEventListener("change", ticket);
    byId("fewer").addEventListener("click", ticket);
    byId("more").addEventListener("click", ticket);
    document.querySelectorAll("[data-quick-date]").forEach((button) => button.addEventListener("click", ticket));
    document.querySelectorAll("[data-slot]").forEach((button) => button.addEventListener("click", () => selectTime(button.dataset.slot)));
    document.querySelectorAll("[data-vibe]").forEach((button) => button.addEventListener("click", () => {
      currentVibe = button.dataset.vibe;
      document.querySelectorAll("[data-vibe]").forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      renderRestaurants();
      toast(VIBES[currentVibe] + " · your shortlist is ready");
    }));
    byId("surprise-me").addEventListener("click", surpriseMe);
    byId("restaurant-grid").addEventListener("click", (event) => {
      const favorite = event.target.closest("[data-favorite]");
      if (favorite) {
        const row = state.restaurants.find((item) => item.id === Number(favorite.dataset.favorite));
        if (!row) return;
        const set = new Set(favorites());
        if (set.has(row.name)) set.delete(row.name); else set.add(row.name);
        saveFavorites([...set]);
        renderRestaurants();
        const sameButton = byId("restaurant-grid").querySelector('[data-favorite="' + row.id + '"]');
        if (sameButton) sameButton.focus(); else document.querySelector('[data-filter="saved"]').focus();
        return;
      }
      const details = event.target.closest("[data-details]");
      if (details) { openDetails(Number(details.dataset.details)); return; }
      const slot = event.target.closest("[data-card-time]");
      if (slot) { selectTime(slot.dataset.cardTime); return; }
      if (event.target.closest("[data-reset-filters]")) resetFilters();
    });
    byId("details-live").addEventListener("click", (event) => {
      const button = event.target.closest("[data-card-time]");
      if (!button) return;
      closeDialog("details-dialog");
      detailsId = null;
      selectTime(button.dataset.cardTime);
      toast("Checking that time for you ✳");
    });
    byId("details-book").addEventListener("click", () => {
      const id = detailsId;
      closeDialog("details-dialog");
      detailsId = null;
      if (id !== null) beginBooking(id);
    });
    byId("details-dialog").addEventListener("close", () => { detailsId = null; });
    byId("restaurant-grid").addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.activeElement?.matches("[data-favorite]")) document.activeElement.blur();
    });
  }
  document.addEventListener("DOMContentLoaded", initStudio);
})();
