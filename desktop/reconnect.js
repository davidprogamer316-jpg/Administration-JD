const params = new URLSearchParams(window.location.search);
const msg = params.get('msg');
if (msg) {
  document.getElementById('msg').textContent = msg;
}

document.getElementById('retry').addEventListener('click', () => {
  window.desktopConfig.retry();
});

document.getElementById('configure').addEventListener('click', (e) => {
  e.preventDefault();
  window.desktopConfig.configure();
});
