import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Header.css';
import '../EditableImage.css';
import { useAuth } from '../../context/AuthContext';
import Icono from '../Icono';
import logoTerracota from '../../assets/images/kapac_made_1.png';
import { useTema, LOGO_CACHE_KEY } from '../../context/TemaContext';
import { cambiarContenido } from '../../firebase/contenido';
import { subirImagen } from '../../firebase/almacenamiento';
import { fotoRapida } from '../../utils/fotos';
import { avisarFallo } from '../../utils/avisos';
import useMarcado from '../../hooks/useMarcado';

export default function Header({ transparente = false }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparente) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparente]);

  const { puedeEditar: esAdmin, esAdmin: administrador } = useAuth();

  const esSolido = !transparente || scrolled;
  const { logo, logoListo, setTema, cerrado, setCerrado } = useTema();
  const logoSrc  = fotoRapida(logo) || logoTerracota; // logo del admin o el de la marca

  // El logo se cambia acá mismo (antes vivía en la pestaña Fotos del admin).
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const logoInputRef = useRef(null);
  const { ref: logoRef, marcado: logoMarcado, setMarcado: setLogoMarcado } = useMarcado(); // toque en pantallas sin hover

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
      avisarFallo('cambiar el logo');
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
      avisarFallo('cambiar');
    }
    setCambiandoTienda(false);
  };

  return (
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
  );
}
