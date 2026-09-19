"use strict";
/* Mesa / Compare Club. Adds a real side-by-side decision layer to sample venue
   discovery. No invented reviews, venue amenities, or booking confirmations. */
(() => {
  const compared = [];
  const $ = (id) => document.getElementById(id);
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compareStatus = (row) => {
    if (state.preview) return {name:"Preview only",className:"offline",detail:"Database-backed availability is not connected."};
    const seats = Number.isFinite(row.available_seats) ? Math.max(0,row.available_seats) : null;
    if (row.can_accommodate === true) {
      return {name:"Room for your group",className:"yes",detail:seats===null?"Available for the chosen time":seats+" of "+row.capacity+" seats remaining"};
    }
    return {name:"Try a different time",className:"no",detail:seats===null?"Availability not confirmed":seats+" seats remaining for this slot"};
  };
  function currentRow(id) { return state.restaurants.find((r) => r.id === id); }
  function titleFor(id) { return currentRow(id)?.name || catalogue[id-1]?.name || "Restaurant "+id; }
  function refreshTray() {
    const tray = $("compare-tray");
    const count = compared.length;
    tray.hidden = count===0;
    $("compare-count").textContent = count===2 ? "Two good options. One great plan." : "One place on your list";
    $("compare-names").textContent = compared.map(titleFor).join("  +  ") || "Choose the places you want to compare";
    $("open-compare").disabled = count!==2;
    $("open-compare").textContent = count===2 ? "Compare places ↗" : "Add one more place";
    document.body.classList.toggle("has-compare-tray",count>0);
    if ($("compare-dialog").open) renderComparison();
  }
  const oldRender = renderRestaurants;
  renderRestaurants = function renderWithCompare() {
    oldRender();
    const grid = $("restaurant-grid");
    grid.querySelectorAll(".restaurant-card").forEach((card) => {
      const id = Number(card.dataset.venueId);
      if (!Number.isSafeInteger(id) || !currentRow(id)) return;
      const main = card.querySelector(".card-main");
      const details = main.querySelector(".details-button");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "compare-card-button" + (compared.includes(id) ? " is-selected" : "");
      button.dataset.comparePlace = String(id);
      button.setAttribute("aria-pressed", String(compared.includes(id)));
      button.setAttribute("aria-label", (compared.includes(id) ? "Remove " : "Compare ") + titleFor(id) + (compared.includes(id) ? " from comparison" : " with another place"));
      button.innerHTML = '<span aria-hidden="true" class="compare-card-icon">'+(compared.includes(id)?"✓":"+")
        +'</span><span>'+(compared.includes(id)?"Added to compare":"Add to compare")+'</span>';
      if (details) details.before(button); else main.append(button);
      card.classList.toggle("is-compared", compared.includes(id));
    });
    refreshTray();
  };
  function toggle(id) {
    if (!currentRow(id)) return;
    const position = compared.indexOf(id);
    if (position!==-1) {
      compared.splice(position,1);
      toast("Removed "+titleFor(id)+" from comparison");
    } else if (compared.length===2) {
      toast("Compare two places at a time. Remove one to swap it.");
      $("open-compare").focus();
      return;
    } else {
      compared.push(id);
      toast("Added "+titleFor(id)+". "+(compared.length===1?"Pick one more to compare.":"Ready to compare your places."));
    }
    renderRestaurants();
    const match = $("restaurant-grid").querySelector('[data-compare-place="'+id+'"]');
    if (match) match.focus(); else if (!$("compare-tray").hidden) $("open-compare").focus();
  }
  function renderComparison() {
    const input = criteria();
    $("compare-subtitle").textContent = validCriteria(input)
      ? formatDate(input.date)+" · "+input.time+" UTC · "+input.guests+" "+(input.guests===1?"guest":"guests")
      : "Choose a valid future date and time to see availability.";
    $("compare-list").innerHTML = compared.map((id,index) => {
      const row = currentRow(id);
      if (!row) {
        return '<article class="compare-place"><strong>'+escapeHTML(titleFor(id))+'</strong><p>Refresh the table search to compare this place.</p></article>';
      }
      const info = restaurantInfo(row);
      const status = compareStatus(row);
      const canBook = !state.preview && row.can_accommodate === true && validCriteria(input);
      return '<article class="compare-place">'+
        '<div class="compare-place-art"><img src="/v2-assets/'+escapeHTML(info.image)+'" width="600" height="390" loading="lazy" alt="Illustration for '+escapeHTML(row.name)+'">'+
        '<span>OPTION '+String(index+1).padStart(2,"0")+'</span></div>'+
        '<div class="compare-place-body"><p class="compare-cuisine">'+escapeHTML(info.type)+'</p><h3>'+escapeHTML(row.name)+'</h3>'+
        '<p class="compare-description">'+escapeHTML(info.description)+'</p>'+
        '<div class="compare-data"><span>SPACE FOR</span><strong>'+escapeHTML(row.capacity)+' guests</strong></div>'+
        '<div class="compare-data"><span>YOUR TIME</span><strong>'+escapeHTML(input.time)+' UTC</strong></div>'+
        '<div class="compare-data"><span>AVAILABILITY</span><strong class="compare-availability '+status.className+'">'+escapeHTML(status.name)+'</strong></div>'+
        '<p class="compare-detail">'+escapeHTML(status.detail)+'</p>'+
        '<button type="button" class="compare-book" data-compare-book="'+id+'" '+(canBook?"":"disabled")+'>'+
        (canBook?"Book this table ↗":"Booking unavailable")+'</button>'+
        '<button type="button" class="compare-more" data-compare-details="'+id+'">Explore restaurant ↗</button>'+
        '</div></article>';
    }).join("");
  }
  function openComparison() {
    if (compared.length!==2) return;
    renderComparison();
    openDialog("compare-dialog");
  }
  function initCompare() {
    const grid = $("restaurant-grid");
    grid.addEventListener("click", (event) => {
      const button=event.target.closest("[data-compare-place]");
      if(button) toggle(Number(button.dataset.comparePlace));
    });
    $("open-compare").addEventListener("click", openComparison);
    $("clear-compare").addEventListener("click", () => {
      compared.splice(0);
      closeDialog("compare-dialog");
      renderRestaurants();
      toast("Comparison cleared. Your saved favourites are still here.");
    });
    $("compare-list").addEventListener("click", (event) => {
      const booking=event.target.closest("[data-compare-book]");
      if (booking) {
        const id=Number(booking.dataset.compareBook);
        const row=currentRow(id);
        if(!row || state.preview || !row.can_accommodate) return;
        closeDialog("compare-dialog");
        beginBooking(id);
        return;
      }
      const details=event.target.closest("[data-compare-details]");
      if(details) {
        const id=Number(details.dataset.compareDetails);
        closeDialog("compare-dialog");
        if (currentRow(id)) window.mesaOpenDetails?.(id);
      }
    });
    $("date").addEventListener("change",()=>{if($("compare-dialog").open) renderComparison()});
    $("time").addEventListener("change",()=>{if($("compare-dialog").open) renderComparison()});
    $("guests").addEventListener("change",()=>{if($("compare-dialog").open) renderComparison()});
    document.querySelectorAll("[data-hero-plan]").forEach(button=>{
      button.addEventListener("click",()=>{
        let date=todayUTC(1),guests=2;
        if(button.dataset.heroPlan==="weekend"){
          const day=new Date(),until=(6-day.getUTCDay()+7)%7;
          day.setUTCDate(day.getUTCDate()+(until||7));
          date=day.toISOString().slice(0,10);guests=4;
        }
        $("date").value=date;
        $("guests").value=guests;
        $("time").value="19:00";
        updateStepper();
        // One change event lets the existing debounced search and live ticket
        // update together without firing three competing API requests.
        $("date").dispatchEvent(new Event("change",{bubbles:true}));
        document.getElementById("explore").scrollIntoView({behavior:reducedMotion()?"auto":"smooth",block:"start"});
        toast((guests===2?"Tomorrow's table for two":"Weekend table for four")+" · check your options below");
      });
    });
  }
  document.addEventListener("DOMContentLoaded",initCompare);
})();
