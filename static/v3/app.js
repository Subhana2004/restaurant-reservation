"use strict";

const el = (selector) => document.querySelector(selector);
const ID_KEY = "mesa-reservation-ids-v1"; // Shared with the original site on this domain.
const catalogue = [
  {name: "Olive Garden Bistro", type: "MEDITERRANEAN", description: "Long lunches, lovely company and a taste of the sun.", image: "olive.svg", mood: "THE EASY AFTERNOON"},
  {name: "The Spice Table", type: "COMFORT FOOD", description: "The kind of food that makes everyone stay a little longer.", image: "spice.svg", mood: "A LITTLE SOMETHING BOLD"},
  {name: "Seaside Kitchen", type: "FRESH & COASTAL", description: "Fresh plates and warm conversations, no coast required.", image: "seaside.svg", mood: "SLOW EVENINGS AHEAD"}
];
const state = {restaurants: [], preview: false, filter: "all", requestId: 0, selected: null, selectedSlot: null, cancelledId: null};
const byId = (id) => document.getElementById(id);

function show(id, message) { const target = byId(id); target.textContent = message; target.hidden = false; }
function hide(id) { const target = byId(id); target.hidden = true; target.textContent = ""; }
function toast(message) { const target = byId("toast"); target.textContent = message; target.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => target.hidden = true, 3600); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char])); }
function storedIds() { try { const list = JSON.parse(localStorage.getItem(ID_KEY) || "[]"); return Array.isArray(list) ? [...new Set(list.filter((id) => Number.isSafeInteger(id) && id > 0))] : []; } catch { return []; } }
function updateCount() { const count = storedIds().length; byId("saved-count").textContent = count; byId("saved-count").hidden = !count; }
function setIds(list) { try { localStorage.setItem(ID_KEY, JSON.stringify([...new Set(list)])); } catch { toast("Browser storage is unavailable. Keep your confirmation ID."); } updateCount(); }
function todayUTC(plusDays = 0) { const day = new Date(); day.setUTCDate(day.getUTCDate() + plusDays); return day.toISOString().slice(0, 10); }
function criteria() { return {date: byId("date").value, time: byId("time").value, guests: Number(byId("guests").value)}; }
function futureSlot({date, time}) { const timestamp = Date.parse(`${date}T${time}:00Z`); return Number.isFinite(timestamp) && timestamp > Date.now(); }
function formatDate(date) { const day = new Date(`${date}T12:00:00Z`); return new Intl.DateTimeFormat("en", {weekday: "short", day: "numeric", month: "short", timeZone: "UTC"}).format(day); }
function validCriteria(value) { return Boolean(value.date && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && /^\d{2}:\d{2}$/.test(value.time) && Number.isSafeInteger(value.guests) && value.guests >= 1 && value.guests <= 1000 && futureSlot(value)); }
function explainError(response, json) { if (typeof json?.detail === "string") return json.detail; if (Array.isArray(json?.detail)) return json.detail.map((item) => item.msg).join(" · "); return `The request failed (${response.status}). Please try again.`; }
async function api(path, options) { const response = await fetch(path, options); let result = null; if (response.status !== 204) { try { result = await response.json(); } catch {} } if (!response.ok) { const error = new Error(explainError(response, result)); error.status = response.status; throw error; } return result; }
function openDialog(id) { const dialog = byId(id); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog = byId(id); if (dialog.open) dialog.close(); }
function seedPreview() { return catalogue.map((entry, index) => ({id: index + 1, name: entry.name, capacity: [20, 35, 50][index], available_seats: null, can_accommodate: false})); }
function announceAvailability(text, mode = "live") {
  const banner = byId("availability-note");
  if (!banner) return;
  banner.textContent = text;
  banner.closest(".availability-note")?.setAttribute("data-mode", mode);
}
function initScrollReveal() {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const items = document.querySelectorAll(".booking-heading, .finder-form, .places-heading, .restaurant-grid, .how-left, .how-step, .closing-inner");
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, {threshold: 0.07, rootMargin: "0px 0px 36px 0px"});
  items.forEach((item) => { item.classList.add("reveal-on-view"); observer.observe(item); });
  document.documentElement.classList.add("reveal-ready");
}
function restaurantInfo(row) { return catalogue.find((r) => r.name === row.name) || {type: "A GOOD PLACE", image: catalogue[(Math.max(row.id, 1) - 1) % catalogue.length].image, description: "A place to make some lovely memories.", mood: "COME AS YOU ARE"}; }

