// Shared helpers for the website mockups: source badges (D28) and the "x of 5" meter (D26).
// <span data-src="shared|public|sim"></span> becomes a badge; <span class="meter" data-n="3"></span> becomes 5 dots.
(function (root) {
  const ICONS = {
    // Two people: results shared by writers.
    shared: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="4" cy="3.6" r="1.9" fill="currentColor"/><path d="M0.6 10.4c0-2.2 1.5-3.6 3.4-3.6s3.4 1.4 3.4 3.6z" fill="currentColor"/><circle cx="8.6" cy="4.2" r="1.6" fill="currentColor" opacity="0.6"/><path d="M6.6 10.4c0.3-1.9 1.1-3 2.4-3 1.6 0 2.5 1.3 2.5 3z" fill="currentColor" opacity="0.6"/></svg>',
    // A flask: real public experiments.
    public: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.4 1h3.2M5 1v3.4L1.8 9.6c-0.4 0.7 0.1 1.4 0.9 1.4h6.6c0.8 0 1.3-0.7 0.9-1.4L7 4.4V1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.2 8h5.6l0.9 1.6c0.2 0.4 0 0.7-0.5 0.7H2.8c-0.5 0-0.7-0.3-0.5-0.7z" fill="currentColor"/></svg>',
    // A gear: made by our simulator.
    sim: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0.8l1 1.4 1.7-0.4 0.3 1.7 1.6 0.7-0.7 1.6 0.9 1.5-1.6 0.8-0.1 1.7-1.7-0.2-1.1 1.3-1.2-1.2-1.7 0.3-0.2-1.7-1.6-0.7 0.7-1.6-0.9-1.5 1.6-0.8 0.1-1.7 1.7 0.2z" fill="currentColor"/><circle cx="6" cy="6" r="1.8" fill="#fff"/></svg>',
  };
  const LABELS = { shared: "Shared by writers", public: "Real public tests", sim: "Simulated" };

  function decorate(scope) {
    const doc = scope || document;
    doc.querySelectorAll("[data-src]").forEach((el) => {
      const kind = el.dataset.src;
      el.classList.add("src", kind);
      el.innerHTML = ICONS[kind] + (el.dataset.label || LABELS[kind]);
    });
    doc.querySelectorAll(".meter[data-n]").forEach((el) => {
      const n = Number(el.dataset.n), of = Number(el.dataset.of || 5);
      el.innerHTML = Array.from({ length: of }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
    });
  }
  root.Mockup = { decorate, ICONS, LABELS };
})(typeof window !== "undefined" ? window : globalThis);
