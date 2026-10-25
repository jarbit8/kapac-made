import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { obtenerProducto, obtenerProductos, productosGuardados, actualizarProducto, eliminarProducto } from '../firebase/productos';
import { imagen } from '../utils/imagen';
import { avisarFallo } from '../utils/avisos';
import { soles } from '../utils/formato';
import { useCart } from '../context/CartContext';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import { nombreProducto } from '../i18n/producto';
import { categoriaLabel, CATEGORIAS } from '../i18n/categorias';
import { useTraducido } from '../i18n/useTraducido';
import { traducirEsEn } from '../i18n/traducir';
import TextoProducto from '../components/TextoProducto';
import Cargando from '../components/Cargando/Cargando';
import { CampoProducto, EstadoProducto, FotosProducto, GaleriaProducto, MAX_GALERIA } from '../components/ProductoEditable';
import { asegurarFuente, cssFuente } from '../utils/fuentes';
import '../styles/Producto.css';

// Dónde aplica cada zona de estilo del producto (definidas al crear/editar en el admin).
// Selectores con 2+ clases para ganarles a las reglas !important del CSS base.
const SELECTOR_ZONA = {
  nombre: '.producto-page .producto-info h1',
  precio: '.producto-page .producto-precio, .producto-page .producto-precio-original',
  descripcion: '.producto-page .producto-descripcion',
  features: '.producto-page .producto-feature strong, .producto-page .producto-feature span',
  specs: '.producto-page .producto-tabla td, .producto-page .producto-tabla td:first-child',
  stock: '.producto-page .producto-stock, .producto-page .producto-stock.stock-bajo',
};

function cssEstilosProducto(estilos) {
  return Object.entries(estilos || {})
    .map(([zona, e]) => {
      const sel = SELECTOR_ZONA[zona];
      if (!sel || (!e?.color && !e?.fuente)) return '';
      const reglas = [
        e.color ? `color: ${e.color} !important;` : '',
        e.fuente ? `font-family: ${cssFuente(e.fuente)} !important;` : '',
      ].filter(Boolean).join(' ');
      return `${sel} { ${reglas} }`;
    })
    .filter(Boolean)
    .join('\n');
}

// Del catálogo guardado, para mostrar la ficha sin esperar a Firestore
const guardadoDe = (id, esAdmin) => productosGuardados()?.find((p) => p.id === id && (p.activo !== false || esAdmin)) || null;
const otrosDe = (id) => (productosGuardados() || []).filter((p) => p.id !== id && p.activo !== false).slice(0, 3);

// Fotos de la ficha: la lista nueva o, en productos viejos, la de catálogo y la de contexto
const fotosDe = (p) => (Array.isArray(p.fotos) && p.fotos.length ? p.fotos : [p.imagenMochila, p.imagenContexto]).filter(Boolean);

function textoDeStock(stock, idioma, t) {
  if (stock <= 0) return t('productos.sin_stock');
  if (stock <= 3) return idioma === 'en' ? `Only ${stock} left!` : `¡Últimas ${stock} unidades!`;
  return idioma === 'en' ? `In stock — ${stock} available` : `Disponible — ${stock} en stock`;
}

// Carrusel de fotos: flechas, puntos y deslizar con el dedo o el mouse
function Carrusel({ fotos, nombre, indice, onIndice, esAdmin, onCambiarFotos }) {
  const touchX = useRef(0);
  const total = fotos.length;

  if (!total) {
    return (
      <div className="producto-galeria">
        {esAdmin ? <FotosProducto fotos={[]} onCambiar={onCambiarFotos} /> : <div className="galeria-marco" />}
      </div>
    );
  }

  const idx = ((indice % total) + total) % total;
  const deslizar = (dx) => {
    if (total > 1 && Math.abs(dx) > 40) onIndice(dx < 0 ? idx + 1 : idx - 1);
  };

  return (
    <div className="producto-galeria">
      <div
        className="galeria-marco"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => deslizar(e.changedTouches[0].clientX - touchX.current)}
        onMouseDown={(e) => { touchX.current = e.clientX; }}
        onMouseUp={(e) => deslizar(e.clientX - touchX.current)}
      >
        <img key={idx} src={imagen(fotos[idx])} alt={nombre} className="galeria-img" draggable="false" />
        {total > 1 && (
          <>
            <button className="galeria-flecha izq" aria-label="Anterior" onClick={() => onIndice(idx - 1)}>‹</button>
            <button className="galeria-flecha der" aria-label="Siguiente" onClick={() => onIndice(idx + 1)}>›</button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="galeria-dots">
          {fotos.map((_, i) => (
            <button
              key={i}
              className={`galeria-dot ${i === idx ? 'activo' : ''}`}
              aria-label={`Imagen ${i + 1}`}
              onClick={() => onIndice(i)}
            />
          ))}
        </div>
      )}
      {esAdmin && <FotosProducto fotos={fotos} elegida={idx} onElegir={onIndice} onCambiar={onCambiarFotos} />}
    </div>
  );
}

