/**
 * Lead form filler — PASTE INTO THE BROWSER CONSOLE on a page that shows the
 * financing form (/<lang>/financiranje, or any /<lang>/vozila/<slug>) or the
 * insurance form (/<lang>/osiguranje).
 *
 * It finds the form, fills every field it recognises from DATA below, and
 * stops there — it never submits, so you can look the values over and press
 * the WhatsApp button yourself.
 *
 * Edit DATA and re-paste to fill a different enquiry. Empty values are left
 * alone rather than blanked, so the vehicle fields a car page pre-fills survive.
 */
(() => {
  const DATA = {
    // Shared by both forms
    ime: "Bebic",
    telefon: "017674705962",
    email: "slobebebic@gmail.com",
    godiste: "2023",
    napomena: "",

    // Financing form only
    vozilo: "Skoda Kodiaq 2.0TDI*L&K*DSG*4M*VIR*PAN*LED*AHK*360*VOL",
    cijena: "32990",
    kredit: "",
    rok: "12", // select: 12 / 24 / 36 / 48 / 60 / 72 / 84

    // Insurance form only
    marka: "Skoda",
    model: "Kodiaq 2.0TDI*L&K*DSG*4M*VIR*PAN*LED*AHK*360*VOL",
    // The <option> labels are translated, so this one is an index:
    // 0 = AO, 1 = Kasko, 2 = both. A label string works too.
    tip: 2,
    registracija: "",
    km: "",
    pocetak: "", // type="date" — needs YYYY-MM-DD
  };

  const FIELDS = {
    financing: ["ime", "telefon", "email", "vozilo", "godiste", "cijena", "kredit", "rok", "napomena"],
    insurance: ["ime", "telefon", "email", "marka", "model", "godiste", "tip", "registracija", "km", "pocetak", "napomena"],
  };

  /** React keeps its own copy of the value on the node, so a plain
   *  `el.value = x` can be reverted on the next render and the events below
   *  never fire. Going through the prototype's setter updates React's tracker
   *  too. These forms read FormData on submit rather than holding state, so
   *  today either would work — this keeps working if that ever changes. */
  function setValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Selects match on index, then value, then visible label — the insurance
   *  type options carry translated labels as their values. */
  function setSelect(el, wanted) {
    const options = [...el.options];
    const match =
      (typeof wanted === "number" ? options[wanted] : null) ??
      options.find((o) => o.value === String(wanted)) ??
      options.find(
        (o) => o.textContent.trim().toLowerCase() === String(wanted).trim().toLowerCase(),
      );
    if (!match) return false;
    setValue(el, match.value);
    return true;
  }

  /** Match on a field unique to each form. `marka`/`model` would be ambiguous:
   *  the problem report form on /prijavi-problem carries those too. */
  const MARKER = { financing: '[name="vozilo"]', insurance: '[name="tip"]' };

  // A vehicle page carries a contact form as well, so pick the first form that
  // is actually one of ours rather than the first form on the page.
  const found = [...document.querySelectorAll("form")]
    .map((form) => ({
      form,
      kind: Object.keys(MARKER).find((k) => form.querySelector(MARKER[k])) ?? null,
    }))
    .filter((c) => c.kind);

  if (found.length === 0) {
    console.error("No financing or insurance form here — open /financiranje, /osiguranje or a vehicle page.");
    return;
  }
  if (found.length > 1) console.warn(`${found.length} matching forms — filling the first.`);

  const { form, kind } = found[0];

  const report = [];
  for (const name of FIELDS[kind]) {
    const el = form.elements.namedItem(name);
    const value = DATA[name];
    if (!el) {
      report.push({ field: name, value: "", status: "no such field" });
    } else if (value === "" || value == null) {
      report.push({ field: name, value: el.value, status: "left as-is" });
    } else if (el instanceof HTMLSelectElement) {
      const ok = setSelect(el, value);
      report.push({ field: name, value: el.value, status: ok ? "filled" : "no matching option" });
    } else {
      setValue(el, String(value));
      report.push({ field: name, value: el.value, status: "filled" });
    }
  }

  form.scrollIntoView({ behavior: "smooth", block: "center" });
  console.log(`Filled the ${kind} form — review it, then submit yourself.`);
  console.table(report);
})();
