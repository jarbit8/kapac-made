const locale = (idioma) => (idioma === 'en' ? 'en-US' : 'es-PE');

export const fechaLarga = (f, idioma) => new Date(f).toLocaleDateString(locale(idioma), { day: 'numeric', month: 'long', year: 'numeric' });
export const fechaHora = (f, idioma) => new Date(f).toLocaleString(locale(idioma), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