// Fotos escalonadas debajo del producto (el admin las edita ahí mismo)
function GaleriaInferior({ producto, idioma, esAdmin, onCambiar }) {
  const nombre = nombreProducto(producto, idioma);
  const galeria = (Array.isArray(producto.galeria) ? producto.galeria : []).filter(Boolean);
  if (esAdmin) return <GaleriaProducto fotos={galeria} nombre={nombre} onCambiar={onCambiar} />;
  const fotos = galeria.map((f) => imagen(f)).slice(0, MAX_GALERIA);
  if (!fotos.length) return null;
  return (
    <section className="producto-galeria-edit">
      <div className="galeria-edit-grid">
        {fotos.map((src, i) => (
          <figure key={i} className={`galeria-edit-item pos-${i}`}>
            <img src={src} alt={`${nombre} ${i + 1}`} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </section>
  );
}

// También te puede gustar
function Relacionados({ productos, idioma }) {
  return (
    <section className="producto-relacionados">
      <h2>{idioma === 'en' ? 'You may also like' : 'También te puede gustar'}</h2>
      <div className="relacionados-grid">
        {productos.map((p) => (
          <Link key={p.id} to={`/producto/${p.id}`} className="relacionado-card">
            <div className="relacionado-img">
              <img src={imagen(p.imagenMochila)} alt={nombreProducto(p, idioma)} loading="lazy" decoding="async" />
            </div>
            <span className="relacionado-nombre"><TextoProducto texto={p.nombre} idioma={idioma} /></span>
            <span className="relacionado-precio">{soles(p.precio, p.moneda)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Producto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agregar, items } = useCart();
  const { t, idioma } = useIdioma();
  const { textos, esAdmin } = useTextos();
  const specsColor = textos['producto_specs_color'] || '';
  const [producto, setProducto] = useState(() => guardadoDe(id, esAdmin));
  const [relacionados, setRelacionados] = useState(() => otrosDe(id));
  const [cargando, setCargando] = useState(() => !guardadoDe(id, esAdmin));
  const [error, setError] = useState(''); // '' | 'no_encontrado' | 'carga'
  const [agregado, setAgregado] = useState(false);
  const [maximo, setMaximo] = useState(false);
  const [imgIdx, setImgIdx] = useState(0); // carrusel de galería
  const nombreTraducido = useTraducido(producto?.nombre, idioma);
  const descripcionTraducida = useTraducido(producto?.descripcion, idioma);
  const cssProducto = cssEstilosProducto(producto?.estilos);

  // Carga las fuentes elegidas para este producto (si hace falta, desde Google Fonts)
  useEffect(() => {
    Object.values(producto?.estilos || {}).forEach((e) => { if (e?.fuente) asegurarFuente(e.fuente); });
  }, [producto]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCargando(!guardadoDe(id, esAdmin));
    setProducto(guardadoDe(id, esAdmin));
    setRelacionados(otrosDe(id));
    setError('');
    setImgIdx(0);
    obtenerProducto(id)
      .then((p) => {
        if (!p || (p.activo === false && !esAdmin)) { setProducto(null); setError('no_encontrado'); }
        else setProducto(p);
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        if (!guardadoDe(id, esAdmin)) setError('carga');
        setCargando(false);
      });
    // Productos relacionados (otros del catálogo)
    obtenerProductos()
      .then((todos) => setRelacionados(todos.filter((p) => p.id !== id && p.activo !== false).slice(0, 3)))
      .catch(() => {});
  }, [id, esAdmin]);

  // Modo edición: cada cambio se guarda al instante y solo escribe los campos que cambiaron
  const productoRef = useRef(producto);
  productoRef.current = producto;
  const filas = (campo) => (Array.isArray(productoRef.current?.[campo]) ? productoRef.current[campo] : []);

  const guardarCampos = async (cambios, anterior) => {
    const antes = anterior || {};
    if (!anterior) Object.keys(cambios).forEach((k) => { antes[k] = productoRef.current[k]; });
    setProducto((p) => (p ? { ...p, ...cambios } : p));
    try {
      await actualizarProducto(id, cambios);
    } catch (e) {
      console.error('No se pudo guardar el producto:', e);
      setProducto((p) => (p ? { ...p, ...antes } : p));
      avisarFallo('guardar el cambio');
    }
  };

  // Nombre y descripción: se guarda el español y se regenera el inglés (si falla, queda vacío)
  const guardarTexto = async (campo, valor) => {
    const antes = { [campo]: productoRef.current[campo], [`${campo}En`]: productoRef.current[`${campo}En`] };
    setProducto((p) => (p ? { ...p, [campo]: valor } : p)); // se ve mientras se traduce
    let en = '';
    if (valor) {
      try { en = (await traducirEsEn(valor)) || ''; } catch (_) {}
    }
    await guardarCampos({ [campo]: valor, [`${campo}En`]: en }, antes);
  };

  const cambiarFila = (campo, i, parte, valor) =>
    guardarCampos({ [campo]: filas(campo).map((f, k) => (k === i ? { ...f, [parte]: valor } : f)) });
  const agregarFila = (campo, nueva) => guardarCampos({ [campo]: [...filas(campo), nueva] });
  const quitarFila = (campo, i) => guardarCampos({ [campo]: filas(campo).filter((_, k) => k !== i) });

  // La primera foto es la portada del catálogo
  const cambiarFotos = (fotos) => guardarCampos({
    fotos,
    imagenMochila: fotos[0] || '',
    ...(producto.imagenContexto ? { imagenContexto: '' } : {}),
  });

  const cambiarGaleria = (galeria) => guardarCampos({ galeria });

  const alternarActivo = () => {
    const activo = producto.activo === false;
    if (activo && (!(producto.nombre || '').trim() || !producto.precio || !producto.imagenMochila)) {
      window.alert('Antes de mostrarlo en la tienda agrega el nombre, el precio y al menos una foto.');
      return;
    }
    guardarCampos({ activo });
  };

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try {
      await eliminarProducto(id);
      navigate('/shop', { replace: true });
    } catch (e) {
      console.error('No se pudo eliminar el producto:', e);
      avisarFallo('eliminar el producto');
    }
  };

  const textoStock = producto ? textoDeStock(producto.stock, idioma, t) : '';

  const handleAgregar = () => {
    const enCarrito = items.find((i) => i.id === producto.id)?.cantidad || 0;
    if (enCarrito >= Number(producto.stock ?? 99)) {
      setAgregado(false);
      setMaximo(true);
      setTimeout(() => setMaximo(false), 2500);
      return;
    }
    agregar(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  return (
    <>
      <Header />
      <main className="producto-page" style={specsColor ? { '--specs-color': specsColor } : undefined}>
        {cssProducto && <style>{cssProducto}</style>}
        {cargando && <Cargando />}
        {error && (
          <p className="producto-msg">
            {error === 'no_encontrado' ? t('producto.no_encontrado') : (idioma === 'en' ? 'Could not load product.' : 'No se pudo cargar el producto.')}
          </p>
        )}

        {producto && (
          <div className="producto-detalle">
            <Carrusel fotos={fotosDe(producto)} nombre={producto.nombre} indice={imgIdx} onIndice={setImgIdx}
              esAdmin={esAdmin} onCambiarFotos={cambiarFotos} />

            <div className="producto-info">
              {esAdmin && <EstadoProducto activo={producto.activo !== false} onAlternar={alternarActivo} />}
              <button className="producto-volver" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/shop'))}>
                <span>{idioma === 'en' ? '← Back' : '← Volver'}</span>
              </button>

              {esAdmin ? (
                <select
                  className="pe-categoria"
                  value={CATEGORIAS.find((c) => c.key === producto.categoria || c.es === producto.categoria)?.key || ''}
                  onChange={(e) => guardarCampos({ categoria: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map((c) => <option key={c.key} value={c.key}>{idioma === 'en' ? c.key : c.es}</option>)}
                </select>
              ) : producto.categoria && (
                <span className="producto-categoria">{categoriaLabel(producto.categoria, idioma)}</span>
              )}

              <h1>
                {esAdmin
                  ? <CampoProducto valor={producto.nombre} placeholder="Agregar nombre" onGuardar={(v) => guardarTexto('nombre', v)} />
                  : nombreTraducido}
              </h1>

              <div className="producto-precios">
                {esAdmin ? (
                  <>
                    <span className="producto-precio">
                      <CampoProducto numero valor={producto.precio || ''} mostrar={soles(producto.precio, producto.moneda)}
                        placeholder="Agregar precio" onGuardar={(v) => guardarCampos({ precio: v })} />
                    </span>
                    <span className="producto-precio-original">
                      <CampoProducto numero opcional valor={producto.precioOriginal || ''} mostrar={soles(producto.precioOriginal, producto.moneda)}
                        placeholder="Agregar precio anterior" onGuardar={(v) => guardarCampos({ precioOriginal: v || null })} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="producto-precio">{soles(producto.precio, producto.moneda)}</span>
                    {producto.precioOriginal && (
                      <span className="producto-precio-original">{soles(producto.precioOriginal, producto.moneda)}</span>
                    )}
                  </>
                )}
              </div>

              <p className="producto-descripcion">
                {esAdmin
                  ? <CampoProducto multiline valor={producto.descripcion} placeholder="Agregar descripción" onGuardar={(v) => guardarTexto('descripcion', v)} />
                  : descripcionTraducida}
              </p>

              {/* Features */}
              {esAdmin ? (
                <div className="producto-features">
                  {filas('features').map((f, i) => (
                    <div key={i} className="producto-feature">
                      <strong>
                        <CampoProducto valor={f.titulo} placeholder="Agregar título" onGuardar={(v) => cambiarFila('features', i, 'titulo', v)} />
                      </strong>
                      <span>
                        <CampoProducto valor={f.desc} placeholder="Agregar descripción" onGuardar={(v) => cambiarFila('features', i, 'desc', v)} />
                      </span>
                      <button type="button" className="pe-quitar" onClick={() => quitarFila('features', i)}>× Quitar</button>
                    </div>
                  ))}
                  <button type="button" className="pe-agregar" onClick={() => agregarFila('features', { titulo: '', desc: '' })}>
                    + Agregar característica
                  </button>
                </div>
              ) : Array.isArray(producto.features) && producto.features.some(f => f.titulo) && (
                <div className="producto-features">
                  {producto.features.filter(f => f.titulo).map((f, i) => (
                    <FeatureFila key={i} titulo={f.titulo} desc={f.desc} idioma={idioma} />
                  ))}
                </div>
              )}

              {/* Especificaciones */}
              {esAdmin ? (
                <>
                  {filas('specs').length > 0 && (
                    <table className="producto-tabla">
                      <tbody>
                        {filas('specs').map((s, i) => (
                          <tr key={i}>
                            <td><CampoProducto valor={s.label} placeholder="Agregar nombre" onGuardar={(v) => cambiarFila('specs', i, 'label', v)} /></td>
                            <td><CampoProducto valor={s.valor} placeholder="Agregar valor" onGuardar={(v) => cambiarFila('specs', i, 'valor', v)} /></td>
                            <td className="pe-celda">
                              <button type="button" className="pe-quitar" onClick={() => quitarFila('specs', i)}>× Quitar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <button type="button" className="pe-agregar" onClick={() => agregarFila('specs', { label: '', valor: '' })}>
                    + Agregar especificación
                  </button>
                </>
              ) : Array.isArray(producto.specs) && producto.specs.some(s => s.label && s.valor) && (
                <table className="producto-tabla">
                  <tbody>
                    {producto.specs.filter(s => s.label && s.valor).map((s, i) => (
                      <SpecFila key={i} label={s.label} valor={s.valor} idioma={idioma} />
                    ))}
                  </tbody>
                </table>
              )}

              <p className={`producto-stock ${producto.stock > 0 && producto.stock <= 3 ? 'stock-bajo' : ''}`}>
                {esAdmin
                  ? <CampoProducto numero valor={producto.stock ?? 0} mostrar={textoStock} onGuardar={(v) => guardarCampos({ stock: v })} />
                  : textoStock}
              </p>

              <button
                className="producto-add"
                onClick={handleAgregar}
                disabled={producto.stock <= 0}
              >
                <span>{agregado ? t('producto.agregado') : maximo ? t('producto.maximo') : t('producto.agregar')}</span>
              </button>

              <button className="producto-ir-carrito" onClick={() => navigate('/carrito')}>
                <span>{idioma === 'en' ? 'Go to cart' : 'Ir al carrito'}</span>
              </button>

              {esAdmin && <button type="button" className="pe-eliminar" onClick={eliminar}>Eliminar producto</button>}
            </div>
          </div>
        )}

        {producto && <GaleriaInferior producto={producto} idioma={idioma} esAdmin={esAdmin} onCambiar={cambiarGaleria} />}

        {producto && relacionados.length > 0 && <Relacionados productos={relacionados} idioma={idioma} />}
      </main>
      <Footer />
    </>
  );
}

// Fila de "Características" — traduce título y descripción automáticamente al inglés.
function FeatureFila({ titulo, desc, idioma }) {
  const tituloT = useTraducido(titulo, idioma);
  const descT = useTraducido(desc, idioma);
  return (
    <div className="producto-feature">
      <strong>{tituloT}</strong>
      {desc && <span>{descT}</span>}
    </div>
  );
}

// Fila de "Especificaciones" — traduce etiqueta y valor automáticamente al inglés.
function SpecFila({ label, valor, idioma }) {
  const labelT = useTraducido(label, idioma);
  const valorT = useTraducido(valor, idioma);
  return <tr><td>{labelT}</td><td>{valorT}</td></tr>;
}
