// Firebase Storage falso para las pruebas de punta a punta: no sube nada, solo deja el registro
// de lo que la página quiso subir o borrar en localStorage.__storage
export const getStorage = () => ({ falso: true });
export const ref = (_storage, ruta) => ({ ruta });

const anotar = (accion, ruta, extra = {}) => {
  try {
    const lista = JSON.parse(localStorage.getItem('__storage')) || [];
    lista.push({ accion, ruta, ...extra });
    localStorage.setItem('__storage', JSON.stringify(lista));
  } catch (_) {}
};

export async function uploadBytes(referencia, archivo, metadatos) {
  anotar('subir', referencia.ruta, { tipo: archivo?.type || metadatos?.contentType || '', bytes: archivo?.size || 0 });
  return { ref: referencia };
}

export async function getDownloadURL(referencia) {
  return `https://firebasestorage.googleapis.com/v0/b/kapac-made.firebasestorage.app/o/${encodeURIComponent(referencia.ruta)}?alt=media&token=falso`;
}

export async function deleteObject(referencia) {
  anotar('borrar', referencia.ruta);
}
