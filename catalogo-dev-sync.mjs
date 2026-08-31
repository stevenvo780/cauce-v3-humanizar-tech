// catalogo-dev-sync.mjs — recarga la página del catálogo cuando cambia el fichero de datos.
//
// 2026-08-30 (kant). El encargo pedía "cuando el fichero cambie, el dev-server recarga".
// Este repo NO tiene dev-server (es estático, sin package.json), así que la recarga se hace
// desde el navegador: se sondea catalogo.json y, si su huella cambia, se vuelve a montar.
//
// SÓLO se activa en localhost / 127.0.0.1 / *.local. En producción no hace absolutamente
// nada: ni un fetch. Así no añade tráfico ni latencia al sitio publicado.

const enDesarrollo = ['localhost', '127.0.0.1', '::1'].includes(location.hostname)
  || location.hostname.endsWith('.local')
  || location.protocol === 'file:';

if (enDesarrollo) {
  const FUENTE = 'catalogo.json';
  const CADA_MS = 1500;
  let huella = null;

  const calcular = (txt) => {           // hash barato: sirve para "¿cambió?", no es criptografía
    let h = 0;
    for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) | 0;
    return `${txt.length}:${h}`;
  };

  async function mirar() {
    try {
      const r = await fetch(FUENTE, { cache: 'no-store' });
      if (!r.ok) return;
      const nueva = calcular(await r.text());
      if (huella === null) { huella = nueva; return; }
      if (nueva !== huella) {
        huella = nueva;
        const { montarCatalogo } = await import(`./catalogo.mjs?v=${Date.now()}`);
        const n = await montarCatalogo();
        console.info(`[catalogo] ${FUENTE} cambió → ${n} productos re-renderizados`);
      }
    } catch { /* el fichero puede estar a medio escribir: se reintenta al siguiente ciclo */ }
  }

  setInterval(mirar, CADA_MS);
  mirar();
  console.info('[catalogo] sincronización de desarrollo activa (sólo en localhost)');
}
