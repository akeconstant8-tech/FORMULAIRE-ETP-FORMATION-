import {
  db,
  collection,
  getDocs,
  doc,
  deleteDoc
} from "./firebase.js";

(function () {
  "use strict";

  const SESSION_KEY = "etp_admin_session";

  const listEl = document.getElementById("list");
  const searchInput = document.getElementById("searchInput");

  const statTotal = document.getElementById("statTotal");
  const statNew = document.getElementById("statNew");
  const statConfirmed = document.getElementById("statConfirmed");
  const statPending = document.getElementById("statPending");

  const logoutBtn = document.getElementById("logoutBtn");

  let inscriptions = [];

  function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  async function getInscriptions() {
    const snapshot = await getDocs(collection(db, "inscriptions"));

    inscriptions = [];

    snapshot.forEach((doc) => {
      inscriptions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return inscriptions;
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
      if (!Number.isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }

    if (!dateObj) return "-";

    return dateObj.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function updateStats(items) {
    const total = items.length;
    const confirmed = items.filter((i) => (i.status || "").toLowerCase() === "confirmé").length;
    const pending = items.filter((i) => {
      const s = (i.status || "").toLowerCase();
      return s === "en attente" || s === "pending";
    }).length;
    const fresh = items.filter((i) => !i.status).length;

    if (statTotal) statTotal.textContent = String(total);
    if (statConfirmed) statConfirmed.textContent = String(confirmed);
    if (statPending) statPending.textContent = String(pending);
    if (statNew) statNew.textContent = String(fresh);
  }

  function render(items) {
    const recherche = (searchInput?.value || "").toLowerCase();

    const liste = items.filter((item) => {
      return (
        (item.eleveNom || "").toLowerCase().includes(recherche) ||
        (item.parentNom || "").toLowerCase().includes(recherche) ||
        (item.parentWhatsapp || "").toLowerCase().includes(recherche) ||
        (item.niveau || "").toLowerCase().includes(recherche)
      );
    });

    if (!liste.length) {
      if (listEl) {
        listEl.innerHTML = `<div class="empty">Aucune inscription trouvée.</div>`;
      }
      updateStats(items);
      return;
    }

    updateStats(items);

    if (listEl) {
      listEl.innerHTML = `
        <table class="inscriptions-table">
          <thead>
            <tr>
              <th>Élève</th>
              <th>Niveau</th>
              <th>Téléphone</th>
              <th>Parent</th>
              <th>Date d'inscription</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${liste.map((ins) => `
              <tr>
                <td>${ins.eleveNom || "-"}</td>
                <td>${ins.niveau || "-"}</td>
                <td>${ins.parentWhatsapp || "-"}</td>
                <td>${ins.parentNom || "-"}</td>
                <td>${fmtDate(ins.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    class="remove-btn"
                    data-id="${ins.id}"
                    aria-label="Supprimer ${ins.eleveNom || "cet élève"}"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }
  }

  async function init() {
    if (!checkSession()) return;

    try {
      await getInscriptions();
      render(inscriptions);
    } catch (error) {
      console.error("Erreur lors du chargement des inscriptions :", error);
      if (listEl) {
        listEl.innerHTML = `<div class="empty">Erreur de chargement des inscriptions.</div>`;
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => render(inscriptions));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "login.html";
    });
  }

  if (listEl) {
    listEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const deleteButton = target.closest(".remove-btn");
      if (!(deleteButton instanceof HTMLElement)) return;

      const id = deleteButton.getAttribute("data-id");
      if (!id) return;

      const confirmed = window.confirm("Supprimer cette inscription ?");
      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "inscriptions", id));
        inscriptions = inscriptions.filter((item) => item.id !== id);
        render(inscriptions);
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        window.alert("La suppression a échoué.");
      }
    });
  }

  init();
})();
