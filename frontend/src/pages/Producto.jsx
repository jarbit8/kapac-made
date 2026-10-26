import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { obtenerProducto, obtenerProductos, productosGuardados, actualizarProducto, eliminarProducto } from '../firebase/productos';
import { imagen } from '../firebase/imagenesProductos';
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

export default function Producto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agregar, items } = useCart();
  const { t, idioma } = useIdioma();
  const { textos, esAdmin } = useTextos();
  const specsColor = textos['producto_specs_color'] || '';
  // Del catálogo guardado, para mostrar la ficha sin esperar a Firestore
  const guardado = () => productosGuardados()?.find((p) => p.id === id && (p.activo !== false || esAdmin)) || null;
  const otrosGuardados = () => (productosGuardados() || []).filter((p) => p.id !== id && p.activo !== false).slice(0, 3);
  const [producto, setProducto] = useState(guardado);
  const [relacionados, setRelacionados] = useState(otrosGuardados);
  const [cargando, setCargando] = useState(() => !guardado());
  const [error, setError] = useState('');
  const [agregado, setAgregado] = useState(false);
  const [maximo, setMaximo] = useState(false);
  const [imgIdx, setImgIdx] = useState(0); // carrusel de galería
  const touchX = useRef(0); // para deslizar (swipe)
  const nombreTraducido = useTraducido(producto?.nombre, idioma);
  const descripcionTraducida = useTraducido(producto?.descripcion, idioma);
  const cssProducto = cssEstilosProducto(producto?.estilos);

  // Carga las fuentes elegidas para este producto (si hace falta, desde Google Fonts)
  useEffect(() => {
    Object.values(producto?.estilos || {}).forEach((e) => { if (e?.fuente) asegurarFuente(e.fuente); });
  }, [producto]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCargando(!guardado());
    setProducto(guardado());
    setRelacionados(otrosGuardados());
    setError('');
    setImgIdx(0);
    obtenerProducto(id)
      .then((p) => {
        if (!p || (p.activo === false && !esAdmin)) { setProducto(null); setError(t('producto.no_encontrado')); }
        else setProducto(p);
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        if (!guardado()) setError(idioma === 'en' ? 'Could not load product.' : 'No se pudo cargar el producto.');
        setCargando(false);
      });
    // Productos relacionados (otros del catálogo)
    obtenerProductos()
      .then((todos) => {
        const otros = todos.filter((p) => p.id !== id && p.activo !== false).slice(0, 3);
        setRelacionados(otros);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      window.alert('No se pudo guardar el cambio. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
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
      window.alert('No se pudo eliminar el producto. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
  };

  const textoStock = producto
    ? (producto.stock <= 0
        ? `${t('productos.sin_stock')}`
        : producto.stock <= 3
          ? (producto.stock === 1
            ? (idioma === 'en' ? 'Last one left!' : '¡Última unidad!')
            : (idioma === 'en' ? `Only ${producto.stock} left!` : `¡Últimas ${producto.stock} unidades!`))
          : (idioma === 'en'
              ? `In stock — ${producto.stock} available`
              : `Disponible — ${producto.stock} en stock`))
    : '';

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
        {error && <p className="producto-msg">{error}</p>}

        {producto && (
          <div className="producto-detalle">
            {(() => {
              const imgs = (Array.isArray(producto.fotos) && producto.fotos.length
                ? producto.fotos
                : [producto.imagenMochila, producto.imagenContexto]).filter(Boolean);
              const total = imgs.length;
              if (!total) {
                return (
                  <div className="producto-galeria">
                    {esAdmin ? <FotosProducto fotos={[]} onCambiar={cambiarFotos} /> : <div className="galeria-marco" />}
                  </div>
                );
              }
              const idx = ((imgIdx % total) + total) % total;
              return (
                <div className="producto-galeria">
                  <div
                    className="galeria-marco"
                    onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                      const dx = e.changedTouches[0].clientX - touchX.current;
                      if (total > 1 && Math.abs(dx) > 40) setImgIdx(dx < 0 ? idx + 1 : idx - 1);
                    }}
                    onMouseDown={(e) => { touchX.current = e.clientX; }}
                    onMouseUp={(e) => {
                      const dx = e.clientX - touchX.current;
                      if (total > 1 && Math.abs(dx) > 40) setImgIdx(dx < 0 ? idx + 1 : idx - 1);
                    }}
                  >
                    <img key={idx} src={imagen(imgs[idx])} alt={producto.nombre} className="galeria-img" draggable="false" />
                    {total > 1 && (
                      <>
                        <button className="galeria-flecha izq" aria-label="Anterior" onClick={() => setImgIdx(idx - 1)}>‹</button>
                        <button className="galeria-flecha der" aria-label="Siguiente" onClick={() => setImgIdx(idx + 1)}>›</button>
                      </>
                    )}
                  </div>
                  {total > 1 && (
                    <div className="galeria-dots">
                      {imgs.map((_, i) => (
                        <button
                          key={i}
                          className={`galeria-dot ${i === idx ? 'activo' : ''}`}
                          aria-label={`Imagen ${i + 1}`}
                          onClick={() => setImgIdx(i)}
                        />
                      ))}
                    </div>
                  )}
                  {esAdmin && <FotosProducto fotos={imgs} elegida={idx} onElegir={setImgIdx} onCambiar={cambiarFotos} />}
                </div>
              );
            })()}

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
                  {!CATEGORIAS.some((c) => c.key === producto.categoria || c.es === producto.categoria) && <option value="">Sin categoría</option>}
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
                      <CampoProducto numero valor={producto.precio || ''} mostrar={`${producto.moneda}${producto.precio}.00`}
                        placeholder="Agregar precio" onGuardar={(v) => guardarCampos({ precio: v })} />
                    </span>
                    <span className="producto-precio-original">
                      <CampoProducto numero opcional valor={producto.precioOriginal || ''} mostrar={`${producto.moneda}${producto.precioOriginal}.00`}
                        placeholder="Agregar precio anterior" onGuardar={(v) => guardarCampos({ precioOriginal: v || null })} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="producto-precio">{producto.moneda}{producto.precio}.00</span>
                    {producto.precioOriginal && (
                      <span className="producto-precio-original">{producto.moneda}{producto.precioOriginal}.00</span>
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

        {/* Galería propia del producto — filas escalonadas (sin título) */}
        {producto && (() => {
          const galeria = (Array.isArray(producto.galeria) ? producto.galeria : []).filter(Boolean);
          if (esAdmin) return <GaleriaProducto fotos={galeria} nombre={nombreProducto(producto, idioma)} onCambiar={cambiarGaleria} />;
          const fotos = galeria.map(imagen).slice(0, MAX_GALERIA);
          if (!fotos.length) return null;
          return (
            <section className="producto-galeria-edit">
              <div className="galeria-edit-grid">
                {fotos.map((src, i) => (
                  <figure key={i} className={`galeria-edit-item pos-${i}`}>
                    <img src={src} alt={`${nombreProducto(producto, idioma)} ${i + 1}`} loading="lazy" decoding="async" />
                  </figure>
                ))}
              </div>
            </section>
          );
        })()}

        {/* También te puede gustar */}
        {producto && relacionados.length > 0 && (
          <section className="producto-relacionados">
            <h2>{idioma === 'en' ? 'You may also like' : 'También te puede gustar'}</h2>
            <div className="relacionados-grid">
              {relacionados.map((p) => (
                <Link key={p.id} to={`/producto/${p.id}`} className="relacionado-card">
                  <div className="relacionado-img">
                    <img src={imagen(p.imagenMochila)} alt={nombreProducto(p, idioma)} loading="lazy" decoding="async" />
                  </div>
                  <span className="relacionado-nombre"><TextoProducto texto={p.nombre} idioma={idioma} /></span>
                  <span className="relacionado-precio">{p.moneda}{p.precio}.00</span>
                </Link>
              ))}
            </div>
          </section>
        )}
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