function renderRestaurants() {
  const query = byId("restaurant-query").value.trim().toLowerCase();
  const list = state.restaurants.filter((r) => r.name.toLowerCase().includes(query) && (state.filter !== "available" || (!state.preview && r.can_accommodate === true)));
  byId("restaurant-count").textContent = list.length.toString().padStart(2, "0");
  const grid = byId("restaurant-grid"); grid.setAttribute("aria-busy", "false");
  if (list.length === 0) { grid.innerHTML = '<div class="empty-results"><span aria-hidden="true">✳</span><strong>No tables this time.</strong><p>Try another restaurant, date, time or group size.</p></div>'; return; }
  grid.innerHTML = list.map((r, index) => {
    const info = restaurantInfo(r);
    const available = !state.preview && r.can_accommodate === true;
    const seats = Number.isFinite(r.available_seats) ? r.available_seats : null;
    const status = state.preview ? "PREVIEW ONLY" : available ? "TABLES OPEN" : "NOT ENOUGH SEATS";
    const remaining = state.preview ? "Booking unavailable" : seats === null ? "Check availability" : available ? `${seats} ${seats === 1 ? "seat" : "seats"} left` : "No space for this party";
    const action = state.preview ? "Booking not set up" : available ? "Save your seat" : "Try another time";
    return `<article class="restaurant-card"><div class="card-image"><img src="/v2-assets/${info.image}" alt="Illustration of a plated meal" width="600" height="390" loading="lazy"><span class="card-tag">${escapeHTML(info.mood)}</span><span class="card-number">0${index + 1}</span></div><div class="card-main"><div class="card-topline"><span>${escapeHTML(info.type)}</span><span>✳ A GOOD FIND</span></div><h3>${escapeHTML(r.name)}</h3><p>${escapeHTML(info.description)}</p><div class="card-status"><span>${status} · UP TO ${r.capacity} GUESTS</span><b class="${available ? "" : "unavailable"}">${remaining}</b></div><button class="card-action" type="button" data-book="${r.id}" ${available ? "" : "disabled"}>${action} <span aria-hidden="true">↗</span></button></div></article>`;
  }).join("");
}

async function loadRestaurants() {
  const input = criteria(); hide("system-message");
  if (!validCriteria(input)) { announceAvailability("Pick a future UTC date and time to check tables.", "unavailable"); show("system-message", "Choose a future date and time in UTC and enter between 1 and 1,000 guests."); return; }
  const requestId = ++state.requestId;
  announceAvailability("Looking for a lovely place for your people…", "live");
  byId("restaurant-grid").setAttribute("aria-busy", "true");
  byId("search-button").disabled = true;
  byId("search-button").firstChild.textContent =  "Checking tables ";
  try {
    const params = new URLSearchParams({date: input.date, time: input.time, guests: String(input.guests)});
    const restaurants = await api(`/restaurants?${params}`);
    if (requestId !== state.requestId) return;
    if (!Array.isArray(restaurants)) throw new Error("The restaurant service returned an unexpected response.");
    state.restaurants = restaurants; state.preview = false;
    const open = restaurants.filter((place) => place.can_accommodate).length;
    announceAvailability(`${open} of ${restaurants.length} places have room for ${input.guests} ${input.guests === 1 ? "guest" : "guests"} · ${formatDate(input.date)} at ${input.time} UTC`, open ? "live" : "unavailable");
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.restaurants = seedPreview(); state.preview = true;
    announceAvailability("Visual preview only · live booking is not available", "preview");
    const reason = error.status === 503 ? "Reservations haven't been connected to a persistent database yet." : "We couldn't reach the reservation service right now.";
    show("system-message", `${reason} These restaurant cards are a design preview only; bookings stay disabled until the API is working. ${error.status === 503 ? "The Vercel project needs DATABASE_URL and a redeployment." : "Please try again shortly."}`);
  } finally {
    if (requestId === state.requestId) { byId("search-button").disabled = false; byId("search-button").firstChild.textContent =  "Find my table "; renderRestaurants(); }
  }
}
function scheduleSearch() { clearTimeout(scheduleSearch.timer); scheduleSearch.timer = setTimeout(loadRestaurants, 170); }
function changeGuests(delta) { const field = byId("guests"); const number = Number(field.value) || 1; field.value = Math.min(1000, Math.max(1, number + delta)); updateStepper(); scheduleSearch(); }
function updateStepper() { const num = Number(byId("guests").value); byId("fewer").disabled = num <= 1; byId("more").disabled = num >= 1000; }

