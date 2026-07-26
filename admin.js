// ============================================================================
// ADMIN DASHBOARD — protected by Firebase Authentication. Only an account
// you create yourself in the Firebase console can log in here (see
// FIREBASE_SETUP.md). This page is noindex'd and disallowed in robots.txt,
// but real protection comes from Auth + Firestore rules, not obscurity.
// ============================================================================
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginCard = document.getElementById("admin-login-card");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("admin-login-error");
const userEmailLabel = document.getElementById("admin-user-email");

/* ---------- AUTH ---------- */
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginCard.hidden = true;
    dashboard.hidden = false;
    userEmailLabel.textContent = user.email;
    loadMessages();
    loadReviews();
    loadPartners();
  } else {
    loginCard.hidden = false;
    dashboard.hidden = true;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.remove("show");
  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = "Login failed — check your email and password.";
    loginError.classList.add("show");
  }
});

document.getElementById("admin-logout-btn").addEventListener("click", () => signOut(auth));

/* ---------- TABS ---------- */
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`admin-panel-${tab.dataset.tab}`).classList.add("active");
  });
});

/* ---------- helpers ---------- */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
function fmtDate(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ============================================================
   REVIEWS MODERATION
   ============================================================ */
let allReviews = [];
let currentFilter = "all";

async function loadReviews() {
  const list = document.getElementById("admin-reviews-list");
  list.innerHTML = "<p class='admin-empty'>Loading…</p>";
  try {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allReviews = [];
    snap.forEach(d => allReviews.push({ id: d.id, ...d.data() }));
    renderReviews();
  } catch (err) {
    list.innerHTML = `<p class="admin-empty">Failed to load reviews: ${escapeHTML(err.message)}</p>`;
  }
}

function renderReviews() {
  const list = document.getElementById("admin-reviews-list");
  const emptyEl = document.getElementById("admin-reviews-empty");
  const filtered = currentFilter === "all" ? allReviews : allReviews.filter(r => r.status === currentFilter);

  if (!filtered.length) {
    list.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  list.innerHTML = filtered.map(r => `
    <div class="admin-review-row" data-id="${r.id}">
      <div>
        <span class="admin-status-badge admin-status-${r.status}">${escapeHTML(r.status)}</span>
        ${r.hidden ? '<span class="admin-status-badge" style="background:#eee;color:#666;">hidden</span>' : ""}
        ${r.pinned ? '<span class="admin-status-badge" style="background:rgba(46,158,255,.15);color:var(--color-primary);">pinned</span>' : ""}
        <p style="margin-top:var(--space-2);"><strong>${escapeHTML(r.name)}</strong>${r.company ? ` — ${escapeHTML(r.company)}` : ""} · ${"★".repeat(r.rating || 0)}${"☆".repeat(5 - (r.rating || 0))}</p>
        <textarea class="admin-review-edit-area" data-field="message">${escapeHTML(r.message)}</textarea>
        <div class="admin-review-meta">
          <span>${fmtDate(r.createdAt)}</span>
          ${r.email ? `<span>${escapeHTML(r.email)}</span>` : ""}
        </div>
      </div>
      <div class="admin-actions">
        <button class="admin-btn admin-btn-approve" data-action="approve">Approve</button>
        <button class="admin-btn admin-btn-reject" data-action="reject">Reject</button>
        <button class="admin-btn" data-action="save">Save Edit</button>
        <button class="admin-btn" data-action="toggle-hide">${r.hidden ? "Unhide" : "Hide"}</button>
        <button class="admin-btn" data-action="toggle-pin">${r.pinned ? "Unpin" : "Pin"}</button>
        <button class="admin-btn admin-btn-delete" data-action="delete">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".admin-review-row").forEach(row => {
    const id = row.dataset.id;
    const review = allReviews.find(r => r.id === id);
    row.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleReviewAction(id, review, btn.dataset.action, row));
    });
  });
}

async function handleReviewAction(id, review, action, row) {
  const ref = doc(db, "reviews", id);
  try {
    if (action === "approve") await updateDoc(ref, { status: "approved" });
    else if (action === "reject") await updateDoc(ref, { status: "rejected" });
    else if (action === "toggle-hide") await updateDoc(ref, { hidden: !review.hidden });
    else if (action === "toggle-pin") await updateDoc(ref, { pinned: !review.pinned });
    else if (action === "save") {
      const newMessage = row.querySelector('[data-field="message"]').value;
      await updateDoc(ref, { message: newMessage });
    } else if (action === "delete") {
      if (!confirm("Delete this review permanently? This can't be undone.")) return;
      await deleteDoc(ref);
    }
    await loadReviews();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

document.querySelectorAll("[data-status-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-status-filter]").forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    currentFilter = btn.dataset.statusFilter;
    renderReviews();
  });
});

/* ============================================================
   PARTNERS MANAGEMENT
   ============================================================ */
let allPartners = [];

async function loadPartners() {
  const list = document.getElementById("admin-partners-list");
  list.innerHTML = "<p class='admin-empty'>Loading…</p>";
  try {
    const q = query(collection(db, "partners"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    allPartners = [];
    snap.forEach(d => allPartners.push({ id: d.id, ...d.data() }));
    renderPartners();
  } catch (err) {
    list.innerHTML = `<p class="admin-empty">Failed to load partners: ${escapeHTML(err.message)}</p>`;
  }
}

function renderPartners() {
  const list = document.getElementById("admin-partners-list");
  const emptyEl = document.getElementById("admin-partners-empty");
  if (!allPartners.length) {
    list.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  list.innerHTML = allPartners.map((p, i) => `
    <div class="admin-partner-row" data-id="${p.id}">
      <span class="partner-logo-icon" style="background:${escapeHTML(p.iconBg || "#0B2C4D")}">${escapeHTML(p.initials || "")}</span>
      <div>
        <strong>${escapeHTML(p.name)}</strong>
        ${p.url ? `<div style="font-size:var(--fs-xs);color:var(--color-ink-subtle);">${escapeHTML(p.url)}</div>` : ""}
        <div style="font-size:var(--fs-xs);color:var(--color-ink-subtle);">${p.visible ? "Visible" : "Hidden"} · order ${p.order}</div>
      </div>
      <div class="admin-actions" style="flex-direction:row;">
        <button class="admin-btn" data-action="up" ${i === 0 ? "disabled" : ""}>&uarr;</button>
        <button class="admin-btn" data-action="down" ${i === allPartners.length - 1 ? "disabled" : ""}>&darr;</button>
        <button class="admin-btn" data-action="toggle-visible">${p.visible ? "Hide" : "Show"}</button>
        <button class="admin-btn admin-btn-delete" data-action="delete">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".admin-partner-row").forEach((row, i) => {
    const id = row.dataset.id;
    row.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handlePartnerAction(id, btn.dataset.action, i));
    });
  });
}

