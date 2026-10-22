import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Icono from '../components/Icono';
import { useIdioma } from '../context/LanguageContext';
import { EMPRESA } from '../config/empresa';
import { enviarReclamo } from '../firebase/reclamos';
import { mensajeServidor } from '../i18n/mensajes';
import '../styles/LibroReclamaciones.css';

const VACIO = {
  nombre: '', documentoTipo: 'DNI', documento: '', domicilio: '', telefono: '', email: '',
  menorDeEdad: false, apoderado: '',
  bienTipo: 'producto', bienDescripcion: '', monto: '', pedidoId: '',
  tipo: '', detalle: '', pedido: '',
};

const DOCUMENTOS = ['DNI', 'CE', 'Pasaporte', 'RUC'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const limpiar = (v) => v.trim().replace(/\s+/g, ' ');
const letras = (v) => (v.match(/\p{L}/gu) || []).length;
const fuera = (v, min, max) => v.length < min || v.length > max;

// Devuelve los datos ya limpios y, por campo, la clave del mensaje de error
function validar(f) {
  const d = {
    tipo: f.tipo,
    nombre: limpiar(f.nombre),
    documentoTipo: f.documentoTipo,
    documento: f.documentoTipo === 'DNI' || f.documentoTipo === 'RUC' ? f.documento.trim() : f.documento.trim().toUpperCase(),
    domicilio: limpiar(f.domicilio),
    telefono: limpiar(f.telefono),
    email: f.email.trim(),
    menorDeEdad: f.menorDeEdad,
    apoderado: f.menorDeEdad ? limpiar(f.apoderado) : '',
    bienTipo: f.bienTipo,
    bienDescripcion: limpiar(f.bienDescripcion),
    monto: null,
    pedidoId: f.pedidoId.trim(),
    detalle: f.detalle.trim(),
    pedido: f.pedido.trim(),
  };
  const e = {};
  if (fuera(d.nombre, 2, 120) || letras(d.nombre) < 2) e.nombre = 'libro.err_nombre';
  const reglaDoc = d.documentoTipo === 'DNI' ? /^\d{8}$/ : d.documentoTipo === 'RUC' ? /^\d{11}$/ : /^[A-Z0-9]{6,15}$/;
  if (!reglaDoc.test(d.documento)) {
    e.documento = d.documentoTipo === 'DNI' ? 'libro.err_doc_dni' : d.documentoTipo === 'RUC' ? 'libro.err_doc_ruc' : 'libro.err_doc_otro';
  }
  if (fuera(d.domicilio, 5, 200)) e.domicilio = 'libro.err_domicilio';
  if (d.telefono.length > 20) e.telefono = 'libro.err_telefono';
  if (fuera(d.email, 1, 120) || !EMAIL_RE.test(d.email)) e.email = 'libro.err_correo';
  if (d.menorDeEdad && fuera(d.apoderado, 2, 120)) e.apoderado = 'libro.err_apoderado';
  if (fuera(d.bienDescripcion, 3, 300)) e.bienDescripcion = 'libro.err_bien_desc';
  const monto = f.monto.trim();
  if (monto) {
    if (/^\d{1,6}([.,]\d{1,2})?$/.test(monto) && Number(monto.replace(',', '.')) <= 100000) d.monto = Number(monto.replace(',', '.'));
    else e.monto = 'libro.err_monto';
  }
  if (d.pedidoId.length > 40) e.pedidoId = 'libro.err_pedido_id';
  if (!d.tipo) e.tipo = 'libro.err_tipo';
  if (fuera(d.detalle, 10, 3000)) e.detalle = 'libro.err_detalle';
  if (fuera(d.pedido, 3, 1500)) e.pedido = 'libro.err_pedido';
  return { datos: d, errores: e };
}

const locale = (idioma) => (idioma === 'en' ? 'en-US' : 'es-PE');
const fechaLarga = (f, idioma) => new Date(f).toLocaleDateString(locale(idioma), { day: 'numeric', month: 'long', year: 'numeric' });
const fechaHora = (f, idioma) => new Date(f).toLocaleString(locale(idioma), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Campo({ id, etiqueta, requerido, error, completo, t, children }) {
  return (
    <div className={`libro-campo${completo ? ' completo' : ''}${error ? ' con-error' : ''}`}>
      <label htmlFor={`libro-${id}`}>{etiqueta}{requerido && <span className="req"> *</span>}</label>
      {children}
      {error && <p className="libro-error" id={`libro-${id}-error`}>{t(error)}</p>}
    </div>
  );
}

function Fila({ etiqueta, valor }) {
  if (valor === '' || valor === null || valor === undefined) return null;
  return (
    <div className="libro-fila">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Leyendas({ t }) {
  return (
    <div className="libro-leyendas">
      <p>{t('libro.legenda1')}</p>
      <p>{t('libro.legenda2')}</p>
    </div>
  );
}

// La hoja registrada: es lo que se ve al terminar y lo único que sale al imprimir
function Hoja({ r, t, idioma }) {
  const d = r.datos;
  return (
    <article className="libro-hoja">
      <header className="libro-hoja-cab">
        <div>
          <p className="libro-hoja-titulo">{t('libro.titulo')}</p>
          <p className="libro-hoja-sub">{t('libro.subtitulo')}</p>
        </div>
        <div className="libro-hoja-codigo">
          <span>{t('libro.ok_codigo')}</span>
          <strong>{r.codigo}</strong>
        </div>
      </header>

      <dl className="libro-datos">
        <Fila etiqueta={t('libro.ok_fecha')} valor={fechaHora(r.fecha, idioma)} />
        <Fila etiqueta={t('libro.ok_limite')} valor={fechaLarga(r.fechaLimite, idioma)} />
      </dl>

      <h3>{t('libro.proveedor')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.razon_social')} valor={EMPRESA.razonSocial} />
        <Fila etiqueta={t('libro.nombre_comercial')} valor={EMPRESA.nombreComercial} />
        <Fila etiqueta={t('libro.ruc')} valor={EMPRESA.ruc} />
        <Fila etiqueta={t('libro.domicilio_proveedor')} valor={EMPRESA.domicilio} />
      </dl>

      <h3>1. {t('libro.bloque1')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.nombre')} valor={d.nombre} />
        <Fila etiqueta={t('libro.hoja_documento')} valor={`${d.documentoTipo} ${d.documento}`} />
        <Fila etiqueta={t('libro.domicilio')} valor={d.domicilio} />
        <Fila etiqueta={t('libro.hoja_telefono')} valor={d.telefono} />
        <Fila etiqueta={t('libro.correo')} valor={d.email} />
        <Fila etiqueta={t('libro.hoja_apoderado')} valor={d.apoderado} />
      </dl>

      <h3>2. {t('libro.bloque2')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.bien_tipo')} valor={t(d.bienTipo === 'producto' ? 'libro.bien_producto' : 'libro.bien_servicio')} />
        <Fila etiqueta={t('libro.bien_desc')} valor={d.bienDescripcion} />
        <Fila etiqueta={t('libro.hoja_monto')} valor={d.monto === null ? '' : `S/ ${d.monto.toFixed(2)}`} />
        <Fila etiqueta={t('libro.hoja_pedido_num')} valor={d.pedidoId} />
      </dl>

      <h3>3. {t('libro.bloque3')}</h3>
      <dl className="libro-datos">
        <Fila etiqueta={t('libro.tipo')} valor={t(d.tipo === 'reclamo' ? 'libro.tipo_reclamo' : 'libro.tipo_queja')} />
        <Fila etiqueta={t('libro.detalle')} valor={d.detalle} />
        <Fila etiqueta={t('libro.pedido_consumidor')} valor={d.pedido} />
      </dl>

      <Leyendas t={t} />
    </article>
  );
}

export default function LibroReclamaciones() {
  const { t, idioma } = useIdioma();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null);

  const cambiar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => {
      if (!e[campo]) return e;
      const { [campo]: _, ...resto } = e;
      return resto;
    });
  };

  const propsDe = (campo, requerido = true) => ({
    id: `libro-${campo}`,
    name: campo,
    value: form[campo],
    onChange: (e) => cambiar(campo, e.target.value),
    'aria-required': requerido,
    'aria-invalid': !!errores[campo],
    'aria-describedby': errores[campo] ? `libro-${campo}-error` : undefined,
  });

  const soloNumeros = (tipo) => tipo === 'DNI' || tipo === 'RUC';

  const cambiarDocumento = (v) => cambiar('documento', soloNumeros(form.documentoTipo) ? v.replace(/\D/g, '') : v.replace(/\s/g, ''));

  const cambiarTipoDocumento = (tipo) => {
    setForm((f) => ({ ...f, documentoTipo: tipo, documento: soloNumeros(tipo) ? f.documento.replace(/\D/g, '') : f.documento }));
    setErrores(({ documento, ...resto }) => resto);
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    if (enviando) return;
    const { datos, errores: e } = validar(form);
    setErrores(e);
    setErrorEnvio('');
    const primero = Object.keys(e)[0];
    if (primero) {
      const campo = document.getElementById(primero === 'tipo' ? 'libro-tipo-reclamo' : `libro-${primero}`);
      if (campo) campo.focus();
      return;
    }
    setEnviando(true);
    const res = await enviarReclamo({ ...datos, idioma });
    setEnviando(false);
    if (res.ok) {
      setEnviado({ ...res, datos });
      window.scrollTo(0, 0);
    } else {
      setErrorEnvio(res.error ? t(`libro.err_${res.error}`) : mensajeServidor(res.mensaje, idioma, t('libro.err_envio')));
    }
  };

  const hayErrores = Object.keys(errores).length > 0;

  return (
    <>
      <Header />
      <main className="libro-page">
        <div className="libro-hero libro-no-imprimir">
          <h1>{t('libro.titulo')}</h1>
          <p className="libro-sub">{t('libro.subtitulo')}</p>
        </div>

        {enviado ? (
          <>
            <section className="libro-exito libro-no-imprimir" role="status">
              <Icono nombre="checkCirculo" tam={44} />
              <h2>{t(enviado.datos.tipo === 'reclamo' ? 'libro.ok_reclamo' : 'libro.ok_queja')}</h2>
              <p className="libro-exito-codigo">{t('libro.ok_codigo')} <strong>{enviado.codigo}</strong></p>
              <p>{t('libro.ok_copia')} <strong>{enviado.datos.email}</strong></p>
              <div className="libro-acciones">
                <button type="button" className="libro-boton" onClick={() => window.print()}>{t('libro.ok_imprimir')}</button>
                <Link to="/" className="libro-boton secundario">{t('libro.ok_inicio')}</Link>
              </div>
            </section>
            <Hoja r={enviado} t={t} idioma={idioma} />
          </>
        ) : (
          <>
            <section className="libro-proveedor">
              <dl className="libro-datos">
                <Fila etiqueta={t('libro.razon_social')} valor={EMPRESA.razonSocial} />
                <Fila etiqueta={t('libro.nombre_comercial')} valor={EMPRESA.nombreComercial} />
                <Fila etiqueta={t('libro.ruc')} valor={EMPRESA.ruc} />
                <Fila etiqueta={t('libro.domicilio_proveedor')} valor={EMPRESA.domicilio} />
                <Fila etiqueta={t('libro.fecha')} valor={fechaLarga(new Date(), idioma)} />
              </dl>
            </section>

            <form className="libro-form" onSubmit={enviar} noValidate>
              <section className="libro-bloque">
                <h2><span className="libro-num">1</span>{t('libro.bloque1')}</h2>
                <div className="libro-grid">
                  <Campo id="nombre" etiqueta={t('libro.nombre')} requerido error={errores.nombre} completo t={t}>
                    <input {...propsDe('nombre')} autoComplete="name" maxLength={120} />
                  </Campo>
                  <Campo id="documentoTipo" etiqueta={t('libro.doc_tipo')} requerido t={t}>
                    <select id="libro-documentoTipo" name="documentoTipo" value={form.documentoTipo} onChange={(e) => cambiarTipoDocumento(e.target.value)}>
                      {DOCUMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Campo>
                  <Campo id="documento" etiqueta={t('libro.doc_numero')} requerido error={errores.documento} t={t}>
                    <input
                      {...propsDe('documento')}
                      onChange={(e) => cambiarDocumento(e.target.value)}
                      inputMode={soloNumeros(form.documentoTipo) ? 'numeric' : 'text'}
                      maxLength={form.documentoTipo === 'RUC' ? 11 : form.documentoTipo === 'DNI' ? 8 : 15}
                      autoComplete="off"
                    />
                  </Campo>
                  <Campo id="domicilio" etiqueta={t('libro.domicilio')} requerido error={errores.domicilio} completo t={t}>
                    <input {...propsDe('domicilio')} autoComplete="street-address" maxLength={200} />
                  </Campo>
                  <Campo id="telefono" etiqueta={t('libro.telefono')} error={errores.telefono} t={t}>
                    <input {...propsDe('telefono', false)} type="tel" autoComplete="tel" maxLength={20} />
                  </Campo>
                  <Campo id="email" etiqueta={t('libro.correo')} requerido error={errores.email} t={t}>
                    <input {...propsDe('email')} type="email" autoComplete="email" maxLength={120} />
                  </Campo>
                </div>

                <label className="libro-switch">
                  <input type="checkbox" role="switch" checked={form.menorDeEdad} onChange={(e) => cambiar('menorDeEdad', e.target.checked)} />
                  <span className="libro-switch-pista" aria-hidden="true" />
                  <span>{t('libro.menor')}</span>
                </label>
                {form.menorDeEdad && (
                  <div className="libro-grid">
                    <Campo id="apoderado" etiqueta={t('libro.apoderado')} requerido error={errores.apoderado} completo t={t}>
                      <input {...propsDe('apoderado')} autoComplete="off" maxLength={120} />
                    </Campo>
                  </div>
                )}
              </section>

              <section className="libro-bloque">
                <h2><span className="libro-num">2</span>{t('libro.bloque2')}</h2>
                <div className="libro-grid">
                  <div className="libro-campo completo">
                    <span className="libro-etiqueta" id="libro-bienTipo-etiqueta">{t('libro.bien_tipo')} <span className="req">*</span></span>
                    <div className="libro-opciones" role="radiogroup" aria-labelledby="libro-bienTipo-etiqueta">
                      {[['producto', 'libro.bien_producto'], ['servicio', 'libro.bien_servicio']].map(([valor, clave]) => (
                        <label className="libro-opcion" key={valor}>
                          <input type="radio" name="bienTipo" value={valor} checked={form.bienTipo === valor} onChange={() => cambiar('bienTipo', valor)} />
                          <span>{t(clave)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Campo id="bienDescripcion" etiqueta={t('libro.bien_desc')} requerido error={errores.bienDescripcion} completo t={t}>
                    <input {...propsDe('bienDescripcion')} autoComplete="off" maxLength={300} />
                  </Campo>
                  <Campo id="monto" etiqueta={t('libro.monto')} error={errores.monto} t={t}>
                    <input {...propsDe('monto', false)} inputMode="decimal" maxLength={9} placeholder="0.00" autoComplete="off" />
                  </Campo>
                  <Campo id="pedidoId" etiqueta={t('libro.pedido_num')} error={errores.pedidoId} t={t}>
                    <input {...propsDe('pedidoId', false)} maxLength={40} autoComplete="off" />
                  </Campo>
                </div>
              </section>

              <section className="libro-bloque">
                <h2><span className="libro-num">3</span>{t('libro.bloque3')}</h2>
                <div className="libro-grid">
                  <div className={`libro-campo completo${errores.tipo ? ' con-error' : ''}`}>
                    <span className="libro-etiqueta" id="libro-tipo-etiqueta">{t('libro.tipo')} <span className="req">*</span></span>
                    <div className="libro-opciones" role="radiogroup" aria-labelledby="libro-tipo-etiqueta">
                      {[['reclamo', 'libro.tipo_reclamo'], ['queja', 'libro.tipo_queja']].map(([valor, clave]) => (
                        <label className="libro-opcion" key={valor}>
                          <input id={`libro-tipo-${valor}`} type="radio" name="tipo" value={valor} checked={form.tipo === valor} onChange={() => cambiar('tipo', valor)} />
                          <span>{t(clave)}</span>
                        </label>
                      ))}
                    </div>
                    <p className="libro-definicion">{t('libro.def_reclamo')}</p>
                    <p className="libro-definicion">{t('libro.def_queja')}</p>
                    {errores.tipo && <p className="libro-error">{t(errores.tipo)}</p>}
                  </div>
                  <Campo id="detalle" etiqueta={t('libro.detalle')} requerido error={errores.detalle} completo t={t}>
                    <textarea {...propsDe('detalle')} rows={6} maxLength={3000} />
                    <span className="libro-contador">{form.detalle.length} / 3000</span>
                  </Campo>
                  <Campo id="pedido" etiqueta={t('libro.pedido_consumidor')} requerido error={errores.pedido} completo t={t}>
                    <textarea {...propsDe('pedido')} rows={4} maxLength={1500} />
                    <span className="libro-contador">{form.pedido.length} / 1500</span>
                  </Campo>
                </div>
              </section>

              {(hayErrores || errorEnvio) && (
                <p className="libro-error-general" role="alert">
                  <Icono nombre="alerta" tam={16} /> {errorEnvio || t('libro.err_revisa')}
                </p>
              )}

              <button type="submit" className="libro-enviar" disabled={enviando}>
                {enviando ? t('libro.enviando') : t('libro.enviar')}
              </button>

              <Leyendas t={t} />
            </form>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
