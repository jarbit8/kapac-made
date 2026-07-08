import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/Header.css';
import '../EditableImage.css';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { esCorreoAdmin } from '../../config/admins';
import { useIdioma } from '../../context/LanguageContext';
import { obtenerProductos } from '../../firebase/productos';
import logoVerde    from '../../assets/images/kapac_made_3.png';
import logoTerracota from '../../assets/images/kapac_made_1.png';
import { useTema, LOGO_CACHE_KEY } from '../../context/TemaContext';
import { obtenerContenido, guardarContenido } from '../../firebase/contenido';
import { subirImagen } from '../../firebase/almacenamiento';

export default function Header({ transparente = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [termino, setTermino] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [productos, setProductos] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);

  useEffect(() => {
    if (!transparente) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparente]);

  // Cargar productos para autocomplete cuando se abre el buscador
  useEffect(() => {
    if (!buscarOpen || productos.length > 0) return;
    obtenerProductos().then(setProductos).catch(() => {});
  }, [buscarOpen, productos.length]);

  // Calcular sugerencias mientras se escribe
  useEffect(() => {
    if (!termino.trim()) { setSugerencias([]); return; }
    const q = termino.toLowerCase();
    const matches = productos
      .filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.nombreEn || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
    setSugerencias(matches);
  }, [termino, productos]);
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { usuario } = useAuth();
  const { idioma, setIdioma, t } = useIdioma();

  const cerrarBuscador = () => {
    setBuscarOpen(false);
    setTermino('');
    setSugerencias([]);
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    if (termino.trim()) {
      navigate(`/catalogo?q=${encodeURIComponent(termino.trim())}`);
      cerrarBuscador();
    }
  };

  const irAProducto = (id) => {
    navigate(`/producto/${id}`);
    cerrarBuscador();
  };

  // Navegación principal
  const itemsMenu = [
    { label: 'Shop',       to: '/catalogo' },
    { label: 'B2B',        to: '/b2b' },
    { label: 'Kapac Made', to: '/alma' },
    { label: t('menu.contacto'), to: '/contacto' },
  ];

  const handleCuenta = () => {
    if (usuario) {
      navigate('/perfil');
    } else {
      navigate('/login');
    }
  };

  const esAdmin = esCorreoAdmin(usuario?.email);
  const esSolido = !transparente || scrolled;
  const { logo, logoListo, setTema } = useTema();
  const logoSrc  = logo || logoTerracota; // logo del admin o el de la marca

  // El logo se cambia acá mismo (antes vivía en la pestaña Fotos del admin).
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const logoInputRef = useRef(null);
  const cambiarLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const url = await subirImagen(file, 'logo');
      const c = await obtenerContenido();
      await guardarContenido({ ...c, logo: url });
      setTema((prev) => ({ ...prev, logo: url }));
      try { localStorage.setItem(LOGO_CACHE_KEY, url); } catch (_) {}
    } catch (_) { /* error silencioso */ }
    setSubiendoLogo(false);
  };

  return (
    <>
      {/* Header — siempre solo el logo centrado, sin hamburger ni carrito */}
      <header className={`header${esSolido ? ' header-solido' : ''}`}>
        <div className="header-container">
          <Link to="/" className={`logo${esAdmin ? ' editable-img-wrap' : ''}`}>
            <img src={logoSrc} alt="Kapac Made" className={`logo-simbolo${esAdmin ? ' editable-img' : ''}`}
              style={logoListo ? undefined : { opacity: 0 }} />
            {esAdmin && (
              <>
                <button
                  type="button"
                  className="editable-img-btn"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); logoInputRef.current?.click(); }}
                  disabled={subiendoLogo}
                >
                  {subiendoLogo ? 'Subiendo…' : '🖼️ Cambiar logo'}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={cambiarLogo} hidden
                  onClick={(e) => e.stopPropagation()} />
              </>
            )}
          </Link>
        </div>
      </header>
    </>
  );
}
