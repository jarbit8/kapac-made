import React, { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import {
  obtenerProductos, agregarProducto, actualizarProducto, eliminarProducto,
} from '../firebase/productos';
import { IMAGENES, imagen } from '../firebase/imagenesProductos';
import '../styles/Admin.css';

const CATEGORIAS = ['Aventura', 'Urbana', 'Viaje', 'Trabajo'];

const VACIO = {
  nombre: '', precio: '', precioOriginal: '', moneda: 'S/',
  imagenMochila: 'mochila-1', imagenContexto: 'foto-1',
  descripcion: '', stock: '', activo: true, categoria: 'Aventura',
};

export default function Admin() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [msg, setMsg] = useState('');
  const claves = Object.keys(IMAGENES);

  const cargar = async () => {
    setProductos(await obtenerProductos());
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    const datos = {
      ...form,
      precio: Number(form.precio),
      precioOriginal: Number(form.precioOriginal) || null,
      stock: Number(form.stock) || 0,
    };
    try {
      if (editandoId) {
        await actualizarProducto(editandoId, datos);
        setMsg('✅ Producto actualizado');
      } else {
        await agregarProducto(datos);
        setMsg('✅ Producto agregado');
      }
      setForm(VACIO);
      setEditandoId(null);
      cargar();
    } catch (err) {
      setMsg('❌ ' + err.message);
    }
  };

  const editar = (p) => {
    setForm({
      nombre: p.nombre, precio: p.precio, precioOriginal: p.precioOriginal || '',
      moneda: p.moneda || 'S/', imagenMochila: p.imagenMochila,
      imagenContexto: p.imagenContexto, descripcion: p.descripcion || '',
      stock: p.stock || '', activo: p.activo !== false,
      categoria: p.categoria || 'Aventura',
    });
    setEditandoId(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const borrar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    await eliminarProducto(id);
    setMsg('🗑️ Producto eliminado');
    cargar();
  };

  return (
    <>
      <Header />
      <div className="admin-page">
        <h1>Panel de productos</h1>
        <p className="admin-sub">Gestiona el catálogo de Kapac Made (página interna).</p>
        {msg && <div className="admin-msg">{msg}</div>}

        <form className="admin-form" onSubmit={guardar}>
          <h2>{editandoId ? 'Editar producto' : 'Agregar producto'}</h2>
          <div className="admin-grid">
            <label>Nombre
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </label>
            <label>Precio
              <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            </label>
            <label>Precio original (opcional)
              <input type="number" value={form.precioOriginal} onChange={(e) => setForm({ ...form, precioOriginal: e.target.value })} />
            </label>
            <label>Stock
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </label>
            <label>Categoría
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Imagen mochila
              <select value={form.imagenMochila} onChange={(e) => setForm({ ...form, imagenMochila: e.target.value })}>
                {claves.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Imagen contexto
              <select value={form.imagenContexto} onChange={(e) => setForm({ ...form, imagenContexto: e.target.value })}>
                {claves.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label>Descripción
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows="2" />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Producto activo (visible en la tienda)
          </label>
          <div className="admin-acciones">
            <button type="submit">{editandoId ? 'Guardar cambios' : 'Agregar producto'}</button>
            {editandoId && (
              <button type="button" className="admin-cancelar" onClick={() => { setForm(VACIO); setEditandoId(null); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <h2 className="admin-lista-titulo">Productos ({productos.length})</h2>
        <div className="admin-lista">
          {productos.map((p) => (
            <div key={p.id} className="admin-card">
              <img src={imagen(p.imagenMochila)} alt={p.nombre} />
              <div className="admin-card-info">
                <strong>{p.nombre}</strong>
                <span>{p.moneda}{p.precio}.00 · stock: {p.stock} · {p.activo !== false ? 'activo' : 'oculto'}</span>
              </div>
              <div className="admin-card-btns">
                <button onClick={() => editar(p)}>Editar</button>
                <button className="del" onClick={() => borrar(p.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
