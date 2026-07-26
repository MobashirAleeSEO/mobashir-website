// ============================================================================
// FORMS — contact form, booking-modal quick-contact form, and exit-intent
// checklist form all write directly to Firestore. No third-party email
// service involved, so there's nothing else to configure — if Firebase is
// set up correctly, these work immediately.
//
// All three write into the "contacts" collection so every inquiry — however
// it was submitted — shows up together in the admin dashboard's Messages tab.
// ============================================================================
import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function wireValidation(form) {
  const requiredFields = form.querySelectorAll("[required]");
  const validateField = (field) => {
    const group = field.closest(".form-group");
    const valid = field.checkValidity();
    if (group) group.classList.toggle("has-error", !valid);
    return valid;
  };
  requiredFields.forEach(field => field.addEventListener("blur", () => validateField(field)));
  return { requiredFields, validateField };
}

async function submitContact(form, { source, extraFields = {} }) {
  const submitBtn = form.querySelector(".form-submit");
  const originalLabel = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

  const fd = new FormData(form);
  const payload = {
    name: fd.get("name") || "",
    email: fd.get("email") || "",
    company: fd.get("company") || "",
    website: fd.get("website") || "",
    budget: fd.get("budget") || "",
    message: fd.get("message") || "",
    source,
    read: false,
    createdAt: serverTimestamp(),
    ...extraFields
  };

  try {
    await addDoc(collection(db, "contacts"), payload);
    return true;
  } catch (err) {
    console.error("Contact submission failed:", err);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
    return false;
  }
}

/* ---------- Main contact page form (#contact-form) ---------- */
function wireContactPageForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const { requiredFields, validateField } = wireValidation(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website && form.website.value && form.querySelector('[name="website"]').type === "text") {
      // honeypot — silently drop, but keep UX identical to a real submit
    }
    let allValid = true;
    requiredFields.forEach(f => { if (!validateField(f)) allValid = false; });
    if (!allValid) {
      const firstError = form.querySelector(".has-error .form-input, .has-error .form-textarea");
      if (firstError) firstError.focus();
      return;
    }

    const errorBanner = document.getElementById("form-error-banner");
    if (errorBanner) errorBanner.classList.remove("show");

    const ok = await submitContact(form, { source: "contact-page" });
    if (ok) {
      const card = form.closest(".form-card");
      const success = document.getElementById("form-success");
      if (card && success) {
        card.classList.add("submitted");
        success.classList.add("show");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
    } else if (errorBanner) {
      errorBanner.textContent = "Something went wrong — please email mobashiralee.tech@gmail.com directly instead.";
      errorBanner.classList.add("show");
    }
  });
}

/* ---------- Booking-modal quick-contact form + exit-intent checklist form ---------- */
function wireLeadForms() {
  document.querySelectorAll(".lead-form").forEach(form => {
    const { requiredFields, validateField } = wireValidation(form);
    const isChecklist = form.getAttribute("aria-label") === "Get the free audit checklist";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (form.querySelector('[name="botcheck"]')?.value) return; // honeypot

      let allValid = true;
      requiredFields.forEach(f => { if (!validateField(f)) allValid = false; });
      if (!allValid) return;

      const ok = await submitContact(form, {
        source: isChecklist ? "exit-intent" : "booking-modal"
      });

      if (ok) {
        form.classList.add("submitted");
        const successEl = form.parentElement.querySelector(".lead-form-success");
        if (successEl) {
          successEl.classList.add("show");
          successEl.setAttribute("tabindex", "-1");
          successEl.focus();
        }
      } else {
        const submitBtn = form.querySelector(".form-submit");
        if (submitBtn) submitBtn.textContent = "Try again — or email mobashiralee.tech@gmail.com";
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireContactPageForm();
  wireLeadForms();
});
