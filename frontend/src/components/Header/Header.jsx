import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Header.css';
import '../EditableImage.css';
import { useAuth } from '../../context/AuthContext';
import Icono from '../Icono';
import logoTerracota from '../../assets/images/kapac_made_1.png';
import { useTema, LOGO_CACHE_KEY } from '../../context/TemaContext';
import { cambiarContenido } from '../../firebase/contenido';
import { subirImagen } from '../../firebase/almacenamiento';
import { fotoRapida } from '../../utils/fotos';

export default function Header({ transparente = false }) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { puedeEditar: esAdmin } = useAuth();

  useEffect(() => {
    if (!transparente) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparente]);

  const esSolido = !transparente || scrolled;
  const { logo, logoListo, setTema } = useTema();
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

  // Sin hover, el primer toque al logo muestra "Cambiar logo"; el segundo vuelve al inicio.
  // No es un enlace: así el navegador no muestra la dirección abajo al pasar el mouse.
  const alTocarLogo = (e) => {
    if (e.target.closest('.editable-img-btn')) return;
    if (esAdmin && !logoMarcado && window.matchMedia('(hover: none)').matches) {
      setLogoMarcado(true);
      return;
    }
    navigate('/');
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

  return (
    <>
      {/* Header — siempre solo el logo centrado, sin hamburger ni carrito */}
      <header className={`header${esSolido ? ' header-solido' : ''}`}>
        <div className="header-container">
          <div ref={logoRef} role="link" tabIndex={0} aria-label="Kapac Made" onClick={alTocarLogo}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/'); }}
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
          </div>
        </div>
      </header>
    </>
  );
}
