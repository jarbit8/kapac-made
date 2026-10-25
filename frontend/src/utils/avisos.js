// Aviso cuando falla algo que el admin hizo desde la página
export const avisarFallo = (accion) =>
  window.alert(`No se pudo ${accion}. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.`);
