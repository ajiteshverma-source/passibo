const demoRides = [
  {id:"r1", name:"Aarav S.", initials:"AS", vehicle:"car", from:"Rau", to:"Nehru Stadium", route:["Rau","Rajendra Nagar","Bhawarkua","Nehru Stadium"], departure:"Leaving in 8 min", seats:2, price:35, detour:4, overlap:91, rating:"4.9", note:"Route match"},
  {id:"r2", name:"Meera K.", initials:"MK", vehicle:"car", from:"Bijalpur", to:"Palasia", route:["Bijalpur","Rajiv Gandhi Square","Bhawarkua","Palasia"], departure:"Leaving in 15 min", seats:1, price:28, detour:6, overlap:84, rating:"4.8", note:"Small detour"},
  {id:"r3", name:"Kabir P.", initials:"KP", vehicle:"bike", from:"Rau", to:"Bhawarkua", route:["Rau","Rajendra Nagar","Bhawarkua"], departure:"Leaving now", seats:1, price:18, detour:2, overlap:78, rating:"4.7", note:"Near your route"}
];
let mode = "find";
const $ = (id) => document.getElementById(id);
const normal = s => (s || "").trim().toLowerCase().replace(/\s+/g," ");
function showToast(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>toast.classList.remove("show"), 3000);
}
function setMode(next) {
  mode = next;
  document.querySelectorAll(".mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  document.querySelectorAll(".offer-only").forEach(el=>el.classList.toggle("hidden",mode!=="offer"));
  $("form-title").textContent = mode==="find" ? "Where are you headed?" : "Where are you travelling?";
  $("search-label").textContent = mode==="find" ? "Find route matches" : "Preview my route matches";
  $("results-title").textContent = mode==="find" ? "Suggested matches" : "Potential passengers";
  renderResults();
}
document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));

function routeScore(ride, origin, destination, vehicle) {
  const routeText = ride.route.map(normal);
  const o = normal(origin).split(",")[0], d = normal(destination).split(",")[0];
  const originMatch = routeText.some(p=>p.includes(o)||o.includes(p)) ? 1 : (ride.from.toLowerCase().includes(o)||o.includes(ride.from.toLowerCase()) ? 1 : 0);
  const destMatch = routeText.some(p=>p.includes(d)||d.includes(p)) || normal(ride.to).includes(d) || d.includes(normal(ride.to)) ? 1 : 0;
  const vehicleMatch = vehicle==="any" || ride.vehicle===vehicle;
  // Transparent demo heuristic: route endpoint matches + vehicle compatibility + lower detour.
  let score = Math.round(ride.overlap * .55 + (originMatch?20:0) + (destMatch?20:0) - ride.detour*.8);
  if (!vehicleMatch) score -= 35;
  return {score:Math.max(0,Math.min(99,score)), vehicleMatch, originMatch, destMatch};
}
function renderResults() {
  const origin = $("from").value, destination = $("to").value, vehicle = $("vehicle").value;
  const list = $("results"); list.innerHTML = "";
  let rides = demoRides.map(r=>({...r, match:routeScore(r,origin,destination,vehicle)}))
    .filter(r=>r.match.score>=35 && r.match.vehicleMatch)
    .sort((a,b)=>b.match.score-a.match.score);
  if (mode==="offer") rides = rides.map(r=>({...r, price:Math.max(15,Math.round(r.price*.75)), note:"Potential route overlap"}));
  $("match-count").textContent = `${rides.length} DEMO MATCH${rides.length===1?"":"ES"}`;
  if (!rides.length) {
    list.innerHTML = `<div class="empty-state">No demo routes match those inputs yet. Try Rau → Bhawarkua or Bijalpur → Bhawarkua.</div>`;
    return;
  }
  rides.forEach(ride=>{
    const card=document.createElement("article"); card.className="ride-card";
    const vehicleLabel=ride.vehicle==="car"?"Car":"Bike";
    card.innerHTML=`
      <div>
        <div class="ride-top"><div class="avatar">${ride.initials}</div><div><div class="ride-name">${ride.name}</div><div class="ride-meta">${vehicleLabel} · ★ ${ride.rating} · Demo profile</div></div></div>
        <div class="route-line"><span class="place">${escapeHtml(ride.from)}</span><span class="arrow">→</span><span class="place">${escapeHtml(ride.to)}</span></div>
        <div class="ride-tags"><span class="tag">${ride.departure}</span><span class="tag">${ride.seats} seat${ride.seats>1?"s":""} shown</span><span class="tag good">${ride.detour} min detour</span></div>
      </div>
      <div class="ride-price"><strong>₹${ride.price}</strong><span>illustrative estimate</span></div>
      <div class="ride-action"><span class="score">${ride.match.score}% route-fit · ${ride.note}</span><button class="request-btn" data-id="${ride.id}">${mode==="find"?"Preview request":"Preview match"}</button></div>`;
    card.querySelector("button").addEventListener("click",()=>showToast("Demo only — no booking was sent. Live rides are disabled pending legal approval."));
    list.appendChild(card);
  });
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("search-btn").addEventListener("click",()=>{
  if (!normal($("from").value)||!normal($("to").value)){showToast("Enter both pickup and destination to preview matches.");return;}
  renderResults(); $("results-section").scrollIntoView({behavior:"smooth",block:"start"});
});
["from","to","vehicle"].forEach(id=>$(id).addEventListener("change",renderResults));
setMode("find");
