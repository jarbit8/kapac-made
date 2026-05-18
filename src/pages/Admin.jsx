import React, { useState } from 'react';
import Header from '../components/Header/Header';
import { seedProductos } from '../firebase/seed';
import { obtenerProductos } from '../firebase/productos';

export default function Admin() {
  const [estado, setEstado] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const subir = async () => {
    setCargando(true);
    setEstado('Subiendo...');
    try {
      const r = await seedProductos();
      setEstado(`✅ ${r.mensaje} (creados: ${r.creados})`);
    } catch (e) {
      setEstado('❌ Error: ' + e.message);
    }
    setCargando(false);
  };

  const ver = async () => {
    setCargando(true);
    try {
      const p = await obtenerProductos();
      setProductos(p);
      setEstado(`📦 ${p.length} productos en la base de datos`);
    } catch (e) {
      setEstado('❌ Error: ' + e.message);
    }
    setCargando(false);
  };

  return (
    <>
      <Header />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 30px' }}>
        <h1 style={{ marginBottom: 20 }}>Panel temporal — Admin</h1>
        <p style={{ color: '#666', marginBottom: 30 }}>
          Esta página es temporal, solo para cargar/verificar productos en Firebase.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={subir} disabled={cargando}
            style={{ padding: '12px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Subir mochilas a Firebase
          </button>
          <button onClick={ver} disabled={cargando}
            style={{ padding: '12px 24px', background: '#fff', color: '#111', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}>
            Ver productos guardados
          </button>
        </div>

        {estado && (
          <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 6, marginBottom: 20 }}>
            {estado}
          </div>
        )}

        {productos.length > 0 && (
          <pre style={{ background: '#1a1a1a', color: '#0f0', padding: 20, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify(productos, null, 2)}
          </pre>
        )}
      </div>
    </>
  );
}
