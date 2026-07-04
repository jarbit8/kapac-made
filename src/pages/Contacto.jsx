import React, { useEffect, useState } from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Editable from '../components/Editable';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import { obtenerContenido, guardarContenido, INFO_EXTRA_DEFAULT } from '../firebase/contenido';
import '../styles/Contacto.css';

export default function Contacto() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';
  const { esAdmin } = useTextos();

  const [contenido, setContenido] = useState(null);
  useEffect(() => {
    obtenerContenido().then(setContenido).catch(() => {});
  }, []);

  const extras = contenido?.infoExtra || INFO_EXTRA_DEFAULT;

  const guardarExtras = async (nuevos) => {
    const base = contenido || await obtenerContenido();
    const nuevo = { ...base, infoExtra: nuevos };
    setContenido(nuevo);
    try { await guardarContenido(nuevo); } catch (_) { /* error silencioso */ }
  };

  const agregarExtra = () => guardarExtras([...extras, `campo_${Date.now()}`]);
  const quitarExtra = (key) => guardarExtras(extras.filter((k) => k !== key));

  return (
    <>
      <Header />
      <main className="info-page">
        <div className="info-wrap">

          <p className="info-eyebrow">Kapac Made</p>
          <Editable id="info_titulo" as="h1" className="info-titulo">{es ? 'Información' : 'Information'}</Editable>

          {/* Contacto */}
          <section className="info-bloque">
            <Editable id="info_contacto_titulo" as="h2">{es ? 'Contacto' : 'Contact'}</Editable>
            <Editable id="info_contacto_direccion" as="p">{es ? 'Arequipa, Perú — Tienda Roots (CC Outlet Arauco)' : 'Arequipa, Peru — Tienda Roots (CC Outlet Arauco)'}</Editable>
            <Editable id="info_contacto_telefono" as="p">{es ? 'WhatsApp / Teléfono: +51 997 050 752' : 'WhatsApp / Phone: +51 997 050 752'}</Editable>
            <p>Email: contacto@qhapaqbrands.com</p>
            <p className="info-redes">
              <a href="https://www.instagram.com/kapac.made/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.facebook.com/KapaqMade/reels/" target="_blank" rel="noopener noreferrer">Facebook</a>
              <a href="https://www.tiktok.com/@kapac.made" target="_blank" rel="noopener noreferrer">TikTok</a>
            </p>
          </section>

          {/* Envíos */}
          <section className="info-bloque">
            <Editable id="info_envios_titulo" as="h2">{es ? 'Envíos' : 'Shipping'}</Editable>
            <Editable id="info_envios_texto" as="p" className="info-parrafo-doble" multiline>{es
              ? 'Realizamos envíos a todo el Perú. Por tiempo limitado, ¡envío gratis a todo el país! El costo de envío (cuando aplique) se calcula automáticamente en el checkout según tu ubicación.\n\nEl tiempo de entrega estimado es de 2 a 5 días hábiles según el destino. Recibirás el seguimiento de tu pedido por correo y WhatsApp.'
              : 'We ship across Peru. For a limited time, free shipping nationwide! Shipping cost (when it applies) is calculated automatically at checkout based on your location.\n\nEstimated delivery is 2 to 5 business days depending on destination. You will receive order tracking by email and WhatsApp.'}</Editable>
          </section>

          {/* Cambios y devoluciones */}
          <section className="info-bloque">
            <Editable id="info_devoluciones_titulo" as="h2">{es ? 'Cambios y devoluciones' : 'Returns & exchanges'}</Editable>
            <Editable id="info_devoluciones_texto" as="p" className="info-parrafo-doble" multiline>{es
              ? 'Tienes hasta 7 días calendario desde la recepción de tu pedido para solicitar un cambio o devolución. El producto debe estar sin uso, en perfecto estado y con sus etiquetas originales.\n\nPara iniciar el proceso, escríbenos al WhatsApp +51 997 050 752 o al correo contacto@qhapaqbrands.com con tu número de pedido. Los costos de envío de la devolución pueden aplicar según el caso.'
              : 'You have up to 7 calendar days from receiving your order to request an exchange or return. The product must be unused, in perfect condition and with its original tags.\n\nTo start the process, message us on WhatsApp +51 997 050 752 or email contacto@qhapaqbrands.com with your order number. Return shipping costs may apply depending on the case.'}</Editable>
          </section>

          {/* Términos y condiciones */}
          <section className="info-bloque">
            <Editable id="info_terminos_titulo" as="h2">{es ? 'Términos y condiciones' : 'Terms & conditions'}</Editable>
            <Editable id="info_terminos_texto" as="p" multiline>{es
              ? 'Los precios, promociones y disponibilidad de productos están sujetos a cambios sin previo aviso. Al realizar una compra aceptas estos términos. Las imágenes son referenciales; al ser productos artesanales, pueden existir ligeras variaciones únicas en cada pieza.'
              : 'Prices, promotions and product availability are subject to change without notice. By making a purchase you accept these terms. Images are referential; as handcrafted products, slight unique variations may exist in each piece.'}</Editable>
          </section>

          {/* Privacidad */}
          <section className="info-bloque">
            <Editable id="info_privacidad_titulo" as="h2">{es ? 'Política de privacidad' : 'Privacy policy'}</Editable>
            <Editable id="info_privacidad_texto" as="p" multiline>{es
              ? 'Tus datos personales se usan únicamente para procesar tus pedidos y mejorar tu experiencia. No compartimos tu información con terceros con fines comerciales. Tratamos tus datos conforme a la Ley N° 29733 de Protección de Datos Personales del Perú.'
              : "Your personal data is used only to process your orders and improve your experience. We do not share your information with third parties for commercial purposes. We handle your data in accordance with Peru's Personal Data Protection Law (N° 29733)."}</Editable>
          </section>

          {/* Libro de reclamaciones */}
          <section className="info-bloque">
            <Editable id="info_libro_titulo" as="h2">{es ? 'Libro de reclamaciones' : 'Complaints book'}</Editable>
            <Editable id="info_libro_texto" as="p" multiline>{es
              ? 'Conforme a la normativa peruana, ponemos a tu disposición nuestro Libro de Reclamaciones. Para registrar una queja o reclamo, escríbenos a contacto@qhapaqbrands.com o al WhatsApp +51 997 050 752 y te guiaremos en el proceso.'
              : 'In accordance with Peruvian regulations, we provide our Complaints Book. To register a complaint, email contacto@qhapaqbrands.com or WhatsApp +51 997 050 752 and we will guide you through the process.'}</Editable>
          </section>

          {/* Campos adicionales que agregue el admin */}
          {extras.map((key) => (
            <section className="info-bloque info-bloque-extra" key={key}>
              <Editable id={`info_${key}_titulo`} as="h2">{es ? 'Nuevo campo' : 'New field'}</Editable>
              <Editable id={`info_${key}_texto`} as="p" multiline>{es ? 'Escribe aquí el contenido.' : 'Write the content here.'}</Editable>
              {esAdmin && (
                <button type="button" className="info-bloque-quitar" onClick={() => quitarExtra(key)} title="Quitar">× Quitar campo</button>
              )}
            </section>
          ))}

          {esAdmin && (
            <button type="button" className="info-agregar-campo" onClick={agregarExtra}>
              + Agregar campo
            </button>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
