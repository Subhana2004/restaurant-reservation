"use strict";
/* Mesa 004 — the workspace layer.
   Hallium-style progression is derived from live actions, not fictional
   progress. The reservation API remains the only authority on bookings. */
(() => {
  const $ = (id) => document.getElementById(id);
  const byData = (name) => document.querySelectorAll("["+name+"]");
  const VIBE_NAMES = {
    all: "Anything goes", catchup: "A long catch-up",
    comfort: "Comfort food", fresh: "Something fresh"
  };
  let activeStage = "plan";
  const presetUserAction = () => {
    const party = Number($("guests").value);
    $("coach-guests").textContent = party + " " + (party === 1 ? "person" : "people");
  };
  const scrollTo = (id) => {
    const target = $(id);
    if (!target) return;
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  };
  function compareCount() {
    if ($("compare-tray").hidden) return 0;
    return $("open-compare").disabled ? 1 : 2;
  }
  function visibleCards() { return [...$("restaurant-grid").querySelectorAll(".restaurant-card")]; }
  function stageFromState() {
    const hasValidPlan = validCriteria(criteria());
    const cards = visibleCards();
    if (!hasValidPlan) return {pct:0,label:"Choose a future UTC moment",stage:"plan"};
    if (storedIds().length) return {pct:100,label:"Your tables are saved here",stage:"review"};
    if (compareCount()===2) return {pct:85,label:"Your shortlist is ready to compare",stage:"compare"};
    if (compareCount()===1 || Number($("favorite-count").textContent)>0) return {pct:65,label:"Great — you're narrowing it down",stage:"discover"};
    if (cards.length>0) return {pct:45,label:"Explore the places for your plan",stage:"discover"};
    return {pct:22,label:"Your plan is taking shape",stage:"plan"};
  }
  function updateTabs(stage) {
    byData("data-step").forEach((node) => {
      const isActive=node.dataset.step===stage;
      node.classList.toggle("is-active",isActive);
      const rank={plan:0,discover:1,compare:2,review:3};
      node.classList.toggle("is-done",rank[node.dataset.step]<rank[stage]);
      if (isActive) node.setAttribute("aria-current","step");
      else node.removeAttribute("aria-current");
    });
  }
  function syncCoach() {
    const input=criteria();
    const day=/^\d{4}-\d{2}-\d{2}$/.test(input.date) ? formatDate(input.date) : "Choose a date";
    const party=input.guests===1 ? "1 person" : input.guests+" people";
    $("coach-date").textContent=day;
    $("coach-time").textContent=input.time+" UTC";
    $("coach-guests").textContent=party;
    $("coach-plan").textContent=day+" · "+input.time+" UTC · "+party;
    $("coach-results").textContent=$("restaurant-count").textContent||"—";
    $("coach-shortlisted").textContent=$("favorite-count").textContent||"0";
    const selected=document.querySelector("[data-vibe][aria-pressed=true]");
    $("coach-mood").textContent=VIBE_NAMES[selected?.dataset.vibe]||VIBE_NAMES.all;
    const progress=stageFromState();
    $("rail-progress-text").textContent=progress.label;
    $("rail-progress-fill").style.width=progress.pct+"%";
    $("rail-progress-track")?.setAttribute("aria-label","Discovery progress: "+progress.pct+" percent");
    updateTabs(progress.stage);
    const c=compareCount();
    $("header-compare").disabled=c!==2;
    $("header-compare-count").textContent=String(c);
    let title,description,action;
    if (!validCriteria(input)) {
      title="Start with your moment";description="Pick a future date, time and group size to see what’s possible.";action="Choose date";activeStage="plan";
    } else if (!visibleCards().length) {
      title="Explore your options";description=state.preview?"The sample cards are ready to explore, even while bookings are unavailable.":"Try clearing a filter or changing the time to see more places.";action="Explore places";activeStage="discover";
    } else if (c<2) {
      title="Choose your favourites";description="Add two places to Compare to see capacity and availability side by side.";action="See restaurants";activeStage="discover";
    } else {
      title="Two good possibilities";description="You can compare them side by side and open either place for details.";action="Compare now";activeStage="compare";
    }
    $("coach-next-title").textContent=title;
    $("coach-next-description").textContent=description;
    $("coach-next-button").firstChild.textContent=action+" ";
    const mode=$("availability-note").closest(".availability-note")?.dataset.mode;
    $("coach-label").dataset.mode=mode||"live";
  }
  function sortCards() {
    const mode=$("sort-restaurants").value;
    const grid=$("restaurant-grid");
    const cards=visibleCards();
    if (mode==="recommended" || cards.length<2) return;
    const row=(card)=>state.restaurants.find(v=>v.id===Number(card.dataset.venueId));
    cards.sort((a,b)=>{
      const ra=row(a),rb=row(b);
      if (!ra || !rb) return 0;
      if (mode==="name") return ra.name.localeCompare(rb.name);
      if (mode==="capacity") return (rb.capacity||0)-(ra.capacity||0);
      if (mode==="seats") {
        const left=!state.preview&&Number.isFinite(ra.available_seats)?ra.available_seats:-1;
        const right=!state.preview&&Number.isFinite(rb.available_seats)?rb.available_seats:-1;
        return right-left;
      }
      return 0;
    });
    grid.replaceChildren(...cards);
  }
  const previousRender=renderRestaurants;
  renderRestaurants=function renderWorkspace() {
    previousRender();
    sortCards();
    syncCoach();
  };
  function actOnCoach() {
    switch(activeStage){
      case "plan":scrollTo("plan-fields");$("date").focus({preventScroll:true});break;
      case "compare":if(!$("open-compare").disabled)$("open-compare").click();break;
      default:scrollTo("places");$("restaurant-query").focus({preventScroll:true});
    }
  }
  function goToReservations(){
    $("open-reservations").click();
  }
  function initWorkspace() {
    byData("data-party").forEach(button=>button.addEventListener("click",()=>{
      const value=Number(button.dataset.party);
      if (!Number.isSafeInteger(value)||value<1||value>1000)return;
      $("guests").value=String(value);
      updateStepper();
      $("guests").dispatchEvent(new Event("change",{bubbles:true}));
      byData("data-party").forEach(x=>x.setAttribute("aria-pressed",String(x===button)));
      presetUserAction();
      toast("A table for "+value+" "+(value===1?"person":"people")+" — got it.");
    }));
    byData("data-open-tables").forEach(button=>button.addEventListener("click",goToReservations));
    byData("data-open-compare").forEach(button=>{
      if(button.id==="header-compare")return;
      button.addEventListener("click",()=>{
        if(!$("open-compare").disabled)$("open-compare").click();
        else{scrollTo("places");toast("Pick two restaurants using Add to compare.");}
      });
    });
    $("sort-restaurants").addEventListener("change",()=>{
      renderRestaurants();
      const labels={recommended:"Suggested order",capacity:"Larger tables",name:"A to Z",seats:"More seats"};
      toast("Sorted: "+(labels[$("sort-restaurants").value]||"Suggested"));
    });
    $("coach-next-button").addEventListener("click",actOnCoach);
    $("guests").addEventListener("input",()=>{
      presetUserAction();syncCoach();
    });
    for(const field of ["date","time","guests"]){
      $(field).addEventListener("change",syncCoach);
    }
    for(const filter of ["data-vibe","data-filter","data-quick-date","data-hero-plan"]){
      byData(filter).forEach(node=>node.addEventListener("click",()=>{
        queueMicrotask(syncCoach);
      }));
    }
    $("restaurant-grid").addEventListener("click",()=>queueMicrotask(syncCoach));
    $("clear-compare").addEventListener("click",()=>queueMicrotask(syncCoach));
    $("open-compare").addEventListener("click",()=>queueMicrotask(syncCoach));
    document.addEventListener("keydown",event=>{
      const typing=event.target?.matches("input,textarea,select,[contenteditable]");
      if(!typing && !document.querySelector("dialog[open]") && (event.ctrlKey||event.metaKey) && event.key.toLowerCase()==="k"){
        event.preventDefault();scrollTo("places");$("restaurant-query").focus({preventScroll:true});
      }
    });
    if("IntersectionObserver" in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          const onPlaces=entry.target.id==="places";
          for(const tab of byData("data-mobile-tab")){
            tab.classList.toggle("is-active",onPlaces?tab.dataset.mobileTab==="places":tab.dataset.mobileTab==="plan");
          }
        }
      },{rootMargin:"-24% 0px -62% 0px",threshold:0});
      observer.observe($("places"));
      observer.observe($("explore"));
    }
    syncCoach();
  }
  document.addEventListener("DOMContentLoaded",initWorkspace);
})();