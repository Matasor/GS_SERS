const themeStorageKey = 'energia-solidaria-theme';
const themeRoot = document.documentElement;
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let chosenTheme = null;

try {
  const savedTheme = localStorage.getItem(themeStorageKey);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    chosenTheme = savedTheme;
  }
} catch {
  // Se o navegador bloquear o armazenamento, use o tema do sistema.
}

function currentTheme() {
  return chosenTheme || (systemTheme.matches ? 'dark' : 'light');
}

// Define o tema antes de carregar a folha de estilos.
themeRoot.dataset.theme = currentTheme();

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('theme-toggle');
  const browserColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme() {
    const theme = currentTheme();
    themeRoot.dataset.theme = theme;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    browserColor.content = theme === 'dark' ? '#0c1627' : '#f2f6fc';
  }

  button.addEventListener('click', () => {
    chosenTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme();

    try {
      localStorage.setItem(themeStorageKey, chosenTheme);
    } catch {
      // A escolha continua ativa até recarregar a página.
    }
  });

  systemTheme.addEventListener('change', applyTheme);
  applyTheme();
  button.hidden = false;
});
