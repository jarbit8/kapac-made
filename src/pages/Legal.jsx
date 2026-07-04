import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Editable from '../components/Editable';
import { useIdioma } from '../context/LanguageContext';
import '../styles/Legal.css';

export default function Legal() {
  const { idioma } = useIdioma();
  const es = idioma === 'es';

  return (
    <>
      <Header />
      <main className="legal-page">
        <div className="legal-hero">
          <Editable id="legal_origen" as="p" className="legal-origen">{es ? 'Arequipa · Perú' : 'Arequipa · Peru'}</Editable>
          <h1><Editable id="legal_titulo" as="span">{es ? 'Información Legal' : 'Legal Information'}</Editable></h1>
          <p className="legal-sub">
            <Editable id="legal_sub" as="span" multiline>{es
              ? 'Todo lo que necesitas saber sobre tus derechos y nuestras políticas como marca.'
              : 'Everything you need to know about your rights and our brand policies.'}</Editable>
          </p>
        </div>

        <div className="legal-contenido">

          {/* ── Términos y Condiciones ── */}
          <section className="legal-section">
            <h2><Editable id="legal_terminos_titulo" as="span">{es ? 'Términos y Condiciones' : 'Terms & Conditions'}</Editable></h2>

            <Editable id="legal_terminos_p1" as="p" multiline>{es
              ? 'Al realizar una compra en Kapac Made aceptas estos términos. Todos los pedidos están sujetos a disponibilidad de stock. Los precios están expresados en soles peruanos (S/) e incluyen IGV cuando corresponde.'
              : 'By placing an order at Kapac Made, you accept these terms. All orders are subject to stock availability. Prices are in Peruvian soles (S/) and include applicable taxes.'}</Editable>
            <Editable id="legal_terminos_p2" as="p" multiline>{es
              ? 'Nos reservamos el derecho de cancelar pedidos en caso de errores de precio o disponibilidad, notificando al cliente por correo electrónico o WhatsApp.'
              : 'We reserve the right to cancel orders in case of pricing or availability errors, notifying the customer by email or WhatsApp.'}</Editable>
            <Editable id="legal_terminos_p3" as="p" multiline>{es
              ? 'Kapac Made es una marca peruana con sede en Arequipa, Perú. Todos nuestros productos son de fabricación artesanal propia.'
              : 'Kapac Made is a Peruvian brand based in Arequipa, Peru. All our products are handcrafted in-house.'}</Editable>
            <Editable id="legal_terminos_p4" as="p" multiline>{es
              ? 'El uso de este sitio web implica la aceptación de estos términos y de la Política de Privacidad. Si no estás de acuerdo con alguno de los puntos, por favor no uses el sitio.'
              : 'Use of this website implies acceptance of these terms and our Privacy Policy. If you do not agree with any of these points, please do not use the site.'}</Editable>
          </section>

          {/* ── Política de Devoluciones ── */}
          <section className="legal-section">
            <h2><Editable id="legal_devoluciones_titulo" as="span">{es ? 'Política de Devoluciones' : 'Return Policy'}</Editable></h2>
            <Editable id="legal_devoluciones_p1" as="p" multiline>{es
              ? 'Aceptamos devoluciones dentro de los 14 días calendario posteriores a la recepción del producto, siempre que esté en su estado original, sin uso y con todos sus accesorios.'
              : 'We accept returns within 14 calendar days after you receive the product, provided it is in its original condition, unused and with all accessories.'}</Editable>
            <Editable id="legal_devoluciones_p2" as="p" multiline>{es
              ? 'Para iniciar una devolución, contáctanos al +51 997 050 752 indicando tu número de pedido y el motivo. Los gastos de envío de devolución corren por cuenta del cliente, salvo que el producto presente un defecto de fabricación, en cuyo caso Kapac Made cubre el envío.'
              : 'To start a return, contact us at +51 997 050 752 with your order number and reason. Return shipping costs are paid by the customer, unless the product has a manufacturing defect — in that case Kapac Made covers shipping.'}</Editable>
            <Editable id="legal_devoluciones_p3" as="p" multiline>{es
              ? 'Una vez recibido y verificado el producto, procesamos el reembolso dentro de los 5 días hábiles por el mismo medio de pago utilizado.'
              : 'Once received and verified, we process the refund within 5 business days via the same payment method used.'}</Editable>
          </section>

          {/* ── Política de Envíos ── */}
          <section className="legal-section">
            <h2><Editable id="legal_envios_titulo" as="span">{es ? 'Política de Envíos' : 'Shipping Policy'}</Editable></h2>
            <Editable id="legal_envios_p1" as="p" multiline>{es
              ? 'Realizamos envíos a todo el Perú a través de servicios de courier. Los tiempos estimados de entrega son:'
              : 'We ship throughout Peru via courier services. Estimated delivery times:'}</Editable>
            <ul className="legal-lista">
              <li><Editable id="legal_envios_li1" as="span">{es ? 'Arequipa: 1 a 2 días hábiles' : 'Arequipa: 1 to 2 business days'}</Editable></li>
              <li><Editable id="legal_envios_li2" as="span">{es ? 'Lima: 2 a 4 días hábiles' : 'Lima: 2 to 4 business days'}</Editable></li>
              <li><Editable id="legal_envios_li3" as="span">{es ? 'Otras ciudades: 3 a 7 días hábiles' : 'Other cities: 3 to 7 business days'}</Editable></li>
            </ul>
            <Editable id="legal_envios_p2" as="p" multiline>{es
              ? 'También ofrecemos recojo en tienda en Arequipa coordinando previamente por WhatsApp. El envío a domicilio tiene un costo adicional según la ciudad de destino, que se comunica al confirmar el pedido.'
              : 'We also offer in-store pickup in Arequipa, coordinated in advance via WhatsApp. Home delivery has an additional cost depending on the destination city, communicated upon order confirmation.'}</Editable>
            <Editable id="legal_envios_p3" as="p" multiline>{es
              ? 'El seguimiento del pedido se realiza a través de nuestro bot de Telegram @kapacmade_bot, por correo electrónico (si lo seleccionaste al hacer el pedido), o contactándonos directamente.'
              : 'Order tracking is done through our Telegram bot @kapacmade_bot, by email (if selected during checkout), or by contacting us directly.'}</Editable>
          </section>

          {/* ── Política de Privacidad ── */}
          <section className="legal-section">
            <h2><Editable id="legal_privacidad_titulo" as="span">{es ? 'Política de Privacidad' : 'Privacy Policy'}</Editable></h2>
            <Editable id="legal_priv_p1" as="p" multiline>{es
              ? 'En Kapac Made respetamos tu privacidad y cumplimos con la Ley N° 29733 de Protección de Datos Personales del Perú. Los datos personales que recopilamos (nombre, correo electrónico, dirección, teléfono) se utilizan exclusivamente para:'
              : 'At Kapac Made we respect your privacy and comply with Peruvian Law N° 29733 on Personal Data Protection. The personal data we collect (name, email, address, phone) is used exclusively to:'}</Editable>
            <ul className="legal-lista">
              <li><Editable id="legal_priv_li1" as="span">{es ? 'Procesar y entregar tu pedido' : 'Process and deliver your order'}</Editable></li>
              <li><Editable id="legal_priv_li2" as="span">{es ? 'Enviarte notificaciones sobre el estado de tu compra' : 'Send you notifications about your order status'}</Editable></li>
              <li><Editable id="legal_priv_li3" as="span">{es ? 'Mejorar tu experiencia de compra' : 'Improve your shopping experience'}</Editable></li>
            </ul>
            <Editable id="legal_priv_p2" as="p" multiline>{es
              ? 'No compartimos tu información personal con terceros, excepto los servicios estrictamente necesarios para procesar pagos (Culqi, certificado PCI-DSS) y entregas (courier).'
              : 'We do not share your personal information with third parties, except for services strictly necessary for payment processing (Culqi, PCI-DSS certified) and deliveries (courier).'}</Editable>
            <Editable id="legal_priv_p3" as="p" multiline>{es
              ? 'Puedes solicitar la eliminación de tus datos en cualquier momento escribiéndonos al +51 997 050 752.'
              : 'You can request the deletion of your data at any time by writing to us at +51 997 050 752.'}</Editable>

            <h3 className="legal-subtitulo"><Editable id="legal_priv_sub1" as="span">{es ? 'Datos de navegación (sin cookies de seguimiento)' : 'Browsing data (no tracking cookies)'}</Editable></h3>
            <Editable id="legal_priv_p4" as="p" multiline>{es
              ? 'Para mejorar el servicio y entender qué páginas son las más vistas, registramos visitas anónimas a nuestro sitio. Es importante que sepas:'
              : 'To improve our service and understand which pages are most visited, we record anonymous visits to our site. Important things to know:'}</Editable>
            <ul className="legal-lista">
              <li><Editable id="legal_priv_li4" as="span" multiline>{es
                ? 'No usamos cookies de seguimiento. No instalamos archivos persistentes en tu dispositivo para identificarte entre sesiones.'
                : "We do not use tracking cookies. We don't install persistent files on your device to identify you between sessions."}</Editable></li>
              <li><Editable id="legal_priv_li5" as="span" multiline>{es
                ? 'Si has iniciado sesión con tu cuenta, registramos tu correo electrónico junto a las páginas que visitas dentro de Kapac Made. Esto se basa en el consentimiento que diste al iniciar sesión.'
                : 'If you are signed in, we record your email along with the pages you visit within Kapac Made. This is based on the consent you gave when signing in.'}</Editable></li>
              <li><Editable id="legal_priv_li6" as="span" multiline>{es
                ? 'Si no has iniciado sesión, tu visita se registra como "Desconocido" — no podemos identificarte.'
                : 'If you are not signed in, your visit is recorded as "Unknown" — we cannot identify you.'}</Editable></li>
              <li><Editable id="legal_priv_li7" as="span" multiline>{es
                ? 'Ubicación aproximada (país y ciudad): obtenida a través de servicios externos a partir de tu dirección IP. No almacenamos tu dirección IP, solo guardamos el país y ciudad aproximados para estadísticas.'
                : 'Approximate location (country and city): obtained via external services from your IP address. We do not store your IP address, only the approximate country and city for statistics.'}</Editable></li>
              <li><Editable id="legal_priv_li8" as="span" multiline>{es
                ? 'Información pública del navegador: tipo de dispositivo (móvil/PC) y navegador (Chrome, Safari, etc.). Es información que tu navegador comparte públicamente con cualquier sitio web.'
                : 'Public browser info: device type (mobile/PC) and browser (Chrome, Safari, etc.). This information is publicly shared by your browser with any website.'}</Editable></li>
            </ul>
            <Editable id="legal_priv_p5" as="p" multiline>{es
              ? 'Estos datos se usan únicamente para estadísticas internas de Kapac Made. No los compartimos ni los vendemos a terceros. Puedes pedirnos en cualquier momento que eliminemos los registros asociados a tu correo escribiéndonos al +51 997 050 752.'
              : "This data is used only for internal statistics at Kapac Made. We don't share or sell it to third parties. You may ask us at any time to delete the records associated with your email by writing to +51 997 050 752."}</Editable>

            <h3 className="legal-subtitulo"><Editable id="legal_priv_sub2" as="span">{es ? 'Tus derechos (Ley 29733)' : 'Your rights (Law 29733)'}</Editable></h3>
            <Editable id="legal_priv_p6" as="p">{es ? 'Como titular de tus datos personales tienes derecho a:' : 'As the owner of your personal data you have the right to:'}</Editable>
            <ul className="legal-lista">
              <li><Editable id="legal_priv_li9" as="span">{es ? 'Acceso: saber qué datos tuyos guardamos' : 'Access: know what data of yours we keep'}</Editable></li>
              <li><Editable id="legal_priv_li10" as="span">{es ? 'Rectificación: corregir datos incorrectos' : 'Rectification: correct inaccurate data'}</Editable></li>
              <li><Editable id="legal_priv_li11" as="span">{es ? 'Cancelación: eliminar tus datos cuando ya no sean necesarios' : 'Cancellation: delete your data when no longer needed'}</Editable></li>
              <li><Editable id="legal_priv_li12" as="span">{es ? 'Oposición: oponerte al uso de tus datos para fines no esenciales' : 'Objection: object to the use of your data for non-essential purposes'}</Editable></li>
            </ul>
            <Editable id="legal_priv_p7" as="p" multiline>{es
              ? 'Para ejercer cualquiera de estos derechos, escríbenos al +51 997 050 752 o al correo del WhatsApp.'
              : 'To exercise any of these rights, write to us at +51 997 050 752 or via the WhatsApp account.'}</Editable>
          </section>

          {/* ── Medios de pago ── */}
          <section className="legal-section">
            <h2><Editable id="legal_pagos_titulo" as="span">{es ? 'Medios de Pago' : 'Payment Methods'}</Editable></h2>
            <Editable id="legal_pagos_p1" as="p">{es ? 'Aceptamos los siguientes métodos de pago:' : 'We accept the following payment methods:'}</Editable>
            <ul className="legal-lista">
              <li><Editable id="legal_pagos_li1" as="span">{es ? 'Yape con QR — pago instantáneo escaneando el QR' : 'Yape with QR — instant payment by scanning the QR'}</Editable></li>
              <li><Editable id="legal_pagos_li2" as="span">{es ? 'Yape con código de aprobación — pagado y verificado vía Culqi' : 'Yape with approval code — paid and verified via Culqi'}</Editable></li>
              <li><Editable id="legal_pagos_li3" as="span">{es ? 'Tarjeta de crédito / débito — Visa, Mastercard, Amex a través de Culqi (procesador certificado PCI-DSS)' : 'Credit / debit card — Visa, Mastercard, Amex via Culqi (PCI-DSS certified processor)'}</Editable></li>
              <li><Editable id="legal_pagos_li4" as="span">{es ? 'PagoEfectivo — paga en efectivo en agentes BCP, BBVA, Tambo, Western Union y otros' : 'PagoEfectivo — pay cash at BCP, BBVA, Tambo, Western Union and other agents'}</Editable></li>
            </ul>
            <Editable id="legal_pagos_p2" as="p" multiline>{es
              ? 'Todos los pagos son procesados de forma segura con cifrado SSL. Kapac Made nunca ve ni almacena datos de tarjetas.'
              : 'All payments are processed securely with SSL encryption. Kapac Made never sees or stores card data.'}</Editable>
          </section>

          {/* ── Propiedad intelectual ── */}
          <section className="legal-section">
            <h2><Editable id="legal_propiedad_titulo" as="span">{es ? 'Propiedad Intelectual' : 'Intellectual Property'}</Editable></h2>
            <p>
              <Editable id="legal_propiedad_texto1" as="span" multiline>{es
                ? 'Todos los diseños, ilustraciones, logotipos, textos, fotografías y contenidos de este sitio son propiedad exclusiva de Kapac Made. Está prohibida su reproducción, distribución o uso comercial sin autorización expresa por escrito.'
                : 'All designs, illustrations, logos, texts, photographs and content on this site are the exclusive property of Kapac Made. Reproduction, distribution or commercial use without express written authorization is prohibited.'}</Editable>
            </p>
            <p>
              <Editable id="legal_propiedad_texto2" as="span" multiline>{es
                ? 'El nombre "Kapac Made" y su logotipo son marcas registradas. Cualquier uso no autorizado será perseguido conforme a la ley peruana.'
                : 'The name "Kapac Made" and its logo are registered trademarks. Any unauthorized use will be prosecuted under Peruvian law.'}</Editable>
            </p>
          </section>

          {/* ── Limitación de responsabilidad ── */}
          <section className="legal-section">
            <h2><Editable id="legal_limitacion_titulo" as="span">{es ? 'Limitación de Responsabilidad' : 'Liability Limitation'}</Editable></h2>
            <p>
              <Editable id="legal_limitacion_texto1" as="span" multiline>{es
                ? 'Kapac Made no se hace responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de los productos. Nuestra responsabilidad máxima se limita al monto pagado por el producto en cuestión.'
                : 'Kapac Made is not liable for indirect, incidental or consequential damages arising from the use or inability to use the products. Our maximum liability is limited to the amount paid for the product in question.'}</Editable>
            </p>
            <p>
              <Editable id="legal_limitacion_texto2" as="span" multiline>{es
                ? 'No nos hacemos responsables por retrasos en la entrega causados por el servicio de courier, condiciones climáticas, problemas aduaneros u otros factores fuera de nuestro control.'
                : 'We are not responsible for delivery delays caused by courier services, weather conditions, customs issues or other factors beyond our control.'}</Editable>
            </p>
          </section>

          {/* ── Ley aplicable ── */}
          <section className="legal-section">
            <h2><Editable id="legal_ley_titulo" as="span">{es ? 'Ley Aplicable y Jurisdicción' : 'Applicable Law & Jurisdiction'}</Editable></h2>
            <p>
              <Editable id="legal_ley_texto" as="span" multiline>{es
                ? 'Este sitio web se rige por las leyes de la República del Perú. Cualquier controversia relacionada con el uso de este sitio o las compras realizadas se someterá a los tribunales competentes de Arequipa, Perú.'
                : 'This website is governed by the laws of the Republic of Peru. Any dispute related to the use of this site or purchases made shall be submitted to the competent courts of Arequipa, Peru.'}</Editable>
            </p>
          </section>

          {/* ── Contacto ── */}
          <section className="legal-section legal-contacto">
            <h2><Editable id="legal_contacto_titulo" as="span">{es ? 'Contacto' : 'Contact'}</Editable></h2>
            <p><Editable id="legal_contacto_intro" as="span">{es ? 'Para consultas, reclamos o cualquier duda:' : 'For inquiries, complaints or any questions:'}</Editable></p>
            <p><Editable id="legal_contacto_tel" as="span">📞 +51 997 050 752 (WhatsApp)</Editable></p>
            <p><Editable id="legal_contacto_lugar" as="span">{es ? '📍 Arequipa, Perú' : '📍 Arequipa, Peru'}</Editable></p>
            <p><Editable id="legal_contacto_bot" as="span">{es ? '🤖 @kapacmade_bot en Telegram para seguimiento de pedidos' : '🤖 @kapacmade_bot on Telegram for order tracking'}</Editable></p>
          </section>

          <p className="legal-actualizado">
            {es
              ? `Última actualización: ${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : `Last updated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>

        </div>
      </main>
      <Footer />
    </>
  );
}
