"use strict";

/*
 * ELO Campus — comportamento da tela de acesso.
 * Esta versão cuida apenas da interface. A autenticação real deve ser conectada
 * à API/backend, sem guardar senhas no navegador ou no localStorage.
 */
(() => {
  const form = document.querySelector("#login-form");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const togglePasswordButton = document.querySelector("#toggle-password");
  const forgotPasswordButton = document.querySelector("#forgot-password");
  const message = document.querySelector("#form-message");

  if (!form || !emailInput || !passwordInput || !togglePasswordButton || !forgotPasswordButton || !message) {
    return;
  }

  function showMessage(text, type = "info") {
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle("is-warning", type === "warning");
  }

  togglePasswordButton.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    togglePasswordButton.setAttribute("aria-pressed", String(shouldShow));
    togglePasswordButton.setAttribute("aria-label", shouldShow ? "Ocultar senha" : "Mostrar senha");
    passwordInput.focus({ preventScroll: true });
  });

  forgotPasswordButton.addEventListener("click", () => {
    const email = emailInput.value.trim();

    if (!email) {
      showMessage("Informe seu e-mail institucional. A recuperação de senha será disponibilizada após a integração com o servidor.", "warning");
      emailInput.focus();
      return;
    }

    showMessage("A recuperação de senha ainda não está conectada ao servidor. Nenhuma mensagem foi enviada.", "warning");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    // Não simula um login bem-sucedido: a autenticação depende do backend.
    showMessage("A tela está pronta para integração, mas a autenticação ainda não foi conectada à API. Nenhum dado foi enviado.", "warning");
  });
})();