function beginBooking(id) {
  if (state.preview) return;
  const restaurant = state.restaurants.find((r) => r.id === id);
  if (!restaurant || !restaurant.can_accommodate) return;
  const selectedSlot = criteria(); if (!validCriteria(selectedSlot)) { toast("Select a future UTC date and time."); return; }
  state.selected = restaurant; state.selectedSlot = selectedSlot;
  byId("booking-title").innerHTML = 'It’s a <em>date.</em>';
  byId("booking-restaurant").textContent = `Confirm your table at ${restaurant.name}.`;
  byId("recap-date").textContent = formatDate(selectedSlot.date);
  byId("recap-time").textContent = `${selectedSlot.time} UTC`;
  byId("recap-guests").textContent = `${selectedSlot.guests} ${selectedSlot.guests === 1 ? "guest" : "guests"}`;
  const confirm = byId("confirm-booking"); confirm.disabled = false; confirm.hidden = false; confirm.firstChild.textContent = "Confirm my table ";
  byId("view-reservations-after-booking").hidden = true; hide("booking-feedback"); openDialog("booking-dialog");
}
async function confirmBooking() {
  if (!state.selected || !state.selectedSlot) return;
  const button = byId("confirm-booking"); button.disabled = true; button.firstChild.textContent = "Saving your seat "; hide("booking-feedback");
  try {
    const record = await api("/reservations", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({restaurant_id: state.selected.id, ...state.selectedSlot})});
    setIds([...storedIds(), record.id]);
    byId("booking-title").innerHTML = 'You’re <em>in!</em>';
    byId("booking-restaurant").textContent = `Your reservation at ${state.selected.name} is confirmed. Save confirmation #${record.id} to look it up later.`;
    button.hidden = true; byId("view-reservations-after-booking").hidden = false;
    toast(`Table confirmed · #${record.id}`);
    await loadRestaurants();
  } catch (error) { show("booking-feedback", error.message); button.disabled = false; button.firstChild.textContent = "Try again "; if (error.status === 409) await loadRestaurants(); }
}

