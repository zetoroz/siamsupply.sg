/* Order builder, shared by the front page and every brand page.
   Expects SHOW_PRICES, WA and PRODUCTS to be defined before this loads. */
const $ = (s, r = document) => r.querySelector(s);
const nf = new Intl.NumberFormat("en-SG");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const order = new Map();   // sku -> pieces

const LINE_ORDER = ["Hong Thai", "Poy-Sian", "Pim Saen", "Siang Pure", "Pastel",
                    "Happy Noz", "Snake Brand", "Takabb", "Namman Muay",
                    "Gumgig Pean", "Kamillosan"];

function groupLines() {
  const g = new Map();
  PRODUCTS.forEach(p => {
    if (!g.has(p.line)) g.set(p.line, []);
    g.get(p.line).push(p);
  });
  return [...g.entries()].sort(
    (a, b) => (LINE_ORDER.indexOf(a[0]) + 1 || 99) - (LINE_ORDER.indexOf(b[0]) + 1 || 99));
}

/* The listings are pre-rendered into the HTML by export_site.py so the
   product names exist without JS. This only wires up the counters. */
function syncStats() {
  const skus = $("#statSkus"), lines = $("#statLines");
  if (!skus || !lines) return;        // brand pages carry no stat ledger
  skus.firstChild.textContent = PRODUCTS.length;
  lines.firstChild.textContent = new Set(PRODUCTS.map(p => p.line)).size;
}

function step(sku, dir) {
  const p = PRODUCTS.find(x => x.sku === sku);
  if (!p) return;
  const cur = order.get(sku) || 0;
  /* First click jumps to the trade minimum, then tops up one supplier pack
     at a time. Dropping below the minimum clears the line, so an order that
     cannot be placed cannot be built. */
  let next;
  if (dir > 0) next = cur === 0 ? p.moqPcs : cur + p.pack;
  else         next = (cur - p.pack) < p.moqPcs ? 0 : cur - p.pack;

  if (next === 0) order.delete(sku); else order.set(sku, next);

  const el = [...document.querySelectorAll(".var")].find(v => v.dataset.sku === sku);
  const v = el.querySelector("[data-v]");
  v.innerHTML = `${nf.format(next)}<em>pcs</em>`;
  v.classList.toggle("on", next > 0);
  el.classList.toggle("picked", next > 0);

  updatePills();
  updateTray();
}

/* a collapsed line still has to show what is in it */
function updatePills() {
  document.querySelectorAll(".listing").forEach(l => {
    const n = [...l.querySelectorAll(".var")]
      .filter(v => order.has(v.dataset.sku)).length;
    const pill = l.querySelector("[data-pill]");
    pill.textContent = n;
    pill.classList.toggle("on", n > 0);
  });
}

function orderText() {
  const rows = [...order.entries()].map(([sku, qty]) => {
    const p = PRODUCTS.find(x => x.sku === sku);
    return `• ${p.name} (${sku}) - ${nf.format(qty)} pcs`;
  });
  const pcs = [...order.values()].reduce((a, b) => a + b, 0);
  return [
    "Trade enquiry, Siam Supply Co.",
    "",
    ...rows,
    "",
    `${rows.length} line${rows.length > 1 ? "s" : ""}, ${nf.format(pcs)} pcs total.`,
    "Please quote against current landed cost.",
  ].join("\n");
}

function updateTray() {
  const n = order.size;
  const pcs = [...order.values()].reduce((a, b) => a + b, 0);

  $("#traySum").textContent = n === 0 ? "No lines yet" : `${n} line${n > 1 ? "s" : ""}`;
  $("#trayPcs").textContent = n === 0 ? "" : `${nf.format(pcs)} pieces`;
  $("#traySend").href = n === 0
    ? `https://wa.me/${WA}`
    : `https://wa.me/${WA}?text=${encodeURIComponent(orderText())}`;

  $("#tray").classList.toggle("up", n > 0);
  document.body.style.paddingBottom = n > 0 ? "var(--tray)" : "0";
}

document.addEventListener("click", e => {
  const q = e.target.closest(".qty button");
  if (q) { step(q.closest(".var").dataset.sku, Number(q.dataset.step)); return; }

  const h = e.target.closest(".lhead");
  if (h) {
    const open = h.getAttribute("aria-expanded") === "true";
    h.setAttribute("aria-expanded", String(!open));
    h.parentElement.querySelector(".vars").classList.toggle("open", !open);
    return;
  }

  const f = e.target.closest(".filters button");
  if (f) {
    document.querySelectorAll(".filters button")
      .forEach(x => x.setAttribute("aria-pressed", String(x === f)));
    const k = f.dataset.filter;
    document.querySelectorAll(".listing").forEach(l => {
      l.classList.toggle("hide", !(k === "all" || l.dataset.cats.split(" ").includes(k)));
    });
  }
});

$("#trayClear") && $("#trayClear").addEventListener("click", () => {
  order.clear();
  document.querySelectorAll(".var").forEach(v => {
    v.classList.remove("picked");
    const c = v.querySelector("[data-v]");
    c.innerHTML = "0<em>pcs</em>";
    c.classList.remove("on");
  });
  updatePills();
  updateTray();
});

syncStats();
updateTray();
$("#waPlain").href = `https://wa.me/${WA}?text=${encodeURIComponent("Hi, I'd like a trade quotation from Siam Supply Co.")}`;
$("#waTel").href = `https://wa.me/${WA}`;
