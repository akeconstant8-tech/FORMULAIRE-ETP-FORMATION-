(function () {
  "use strict";

  const SESSION_KEY = "etp_admin_session";
  const STORAGE_KEY = "etp_inscriptions_v1";

  if (localStorage.getItem(SESSION_KEY) !== "active") {
    window.location.href = "login.html";
  }

  const listEl = document.getElementById("list");
  const logoutBtn = document.getElementById("logoutBtn");
  const searchInput = document.getElementById("searchInput");

  const statTotal = document.getElementById("statTotal");
  const statNew = document.getElementById("statNew");
  const statConfirmed = document.getElementById("statConfirmed");
  const statPending = document.getElementById("statPending");

  function getInscriptions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function saveInscriptions(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function statusOf(item) {
    const hasRequiredData = item && item.parentNom && item.eleveNom && item.parentWhatsapp && item.niveau;
    return hasRequiredData ? "confirmed" : "pending";
  }

  function updateStats(items) {
    const total = items.length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const newlyAdded = items.filter((x) => {
      if (!x.createdAt) return false;
      const d = new Date(x.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const confirmed = items.filter((x) => statusOf(x) === "confirmed").length;
    const pending = total - confirmed;

    statTotal.textContent = String(total);
    statNew.textContent = String(newlyAdded);
    statConfirmed.textContent = String(confirmed);
    statPending.textContent = String(pending);
  }

  function getSearchableText(item) {
    return [
      item.eleveNom,
      item.parentNom,
      item.parentWhatsapp,
      item.niveau,
      item.etablissement
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function render(items) {
    updateStats(items);

    if (!items.length) {
      listEl.innerHTML = `<div class="empty">Aucune inscription enregistrée.</div>`;
      return;
    }

    const query = (searchInput?.value || "").trim().toLowerCase();
    const filtered = query
      ? items.filter((ins) => getSearchableText(ins).includes(query))
      : items.slice();

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty">Aucun résultat pour votre recherche.</div>`;
      return;
    }

    listEl.innerHTML = `
      <table class="inscriptions-table">
        <thead>
          <tr>
            <th>Élève</th>
            <th>Formation / Niveau</th>
            <th>Téléphone</th>
            <th>Parent</th>
            <th>Date d'inscription</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .slice()
            .reverse()
            .map((ins) => {
              const status = statusOf(ins);
              const statusLabel = status === "confirmed" ? "Confirmé" : "En attente";
              return `
                <tr>
                  <td>
                    <div class="student">${ins.eleveNom || "Élève sans nom"}</div>
                    <div class="meta-line">${ins.sexe || "-"} • ${ins.etablissement || "-"}</div>
                  </td>
                  <td>
                    <div>${ins.niveau || "-"}</div>
                    <div class="meta-line">${Array.isArray(ins.matieres) && ins.matieres.length ? ins.matieres.join(", ") : "-"}</div>
                  </td>
                  <td>${ins.parentWhatsapp || "-"}</td>
                  <td>${ins.parentNom || "-"}</td>
                  <td>${fmtDate(ins.createdAt)}</td>
                  <td><span class="badge ${status}">${statusLabel}</span></td>
                  <td>
                    <div class="row-actions">
                      <button class="remove-btn" data-id="${ins.id}">Supprimer</button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function rerender() {
    render(getInscriptions());
  }

  listEl.addEventListener("click", function (e) {
    const btn = e.target.closest(".remove-btn");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-id"));
    const items = getInscriptions();
    const next = items.filter((x) => Number(x.id) !== id);
    saveInscriptions(next);
    render(next);
  });

  if (searchInput) {
    searchInput.addEventListener("input", rerender);
  }

  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  });

  rerender();
})();
