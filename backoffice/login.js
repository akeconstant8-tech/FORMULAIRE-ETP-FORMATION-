(function () {
  "use strict";

  const ADMIN_EMAIL = "ettienpt@gmail.com";
  const ADMIN_PASSWORD = "pierreisaac@8";
  const SESSION_KEY = "etp_admin_session";

  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const msg = document.getElementById("msg");
  const togglePassword = document.getElementById("togglePassword");

  function showMessage(text, type) {
    msg.textContent = text;
    msg.className = "msg " + (type || "");
  }

  if (localStorage.getItem(SESSION_KEY) === "active") {
    window.location.href = "dashboard.html";
  }

  if (togglePassword && password) {
    togglePassword.addEventListener("click", function () {
      const isHidden = password.type === "password";
      password.type = isHidden ? "text" : "password";
      togglePassword.textContent = isHidden ? "🙈" : "👁";
      togglePassword.setAttribute("aria-label", isHidden ? "Masquer le mot de passe" : "Afficher le mot de passe");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const em = (email.value || "").trim().toLowerCase();
    const pw = password.value || "";

    if (!em || !pw) {
      showMessage("Veuillez remplir email et mot de passe.", "error");
      return;
    }

    if (em === ADMIN_EMAIL && pw === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "active");
      showMessage("Connexion réussie. Redirection...", "success");
      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 500);
      return;
    }

    showMessage("Identifiants invalides.", "error");
  });
})();
