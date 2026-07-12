// Correos con acceso de administrador (panel /admin + editor visual del sitio).
// La seguridad REAL vive en las reglas de Firestore/Storage; esto es solo para
// mostrar/ocultar las herramientas de edición en la interfaz.
// Para agregar o quitar un admin, edita esta lista y vuelve a publicar.
export const ADMINS = [
  'jarb2299@gmail.com',
  'cristhian.ccapa@qhapaqbrands.com',
  'joel.reinoso@ucsp.edu.pe', // prueba temporal del fix de guardado
];

// Compara sin distinguir mayúsculas/minúsculas.
export const esCorreoAdmin = (email) =>
  !!email && ADMINS.includes(String(email).toLowerCase());
