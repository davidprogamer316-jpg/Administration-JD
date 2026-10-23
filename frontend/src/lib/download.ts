const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function downloadFromApi(endpoint: string, filename: string) {
  const res = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders() });

  if (!res.ok) throw new Error('Error al descargar');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function openPdfFromApi(endpoint: string, fallbackFilename = 'documento.pdf') {
  const win = window.open('', '_blank');

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Error al abrir PDF');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (win) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = fallbackFilename;
      a.click();
    }

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (win) win.close();
    throw error;
  }
}
