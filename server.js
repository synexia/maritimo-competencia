const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const PRODUCTOS = [
  { id: '1',  campo: 'gasolina95' },
  { id: '3',  campo: 'gasolina98' },
  { id: '4',  campo: 'gasoleo' },
  { id: '5',  campo: 'gasoleoPlus' },
  { id: '6',  campo: 'glp' },
];

// Agente HTTPS que ignora certificados autofirmados (igual que n8n)
const agenteSinSSL = new https.Agent({ rejectUnauthorized: false });

async function fetchPrecios(idProducto) {
  const body = JSON.stringify({
    tipoEstacion: "EESS",
    idProvincia: "46",
    idMunicipio: "",
    idProducto: idProducto,
    rotulo: "",
    eessEconomicas: false,
    conPlanesDescuento: false,
    horarioInicial: "",
    horarioFinal: "",
    calle: "",
    numero: "",
    codPostal: "",
    tipoVenta: "P",
    tipoServicio: null,
    idOperador: "",
    nombrePlan: "",
    idTipoDestinatario: null,
    x0: "", y0: "", x1: "", y1: ""
  });

  const res = await fetch('https://geoportalgasolineras.es/geoportal/rest/busquedaEstaciones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'es-ES,es;q=0.9',
      'Origin': 'https://geoportalgasolineras.es',
      'Referer': 'https://geoportalgasolineras.es/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body,
    // @ts-ignore
    agent: agenteSinSSL,
  });

  const texto = await res.text();

  // Log para depuración en Railway
  if (!res.ok || texto.trim().startsWith('<')) {
    console.error(`Geoportal error producto ${idProducto} — HTTP ${res.status} — respuesta: ${texto.substring(0, 300)}`);
    throw new Error(`Geoportal devolvió HTTP ${res.status} para producto ${idProducto}. Puede que el servicio esté caído o bloqueando la petición.`);
  }

  return JSON.parse(texto);
}

app.get('/api/precios', async (req, res) => {
  try {
    // Clear require cache so changes to estaciones.json are picked up
    delete require.cache[require.resolve('./public/estaciones.json')];
    const estaciones = require('./public/estaciones.json');
    const idSet = new Set(estaciones.map(e => String(e.id)));

    // Fetch all fuel types in parallel
    const resultados = await Promise.all(
      PRODUCTOS.map(p => fetchPrecios(p.id).then(data => ({ campo: p.campo, data })))
    );

    // Build map: idestacion -> prices
    const mapa = {};
    for (const { campo, data } of resultados) {
      if (!data.estaciones) continue;
      for (const est of data.estaciones) {
        const id = String(est.estacion.id);
        if (!idSet.has(id)) continue;
        if (!mapa[id]) mapa[id] = {};
        mapa[id][campo] = est.precio ?? null;
      }
    }

    // Merge with station info
    const resultado = estaciones.map(e => ({
      id: String(e.id),
      nombre: e.nombre,
      zona: e.zona,
      propia: e.propia,
      ...(mapa[String(e.id)] || {}),
    }));

    res.json({ ok: true, data: resultado, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor arrancado en puerto ${PORT}`);
});
