import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/Header.css';
import '../EditableImage.css';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useIdioma } from '../../context/LanguageContext';
import Icono from '../Icono';
import { obtenerProductos } from '../../firebase/productos';
import logoVerde    from '../../assets/images/kapac_made_3.png';
import logoTerracota from '../../assets/images/kapac_made_1.png';
import { useTema, LOGO_CACHE_KEY } from '../../context/TemaContext';
import { cambiarContenido } from '../../firebase/contenido';
import { subirImagen } from '../../firebase/almacenamiento';
import { fotoRapida } from '../../utils/fotos';
import { cuentaDe } from '../../utils/compra';

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
    obtenerProductos().then((p) => setProductos(p.filter((x) => x.activo !== false))).catch(() => {});
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
  const { usuario, puedeEditar: esAdmin, esAdmin: administrador } = useAuth();
  const { idioma, setIdioma, t } = useIdioma();

  const cerrarBuscador = () => {
    setBuscarOpen(false);
    setTermino('');
    setSugerencias([]);
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    if (termino.trim()) {
      navigate(`/shop?q=${encodeURIComponent(termino.trim())}`);
      cerrarBuscador();
    }
  };

  const irAProducto = (id) => {
    navigate(`/producto/${id}`);
    cerrarBuscador();
  };

  // Navegación principal
  const itemsMenu = [
    { label: 'Shop',       to: '/shop' },
    { label: 'B2B',        to: '/b2b' },
    { label: 'Kapac Made', to: '/kapac-made' },
    { label: t('menu.contacto'), to: '/info' },
  ];

  const handleCuenta = () => {
    if (cuentaDe(usuario)) {
      navigate('/perfil');
    } else {
      navigate('/login');
    }
  };

  const esSolido = !transparente || scrolled;
  const { logo, logoListo, setTema, cerrado, setCerrado } = useTema();
  const logoSrc  = fotoRapida(logo) || logoTerracota; // logo del admin o el de la marca

  // El logo se cambia acá mismo (antes vivía en la pestaña Fotos del admin).
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const logoInputRef = useRef(null);
  const logoRef = useRef(null);
  const [logoMarcado, setLogoMarcado] = useState(false); // toque en pantallas sin hover

  // El botón marcado con un toque se oculta al tocar en otra parte
  useEffect(() => {
    if (!logoMarcado) return;
    const fuera = (e) => { if (!logoRef.current?.contains(e.target)) setLogoMarcado(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [logoMarcado]);

  // Sin hover, el primer toque al logo muestra "Cambiar logo"; el segundo vuelve al inicio
  const alTocarLogo = (e) => {
    if (!esAdmin || logoMarcado || e.target.closest('.editable-img-btn')) return;
    if (!window.matchMedia('(hover: none)').matches) return;
    e.preventDefault();
    setLogoMarcado(true);
  };

  const cambiarLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendoLogo(true);
    try {
      const url = await subirImagen(file, 'logo');
      await cambiarContenido(() => ({ logo: url }));
      setTema((prev) => ({ ...prev, logo: url }));
      try { localStorage.setItem(LOGO_CACHE_KEY, url); } catch (_) {}
    } catch (_) {
      window.alert('No se pudo cambiar el logo. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
    setSubiendoLogo(false);
  };

  const [cambiandoTienda, setCambiandoTienda] = useState(false);
  const cambiarTienda = async () => {
    const abrir = cerrado;
    const pregunta = abrir
      ? '¿Seguro que quieres ABRIR la tienda? Todos podrán ver la página y comprar.'
      : '¿Seguro que quieres CERRAR la tienda? Los visitantes verán la pantalla «Próximamente».';
    if (!window.confirm(pregunta)) return;
    setCambiandoTienda(true);
    try {
      await cambiarContenido(() => ({ cerrado: !abrir }));
      setCerrado(!abrir);
      try { localStorage.setItem('kapac_cerrado_v1', abrir ? '0' : '1'); } catch (_) {}
    } catch (_) {
      window.alert('No se pudo cambiar. Verifica tu conexión o que tu sesión siga activa, e intenta de nuevo.');
    }
    setCambiandoTienda(false);
  };

  return (
    <>
      {/* Header — siempre solo el logo centrado, sin hamburger ni carrito */}
      <header className={`header${esSolido ? ' header-solido' : ''}`}>
        <div className="header-container">
          {administrador && (
            <button type="button" className={`header-tienda${cerrado ? ' cerrada' : ''}`} onClick={cambiarTienda} disabled={cambiandoTienda}
              title={cerrado ? 'Abrir la tienda al público' : 'Cerrar la tienda al público'}>
              <span className="header-tienda-punto" />
              {cambiandoTienda ? 'Guardando…' : (cerrado ? 'Tienda cerrada' : 'Tienda abierta')}
            </button>
          )}
          <Link ref={logoRef} to="/" onClick={alTocarLogo}
            className={`logo${esAdmin ? ' editable-img-wrap editable-toque' : ''}${logoMarcado ? ' editable-marcado' : ''}`}>
            {/* key: al pasar a admin se crea otra imagen, así vuelve a marcarse como cargada */}
            <img key={esAdmin ? 'admin' : 'visita'} src={logoSrc} alt="Kapac Made" className={`logo-simbolo${esAdmin ? ' editable-img' : ''}`}
              style={logoListo ? undefined : { opacity: 0 }} />
            {esAdmin && (
              <>
                <button
                  type="button"
                  className="editable-img-btn"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); logoInputRef.current?.click(); }}
                  disabled={subiendoLogo}
                >
                  <Icono nombre="foto" tam={15} /> {subiendoLogo ? 'Subiendo…' : 'Cambiar logo'}
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
