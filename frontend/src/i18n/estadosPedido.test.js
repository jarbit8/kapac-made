import TEXTOS from '../config/textosPedidos.json';
import { textosEstado, nombreEstado, textoPagina } from './estadosPedido';

const METODOS = ['yape', 'yape-codigo', 'tarjeta', 'efectivo', undefined];
const ENTREGAS = [{ tipo: 'envio' }, { tipo: 'recojo' }, undefined];
const ESTADOS = Object.keys(TEXTOS.estados);

const pedidoDe = (estado, metodoPago, envio) => ({ estado, metodoPago, envio });

// El caso que debe usar la pantalla según el método y la entrega
function casoEsperado(estado, metodoPago, envio) {
  const casos = TEXTOS.estados[estado];
  const recojo = envio?.tipo !== 'envio';
  return casos[metodoPago === 'efectivo' ? 'pagoefectivo' : 'yape_qr'] || casos[recojo ? 'recojo' : 'domicilio'] || casos.todos;
}

describe('textosEstado', () => {
  test('cubre todos los estados × métodos × entregas del JSON', () => {
    ESTADOS.forEach((estado) => {
      METODOS.forEach((metodo) => {
        ENTREGAS.forEach((envio) => {
          const t = textosEstado(pedidoDe(estado, metodo, envio));
          expect(t).toBe(casoEsperado(estado, metodo, envio));
          expect(t.nombre).toBeTruthy();
        });
      });
    });
  });

  test('un estado desconocido no tiene textos', () => {
    expect(textosEstado(pedidoDe('inventado', 'yape', { tipo: 'envio' }))).toBeNull();
    expect(textosEstado({})).toBeNull();
    expect(textosEstado(null)).toBeNull();
    expect(textosEstado(undefined)).toBeNull();
  });

  test('los estados viejos se traducen a los nuevos', () => {
    expect(textosEstado(pedidoDe('pendiente', 'yape', null)).nombre).toBe(textosEstado(pedidoDe('verificando_pago', 'yape', null)).nombre);
    expect(textosEstado(pedidoDe('verificando', 'tarjeta', null)).nombre).toBe(TEXTOS.estados.procesando_pago.todos.nombre);
    expect(textosEstado(pedidoDe('pagado', 'tarjeta', { tipo: 'envio' }))).toBe(TEXTOS.estados.pendiente_envio.domicilio);
  });

  test('el estado se puede pedir aparte del que tiene el pedido', () => {
    const pedido = pedidoDe('pendiente_envio', 'tarjeta', { tipo: 'recojo' });
    expect(textosEstado(pedido, 'enviado').nombre).toBe('Listo para recoger');
    expect(textosEstado(pedido, 'cancelado').nombre).toBe('Cancelado');
  });

  test('PagoEfectivo manda sobre la entrega', () => {
    const t = textosEstado(pedidoDe('verificando_pago', 'efectivo', { tipo: 'envio' }));
    expect(t.nombre).toBe('Esperando pago');
    expect(t.correo.mensaje).toMatch(/\{cip\}/);
  });

  test('sin datos de envío el pedido se trata como recojo', () => {
    expect(textosEstado(pedidoDe('enviado', 'tarjeta', undefined)).nombre).toBe('Listo para recoger');
    expect(textosEstado(pedidoDe('enviado', 'tarjeta', { tipo: 'envio' })).nombre).toBe('Enviando');
  });
});

describe('nombreEstado', () => {
  test('da el nombre en español e inglés para cada combinación', () => {
    ESTADOS.forEach((estado) => {
      METODOS.forEach((metodo) => {
        ENTREGAS.forEach((envio) => {
          const caso = casoEsperado(estado, metodo, envio);
          const pedido = pedidoDe(estado, metodo, envio);
          expect(nombreEstado(pedido, 'es')).toBe(caso.nombre);
          expect(nombreEstado(pedido, 'en')).toBe(caso.nombre_en);
          expect(nombreEstado(pedido, 'es', estado)).toBe(caso.nombre);
        });
      });
    });
  });

  test('cualquier idioma que no sea inglés usa el español', () => {
    const pedido = pedidoDe('entregado', 'tarjeta', { tipo: 'envio' });
    expect(nombreEstado(pedido, 'fr')).toBe('Entregado');
    expect(nombreEstado(pedido, undefined)).toBe('Entregado');
  });

  test('un estado desconocido se muestra tal cual', () => {
    expect(nombreEstado(pedidoDe('raro', 'yape', null), 'es')).toBe('raro');
    expect(nombreEstado({}, 'es', 'otro')).toBe('otro');
  });

  test('sin estado muestra una raya', () => {
    expect(nombreEstado({}, 'es')).toBe('—');
    expect(nombreEstado(null, 'en')).toBe('—');
  });

  test('los nombres que ve el cliente en cada paso', () => {
    const nombres = (envio, metodo) => ['verificando_pago', 'pendiente_envio', 'enviado', 'entregado', 'cancelado']
      .map((e) => nombreEstado(pedidoDe(e, metodo, envio), 'es'));
    expect(nombres({ tipo: 'envio' }, 'tarjeta')).toEqual(['Verificando pago', 'Pagado', 'Enviando', 'Entregado', 'Cancelado']);
    expect(nombres({ tipo: 'recojo' }, 'tarjeta')).toEqual(['Verificando pago', 'Pagado', 'Listo para recoger', 'Entregado', 'Cancelado']);
    expect(nombres({ tipo: 'envio' }, 'efectivo')[0]).toBe('Esperando pago');
  });
});

describe('textoPagina', () => {
  test('da título y texto en cada idioma para cada combinación', () => {
    ESTADOS.forEach((estado) => {
      METODOS.forEach((metodo) => {
        ENTREGAS.forEach((envio) => {
          const caso = casoEsperado(estado, metodo, envio);
          const pedido = pedidoDe(estado, metodo, envio);
          expect(textoPagina(pedido, 'es')).toEqual({ titulo: caso.pagina_titulo, texto: caso.pagina_texto });
          expect(textoPagina(pedido, 'en')).toEqual({ titulo: caso.pagina_titulo_en, texto: caso.pagina_texto_en });
        });
      });
    });
  });

  test('un estado desconocido da null', () => {
    expect(textoPagina(pedidoDe('raro', 'yape', null), 'es')).toBeNull();
    expect(textoPagina(null, 'es')).toBeNull();
  });

  test('pago confirmado dice lo mismo en recojo y en domicilio', () => {
    expect(textoPagina(pedidoDe('pendiente_envio', 'tarjeta', { tipo: 'envio' }), 'es').titulo).toBe('¡Pago confirmado!');
    expect(textoPagina(pedidoDe('pendiente_envio', 'tarjeta', { tipo: 'recojo' }), 'en').titulo).toBe('Payment confirmed!');
  });
});

describe('textosPedidos.json', () => {
  test('no hay textos vacíos ni sin traducir al inglés', () => {
    ESTADOS.forEach((estado) => {
      Object.values(TEXTOS.estados[estado]).forEach((t) => {
        ['nombre', 'nombre_en', 'pagina_titulo', 'pagina_titulo_en', 'pagina_texto', 'pagina_texto_en'].forEach((campo) => {
          expect(typeof t[campo]).toBe('string');
          expect(t[campo].trim()).not.toBe('');
        });
        expect(t.pagina_texto_en).not.toBe(t.pagina_texto);
      });
    });
  });
});
