// Marcar item do menu como ativo baseado na URL atual
document.addEventListener("DOMContentLoaded", function () {
  const currentPath = window.location.pathname;
  const menuItems = document.querySelectorAll(".navigation li");

  menuItems.forEach((item, index) => {
    // Pular o primeiro item (logo)
    if (index === 0) return;

    const link = item.querySelector("a");
    if (link) {
      const href = link.getAttribute("href");

      // Verificar se o href corresponde à página atual
      let isActive = false;

      if (href === "/" || href === "/index.html") {
        // Dashboard - ativo apenas na raiz
        isActive = currentPath === "/" || currentPath === "/index.html" || currentPath === "";
      } else if (href && !href.startsWith("http")) {
        // Links internos - verificar se o path atual começa com o href
        isActive = currentPath.startsWith(href.replace("/index.html", "").replace("index.html", ""));
      }

      if (isActive) {
        item.classList.add("active");
      }
    }
  });
});

// Menu Toggle com persistência de estado
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

// Função para verificar se está em mobile
function isMobile() {
  return window.innerWidth <= 480;
}

// Restaurar estado do menu ao carregar a página
if (isMobile()) {
  // No mobile, menu sempre inicia fechado (sem classe active)
  navigation.classList.remove("active");
  main.classList.remove("active");
} else if (localStorage.getItem("menuClosed") === "true") {
  // No desktop, restaurar estado salvo
  navigation.classList.add("active");
  main.classList.add("active");
}

toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");

  // Salvar estado do menu apenas no desktop
  if (!isMobile()) {
    const isClosed = navigation.classList.contains("active");
    localStorage.setItem("menuClosed", isClosed);
  }
};