async function renderReservations() {
  const list = byId("reservations-list"); hide("reservations-feedback");
  const ids = storedIds(); if (!ids.length) { list.innerHTML = '<div class="empty-results"><strong>Nothing planned. Yet.</strong><p>Find a restaurant and your reservation will live here.</p></div>'; return; }
  list.innerHTML = '<p class="muted">Finding your tables…</p>';
  const rows = await Promise.all(ids.map(async (id) => {try { return await api(`/reservations/${id}`); } catch (error) {return {id, error: error.message};}}));
  list.innerHTML = rows.map((r) => {
    if (r.error) return `<article class="reservation-entry"><h3>Confirmation #${r.id}</h3><p>${escapeHTML(r.error)}</p><button type="button" class="link-button" data-forget="${r.id}">Remove from this browser</button></article>`;
    const name = state.restaurants.find((place) => place.id === r.restaurant_id)?.name || catalogue[r.restaurant_id - 1]?.name || `Restaurant #${r.restaurant_id}`;
    return `<article class="reservation-entry"><h3>${escapeHTML(name)}</h3><p>#${r.id} · ${escapeHTML(r.date)} · ${escapeHTML(r.time)} UTC · ${r.guests} ${r.guests === 1 ? "guest" : "guests"}</p><span class="status ${r.status}">${r.status.toUpperCase()}</span><button type="button" class="link-button" ${r.status === "active" ? `data-cancel="${r.id}"` : `data-forget="${r.id}"`}>${r.status === "active" ? "Cancel this reservation ↗" : "Remove from this browser"}</button></article>`;
  }).join("");
}
async function lookup(event) {
  event.preventDefault(); hide("reservations-feedback"); const id = Number(byId("lookup-id").value);
  if (!Number.isSafeInteger(id) || id < 1) {show("reservations-feedback", "Enter a valid confirmation ID.");return;}
  try {await api(`/reservations/${id}`);setIds([...storedIds(), id]);byId("lookup-id").value = "";toast(`Found reservation #${id}`);await renderReservations();}
  catch (error) {show("reservations-feedback", error.message);}
}
async function confirmCancellation() {
  if (!state.cancelledId) return; const button = byId("confirm-cancel"); button.disabled = true; button.textContent = "Cancelling…"; hide("cancel-feedback");
  try {await api(`/reservations/${state.cancelledId}`, {method: "DELETE"});closeDialog("cancel-dialog");toast("Reservation cancelled. Seats are available again.");await Promise.all([renderReservations(), loadRestaurants()]);}
  catch (error) {show("cancel-feedback", error.message);}
  finally {button.disabled = false;button.textContent = "Cancel reservation";}
}
function init() {
  byId("year").textContent = new Date().getFullYear();
  initScrollReveal();
  document.addEventListener("keydown", (event) => {
    const current = document.activeElement;
    const isTyping = current?.matches("input, select, textarea, [contenteditable]");
    if (event.key === "/" && !isTyping && !event.ctrlKey && !event.metaKey && !document.querySelector("dialog[open]")) {
      event.preventDefault();
      byId("restaurant-query").focus();
    }
  });
  byId("date").value = todayUTC(1); byId("date").min = todayUTC(); updateCount(); updateStepper();
  byId("search-form").addEventListener("submit", (event) => {event.preventDefault();clearTimeout(scheduleSearch.timer);loadRestaurants();});
  ["date", "time", "guests"].forEach((id) => byId(id).addEventListener("change", () => {updateStepper();scheduleSearch();}));
  byId("fewer").addEventListener("click", () => changeGuests(-1)); byId("more").addEventListener("click", () => changeGuests(1));
  byId("restaurant-query").addEventListener("input", renderRestaurants);
  document.querySelector(".segmented").addEventListener("click", (event) => {const button = event.target.closest("[data-filter]");if (!button) return; state.filter = button.dataset.filter;document.querySelectorAll("[data-filter]").forEach((item) => {const active = item === button;item.classList.toggle("selected", active);item.setAttribute("aria-pressed", String(active));});renderRestaurants();});
  byId("restaurant-grid").addEventListener("click", (event) => {const button = event.target.closest("[data-book]");if (button) beginBooking(Number(button.dataset.book));});
  byId("confirm-booking").addEventListener("click", confirmBooking);
  byId("open-reservations").addEventListener("click", () => {openDialog("reservations-dialog");renderReservations();});
  byId("view-reservations-after-booking").addEventListener("click", () => {closeDialog("booking-dialog");openDialog("reservations-dialog");renderReservations();});
  byId("lookup-form").addEventListener("submit", lookup);
  byId("reservations-list").addEventListener("click", (event) => {const cancel = event.target.closest("[data-cancel]");const forget = event.target.closest("[data-forget]");if (cancel) {state.cancelledId = Number(cancel.dataset.cancel);hide("cancel-feedback");openDialog("cancel-dialog");}if (forget) {setIds(storedIds().filter((id) => id !== Number(forget.dataset.forget)));renderReservations();}});
  byId("keep-reservation").addEventListener("click", () => closeDialog("cancel-dialog"));
  byId("confirm-cancel").addEventListener("click", confirmCancellation);
  byId("find-another").addEventListener("click", () => {closeDialog("reservations-dialog");location.hash = "#explore";});
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog(button.dataset.close)));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {if (event.target === dialog) dialog.close();}));
  document.querySelectorAll("[data-quick-date]").forEach((button) => button.addEventListener("click", () => { const day = new Date(); const utcDay = day.getUTCDay(); if (button.dataset.quickDate === "tomorrow") { day.setUTCDate(day.getUTCDate() + 1); } else { const daysUntilSaturday = (6 - utcDay + 7) % 7; day.setUTCDate(day.getUTCDate() + (daysUntilSaturday || 7)); } byId("date").value = day.toISOString().slice(0, 10); scheduleSearch(); document.querySelectorAll("[data-quick-date]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); }));
  loadRestaurants();
}
document.addEventListener("DOMContentLoaded", init);
