import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { obtenerProductos } from '../firebase/productos';
import { imagen } from '../firebase/imagenesProductos';
import { useCart } from '../context/CartContext';
import '../styles/Catalogo.css';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { agregar } = useCart();

  const busqueda = searchParams.get('q') || '';
  const [catSel, setCatSel] = useState('Todas');
  const [orden, setOrden] = useState('relevancia');

  useEffect(() => {
    obtenerProductos()
      .then((data) => {
        setProductos(data.filter((p) => p.activo !== false));
        setCargando(false);
      })
      .catch((e) => {
        setError('No se pudieron cargar los productos.');
        setCargando(false);
        console.error(e);
      });
  }, []);

  // Categorías disponibles (sacadas de los productos)
  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  // Aplicar búsqueda + filtro + orden
  const filtrados = useMemo(() => {
    let res = [...productos];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      res = res.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.descripcion || '').toLowerCase().includes(q)
      );
    }

    if (catSel !== 'Todas') {
      res = res.filter((p) => p.categoria === catSel);
    }

    if (orden === 'precio-asc') res.sort((a, b) => a.precio - b.precio);
    if (orden === 'precio-desc') res.sort((a, b) => b.precio - a.precio);

    return res;
  }, [productos, busqueda, catSel, orden]);

  const limpiarBusqueda = () => {
    searchParams.delete('q');
    setSearchParams(searchParams);
  };

  return (
    <>
      <Header />
      <main className="catalogo-page">
        <h1 className="catalogo-page-title">Catálogo</h1>

        {busqueda && (
          <p className="catalogo-busqueda-info">
            Resultados para: <strong>"{busqueda}"</strong>
            <button onClick={limpiarBusqueda} className="catalogo-limpiar">✕ limpiar</button>
          </p>
        )}

        {/* Filtros */}
        {!cargando && !error && (
          <div className="catalogo-filtros">
            <div className="catalogo-cats">
              {categorias.map((c) => (
                <button
                  key={c}
                  className={catSel === c ? 'activo' : ''}
                  onClick={() => setCatSel(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <select value={orden} onChange={(e) => setOrden(e.target.value)} className="catalogo-orden">
              <option value="relevancia">Ordenar por</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>
          </div>
        )}

        {cargando && <p style={{ color: '#666' }}>Cargando productos...</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        {!cargando && !error && filtrados.length === 0 && (
          <p style={{ color: '#666', padding: '40px 0' }}>
            No se encontraron productos{busqueda ? ` para "${busqueda}"` : ''}.
          </p>
        )}

        {!cargando && !error && filtrados.length > 0 && (
          <div className="catalogo-page-grid">
            {filtrados.map((p) => (
              <div key={p.id} className="catalogo-page-card">
                <Link to={`/producto/${p.id}`}>
                  <img src={imagen(p.imagenMochila)} alt={p.nombre} />
                </Link>
                <div className="catalogo-page-info">
                  <Link to={`/producto/${p.id}`} className="catalogo-page-name">
                    {p.nombre}
                  </Link>
                  <div className="catalogo-page-precios">
                    <span className="precio-actual">{p.moneda}{p.precio}.00</span>
                    {p.precioOriginal && (
                      <span className="precio-original">{p.moneda}{p.precioOriginal}.00</span>
                    )}
                  </div>
                  <button className="catalogo-add-btn" onClick={() => agregar(p)}>
                    Agregar al carrito
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
