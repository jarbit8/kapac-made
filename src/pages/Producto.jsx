import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ET from '../components/ET';
import Editable from '../components/Editable';
import { obtenerProducto, obtenerProductos } from '../firebase/productos';
import { imagen } from '../firebase/imagenesProductos';
import { useCart } from '../context/CartContext';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import { nombreProducto } from '../i18n/producto';
import { categoriaLabel } from '../i18n/categorias';
import { useTraducido } from '../i18n/useTraducido';
import TextoProducto from '../components/TextoProducto';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Producto.css';

export default function Producto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agregar } = useCart();
  const { t, idioma } = useIdioma();
  const { textos } = useTextos();
  const specsColor = textos['producto_specs_color'] || '';
  const [producto, setProducto] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agregado, setAgregado] = useState(false);
  const [imgIdx, setImgIdx] = useState(0); // carrusel de galería
  const touchX = useRef(0); // para deslizar (swipe)
  const nombreTraducido = useTraducido(producto?.nombre, idioma);
  const descripcionTraducida = useTraducido(producto?.descripcion, idioma);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCargando(true);
    setImgIdx(0);
    obtenerProducto(id)
      .then((p) => {
        if (!p) setError(t('producto.no_encontrado'));
        else setProducto(p);
        setCargando(false);
      })
      .catch((e) => {
        console.error(e);
        setError(idioma === 'en' ? 'Could not load product.' : 'No se pudo cargar el producto.');
        setCargando(false);
      });
    // Productos relacionados (otros del catálogo)
    obtenerProductos()
      .then((todos) => {
        const otros = todos.filter((p) => p.id !== id).slice(0, 3);
        setRelacionados(otros);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAgregar = () => {
    agregar(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  return (
    <>
      <Header />
      <main className="producto-page" style={specsColor ? { '--specs-color': specsColor } : undefined}>
        {cargando && <Cargando />}
        {error && <p className="producto-msg">{error}</p>}

        {producto && (
          <div className="producto-detalle">
            {(() => {
              const imgs = (Array.isArray(producto.fotos) && producto.fotos.length
                ? producto.fotos
                : [producto.imagenMochila, producto.imagenContexto]).filter(Boolean);
              const total = imgs.length;
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
                </div>
              );
            })()}

            <div className="producto-info">
              <button className="producto-volver" onClick={() => navigate(-1)}>
                <Editable id="producto_volver" as="span" sinColor>{idioma === 'en' ? '← Back' : '← Volver'}</Editable>
              </button>

              {producto.categoria && (
                <span className="producto-categoria">{categoriaLabel(producto.categoria, idioma)}</span>
              )}

              <h1>{nombreTraducido}</h1>

              <div className="producto-precios">
                <span className="producto-precio">{producto.moneda}{producto.precio}.00</span>
                {producto.precioOriginal && (
                  <span className="producto-precio-original">{producto.moneda}{producto.precioOriginal}.00</span>
                )}
              </div>

              <p className="producto-descripcion">{descripcionTraducida}</p>

              {/* Features */}
              {Array.isArray(producto.features) && producto.features.some(f => f.titulo) && (
                <div className="producto-features">
                  {producto.features.filter(f => f.titulo).map((f, i) => (
                    <FeatureFila key={i} titulo={f.titulo} desc={f.desc} idioma={idioma} />
                  ))}
                </div>
              )}

              {/* Especificaciones */}
              {Array.isArray(producto.specs) && producto.specs.some(s => s.label && s.valor) && (
                <table className="producto-tabla">
                  <tbody>
                    {producto.specs.filter(s => s.label && s.valor).map((s, i) => (
                      <SpecFila key={i} label={s.label} valor={s.valor} idioma={idioma} />
                    ))}
                  </tbody>
                </table>
              )}

              <p className={`producto-stock ${producto.stock > 0 && producto.stock <= 3 ? 'stock-bajo' : ''}`}>
                {producto.stock <= 0
                  ? `${t('productos.sin_stock')}`
                  : producto.stock <= 3
                    ? (idioma === 'en' ? `Only ${producto.stock} left!` : `¡Últimas ${producto.stock} unidades!`)
                    : (idioma === 'en'
                        ? `In stock — ${producto.stock} available`
                        : `Disponible — ${producto.stock} en stock`)}
              </p>

              <button
                className="producto-add"
                onClick={handleAgregar}
                disabled={producto.stock <= 0}
              >
                {agregado ? <ET k="producto.agregado" sinColor /> : <ET k="producto.agregar" sinColor />}
              </button>

              <button className="producto-ir-carrito" onClick={() => navigate('/carrito')}>
                <Editable id="producto_ir_carrito" as="span" sinColor>{idioma === 'en' ? 'Go to cart' : 'Ir al carrito'}</Editable>
              </button>
            </div>
          </div>
        )}

        {/* Galería propia del producto — filas escalonadas (sin título) */}
        {producto && (() => {
          const fotos = (producto.galeria || []).filter(Boolean).map(imagen).slice(0, 6);
          if (!fotos.length) return null;
          return (
            <section className="producto-galeria-edit">
              <div className="galeria-edit-grid">
                {fotos.map((src, i) => (
                  <figure key={i} className={`galeria-edit-item pos-${i}`}>
                    <img src={src} alt={`${nombreProducto(producto, idioma)} ${i + 1}`} loading="lazy" />
                  </figure>
                ))}
              </div>
            </section>
          );
        })()}

        {/* También te puede gustar */}
        {producto && relacionados.length > 0 && (
          <section className="producto-relacionados">
            <Editable id="producto_relacionados_titulo" as="h2">{idioma === 'en' ? 'You may also like' : 'También te puede gustar'}</Editable>
            <div className="relacionados-grid">
              {relacionados.map((p) => (
                <Link key={p.id} to={`/producto/${p.id}`} className="relacionado-card">
                  <div className="relacionado-img">
                    <img src={imagen(p.imagenMochila)} alt={nombreProducto(p, idioma)} />
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