async function handlePartnerAction(id, action, index) {
  const partner = allPartners.find(p => p.id === id);
  const ref = doc(db, "partners", id);
  try {
    if (action === "toggle-visible") {
      await updateDoc(ref, { visible: !partner.visible });
    } else if (action === "delete") {
      if (!confirm(`Delete "${partner.name}" permanently?`)) return;
      await deleteDoc(ref);
    } else if (action === "up" && index > 0) {
      const other = allPartners[index - 1];
      await updateDoc(doc(db, "partners", other.id), { order: partner.order });
      await updateDoc(ref, { order: other.order });
    } else if (action === "down" && index < allPartners.length - 1) {
      const other = allPartners[index + 1];
      await updateDoc(doc(db, "partners", other.id), { order: partner.order });
      await updateDoc(ref, { order: other.order });
    }
    await loadPartners();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

document.getElementById("admin-add-partner-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("partner-name").value.trim();
  const initials = document.getElementById("partner-initials").value.trim().toUpperCase();
  const iconBg = document.getElementById("partner-color").value;
  const url = document.getElementById("partner-url").value.trim();
  const maxOrder = allPartners.reduce((max, p) => Math.max(max, p.order || 0), 0);

  try {
    await addDoc(collection(db, "partners"), {
      name, initials, iconBg, url, visible: true, order: maxOrder + 1
    });
    e.target.reset();
    document.getElementById("partner-color").value = "#0B2C4D";
    await loadPartners();
  } catch (err) {
    alert("Failed to add partner: " + err.message);
  }
});

/* ============================================================
   MESSAGES (contact form + booking quick-contact + exit-intent)
   ============================================================ */
let allMessages = [];
let currentMessageFilter = "all";

async function loadMessages() {
  const list = document.getElementById("admin-messages-list");
  list.innerHTML = "<p class='admin-empty'>Loading…</p>";
  try {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allMessages = [];
    snap.forEach(d => allMessages.push({ id: d.id, ...d.data() }));
    renderMessages();
  } catch (err) {
    list.innerHTML = `<p class="admin-empty">Failed to load messages: ${escapeHTML(err.message)}</p>`;
  }
}

const sourceLabels = {
  "contact-page": "Contact Form",
  "booking-modal": "Quick Contact",
  "exit-intent": "Checklist Signup"
};

function renderMessages() {
  const list = document.getElementById("admin-messages-list");
  const emptyEl = document.getElementById("admin-messages-empty");
  const filtered = allMessages.filter(m => {
    if (currentMessageFilter === "all") return true;
    if (currentMessageFilter === "unread") return !m.read;
    return m.source === currentMessageFilter;
  });

  if (!filtered.length) {
    list.innerHTML = "";
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  list.innerHTML = filtered.map(m => `
    <div class="admin-review-row" data-id="${m.id}" style="${m.read ? "" : "border-left: 3px solid var(--color-accent);"}">
      <div>
        <span class="admin-status-badge" style="background:rgba(46,158,255,.12);color:var(--color-primary);">${escapeHTML(sourceLabels[m.source] || m.source || "Unknown")}</span>
        ${!m.read ? '<span class="admin-status-badge admin-status-pending">unread</span>' : ""}
        <p style="margin-top:var(--space-2);"><strong>${escapeHTML(m.name || "(no name)")}</strong>${m.company ? ` — ${escapeHTML(m.company)}` : ""}</p>
        <p style="font-size:var(--fs-sm); margin-top:var(--space-1);">${escapeHTML(m.email || "(no email)")}${m.website ? " · " + escapeHTML(m.website) : ""}${m.budget ? " · " + escapeHTML(m.budget) : ""}</p>
        ${m.message ? `<p style="margin-top:var(--space-2); font-size:var(--fs-sm); white-space:pre-wrap;">${escapeHTML(m.message)}</p>` : ""}
        <div class="admin-review-meta"><span>${fmtDate(m.createdAt)}</span></div>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" data-action="toggle-read">${m.read ? "Mark Unread" : "Mark Read"}</button>
        <button class="admin-btn admin-btn-delete" data-action="delete">Delete</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".admin-review-row").forEach(row => {
    const id = row.dataset.id;
    const msg = allMessages.find(m => m.id === id);
    row.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleMessageAction(id, msg, btn.dataset.action));
    });
  });
}

async function handleMessageAction(id, msg, action) {
  const ref = doc(db, "contacts", id);
  try {
    if (action === "toggle-read") await updateDoc(ref, { read: !msg.read });
    else if (action === "delete") {
      if (!confirm("Delete this message permanently?")) return;
      await deleteDoc(ref);
    }
    await loadMessages();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

document.querySelectorAll("[data-message-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-message-filter]").forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    currentMessageFilter = btn.dataset.messageFilter;
    renderMessages();
  });
});

/* ============================================================
   ONE-CLICK PARTNER SEEDING (from the reference screenshot)
   ============================================================ */
const STARTER_PARTNERS = [
  { name: "Creative Brains", initials: "CB", iconBg: "#0B2C4D", url: "" },
  { name: "uSERP", initials: "U", iconBg: "#7C3AED", url: "" },
  { name: "Coupler.io", initials: "C", iconBg: "#22B8C4", url: "https://coupler.io" },
  { name: "LVREALTORS", initials: "LVR", iconBg: "#1E3A8A", url: "" },
  { name: "Alpine Credits", initials: "AC", iconBg: "#22C55E", url: "" },
  { name: "cloudtalk.io", initials: "C", iconBg: "#2563EB", url: "https://cloudtalk.io" },
  { name: "Netcoins", initials: "N", iconBg: "#111827", url: "" },
  { name: "Gore", initials: "G", iconBg: "#DC2626", url: "" },
  { name: "Winden", initials: "W", iconBg: "#8B5CF6", url: "" },
  { name: "Bragg", initials: "B", iconBg: "#1E3A8A", url: "" }
];

document.getElementById("admin-seed-partners-btn").addEventListener("click", async () => {
  const statusEl = document.getElementById("admin-seed-status");
  statusEl.textContent = "Checking for existing entries…";
  try {
    const existingSnap = await getDocs(collection(db, "partners"));
    const existingNames = new Set();
    existingSnap.forEach(d => existingNames.add((d.data().name || "").toLowerCase()));

    const toAdd = STARTER_PARTNERS.filter(p => !existingNames.has(p.name.toLowerCase()));
    if (!toAdd.length) {
      statusEl.textContent = "All 10 already exist — nothing to add.";
      return;
    }

    let baseOrder = allPartners.reduce((max, p) => Math.max(max, p.order || 0), 0);
    for (const p of toAdd) {
      baseOrder += 1;
      await addDoc(collection(db, "partners"), { ...p, visible: true, order: baseOrder });
    }
    statusEl.textContent = `Added ${toAdd.length} partner${toAdd.length !== 1 ? "s" : ""}.`;
    await loadPartners();
  } catch (err) {
    statusEl.textContent = "Failed: " + err.message;
  }
});
