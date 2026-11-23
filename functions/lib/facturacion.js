// Corte de facturación
// El presupuesto de Cloud Billing publica el gasto del mes en este tema varias
// veces al día. Si llega al monto del presupuesto, se desvincula la facturación
// del proyecto y todo el servidor se apaga hasta reactivarla a mano.
const PROYECTO = 'kapac-made';

async function tokenDeServicio() {
  const r = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  return (await r.json()).access_token;
}

async function cortarFacturacion(event) {
  const aviso = event.data.message.json || {};
  const gasto = Number(aviso.costAmount);
  const tope  = Number(aviso.budgetAmount);
  if (!(gasto >= tope)) return;

  const url = `https://cloudbilling.googleapis.com/v1/projects/${PROYECTO}/billingInfo`;
  const headers = {
    Authorization: `Bearer ${await tokenDeServicio()}`,
    'Content-Type': 'application/json',
  };

  const info = await (await fetch(url, { headers })).json();
  if (!info.billingEnabled) return;

  const r = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ billingAccountName: '' }),
  });
  if (!r.ok) throw new Error(`No se pudo cortar la facturación: ${r.status} ${await r.text()}`);
  console.log(`Facturación cortada: gasto ${gasto} >= tope ${tope} ${aviso.currencyCode}`);
}

module.exports = { cortarFacturacion };
