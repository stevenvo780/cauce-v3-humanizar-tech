// app.js — Agenda: UX del form + POST al endpoint /api/booking
// v2: fricción baja en fecha/hora, validación por campo, confirmación con .ics.
// El contrato con /api/booking NO cambia: se siguen enviando exactamente los
// campos nombre, email, empresa, telefono, producto, fecha, hora y nota.

(function () {
  "use strict";

  var form = document.getElementById("booking");
  var status = document.getElementById("form-status");
  var submit = form.querySelector('button[type="submit"]');
  var fechaInput = form.querySelector('input[name="fecha"]');
  var horaSelect = form.querySelector('select[name="hora"]');
  var productoSelect = form.querySelector('select[name="producto"]');
  var autoBtn = document.getElementById("auto-slot");
  var slotNote = document.getElementById("slot-note");
  var confirmBox = document.getElementById("confirm");

  var HORAS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  var BUFFER_MIN = 120; // no ofrecer un horario a menos de 2 h vista
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  // --- helpers de fecha (todo en hora de Bogotá, que es la que promete la UI) ---

  function bogotaNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  }

  function iso(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function parseIso(s) {
    var p = String(s || "").split("-");
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function esFinDeSemana(d) {
    return d.getDay() === 0 || d.getDay() === 6;
  }

  function siguienteHabil(d) {
    var x = new Date(d.getTime());
    while (esFinDeSemana(x)) x.setDate(x.getDate() + 1);
    return x;
  }

  function minutosDe(hhmm) {
    var p = hhmm.split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  // Horas disponibles para una fecha dada: vacío si es fin de semana,
  // y recortadas si la fecha es hoy y el horario ya pasó (o está muy encima).
  function horasPara(fechaStr) {
    var d = parseIso(fechaStr);
    if (!d || esFinDeSemana(d)) return [];
    var ahora = bogotaNow();
    if (iso(d) !== iso(ahora)) return HORAS.slice();
    var corte = ahora.getHours() * 60 + ahora.getMinutes() + BUFFER_MIN;
    return HORAS.filter(function (h) { return minutosDe(h) >= corte; });
  }

  // Primer hueco realmente reservable a partir de ahora.
  function primerHueco() {
    var d = siguienteHabil(bogotaNow());
    for (var i = 0; i < 30; i++) {
      var libres = horasPara(iso(d));
      if (libres.length) return { fecha: iso(d), hora: libres[0] };
      d.setDate(d.getDate() + 1);
      d = siguienteHabil(d);
    }
    return null;
  }

  function fechaEnPalabras(fechaStr) {
    var d = parseIso(fechaStr);
    if (!d) return fechaStr;
    return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()];
  }

  // --- render de horarios ---

  function pintarHoras(mantener) {
    var libres = horasPara(fechaInput.value);
    var previo = mantener ? horaSelect.value : "";
    horaSelect.innerHTML = "";

    var vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = libres.length ? "Elegí…" : "Sin horarios ese día";
    horaSelect.appendChild(vacio);

    libres.forEach(function (h) {
      var o = document.createElement("option");
      o.value = h;
      o.textContent = h;
      horaSelect.appendChild(o);
    });

    horaSelect.disabled = libres.length === 0;
    if (previo && libres.indexOf(previo) !== -1) horaSelect.value = previo;

    var d = parseIso(fechaInput.value);
    if (d && esFinDeSemana(d)) {
      slotNote.textContent = "Ese día es fin de semana. Atendemos de lunes a viernes, 8:00–17:00 (hora de Bogotá).";
      slotNote.className = "field-hint warn";
    } else if (!libres.length) {
      slotNote.textContent = "Ya no quedan horarios ese día. Probá con el siguiente hábil.";
      slotNote.className = "field-hint warn";
    } else {
      slotNote.textContent = "Atendemos de lunes a viernes, 8:00–17:00 (hora de Bogotá).";
      slotNote.className = "field-hint";
    }
  }

  // --- validación por campo ---

  var MENSAJES = {
    nombre: "Necesitamos tu nombre para armar la invitación.",
    email: "Revisá el email: ahí te mandamos la confirmación.",
    producto: "Elegí qué producto querés ver.",
    fecha: "Elegí un día, o dejá que lo elijamos por vos.",
    hora: "Elegí una hora, o dejá que la elijamos por vos."
  };

  function marcarError(nombre, hay) {
    var campo = form.querySelector('[name="' + nombre + '"]');
    var caja = document.getElementById("err-" + nombre);
    if (!campo || !caja) return;
    if (hay) {
      caja.textContent = MENSAJES[nombre];
      caja.hidden = false;
      campo.setAttribute("aria-invalid", "true");
      campo.classList.add("invalid");
    } else {
      caja.hidden = true;
      campo.removeAttribute("aria-invalid");
      campo.classList.remove("invalid");
    }
  }

  function emailValido(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
  }

  function validar() {
    var v = {
      nombre: form.nombre.value.trim().length >= 2,
      email: emailValido(form.email.value),
      producto: !!productoSelect.value,
      fecha: !!fechaInput.value && !esFinDeSemana(parseIso(fechaInput.value) || new Date()),
      hora: !!horaSelect.value
    };
    var primerFallo = null;
    Object.keys(v).forEach(function (k) {
      marcarError(k, !v[k]);
      if (!v[k] && !primerFallo) primerFallo = k;
    });
    if (primerFallo) {
      var campo = form.querySelector('[name="' + primerFallo + '"]');
      if (campo) campo.focus();
    }
    return !primerFallo;
  }

  // --- confirmación + .ics ---

  function pad(n) { return String(n).padStart(2, "0"); }

  // Bogotá es UTC-5 fijo (Colombia no aplica horario de verano).
  function icsUtc(fechaStr, horaStr, masMinutos) {
    var d = parseIso(fechaStr);
    var hm = horaStr.split(":");
    var utc = new Date(Date.UTC(
      d.getFullYear(), d.getMonth(), d.getDate(),
      Number(hm[0]) + 5, Number(hm[1]) + (masMinutos || 0), 0
    ));
    return utc.getUTCFullYear() + pad(utc.getUTCMonth() + 1) + pad(utc.getUTCDate()) +
      "T" + pad(utc.getUTCHours()) + pad(utc.getUTCMinutes()) + "00Z";
  }

  function construirIcs(datos) {
    var lineas = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Humanizar//Agenda//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + icsUtc(datos.fecha, datos.hora, 0) + "-" + Math.random().toString(36).slice(2) + "@humanizar.tech",
      "DTSTAMP:" + icsUtc(datos.fecha, datos.hora, 0),
      "DTSTART:" + icsUtc(datos.fecha, datos.hora, 0),
      "DTEND:" + icsUtc(datos.fecha, datos.hora, 30),
      "SUMMARY:Demo de " + datos.producto + " — Humanizar",
      "DESCRIPTION:30 minutos con quien construyó el producto. El enlace de la videollamada llega por email 24 h antes.",
      "URL:https://agenda.humanizar.tech/",
      "END:VEVENT",
      "END:VCALENDAR"
    ];
    return lineas.join("\r\n");
  }

  function mostrarConfirmacion(datos, mensajeServidor) {
    document.getElementById("confirm-detail").textContent =
      datos.producto + " · " + fechaEnPalabras(datos.fecha) + " a las " + datos.hora + " (hora de Bogotá).";
    document.getElementById("confirm-mail").textContent =
      mensajeServidor || ("Te mandamos la confirmación a " + datos.email + ". El enlace de la videollamada llega 24 h antes.");

    var titulo = document.getElementById("confirm-title");
    var nombre = String(datos.nombre || "").trim().split(/\s+/)[0];
    titulo.textContent = nombre ? ("Listo, " + nombre + ". Quedó agendado.") : "Listo. Quedó agendado.";

    try {
      var blob = new Blob([construirIcs(datos)], { type: "text/calendar;charset=utf-8" });
      document.getElementById("add-cal").href = URL.createObjectURL(blob);
    } catch (e) {
      document.getElementById("add-cal").hidden = true;
    }

    form.hidden = true;
    confirmBox.hidden = false;
    titulo.focus();
  }

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.className = "hint" + (kind ? " " + kind : "");
  }

  // --- arranque ---

  var hoy = bogotaNow();
  fechaInput.min = iso(hoy);
  var max = new Date(hoy.getTime() + 60 * 86400000);
  fechaInput.max = iso(max);

  // Antes arrancaba en HOY: quien no tocaba el campo reservaba el mismo día,
  // a veces a una hora ya pasada. Ahora arranca en el primer hueco real.
  var hueco = primerHueco();
  if (hueco) {
    fechaInput.value = hueco.fecha;
  } else {
    fechaInput.value = iso(siguienteHabil(hoy));
  }
  pintarHoras(false);

  // El catálogo nombra productos que acá no son opciones (Koinonía, Nómos, Apothḗke…).
  // Los que sí corresponden pero se llaman distinto se traducen con este mapa.
  var ALIAS = {
    "cauce / humanizar": "Cauce V3",
    "cauce": "Cauce V3",
    "humanizar web": "Cauce V3",
    "xenia": "Xenía",
    "demeter": "Deméter",
    "aletheia": "Aletheia",
    "sigre": "SIGRE",
    "graf": "Graf",
    "sinergia pos": "Sinergia POS"
  };

  // Producto preseleccionado desde el catálogo: /?producto=Deméter
  try {
    var pedido = new URLSearchParams(window.location.search).get("producto");
    if (pedido) {
      pedido = pedido.trim().slice(0, 80);
      var clave = pedido.toLowerCase();
      var buscado = ALIAS[clave] || pedido;
      var match = Array.prototype.slice.call(productoSelect.options).filter(function (o) {
        return o.value && o.value.toLowerCase() === buscado.toLowerCase();
      })[0];

      if (match) {
        productoSelect.value = match.value;
      } else {
        // Producto del catálogo sin opción propia: no lo perdemos, lo pasamos
        // en la nota. El select queda en "Otro" para no inventar valores que
        // el servidor no espera.
        productoSelect.value = "Otro / no sé";
        var nota = form.querySelector('[name="nota"]');
        if (nota && !nota.value) nota.value = "Me interesa: " + pedido;
      }
    }
  } catch (e) { /* sin URLSearchParams no pasa nada: el visitante elige a mano */ }

  fechaInput.addEventListener("change", function () {
    pintarHoras(true);
    marcarError("fecha", false);
  });

  autoBtn.addEventListener("click", function () {
    var h = primerHueco();
    if (!h) {
      slotNote.textContent = "No encontramos hueco en los próximos días. Elegí uno a mano y lo acomodamos.";
      slotNote.className = "field-hint warn";
      return;
    }
    fechaInput.value = h.fecha;
    pintarHoras(false);
    horaSelect.value = h.hora;
    marcarError("fecha", false);
    marcarError("hora", false);
    setStatus("Te reservamos el " + fechaEnPalabras(h.fecha) + " a las " + h.hora + ". Podés cambiarlo.", "ok");
  });

  ["nombre", "email", "producto", "hora"].forEach(function (n) {
    var campo = form.querySelector('[name="' + n + '"]');
    if (campo) campo.addEventListener("input", function () { marcarError(n, false); });
    if (campo) campo.addEventListener("change", function () { marcarError(n, false); });
  });

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();

    if (!validar()) {
      setStatus("Revisá los campos marcados.", "err");
      return;
    }

    setStatus("Enviando…", "");
    var data = Object.fromEntries(new FormData(form).entries());

    submit.disabled = true;
    submit.dataset.label = submit.textContent;
    submit.textContent = "Enviando…";

    try {
      var res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || !json.ok) {
        setStatus(json.error || "No pudimos registrar la reserva. Probá de nuevo.", "err");
      } else {
        setStatus("", "");
        mostrarConfirmacion(data, json.message);
      }
    } catch (e) {
      setStatus("Sin red o el servidor no responde. Probá de nuevo.", "err");
    } finally {
      submit.disabled = false;
      submit.textContent = submit.dataset.label || "Reservar mis 30 minutos";
    }
  });
})();
