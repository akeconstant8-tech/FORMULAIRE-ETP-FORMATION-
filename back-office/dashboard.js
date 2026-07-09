import {
  db,
  collection,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "./firebase.js";

(function () {
  "use strict";

  const SESSION_KEY = "etp_admin_session";

  const menuItems = Array.from(document.querySelectorAll(".menu-item[data-view]"));
  const views = {
    overview: document.getElementById("viewOverview"),
    pending: document.getElementById("viewPending"),
    validated: document.getElementById("viewValidated")
  };

  const logoutBtn = document.getElementById("logoutBtn");

  const statNew = document.getElementById("statNew");
  const statPending = document.getElementById("statPending");
  const statValidated = document.getElementById("statValidated");
  const statTotal = document.getElementById("statTotal");

  const notifCount = document.getElementById("notifCount");
  const notificationsList = document.getElementById("notificationsList");

  const searchOverview = document.getElementById("searchOverview");
  const searchPending = document.getElementById("searchPending");
  const searchValidated = document.getElementById("searchValidated");

  const overviewTableWrap = document.getElementById("overviewTableWrap");
  const pendingTableWrap = document.getElementById("pendingTableWrap");
  const validatedTableWrap = document.getElementById("validatedTableWrap");

  const detailsModal = document.getElementById("detailsModal");
  const closeDetailsModal = document.getElementById("closeDetailsModal");
  const detailsContent = document.getElementById("detailsContent");

  let inscriptions = [];
  let firstLoadDone = false;
  let previousIds = new Set();

  function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function normalizeStatus(value) {
    const v = String(value || "").toLowerCase().trim();
    if (v === "en_attente" || v === "en attente" || v === "pending") return "en_attente";
    if (v === "validee" || v === "validée") return "validee";
    if (v === "confirmee" || v === "confirmée" || v === "confirmé") return "confirmee";
    if (v === "annulee" || v === "annulée") return "annulee";
    return "en_attente";
  }

  function statusLabel(status) {
    const s = normalizeStatus(status);
    if (s === "en_attente") return "🟡 En attente";
    if (s === "validee") return "✅ Validée";
    if (s === "confirmee") return "🔵 Inscription confirmée";
    return "🔴 Annulée";
  }

  function fmtDate(value) {
    if (!value) return "-";
    let dateObj = null;

    if (typeof value?.toDate === "function") {
      dateObj = value.toDate();
    } else if (value instanceof Date) {
      dateObj = value;
    } else if (typeof value === "number" || typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) dateObj = parsed;
    }

    if (!dateObj) return "-";

    return dateObj.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function getIdentity(ins) {
    const full = String(ins.eleveNom || "").trim();
    if (!full) return { nom: "-", prenoms: "-" };
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { nom: parts[0], prenoms: "-" };
    return { nom: parts[0], prenoms: parts.slice(1).join(" ") };
  }

  function getSubjectsForNiveau(niveau) {
    const n = String(niveau || "").toLowerCase();
    if (n.includes("terminale") && n.includes("gle")) return ["Philosophie", "Spécialité"];
    if (n.includes("terminale") && n.includes("stmg")) return ["Philosophie", "Spécialité"];
    if (n.includes("première") && n.includes("stmg")) return ["Mathématiques", "Français", "Spécialité"];
    if (n.includes("première") && n.includes("gle")) return ["Mathématiques", "Français", "Spécialité"];
    const lowLevels = ["6ème", "5ème", "4ème", "3ème", "2nde", "seconde"];
    if (lowLevels.some((lv) => n.includes(lv))) return ["Mathématiques", "Sciences", "Français", "Anglais"];
    return ["Mathématiques", "Français"];
  }

  function resolveSubjectsForDetails(ins) {
    const subjects = Array.isArray(ins.matieres) && ins.matieres.length > 0
      ? [...ins.matieres]
      : [...getSubjectsForNiveau(ins.niveau || "")];

    const specialite = String(ins.specialite || "").trim();
    if (specialite) {
      const hasSpecialite = subjects.some((s) => String(s).toLowerCase().includes("spécialité"));
      if (hasSpecialite) {
        return subjects.map((s) =>
          String(s).toLowerCase().includes("spécialité") ? `Spécialité : ${specialite}` : s
        );
      }
      subjects.push(`Spécialité : ${specialite}`);
    }

    return subjects;
  }

  function setActiveView(viewKey) {
    menuItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewKey));
    Object.keys(views).forEach((key) => {
      if (views[key]) views[key].classList.toggle("active", key === viewKey);
    });
  }

  function renderNotifications() {
    if (!notificationsList || !notifCount) return;
    const pending = inscriptions.filter((i) => normalizeStatus(i.status) === "en_attente");
    notifCount.textContent = String(pending.length);

    if (!pending.length) {
      notificationsList.innerHTML = `<p class="empty-inline">Aucune notification pour le moment.</p>`;
      return;
    }

    notificationsList.innerHTML = pending.slice(0, 10).map((ins) => `
      <article class="notif-item">
        <p><strong>🔔 Nouvelle inscription :</strong> ${ins.eleveNom || "-"} (${ins.niveau || "-"})</p>
        <span>${fmtDate(ins.createdAt)}</span>
      </article>
    `).join("");
  }

  function updateStats() {
    const total = inscriptions.length;
    const pending = inscriptions.filter((i) => normalizeStatus(i.status) === "en_attente").length;
    const validated = inscriptions.filter((i) => normalizeStatus(i.status) === "validee").length;
    const fresh = pending;

    if (statTotal) statTotal.textContent = String(total);
    if (statPending) statPending.textContent = String(pending);
    if (statValidated) statValidated.textContent = String(validated);
    if (statNew) statNew.textContent = String(fresh);
  }

  function filterBySearch(list, queryText) {
    const q = String(queryText || "").toLowerCase().trim();
    if (!q) return list;
    return list.filter((item) =>
      String(item.eleveNom || "").toLowerCase().includes(q) ||
      String(item.parentNom || "").toLowerCase().includes(q) ||
      String(item.parentWhatsapp || "").toLowerCase().includes(q) ||
      String(item.niveau || "").toLowerCase().includes(q)
    );
  }

  function renderOverviewTable() {
    if (!overviewTableWrap) return;
    const list = filterBySearch(inscriptions, searchOverview ? searchOverview.value : "");

    if (!list.length) {
      overviewTableWrap.innerHTML = `<div class="empty">Aucune inscription trouvée.</div>`;
      return;
    }

    overviewTableWrap.innerHTML = `
      <table class="inscriptions-table">
        <thead>
          <tr>
            <th>Élève</th><th>Niveau</th><th>Parent</th><th>Téléphone</th><th>Date inscription</th><th>Statut</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((ins) => `
            <tr>
              <td>${ins.eleveNom || "-"}</td>
              <td>${ins.niveau || "-"}</td>
              <td>${ins.parentNom || "-"}</td>
              <td>${ins.parentWhatsapp || "-"}</td>
              <td>${fmtDate(ins.createdAt)}</td>
              <td><span class="status-badge status-${normalizeStatus(ins.status)}">${statusLabel(ins.status)}</span></td>
              <td class="actions-cell">
                <button class="action-btn view-btn" data-action="view" data-id="${ins.id}" type="button">👁 Afficher la fiche</button>
                <button class="action-btn edit-btn" data-action="edit" data-id="${ins.id}" type="button">✏ Modifier</button>
                <button class="action-btn delete-btn" data-action="delete" data-id="${ins.id}" type="button">🗑 Supprimer</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderPendingTable() {
    if (!pendingTableWrap) return;
    const pendingList = inscriptions.filter((i) => normalizeStatus(i.status) === "en_attente");
    const list = filterBySearch(pendingList, searchPending ? searchPending.value : "");

    if (!list.length) {
      pendingTableWrap.innerHTML = `<div class="empty">Aucune inscription en attente.</div>`;
      return;
    }

    pendingTableWrap.innerHTML = `
      <table class="inscriptions-table">
        <thead>
          <tr>
            <th>Nom</th><th>Prénoms</th><th>Niveau</th><th>Parent</th><th>Téléphone</th><th>Date d'inscription</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((ins) => {
            const identity = getIdentity(ins);
            return `
              <tr>
                <td>${identity.nom}</td>
                <td>${identity.prenoms}</td>
                <td>${ins.niveau || "-"}</td>
                <td>${ins.parentNom || "-"}</td>
                <td>${ins.parentWhatsapp || "-"}</td>
                <td>${fmtDate(ins.createdAt)}</td>
                <td class="actions-cell">
                  <button class="action-btn view-btn" data-action="view" data-id="${ins.id}" type="button">👁 Afficher la fiche</button>
                  <button class="action-btn validate-btn" data-action="validate" data-id="${ins.id}" type="button">🟢 Valider</button>
                  <button class="action-btn cancel-btn" data-action="cancel" data-id="${ins.id}" type="button">🔴 Annuler</button>
                  <button class="action-btn edit-btn" data-action="edit" data-id="${ins.id}" type="button">✏ Modifier</button>
                  <button class="action-btn delete-btn" data-action="delete" data-id="${ins.id}" type="button">🗑 Supprimer</button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function renderValidatedTable() {
    if (!validatedTableWrap) return;
    const validatedList = inscriptions.filter((i) => normalizeStatus(i.status) === "validee");
    const list = filterBySearch(validatedList, searchValidated ? searchValidated.value : "");

    if (!list.length) {
      validatedTableWrap.innerHTML = `<div class="empty">Aucune inscription validée.</div>`;
      return;
    }

    validatedTableWrap.innerHTML = `
      <table class="inscriptions-table">
        <thead>
          <tr>
            <th>#</th><th>Élève</th><th>Niveau</th><th>Parent</th><th>Téléphone</th><th>Date validation</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((ins, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${ins.eleveNom || "-"}</td>
              <td>${ins.niveau || "-"}</td>
              <td>${ins.parentNom || "-"}</td>
              <td>${ins.parentWhatsapp || "-"}</td>
              <td>${fmtDate(ins.validatedAt)}</td>
              <td class="actions-cell">
                <button class="action-btn view-btn" data-action="view" data-id="${ins.id}" type="button">Afficher la fiche</button>
                <button class="action-btn edit-btn" data-action="edit" data-id="${ins.id}" type="button">Modifier</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderAll() {
    updateStats();
    renderNotifications();
    renderOverviewTable();
    renderPendingTable();
    renderValidatedTable();
  }

  function openDetails(ins) {
    if (!detailsModal || !detailsContent) return;

    const subjects = resolveSubjectsForDetails(ins);
    const subjectsText = subjects.map((s) => `✔ ${s}`).join("\n");

    detailsContent.textContent = `
══════════════════════════════
        FICHE D'INSCRIPTION
══════════════════════════════

Nom et Prénoms : ${ins.eleveNom || "-"}
Niveau : ${ins.niveau || "-"}
Parent / Tuteur : ${ins.parentNom || "-"}
Téléphone : ${ins.parentWhatsapp || "-"}
Date d'inscription : ${fmtDate(ins.createdAt)}
Statut : ${statusLabel(ins.status)}

Matières suivies :
${subjectsText}
`.trim();

    detailsModal.classList.remove("hidden");
    detailsModal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!detailsModal) return;
    detailsModal.classList.add("hidden");
    detailsModal.setAttribute("aria-hidden", "true");
  }

  async function validateInscription(id) {
    await updateDoc(doc(db, "inscriptions", id), {
      status: "validee",
      validatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async function cancelInscription(id) {
    await updateDoc(doc(db, "inscriptions", id), {
      status: "annulee",
      updatedAt: serverTimestamp()
    });
  }

  async function deleteInscription(id) {
    await deleteDoc(doc(db, "inscriptions", id));
  }

  async function editInscription(id) {
    const existing = inscriptions.find((i) => i.id === id);
    if (!existing) return;

    const nextEleve = window.prompt("Nom et prénoms de l'élève :", existing.eleveNom || "");
    if (nextEleve === null) return;

    const nextNiveau = window.prompt("Niveau :", existing.niveau || "");
    if (nextNiveau === null) return;

    const nextParent = window.prompt("Parent / Tuteur :", existing.parentNom || "");
    if (nextParent === null) return;

    const nextPhone = window.prompt("Téléphone WhatsApp :", existing.parentWhatsapp || "");
    if (nextPhone === null) return;

    await updateDoc(doc(db, "inscriptions", id), {
      eleveNom: String(nextEleve).trim(),
      niveau: String(nextNiveau).trim(),
      parentNom: String(nextParent).trim(),
      parentWhatsapp: String(nextPhone).trim(),
      updatedAt: serverTimestamp()
    });
  }

  function bindGlobalActions(container) {
    if (!container) return;

    container.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const btn = target.closest(".action-btn");
      if (!(btn instanceof HTMLElement)) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!action || !id) return;

      try {
        if (action === "view") {
          const ins = inscriptions.find((i) => i.id === id);
          if (ins) openDetails(ins);
          return;
        }

        if (action === "validate") {
          await validateInscription(id);
          return;
        }

        if (action === "cancel") {
          await cancelInscription(id);
          return;
        }

        if (action === "edit") {
          await editInscription(id);
          return;
        }

        if (action === "delete") {
          const ok = window.confirm("Supprimer cette inscription ?");
          if (!ok) return;
          await deleteInscription(id);
        }
      } catch (error) {
        console.error("Erreur action inscription :", error);
        window.alert("Une erreur est survenue.");
      }
    });
  }

  function wireEvents() {
    menuItems.forEach((item) => {
      item.addEventListener("click", () => setActiveView(item.dataset.view || "overview"));
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = "login.html";
      });
    }

    if (searchOverview) searchOverview.addEventListener("input", renderOverviewTable);
    if (searchPending) searchPending.addEventListener("input", renderPendingTable);
    if (searchValidated) searchValidated.addEventListener("input", renderValidatedTable);

    [overviewTableWrap, pendingTableWrap, validatedTableWrap].forEach(bindGlobalActions);

    if (closeDetailsModal) closeDetailsModal.addEventListener("click", closeModal);

    if (detailsModal) {
      detailsModal.addEventListener("click", (event) => {
        if (event.target === detailsModal) closeModal();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  function listenRealtime() {
    const q = query(collection(db, "inscriptions"), orderBy("createdAt", "desc"));
    onSnapshot(
      q,
      (snapshot) => {
        const next = [];
        const nextIds = new Set();

        snapshot.forEach((snap) => {
          next.push({ id: snap.id, ...snap.data() });
          nextIds.add(snap.id);
        });

        if (firstLoadDone) {
          const newCount = [...nextIds].filter((id) => !previousIds.has(id)).length;
          if (newCount > 0 && notificationsList) {
            const existing = notificationsList.innerHTML;
            notificationsList.innerHTML = `
              <article class="notif-item notif-new">
                <p><strong>🔔 ${newCount} nouvelle(s) fiche(s) reçue(s)</strong></p>
                <span>${fmtDate(new Date())}</span>
              </article>
            ` + existing;
          }
        }

        inscriptions = next;
        previousIds = nextIds;
        firstLoadDone = true;
        renderAll();
      },
      (error) => {
        console.error("Erreur écoute temps réel :", error);
      }
    );
  }

  function init() {
    if (!checkSession()) return;
    wireEvents();
    listenRealtime();
  }

  init();
})();
