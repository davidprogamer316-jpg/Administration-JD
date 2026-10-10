const input = document.getElementById('uri');
const saveBtn = document.getElementById('save');
const errorEl = document.getElementById('error');

const params = new URLSearchParams(window.location.search);
const incoming = params.get('msg');
if (incoming) errorEl.textContent = incoming;

async function init() {
  try {
    const cfg = await window.desktopConfig.getConfig();
    if (cfg && cfg.mongodbUri) input.value = cfg.mongodbUri;
  } catch {
    // ignore
  }
  input.focus();
}

async function save() {
  const uri = input.value.trim();
  errorEl.textContent = '';
  if (!uri) {
    errorEl.textContent = 'Escribe la cadena de conexión.';
    return;
  }
  saveBtn.disabled = true;
  try {
    const res = await window.desktopConfig.saveConfig({ mongodbUri: uri });
    if (!res || !res.ok) {
      errorEl.textContent = (res && res.error) || 'No se pudo guardar la conexión.';
      saveBtn.disabled = false;
    }
  } catch {
    errorEl.textContent = 'No se pudo guardar la conexión.';
    saveBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', save);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
});

init();
