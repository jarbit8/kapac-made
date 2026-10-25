import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { obtenerProductos, productosGuardados, agregarProducto } from '../firebase/productos';
import { imagen } from '../utils/imagen';
import { avisarFallo } from '../utils/avisos';
import { soles } from '../utils/formato';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import TextoProducto from '../components/TextoProducto';
import Cargando from '../components/Cargando/Cargando';
import '../styles/Catalogo.css';

// Borrador que se crea al agregar un producto en modo edición, con textos base para reemplazar
const PRODUCTO_NUEVO = {
  nombre: '', nombreEn: '',
  precio: 0, precioOriginal: null, moneda: 'S/',
  imagenMochila: '', imagenContexto: '',
  fotos: [],
  descripcion: 'Escribe aquí la descripción de la mochila.', descripcionEn: '',
  stock: 0, activo: false, categoria: 'Climbing',
  galeria: [],
  features: [
    { titulo: 'Característica 1', desc: 'Describe la característica 1' },
    { titulo: 'Característica 2', desc: 'Describe la característica 2' },
    { titulo: 'Característica 3', desc: 'Describe la característica 3' },
  ],
  specs: [
    { label: 'Especificación 1', valor: 'Detalle 1' },
    { label: 'Especificación 2', valor: 'Detalle 2' },
    { label: 'Especificación 3', valor: 'Detalle 3' },
  ],
  estilos: {},
};

export default function Catalogo() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState(() => productosGuardados() || []);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(() => productosGuardados() === null);
  const [error, setError] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, idioma } = useIdioma();
  const { textos, esAdmin, guardar } = useTextos();
  const colorProductos = textos['catalogo_color'] || '';

  const busqueda = searchParams.get('q') || '';

  useEffect(() => {
    obtenerProductos()
      .then((data) => {
        setProductos(data);
        setCargando(false);
      })
      .catch((e) => {
        // Sin conexión se quedan los de la visita anterior
        if (productosGuardados() === null) setError(true);
        setCargando(false);
        console.error(e);
      });
  }, []);

  const filtrados = useMemo(() => {
    // Los borradores (activo: false) solo los ve el admin en modo edición
    let res = productos.filter((p) => p.activo !== false || esAdmin);

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      res = res.filter((p) =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.nombreEn || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.descripcionEn || '').toLowerCase().includes(q)
      );
    }

    return res;
  }, [productos, busqueda, esAdmin]);

  const crearProducto = async () => {
    setCreando(true);
    try {
      const id = await agregarProducto(PRODUCTO_NUEVO);
      navigate(`/producto/${id}`);
    } catch (e) {
      console.error('No se pudo crear el producto:', e);
      avisarFallo('guardar el cambio');
      setCreando(false);
    }
  };

  const limpiarBusqueda = () => {
    searchParams.delete('q');
    setSearchParams(searchParams);
  };

  return (
    <>
      <Header />
      <main className="catalogo-page" style={colorProductos ? { '--catalogo-texto': colorProductos } : undefined}>
        <h1 className="catalogo-page-title">
          <span>{t('catalogo.titulo')}</span>
          {esAdmin && (
            <input
              type="color"
              className="editable-color"
              value={colorProductos || '#1d1b15'}
              onChange={(e) => guardar('catalogo_color', e.target.value)}
              title="Color del nombre y precio de TODOS los productos"
              style={{ marginLeft: 10, verticalAlign: 'middle' }}
            />
          )}
        </h1>

        {busqueda && (
          <p className="catalogo-busqueda-info">
            <span>{idioma === 'en' ? 'Results for:' : 'Resultados para:'}</span> <strong>"{busqueda}"</strong>
            <button onClick={limpiarBusqueda} className="catalogo-limpiar">
              ✕ <span>{idioma === 'en' ? 'clear' : 'limpiar'}</span>
            </button>
          </p>
        )}

        {cargando && <Cargando />}
        {error && <p style={{ color: 'crimson' }}>{idioma === 'en' ? 'Could not load products.' : 'No se pudieron cargar los productos.'}</p>}

        {!cargando && !error && filtrados.length === 0 && (
          <p style={{ color: '#666', padding: '40px 0' }}><span>{t('catalogo.vacio')}</span></p>
        )}

        {!cargando && !error && (filtrados.length > 0 || esAdmin) && (
          <div className="catalogo-page-grid">
            {filtrados.map((p) => (
              <div key={p.id} className={`catalogo-page-card${p.activo === false ? ' borrador' : ''}`}>
                {p.activo === false && <span className="catalogo-borrador">Borrador</span>}
                <Link to={`/producto/${p.id}`} className="cat-img-wrap">
                  {!p.imagenMochila
                    ? <span className={`cat-sin-foto${esAdmin ? '' : ' vacia'}`}>{esAdmin ? 'Sin foto' : ''}</span>
                    : <img src={imagen(p.imagenMochila)} alt={p.nombre} loading="lazy" decoding="async" />}
                </Link>
                <div className="catalogo-page-info">
                  <Link to={`/producto/${p.id}`} className="catalogo-page-name">
                    {esAdmin && !p.nombre ? 'Sin nombre' : <TextoProducto texto={p.nombre} idioma={idioma} />}
                  </Link>
                  <div className="catalogo-page-precios">
                    <span className="precio-actual">{soles(p.precio, p.moneda)}</span>
                    {p.precioOriginal && (
                      <span className="precio-original">{soles(p.precioOriginal, p.moneda)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {esAdmin && (
              <button type="button" className="catalogo-agregar" onClick={crearProducto} disabled={creando}>
                <span className="catalogo-agregar-caja">{creando ? 'Creando…' : '+ Agregar producto'}</span>
              </button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
