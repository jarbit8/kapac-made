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
          <p className="legal-origen">Arequipa · {es ? 'Perú' : 'Peru'}</p>
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

            {es ? (
              <>
                <p>Al realizar una compra en Kapac Made aceptas estos términos. Todos los pedidos están sujetos a disponibilidad de stock. Los precios están expresados en soles peruanos (S/) e incluyen IGV cuando corresponde.</p>
                <p>Nos reservamos el derecho de cancelar pedidos en caso de errores de precio o disponibilidad, notificando al cliente por correo electrónico o WhatsApp.</p>
                <p>Kapac Made es una marca peruana con sede en Arequipa, Perú. Todos nuestros productos son de fabricación artesanal propia.</p>
                <p>El uso de este sitio web implica la aceptación de estos términos y de la Política de Privacidad. Si no estás de acuerdo con alguno de los puntos, por favor no uses el sitio.</p>
              </>
            ) : (
              <>
                <p>By placing an order at Kapac Made, you accept these terms. All orders are subject to stock availability. Prices are in Peruvian soles (S/) and include applicable taxes.</p>
                <p>We reserve the right to cancel orders in case of pricing or availability errors, notifying the customer by email or WhatsApp.</p>
                <p>Kapac Made is a Peruvian brand based in Arequipa, Peru. All our products are handcrafted in-house.</p>
                <p>Use of this website implies acceptance of these terms and our Privacy Policy. If you do not agree with any of these points, please do not use the site.</p>
              </>
            )}
          </section>

          {/* ── Política de Devoluciones ── */}
          <section className="legal-section">
            <h2><Editable id="legal_devoluciones_titulo" as="span">{es ? 'Política de Devoluciones' : 'Return Policy'}</Editable></h2>
            {es ? (
              <>
                <p>Aceptamos devoluciones dentro de los <strong>14 días calendario</strong> posteriores a la recepción del producto, siempre que esté en su estado original, sin uso y con todos sus accesorios.</p>
                <p>Para iniciar una devolución, contáctanos al <strong>+51 997 050 752</strong> indicando tu número de pedido y el motivo. Los gastos de envío de devolución corren por cuenta del cliente, salvo que el producto presente un defecto de fabricación, en cuyo caso Kapac Made cubre el envío.</p>
                <p>Una vez recibido y verificado el producto, procesamos el reembolso dentro de los <strong>5 días hábiles</strong> por el mismo medio de pago utilizado.</p>
              </>
            ) : (
              <>
                <p>We accept returns within <strong>14 calendar days</strong> after you receive the product, provided it is in its original condition, unused and with all accessories.</p>
                <p>To start a return, contact us at <strong>+51 997 050 752</strong> with your order number and reason. Return shipping costs are paid by the customer, unless the product has a manufacturing defect — in that case Kapac Made covers shipping.</p>
                <p>Once received and verified, we process the refund within <strong>5 business days</strong> via the same payment method used.</p>
              </>
            )}
          </section>

          {/* ── Política de Envíos ── */}
          <section className="legal-section">
            <h2><Editable id="legal_envios_titulo" as="span">{es ? 'Política de Envíos' : 'Shipping Policy'}</Editable></h2>
            {es ? (
              <>
                <p>Realizamos envíos a todo el Perú a través de servicios de courier. Los tiempos estimados de entrega son:</p>
                <ul className="legal-lista">
                  <li><strong>Arequipa:</strong> 1 a 2 días hábiles</li>
                  <li><strong>Lima:</strong> 2 a 4 días hábiles</li>
                  <li><strong>Otras ciudades:</strong> 3 a 7 días hábiles</li>
                </ul>
                <p>También ofrecemos recojo en tienda en Arequipa coordinando previamente por WhatsApp. El envío a domicilio tiene un costo adicional según la ciudad de destino, que se comunica al confirmar el pedido.</p>
                <p>El seguimiento del pedido se realiza a través de nuestro bot de Telegram <strong>@kapacmade_bot</strong>, por correo electrónico (si lo seleccionaste al hacer el pedido), o contactándonos directamente.</p>
              </>
            ) : (
              <>
                <p>We ship throughout Peru via courier services. Estimated delivery times:</p>
                <ul className="legal-lista">
                  <li><strong>Arequipa:</strong> 1 to 2 business days</li>
                  <li><strong>Lima:</strong> 2 to 4 business days</li>
                  <li><strong>Other cities:</strong> 3 to 7 business days</li>
                </ul>
                <p>We also offer in-store pickup in Arequipa, coordinated in advance via WhatsApp. Home delivery has an additional cost depending on the destination city, communicated upon order confirmation.</p>
                <p>Order tracking is done through our Telegram bot <strong>@kapacmade_bot</strong>, by email (if selected during checkout), or by contacting us directly.</p>
              </>
            )}
          </section>

          {/* ── Política de Privacidad ── */}
          <section className="legal-section">
            <h2><Editable id="legal_privacidad_titulo" as="span">{es ? 'Política de Privacidad' : 'Privacy Policy'}</Editable></h2>
            {es ? (
              <>
                <p>En Kapac Made respetamos tu privacidad y cumplimos con la <strong>Ley N° 29733 de Protección de Datos Personales del Perú</strong>. Los datos personales que recopilamos (nombre, correo electrónico, dirección, teléfono) se utilizan exclusivamente para:</p>
                <ul className="legal-lista">
                  <li>Procesar y entregar tu pedido</li>
                  <li>Enviarte notificaciones sobre el estado de tu compra</li>
                  <li>Mejorar tu experiencia de compra</li>
                </ul>
                <p>No compartimos tu información personal con terceros, excepto los servicios estrictamente necesarios para procesar pagos (Culqi, certificado PCI-DSS) y entregas (courier).</p>
                <p>Puedes solicitar la eliminación de tus datos en cualquier momento escribiéndonos al <strong>+51 997 050 752</strong>.</p>

                <h3 className="legal-subtitulo">Datos de navegación (sin cookies de seguimiento)</h3>
                <p>Para mejorar el servicio y entender qué páginas son las más vistas, registramos visitas anónimas a nuestro sitio. Es importante que sepas:</p>
                <ul className="legal-lista">
                  <li><strong>No usamos cookies de seguimiento.</strong> No instalamos archivos persistentes en tu dispositivo para identificarte entre sesiones.</li>
                  <li><strong>Si has iniciado sesión</strong> con tu cuenta, registramos tu correo electrónico junto a las páginas que visitas dentro de Kapac Made. Esto se basa en el consentimiento que diste al iniciar sesión.</li>
                  <li><strong>Si no has iniciado sesión</strong>, tu visita se registra como "Desconocido" — no podemos identificarte.</li>
                  <li><strong>Ubicación aproximada</strong> (país y ciudad): obtenida a través de servicios externos a partir de tu dirección IP. <strong>No almacenamos tu dirección IP</strong>, solo guardamos el país y ciudad aproximados para estadísticas.</li>
                  <li><strong>Información pública del navegador</strong>: tipo de dispositivo (móvil/PC) y navegador (Chrome, Safari, etc.). Es información que tu navegador comparte públicamente con cualquier sitio web.</li>
                </ul>
                <p>Estos datos se usan únicamente para estadísticas internas de Kapac Made. No los compartimos ni los vendemos a terceros. Puedes pedirnos en cualquier momento que eliminemos los registros asociados a tu correo escribiéndonos al <strong>+51 997 050 752</strong>.</p>

                <h3 className="legal-subtitulo">Tus derechos (Ley 29733)</h3>
                <p>Como titular de tus datos personales tienes derecho a:</p>
                <ul className="legal-lista">
                  <li><strong>Acceso:</strong> saber qué datos tuyos guardamos</li>
                  <li><strong>Rectificación:</strong> corregir datos incorrectos</li>
                  <li><strong>Cancelación:</strong> eliminar tus datos cuando ya no sean necesarios</li>
                  <li><strong>Oposición:</strong> oponerte al uso de tus datos para fines no esenciales</li>
                </ul>
                <p>Para ejercer cualquiera de estos derechos, escríbenos al <strong>+51 997 050 752</strong> o al correo del WhatsApp.</p>
              </>
            ) : (
              <>
                <p>At Kapac Made we respect your privacy and comply with <strong>Peruvian Law N° 29733 on Personal Data Protection</strong>. The personal data we collect (name, email, address, phone) is used exclusively to:</p>
                <ul className="legal-lista">
                  <li>Process and deliver your order</li>
                  <li>Send you notifications about your order status</li>
                  <li>Improve your shopping experience</li>
                </ul>
                <p>We do not share your personal information with third parties, except for services strictly necessary for payment processing (Culqi, PCI-DSS certified) and deliveries (courier).</p>
                <p>You can request the deletion of your data at any time by writing to us at <strong>+51 997 050 752</strong>.</p>

                <h3 className="legal-subtitulo">Browsing data (no tracking cookies)</h3>
                <p>To improve our service and understand which pages are most visited, we record anonymous visits to our site. Important things to know:</p>
                <ul className="legal-lista">
                  <li><strong>We do not use tracking cookies.</strong> We don't install persistent files on your device to identify you between sessions.</li>
                  <li><strong>If you are signed in</strong>, we record your email along with the pages you visit within Kapac Made. This is based on the consent you gave when signing in.</li>
                  <li><strong>If you are not signed in</strong>, your visit is recorded as "Unknown" — we cannot identify you.</li>
                  <li><strong>Approximate location</strong> (country and city): obtained via external services from your IP address. <strong>We do not store your IP address</strong>, only the approximate country and city for statistics.</li>
                  <li><strong>Public browser info</strong>: device type (mobile/PC) and browser (Chrome, Safari, etc.). This information is publicly shared by your browser with any website.</li>
                </ul>
                <p>This data is used only for internal statistics at Kapac Made. We don't share or sell it to third parties. You may ask us at any time to delete the records associated with your email by writing to <strong>+51 997 050 752</strong>.</p>

                <h3 className="legal-subtitulo">Your rights (Law 29733)</h3>
                <p>As the owner of your personal data you have the right to:</p>
                <ul className="legal-lista">
                  <li><strong>Access:</strong> know what data of yours we keep</li>
                  <li><strong>Rectification:</strong> correct inaccurate data</li>
                  <li><strong>Cancellation:</strong> delete your data when no longer needed</li>
                  <li><strong>Objection:</strong> object to the use of your data for non-essential purposes</li>
                </ul>
                <p>To exercise any of these rights, write to us at <strong>+51 997 050 752</strong> or via the WhatsApp account.</p>
              </>
            )}
          </section>

          {/* ── Medios de pago ── */}
          <section className="legal-section">
            <h2><Editable id="legal_pagos_titulo" as="span">{es ? 'Medios de Pago' : 'Payment Methods'}</Editable></h2>
            {es ? (
              <>
                <p>Aceptamos los siguientes métodos de pago:</p>
                <ul className="legal-lista">
                  <li><strong>Yape con QR</strong> — pago instantáneo escaneando el QR</li>
                  <li><strong>Yape con código de aprobación</strong> — pagado y verificado vía Culqi</li>
                  <li><strong>Tarjeta de crédito / débito</strong> — Visa, Mastercard, Amex a través de Culqi (procesador certificado PCI-DSS)</li>
                  <li><strong>PagoEfectivo</strong> — paga en efectivo en agentes BCP, BBVA, Tambo, Western Union y otros</li>
                </ul>
                <p>Todos los pagos son procesados de forma segura con cifrado SSL. <strong>Kapac Made nunca ve ni almacena datos de tarjetas.</strong></p>
              </>
            ) : (
              <>
                <p>We accept the following payment methods:</p>
                <ul className="legal-lista">
                  <li><strong>Yape with QR</strong> — instant payment by scanning the QR</li>
                  <li><strong>Yape with approval code</strong> — paid and verified via Culqi</li>
                  <li><strong>Credit / debit card</strong> — Visa, Mastercard, Amex via Culqi (PCI-DSS certified processor)</li>
                  <li><strong>PagoEfectivo</strong> — pay cash at BCP, BBVA, Tambo, Western Union and other agents</li>
                </ul>
                <p>All payments are processed securely with SSL encryption. <strong>Kapac Made never sees or stores card data.</strong></p>
              </>
            )}
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
            <p>📞 <strong>+51 997 050 752</strong> (WhatsApp)</p>
            <p>📍 Arequipa, {es ? 'Perú' : 'Peru'}</p>
            <p>🤖 <strong>@kapacmade_bot</strong> {es ? 'en Telegram para seguimiento de pedidos' : 'on Telegram for order tracking'}</p>
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
