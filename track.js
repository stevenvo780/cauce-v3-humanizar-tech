/* track.js — métricas de uso de las webs de Humanizar.
 *
 * Se instala con una sola línea en cualquiera de los tres sitios:
 *   <script src="https://humanizar.tech/track.js" defer></script>
 *
 * Mide: vista de página, click en tarjeta/CTA, envío de formulario y tiempo en página.
 * No usa cookies, no guarda IP ni datos personales, y respeta Do Not Track.
 */
(function () {
  "use strict";

  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  var script = document.currentScript;
  var base = script ? script.src.replace(/\/track\.js(\?.*)?$/, "") : "";
  var ENDPOINT = base + "/api/track";
  var SITE = location.hostname.replace(/^www\./, "");

  var sid = (function () {
    try {
      var previo = sessionStorage.getItem("hz_sid");
      if (previo) return previo;
      var nuevo = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      sessionStorage.setItem("hz_sid", nuevo);
      return nuevo;
    } catch (e) {
      return "efimera-" + Math.random().toString(36).slice(2, 10);
    }
  })();

  function refHost() {
    if (!document.referrer) return null;
    try {
      var h = new URL(document.referrer).hostname;
      return h === location.hostname ? null : h;
    } catch (e) {
      return null;
    }
  }

  // text/plain evita el preflight de CORS, así funciona igual por fetch y por sendBeacon.
  function enviar(evento, extra, conBeacon) {
    var cuerpo = JSON.stringify(
      Object.assign(
        { site: SITE, event: evento, path: location.pathname, sid: sid, ref: refHost() },
        extra || {},
      ),
    );
    if (conBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([cuerpo], { type: "text/plain" }));
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: cuerpo,
      keepalive: true,
      mode: "cors",
    }).catch(function () {});
  }

  enviar("pageview");

  // 2. Click en tarjeta del catálogo o en cualquier CTA marcado.
  document.addEventListener(
    "click",
    function (ev) {
      var el = ev.target.closest("[data-demo], [data-track], .card a, .card button");
      if (!el) return;
      var tarjeta = el.closest(".card");
      var etiqueta =
        el.getAttribute("data-demo") ||
        el.getAttribute("data-track") ||
        (tarjeta && tarjeta.querySelector("h3") ? tarjeta.querySelector("h3").textContent : "") ||
        el.textContent ||
        "";
      enviar("card_click", { label: etiqueta.replace(/\s+/g, " ").trim().slice(0, 200) });
    },
    true,
  );

  // 3. Envío de formulario (el de agenda y el de contacto del catálogo).
  document.addEventListener(
    "submit",
    function (ev) {
      var form = ev.target;
      if (!form || form.tagName !== "FORM") return;
      var producto = form.querySelector('[name="producto"]');
      enviar("form_submit", {
        label: (producto && producto.value) || form.id || form.getAttribute("name") || "form",
      });
    },
    true,
  );

  // 4. Tiempo en página: se manda una sola vez, al ocultar o descargar la pestaña.
  var inicio = Date.now();
  var enviado = false;
  function cerrar() {
    if (enviado) return;
    enviado = true;
    enviar("page_time", { ms: Date.now() - inicio }, true);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") cerrar();
  });
  window.addEventListener("pagehide", cerrar);
})();
