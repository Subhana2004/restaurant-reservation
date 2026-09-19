"use strict";
const $ = (selector) => document.querySelector(selector);
const state = {restaurants:[],selected:null,filter:"all",lastRequest:0,cancelId:null};
const storageKey = "mesa-reservation-ids-v1";
const names = ["Olive Garden Bistro","The Spice Table","Seaside Kitchen"];
const descriptions = ["A little Mediterranean sunshine, any day of the week.","Comforting spices and familiar flavours, beautifully served.","Fresh flavours and easy evenings by the imaginary coast."];
const palettes = ["a","b","c"];
const icons = [
  '<svg viewBox="0 0 260 180" aria-hidden="true"><ellipse cx="128" cy="151" rx="93" ry="16" fill="#bd8d7055"/><ellipse cx="130" cy="89" rx="101" ry="73" fill="#fff9e8"/><ellipse cx="130" cy="89" rx="82" ry="56" fill="#e8b771"/><path d="M72 89q46-51 93 2t-67 17q15-70 91-28" fill="none" stroke="#f9d186" stroke-width="12" stroke-linecap="round"/><path d="M98 60q-15 18 3 25m48 13q28-18 17-26m-45 38q18-20 27-6" fill="none" stroke="#517b42" stroke-width="8" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 260 180" aria-hidden="true"><ellipse cx="129" cy="151" rx="95" ry="16" fill="#6c753c33"/><ellipse cx="130" cy="91" rx="99" ry="70" fill="#fbf2dd"/><ellipse cx="130" cy="91" rx="80" ry="53" fill="#b75b2c"/><path d="M77 89q29-49 59-8t45 6q-30 50-93 22" fill="none" stroke="#eaa74d" stroke-width="19" stroke-linecap="round"/><circle cx="97" cy="73" r="8" fill="#4b703b"/><circle cx="158" cy="111" r="8" fill="#4b703b"/><circle cx="153" cy="70" r="6" fill="#f3dd93"/></svg>',
  '<svg viewBox="0 0 260 180" aria-hidden="true"><ellipse cx="130" cy="152" rx="95" ry="15" fill="#8a453b33"/><ellipse cx="130" cy="89" rx="103" ry="69" fill="#fff9ed"/><ellipse cx="130" cy="89" rx="81" ry="50" fill="#e9ceac"/><path d="M71 90q31-44 59 0t60-2q-18 47-59 33t-60-31" fill="none" stroke="#e68e65" stroke-width="24" stroke-linecap="round"/><path d="M88 70q13 9 29-2m45 37q16-14 26-1m-77 13q20 4 35-9" stroke="#54794a" stroke-width="8" fill="none" stroke-linecap="round"/></svg>'
];
function ids(){try{const value=JSON.parse(localStorage.getItem(storageKey)||"[]");return Array.isArray(value)?[...new Set(value.filter(x=>Number.isSafeInteger(x)&&x>0))]:[]}catch{return []}}
function saveIds(items){try{localStorage.setItem(storageKey,JSON.stringify([...new Set(items)]))}catch{toast("Browser storage is unavailable. Save your confirmation ID.")}updateCount()}
function updateCount(){const n=ids().length;$("#book-count").hidden=!n;$("#book-count").textContent=n}
function slot(){return{date:$("#date").value,time:$("#time").value,guests:Number($("#guests").value)}}
function utcDate(offset=1){const d=new Date();d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}
function future(s){return new Date(s.date+"T"+s.time+":00Z").getTime()>Date.now()}
function toast(message){const t=$("#toast");t.textContent=message;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,3800)}
function errorText(response,data){if(response.status===409)return "Those seats were just booked. Please choose a different time or restaurant.";if(typeof data?.detail==="string")return data.detail;if(Array.isArray(data?.detail))return data.detail.map(x=>x.msg).join("; ");return "Something went wrong. Please try again."}
async function request(url,options){const response=await fetch(url,options);let data=null;if(response.status!==204){try{data=await response.json()}catch{}}if(!response.ok)throw new Error(errorText(response,data));return data}
function showError(selector,message){$(selector).textContent=message;$(selector).hidden=false}
function clearError(selector){$(selector).hidden=true;$(selector).textContent=""}
function dialogOpen(selector){const dialog=$(selector);if(!dialog.open)dialog.showModal()}
function dialogClose(selector){const dialog=$(selector);if(dialog.open)dialog.close()}
function htmlEscape(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(){
 const q=$("#query").value.trim().toLowerCase();let r=state.restaurants.filter(x=>x.name.toLowerCase().includes(q));if(state.filter==="available")r=r.filter(x=>x.can_accommodate);
 $("#results-count").textContent=r.length+" "+(r.length===1?"PLACE":"PLACES")+" TO EXPLORE";
 $("#restaurant-list").setAttribute("aria-busy","false");
 if(!r.length){$("#restaurant-list").innerHTML='<div class="empty"><span aria-hidden="true">✳</span><h3>No tables found.</h3><p>Try a different name, date, time or party size.</p></div>';return}
 $("#restaurant-list").innerHTML=r.map(x=>{
 const index=Math.max(0,names.indexOf(x.name)),can=x.can_accommodate!==false,available=x.available_seats??x.capacity;
 return '<article class="card"><div class="card-art '+palettes[index]+'"><span class="card-kicker">✳ THE GOOD STUFF</span>'+icons[index]+'</div><div class="card-body"><h3>'+htmlEscape(x.name)+'</h3><p class="card-meta">'+descriptions[index]+'</p><div class="capacity"><span>Capacity: '+x.capacity+' guests</span><strong class="'+(can?'':'full')+'">'+(can?available+' seats left':'Fully booked for your party')+'</strong></div><button type="button" class="card-cta" data-book="'+x.id+'" '+(can?'':'disabled')+'>'+ (can?"Save a seat":"Try another time")+' <span aria-hidden="true">↗</span></button></div></article>'
 }).join("");
}
async function loadRestaurants(){
 const s=slot();clearError("#list-error");if(!s.date||!future(s)){showError("#list-error","Please choose a future UTC date and time.");return}
 const req=++state.lastRequest;$("#restaurant-list").setAttribute("aria-busy","true");
 try{const p=new URLSearchParams({date:s.date,time:s.time,guests:s.guests});const data=await request("/restaurants?"+p);if(req!==state.lastRequest)return;state.restaurants=data;render()}
 catch(err){if(req!==state.lastRequest)return;showError("#list-error",err.message+" Refresh the page to retry.");$("#restaurant-list").innerHTML='<div class="empty"><h3>We couldn’t load the restaurants.</h3><p>Please check the connection and try again.</p><button class="pill dark" type="button" id="retry">Try again ↗</button></div>';$("#restaurant-list").setAttribute("aria-busy","false")}
}
function openBooking(id){const item=state.restaurants.find(x=>x.id===id);if(!item)return;state.selected=item;const s=slot();if(!future(s)){toast("Choose a future UTC date and time.");return}$("#book-name").textContent=item.name;$("#book-date").textContent=s.date;$("#book-time").textContent=s.time+" UTC";$("#book-guests").textContent=s.guests+" "+(s.guests===1?"guest":"guests");$("#book-title").innerHTML='Save your <em>seat.</em>';$("#confirm-book").hidden=false;$("#confirm-book").disabled=false;$("#confirm-book").textContent="Confirm reservation ↗";clearError("#book-error");dialogOpen("#book-dialog")}
async function confirmBooking(){
 if(!state.selected)return;const button=$("#confirm-book");button.disabled=true;button.textContent="Saving your seat…";clearError("#book-error");
 try{const s=slot();const data=await request("/reservations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({restaurant_id:state.selected.id,...s})});saveIds([...ids(),data.id]);$("#book-title").innerHTML='It’s <em>confirmed!</em>';$("#book-name").textContent="Your confirmation ID is #"+data.id+". Keep it to retrieve your booking.";button.hidden=true;toast("Reservation confirmed · #"+data.id);await loadRestaurants()}
 catch(err){showError("#book-error",err.message);button.disabled=false;button.textContent="Try again ↗";await loadRestaurants()}
}
async function renderSaved(){
 const list=$("#saved-list");clearError("#saved-error");const saved=ids();if(!saved.length){list.innerHTML='<div class="empty"><h3>No tables saved yet.</h3><p>Book a table or look up a confirmation ID above.</p></div>';return}
 list.innerHTML='<div class="skeleton" style="height:130px"></div>';
 const results=await Promise.all(saved.map(async id=>{try{return await request("/reservations/"+id)}catch(e){return{id,error:e.message}}}));
 list.innerHTML=results.map(r=>{if(r.error)return '<div class="saved-card"><h3>Confirmation #'+r.id+'</h3><p>'+htmlEscape(r.error)+'</p><button data-forget="'+r.id+'">Remove from this browser</button></div>';const name=names[r.restaurant_id-1]||"Restaurant #"+r.restaurant_id;return '<article class="saved-card"><h3>'+htmlEscape(name)+'</h3><p>Confirmation #'+r.id+' · '+r.date+' · '+r.time+' UTC · '+r.guests+' guests</p><span class="status-badge '+r.status+'">'+r.status.toUpperCase()+'</span><br>'+(r.status==="active"?'<button data-cancel="'+r.id+'">Cancel reservation ↗</button>':'<button data-forget="'+r.id+'">Remove from this browser</button>')+'</article>'}).join("")
}
async function lookup(event){event.preventDefault();const value=Number($("#lookup-id").value);if(!Number.isSafeInteger(value)||value<1)return;clearError("#saved-error");try{await request("/reservations/"+value);saveIds([...ids(),value]);$("#lookup-id").value="";await renderSaved();toast("Confirmation #"+value+" found")}catch(e){showError("#saved-error",e.message)}}
async function cancel(){const button=$("#cancel-book");button.disabled=true;button.textContent="Cancelling…";clearError("#cancel-error");try{await request("/reservations/"+state.cancelId,{method:"DELETE"});dialogClose("#cancel-dialog");toast("Reservation cancelled. Seats are available again.");await Promise.all([renderSaved(),loadRestaurants()])}catch(e){showError("#cancel-error",e.message)}finally{button.disabled=false;button.textContent="Yes, cancel"}}
function init(){
 $("#date").value=utcDate(1);$("#date").min=utcDate(0);$("#year").textContent=new Date().getFullYear();updateCount();
 $("#search-form").addEventListener("submit",e=>{e.preventDefault();loadRestaurants()});$("#query").addEventListener("input",render);
 $(".filters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;state.filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>{const active=x===b;x.classList.toggle("active",active);x.setAttribute("aria-pressed",String(active))});render()});
 $("#restaurant-list").addEventListener("click",e=>{const b=e.target.closest("[data-book]");if(b)openBooking(Number(b.dataset.book));if(e.target.closest("#retry"))loadRestaurants()});
 $("#confirm-book").addEventListener("click",confirmBooking);$("#close-book").addEventListener("click",()=>dialogClose("#book-dialog"));
 $("#open-saved").addEventListener("click",()=>{dialogOpen("#saved-dialog");renderSaved()});$("#close-saved").addEventListener("click",()=>dialogClose("#saved-dialog"));
 $("#lookup-form").addEventListener("submit",lookup);
 $("#saved-list").addEventListener("click",e=>{const cancel=e.target.closest("[data-cancel]"),forget=e.target.closest("[data-forget]");if(cancel){state.cancelId=Number(cancel.dataset.cancel);dialogOpen("#cancel-dialog")}if(forget){saveIds(ids().filter(id=>id!==Number(forget.dataset.forget)));renderSaved()}});
 $("#cancel-book").addEventListener("click",cancel);$("#keep-book").addEventListener("click",()=>dialogClose("#cancel-dialog"));
 $("#explore-more").addEventListener("click",()=>{dialogClose("#saved-dialog");location.hash="#discover"});
 document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
 loadRestaurants();
}
document.addEventListener("DOMContentLoaded",init);
