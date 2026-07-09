import { db, collection, addDoc, serverTimestamp }
 from "./back-office/firebase.js";
(function (){
  "use strict";
  const STORAGE_KEY = "etp_inscriptions_v1";
  const DRAFT_KEY = "etp_form_draft_v1";
 

  const form = document.querySelector("form");
  if (!form) return;

  const fields = {
    parentNom: document.getElementById("parentNom"),
    parentWhatsapp: document.getElementById("parentWhatsapp"),
    eleveNom: document.getElementById("eleveNom"),
    etablissement: document.getElementById("etablissement"),
    sexe: document.getElementById("sexe"),
    niveau: document.getElementById("niveau"),
    ancienEnfantNom: document.getElementById("ancienEnfantNom"),
    anneeInscription: document.getElementById("anneeInscription"),
  };

  const matieresContainer = document.getElementById("matieresContainer");
  const matieresSection = document.getElementById("matieresSection");
  const previousEnrollmentDetails = document.getElementById("previousEnrollmentDetails");
  const promoReduction = document.getElementById("promoReduction");

  const submitBtn = form.querySelector('button[type="submit"]');
  const successOverlay = document.getElementById("successOverlay");
  const successCloseBtn = document.getElementById("successCloseBtn");
  const successStudentName = document.getElementById("successStudentName");
  const successDate = document.getElementById("successDate");
  let isResettingAfterSubmit = false;

  const statusBox = document.createElement("div");
  statusBox.className = "alert mt-3 d-none";
  statusBox.setAttribute("role", "alert");
  form.appendChild(statusBox);

  function showMessage(type, message) {
    statusBox.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    statusBox.classList.add(`alert-${type}`);
    statusBox.textContent = message;
  }

  function clearMessage() {
    statusBox.classList.add("d-none");
    statusBox.textContent = "";
  }

  function sanitizeText(value) {
    return String(value || "").trim();
  }

  function getSelectedSerie() {
    const selected = document.querySelector('input[name="serie"]:checked');
    return selected ? selected.value : "";
  }

  function getSpecialiteValue() {
    const input = document.getElementById("specialite");
    return sanitizeText(input?.value);
  }

  function getCheckedSubjects() {
    return Array.from(document.querySelectorAll(".matiere-checkbox"))
      .filter((el) => el.checked)
      .map((el) => el.dataset.label || el.value)
      .filter(Boolean);
  }

  function getDejaInscritValue() {
    const checked = document.querySelector('input[name="dejaInscrit"]:checked');
    return checked ? checked.value : "non";
  }

  function isBeforeAugust15() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const limitDate = new Date(currentYear, 7, 15, 23, 59, 59, 999); // 15 août
    return now <= limitDate;
  }

  function togglePreviousEnrollmentBlock() {
    const dejaInscrit = getDejaInscritValue() === "oui";
    if (previousEnrollmentDetails) {
      previousEnrollmentDetails.classList.toggle("d-none", !dejaInscrit);
    }
    if (promoReduction) {
      const canShowPromo = dejaInscrit && isBeforeAugust15();
      promoReduction.classList.toggle("d-none", !canShowPromo);
    }
  }

  function parseNiveau(niveau) {
    const val = (niveau || "").toLowerCase();
    if (val.includes("1ère")) return "premiere";
    if (val.includes("terminale")) return "terminale";
    return "autre";
  }

  function renderMatieresByNiveau(niveau) {
    if (!matieresContainer) return;

    const typeNiveau = parseNiveau(niveau);

    if (typeNiveau === "premiere") {
      if (matieresSection) matieresSection.classList.remove("d-none");
      matieresContainer.innerHTML = `
        <div class="col-12">
          <label class="form-label required d-block mb-2">Série</label>
          <div class="d-flex flex-wrap gap-3">
            <div class="form-check">
              <input class="form-check-input" type="radio" name="serie" id="serieGle" value="Gle" />
              <label class="form-check-label" for="serieGle">Gle</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="serie" id="serieStmg" value="STMG" />
              <label class="form-check-label" for="serieStmg">STMG</label>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="form-check">
            <input class="form-check-input matiere-checkbox" type="checkbox" id="maths" data-label="Mathématiques" checked />
            <label class="form-check-label" for="maths">Mathématiques</label>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="form-check">
            <input class="form-check-input matiere-checkbox" type="checkbox" id="francais" data-label="Français" checked />
            <label class="form-check-label" for="francais">Français</label>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <label for="specialite" class="form-label required">Spécialité</label>
          <input id="specialite" type="text" class="form-control" placeholder="Ex : SES, HGGSP, Mercatique..." />
        </div>
      `;
      return;
    }

    if (typeNiveau === "terminale") {
      if (matieresSection) matieresSection.classList.remove("d-none");
      matieresContainer.innerHTML = `
        <div class="col-12">
          <label class="form-label required d-block mb-2">Série</label>
          <div class="d-flex flex-wrap gap-3">
            <div class="form-check">
              <input class="form-check-input" type="radio" name="serie" id="serieGle" value="Gle" />
              <label class="form-check-label" for="serieGle">Gle</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="serie" id="serieStmg" value="STMG" />
              <label class="form-check-label" for="serieStmg">STMG</label>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="form-check">
            <input class="form-check-input matiere-checkbox" type="checkbox" id="philo" data-label="Philo" checked />
            <label class="form-check-label" for="philo">Philo</label>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <label for="specialite" class="form-label required">Spécialités</label>
          <input id="specialite" type="text" class="form-control" placeholder="Ex : Maths, Physique-Chimie..." />
        </div>
      `;
      return;
    }

    matieresContainer.innerHTML = "";
    if (matieresSection) matieresSection.classList.add("d-none");
  }

  function collectFormData() {
    return {
      parentNom: sanitizeText(fields.parentNom?.value),
      parentWhatsapp: sanitizeText(fields.parentWhatsapp?.value),
      eleveNom: sanitizeText(fields.eleveNom?.value),
      etablissement: sanitizeText(fields.etablissement?.value),
      sexe: sanitizeText(fields.sexe?.value),
      niveau: sanitizeText(fields.niveau?.value),
      serie: getSelectedSerie(),
      specialite: getSpecialiteValue(),
      matieres: getCheckedSubjects(),
      dejaInscrit: getDejaInscritValue(),
      ancienEnfantNom: sanitizeText(fields.ancienEnfantNom?.value),
      anneeInscription: sanitizeText(fields.anneeInscription?.value),
      createdAt: new Date().toISOString(),
    };
  }

  function validate(data) {
    const errors = [];

    if (!data.parentNom) errors.push("Le nom du parent est obligatoire.");
    if (!data.parentWhatsapp) errors.push("Le numéro WhatsApp est obligatoire.");
    if (!data.eleveNom) errors.push("Le nom de l'élève est obligatoire.");
    if (!data.etablissement) errors.push("L'établissement est obligatoire.");
    if (!data.sexe) errors.push("Le sexe de l'élève est obligatoire.");
    if (!data.niveau) errors.push("Le niveau est obligatoire.");

    const whatsappOk = /^\+?[0-9\s]{8,20}$/.test(data.parentWhatsapp);
    if (data.parentWhatsapp && !whatsappOk) {
      errors.push("Le numéro WhatsApp semble invalide.");
    }

    const typeNiveau = parseNiveau(data.niveau);

    if ((typeNiveau === "premiere" || typeNiveau === "terminale") && !data.serie) {
      errors.push("Veuillez choisir une série (Gle ou STMG).");
    }

    if ((typeNiveau === "premiere" || typeNiveau === "terminale") && !data.specialite) {
      errors.push("Veuillez renseigner la spécialité.");
    }

    if ((typeNiveau === "premiere" || typeNiveau === "terminale") && !data.matieres.length) {
      errors.push("Sélectionnez au moins une matière.");
    }

    if (data.dejaInscrit === "oui") {
      if (!data.ancienEnfantNom) {
        errors.push("Veuillez renseigner le nom de l'enfant déjà inscrit.");
      }
      if (!data.anneeInscription) {
        errors.push("Veuillez renseigner l'année d'inscription.");
      } else if (!/^\d{4}$/.test(data.anneeInscription)) {
        errors.push("L'année d'inscription doit contenir 4 chiffres.");
      }
    }

    return errors;
  }

  function getAllInscriptions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAllInscriptions(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function saveDraft() {
    if (isResettingAfterSubmit) return;
    const draft = {
      parentNom: fields.parentNom?.value || "",
      parentWhatsapp: fields.parentWhatsapp?.value || "",
      eleveNom: fields.eleveNom?.value || "",
      etablissement: fields.etablissement?.value || "",
      sexe: fields.sexe?.value || "",
      niveau: fields.niveau?.value || "",
      serie: getSelectedSerie(),
      specialite: getSpecialiteValue(),
      matieres: Array.from(document.querySelectorAll(".matiere-checkbox"))
        .filter((el) => el.checked)
        .map((el) => el.id),
      dejaInscrit: getDejaInscritValue(),
      ancienEnfantNom: fields.ancienEnfantNom?.value || "",
      anneeInscription: fields.anneeInscription?.value || "",
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function resetFormAfterSubmit() {
    isResettingAfterSubmit = true;

    clearDraft();
    form.reset();

    const dejaInscritNonRadio = document.getElementById("dejaInscritNon");
    if (dejaInscritNonRadio) {
      dejaInscritNonRadio.checked = true;
    }

    if (fields.parentNom) fields.parentNom.value = "";
    if (fields.parentWhatsapp) fields.parentWhatsapp.value = "";
    if (fields.eleveNom) fields.eleveNom.value = "";
    if (fields.etablissement) fields.etablissement.value = "";
    if (fields.sexe) fields.sexe.value = "";
    if (fields.niveau) fields.niveau.value = "";
    if (fields.ancienEnfantNom) fields.ancienEnfantNom.value = "";
    if (fields.anneeInscription) fields.anneeInscription.value = "";

    renderMatieresByNiveau("");
    togglePreviousEnrollmentBlock();

    clearDraft();
    isResettingAfterSubmit = false;
  }

  function clearFormCompletely() {
    clearDraft();

    form.reset();

    if (fields.parentNom) fields.parentNom.value = "";
    if (fields.parentWhatsapp) fields.parentWhatsapp.value = "";
    if (fields.eleveNom) fields.eleveNom.value = "";
    if (fields.etablissement) fields.etablissement.value = "";
    if (fields.sexe) fields.sexe.value = "";
    if (fields.niveau) fields.niveau.value = "";
    if (fields.ancienEnfantNom) fields.ancienEnfantNom.value = "";
    if (fields.anneeInscription) fields.anneeInscription.value = "";

    const dejaInscritNonRadio = document.getElementById("dejaInscritNon");
    if (dejaInscritNonRadio) dejaInscritNonRadio.checked = true;

    const dejaInscritOuiRadio = document.getElementById("dejaInscritOui");
    if (dejaInscritOuiRadio) dejaInscritOuiRadio.checked = false;

    document.querySelectorAll('input[name="serie"]').forEach((radio) => {
      radio.checked = false;
    });

    document.querySelectorAll(".matiere-checkbox").forEach((checkbox) => {
      checkbox.checked = false;
    });

    if (matieresContainer) {
      matieresContainer.innerHTML = "";
    }
    if (matieresSection) {
      matieresSection.classList.add("d-none");
    }

    if (previousEnrollmentDetails) {
      previousEnrollmentDetails.classList.add("d-none");
    }

    if (promoReduction) {
      promoReduction.classList.add("d-none");
    }

    clearDraft();
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);

      if (fields.parentNom) fields.parentNom.value = draft.parentNom || "";
      if (fields.parentWhatsapp) fields.parentWhatsapp.value = draft.parentWhatsapp || "";
      if (fields.eleveNom) fields.eleveNom.value = draft.eleveNom || "";
      if (fields.etablissement) fields.etablissement.value = draft.etablissement || "";
      if (fields.sexe) fields.sexe.value = draft.sexe || "";
      if (fields.niveau) {
        fields.niveau.value = draft.niveau || "";
        renderMatieresByNiveau(fields.niveau.value);
      }

      if (Array.isArray(draft.matieres)) {
        draft.matieres.forEach((id) => {
          const checkbox = document.getElementById(id);
          if (checkbox) checkbox.checked = true;
        });
      }

      if (draft.serie) {
        const serieRadio = document.querySelector(`input[name="serie"][value="${draft.serie}"]`);
        if (serieRadio) serieRadio.checked = true;
      }

      if (draft.dejaInscrit) {
        const dejaRadio = document.querySelector(`input[name="dejaInscrit"][value="${draft.dejaInscrit}"]`);
        if (dejaRadio) dejaRadio.checked = true;
      }

      if (fields.ancienEnfantNom) fields.ancienEnfantNom.value = draft.ancienEnfantNom || "";
      if (fields.anneeInscription) fields.anneeInscription.value = draft.anneeInscription || "";

      togglePreviousEnrollmentBlock();

      const specialiteInput = document.getElementById("specialite");
      if (specialiteInput) specialiteInput.value = draft.specialite || "";
    } catch (e) {
      // noop
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function formatFrenchDate(date) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function openSuccessModal(data) {
    if (!successOverlay) return;
    if (successStudentName) {
      successStudentName.textContent = data.eleveNom || "Élève";
    }
    if (successDate) {
      successDate.textContent = formatFrenchDate(new Date());
    }
    successOverlay.classList.remove("d-none");
    successOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeSuccessModal() {
    if (!successOverlay) return;
    successOverlay.classList.add("d-none");
    successOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage();

    const data = collectFormData();
    const errors = validate(data);

    if (errors.length) {
      showMessage("danger", errors[0]);
      return;
    }

    try {
    await addDoc(collection(db, "inscriptions"), {
        ...data,
        status: "en_attente",
        source: "parent",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    });
} catch (error) {
    console.error(error);
    showMessage("danger", "Erreur lors de l'enregistrement dans Firebase.");
    return;
}

    resetFormAfterSubmit();

    showMessage("success", "🎉 Votre formulaire a été rempli avec succès. Nous vous contacterons bientôt. Nous vous remercions pour votre confiance.");
    openSuccessModal(data);
  });

  if (fields.niveau) {
    fields.niveau.addEventListener("change", function () {
      renderMatieresByNiveau(fields.niveau.value);
      saveDraft();
    });
  }

  document.querySelectorAll('input[name="dejaInscrit"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      togglePreviousEnrollmentBlock();
      saveDraft();
    });
  });

  loadDraft();

  if (!localStorage.getItem(DRAFT_KEY)) {
    clearFormCompletely();
  } else if (fields.niveau && !fields.niveau.value) {
    renderMatieresByNiveau("");
    togglePreviousEnrollmentBlock();
  } else {
    togglePreviousEnrollmentBlock();
  }

  if (submitBtn) {
    submitBtn.setAttribute("aria-label", "Envoyer la fiche d'inscription");
  }

  if (successCloseBtn) {
    successCloseBtn.addEventListener("click", closeSuccessModal);
  }

  if (successOverlay) {
    successOverlay.addEventListener("click", function (event) {
      if (event.target === successOverlay) {
        closeSuccessModal();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeSuccessModal();
    }
  });
})();
