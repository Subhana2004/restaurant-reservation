"use strict";
/* V7: genuine plan feedback from existing validated form values.
   This layer does not book, fabricate seats or write any reservation state. */
(() => {
  const $ = (id) => document.getElementById(id);
  let scheduled = false;

  function updateHeroPlan() {
    const dateNode = $("hero-plan-date");
    const partyNode = $("hero-plan-party");
    if (!dateNode || !partyNode) return;
    const date = $("date")?.value || "";
    const time = $("time")?.value || "";
    const guests = Number($("guests")?.value);
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !Number.isNaN(Date.parse(date + "T12:00:00Z"))
      ? formatDate(date)
      : "Choose a date";
    dateNode.textContent = displayDate +
      (/^\d{2}:\d{2}$/.test(time) ? " · " + time + " UTC" : "");
    partyNode.textContent =
      Number.isSafeInteger(guests) && guests >= 1 && guests <= 1000
        ? guests + (guests === 1 ? " person" : " people")
        : "Your people";
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateHeroPlan();
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    updateHeroPlan();
    for (const id of ["date", "time", "guests"]) {
      const node = $(id);
      if (!node) continue;
      node.addEventListener("change", scheduleUpdate);
      if (id === "guests") node.addEventListener("input", scheduleUpdate);
    }
    document.addEventListener("click", (event) => {
      if (event.target.closest(
        "[data-quick-date], [data-hero-plan], [data-party], [data-slot], #fewer, #more"
      )) scheduleUpdate();
    });
  });
})();
