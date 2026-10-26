import { mensajeServidor } from './mensajes';

const GENERICO = 'Algo salió mal.';

describe('mensajeServidor', () => {
  test('en español el mensaje del servidor pasa tal cual', () => {
    expect(mensajeServidor('Tarjeta rechazada.', 'es', GENERICO)).toBe('Tarjeta rechazada.');
    expect(mensajeServidor('Cualquier cosa nueva', 'es', GENERICO)).toBe('Cualquier cosa nueva');
  });

  test('en inglés se traducen los mensajes conocidos', () => {
    expect(mensajeServidor('Tarjeta rechazada.', 'en', GENERICO)).toBe('Card declined.');
    expect(mensajeServidor('Pedido no encontrado.', 'en', GENERICO)).toBe('Order not found.');
    expect(mensajeServidor('Código incorrecto.', 'en', GENERICO)).toBe('Wrong code.');
  });

  test('en inglés un mensaje desconocido se cambia por el genérico', () => {
    expect(mensajeServidor('Mensaje que nadie tradujo', 'en', GENERICO)).toBe(GENERICO);
  });

  test('sin mensaje usa el genérico en cualquier idioma', () => {
    expect(mensajeServidor('', 'es', GENERICO)).toBe(GENERICO);
    expect(mensajeServidor(undefined, 'en', GENERICO)).toBe(GENERICO);
    expect(mensajeServidor(null, 'es', GENERICO)).toBe(GENERICO);
  });
});
