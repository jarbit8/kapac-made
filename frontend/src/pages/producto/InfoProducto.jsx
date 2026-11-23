import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdioma } from '../../context/LanguageContext';
import { categoriaLabel, CATEGORIAS } from '../../i18n/categorias';
import { useTraducido } from '../../i18n/useTraducido';
import { CampoProducto, EstadoProducto } from '../../components/ProductoEditable';
import Caracteristicas from './Caracteristicas';
import Especificaciones from './Especificaciones';
import useAgregarAlCarrito from './useAgregarAlCarrito';
import { textoStock } from './estilos';

export default function InfoProducto({ producto, esAdmin, edicion }) {
  const navigate = useNavigate();
  const { t, idioma } = useIdioma();
  const { agregado, maximo, handleAgregar } = useAgregarAlCarrito(producto);
  const nombreTraducido = useTraducido(producto.nombre, idioma);
  const descripcionTraducida = useTraducido(producto.descripcion, idioma);
  const { guardarCampos, guardarTexto, alternarActivo, eliminar } = edicion;
  const stockTexto = textoStock(producto, t, idioma);

  return (
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

      <Caracteristicas producto={producto} esAdmin={esAdmin} idioma={idioma} edicion={edicion} />
      <Especificaciones producto={producto} esAdmin={esAdmin} idioma={idioma} edicion={edicion} />

      <p className={`producto-stock ${producto.stock > 0 && producto.stock <= 3 ? 'stock-bajo' : ''}`}>
        {esAdmin
          ? <CampoProducto numero valor={producto.stock ?? 0} mostrar={stockTexto} onGuardar={(v) => guardarCampos({ stock: v })} />
          : stockTexto}
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
  );
}
