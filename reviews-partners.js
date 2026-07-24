// ============================================================================
// REVIEWS & PARTNERS (public-facing) — reads approved/visible data from
// Firestore and renders it. Review submissions write with status:"pending"
// and never appear publicly until approved in the admin dashboard.
// ============================================================================
import { db } from "./firebase-config.js";
import {
  collection, addDoc, query, where, orderBy, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- helpers ---------- */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function starString(rating) {
  const full = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return full + empty;
}

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60]
  ];
  for (const [name, secs] of units) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val} ${name}${val > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

/* ---------- REVIEWS: fetch + render ---------- */
async function loadReviews() {
  const grid = document.getElementById("reviews-grid");
  const emptyState = document.getElementById("reviews-empty");
  const summaryAvg = document.getElementById("reviews-avg");
  const summaryCount = document.getElementById("reviews-count");
  const summaryStars = document.getElementById("reviews-summary-stars");
  if (!grid) return;

  try {
    const q = query(
      collection(db, "reviews"),
      where("status", "==", "approved"),
      where("hidden", "==", false)
    );
    const snap = await getDocs(q);
    let reviews = [];
    snap.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));

    // Pinned first, then newest first
    reviews.sort((a, b) => {
      if (!!b.pinned - !!a.pinned !== 0) return !!b.pinned - !!a.pinned;
      const at = a.createdAt?.toMillis?.() || 0;
      const bt = b.createdAt?.toMillis?.() || 0;
      return bt - at;
    });

    if (!reviews.length) {
      if (emptyState) emptyState.hidden = false;
      grid.innerHTML = "";
      if (summaryAvg) summaryAvg.textContent = "—";
      if (summaryCount) summaryCount.textContent = "0 reviews yet";
      return;
    }
    if (emptyState) emptyState.hidden = true;

    const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    if (summaryAvg) summaryAvg.textContent = avg.toFixed(1);
    if (summaryStars) summaryStars.textContent = starString(Math.round(avg));
    if (summaryCount) summaryCount.textContent = `Based on ${reviews.length} review${reviews.length !== 1 ? "s" : ""}`;

    grid.innerHTML = reviews.map((r, i) => `
      <article class="review-card reveal" data-tilt data-tilt-strength="4" style="transition-delay:${Math.min(i, 5) * 60}ms">
        ${r.pinned ? '<span class="review-pin" aria-label="Featured review">★ Featured</span>' : ""}
        <div class="review-stars" aria-hidden="true">${starString(r.rating || 0)}</div>
        <p class="review-message">&ldquo;${escapeHTML(r.message)}&rdquo;</p>
        <footer class="review-footer">
          <span class="review-avatar">${escapeHTML((r.name || "?").charAt(0).toUpperCase())}</span>
          <div>
            <cite class="review-name">${escapeHTML(r.name)}</cite>
            ${r.company ? `<span class="review-company">${escapeHTML(r.company)}</span>` : ""}
          </div>
        </footer>
      </article>
    `).join("");

    // Re-run reveal + tilt setup for newly injected cards
    if (window.initRevealObserver) window.initRevealObserver();
    if (window.initTiltCards) window.initTiltCards();
  } catch (err) {
    console.error("Failed to load reviews:", err);
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = "Reviews are temporarily unavailable.";
    }
  }
}

/* ---------- REVIEW SUBMISSION FORM ---------- */
function wireReviewForm() {
  const form = document.getElementById("review-form");
  if (!form) return;

  const starInputs = form.querySelectorAll(".star-input-btn");
  const ratingField = form.querySelector('input[name="rating"]');

  starInputs.forEach(btn => {
    btn.addEventListener("click", () => {
      const val = parseInt(btn.dataset.star, 10);
      ratingField.value = val;
      starInputs.forEach(b => {
        const active = parseInt(b.dataset.star, 10) <= val;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector(".form-submit");
    const successEl = document.getElementById("review-form-success");
    const errorEl = document.getElementById("review-form-error");
    if (errorEl) errorEl.classList.remove("show");

    const rating = parseInt(ratingField.value || "0", 10);
    if (!rating) {
      if (errorEl) {
        errorEl.textContent = "Please select a star rating.";
        errorEl.classList.add("show");
      }
      return;
    }
    if (form.website.value) return; // honeypot triggered — silently drop

    const data = {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
      rating,
      status: "pending",
      hidden: false,
      pinned: false,
      createdAt: serverTimestamp()
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting…"; }

    try {
      await addDoc(collection(db, "reviews"), data);
      form.hidden = true;
      if (successEl) successEl.classList.add("show");
    } catch (err) {
      console.error("Review submission failed:", err);
      if (errorEl) {
        errorEl.textContent = "Something went wrong submitting your review — please try again shortly.";
        errorEl.classList.add("show");
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Review"; }
    }
  });
}

/* ---------- PARTNERS: fetch + render ---------- */
async function loadPartners() {
  const track = document.getElementById("partners-track");
  if (!track) return;

  try {
    const q = query(
      collection(db, "partners"),
      where("visible", "==", true),
      orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    let partners = [];
    snap.forEach(doc => partners.push({ id: doc.id, ...doc.data() }));

    if (!partners.length) return; // section stays hidden via CSS :empty fallback

    const renderTile = (p) => {
      const inner = `
        <span class="partner-logo-icon" style="background:${escapeHTML(p.iconBg || "#0B2C4D")}">${escapeHTML(p.initials || "")}</span>
        <span class="partner-name">${escapeHTML(p.name)}</span>
      `;
      return p.url
        ? `<a class="partner-tile" href="${escapeHTML(p.url)}" target="_blank" rel="noopener sponsored" aria-label="${escapeHTML(p.name)} — opens in new tab">${inner}</a>`
        : `<span class="partner-tile" role="img" aria-label="${escapeHTML(p.name)}">${inner}</span>`;
    };

    // Duplicate set for seamless marquee loop
    track.innerHTML = partners.map(renderTile).join("") + partners.map(renderTile).join("");
  } catch (err) {
    console.error("Failed to load partners:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadReviews();
  wireReviewForm();
  loadPartners();
});
