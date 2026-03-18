export async function downloadElementorJson(pageId: string, slug: string) {
  const res = await fetch(`/api/landing-pages/${pageId}/export/elementor`);
  if (!res.ok) {
    throw new Error('Falha ao exportar para Elementor');
  }

  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-elementor.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
