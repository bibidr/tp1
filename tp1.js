let trazos = [];
let cantTrazos = 21; 
let trazosEnPantalla = [];

const MAX_FIGURAS = 65; // cantidad de figuras que puede haber a la vez en el lienzo

// ── TAMAÑO CONTROLADO ──
let ANCHO_MIN = 70;
let ANCHO_MAX = 250;

let escala = 1;
let escalaMin = 0.6;
let escalaMax = 1.3;

// ── GRILLA PARA DISTRIBUCIÓN PAREJA (estilo Hasper) ──
let colsGrilla = 12;
let filasGrilla = 8;
let celdasDisponibles = [];

let paleta = [
  "#28b3a0", "#fec30e", "#e31d4e", "#e977a4",
  "#432e58", "#4d94cf", "#718c3e", "#c16a3f", "#fcfcfc"
];

// VARIABLES DE CALIBRACIÓN — el menú las modifica en tiempo real
let AMP_MIN = 0.01;
let AMP_MAX = 0.035;
let FREC_MIN = 110;
let FREC_MAX = 350;
let UMBRAL_SONIDO = 0.12;

let debug = false;

let mic;
let amp_cruda, amp;
let frec_cruda, frec;
let pitch;
let audioContext;
const pichModel = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';

let gestorAmp;
let gestorFrec;

let haySonido = false;
let antesHabiaSonido = false;

// ── VALORES DEFAULT DEL MENÚ (para reinicio) ──
const DEFAULTS = {
  ampMin:   0.12,
  ampMax:   0.035,
  volumen:  0.90
};

// ══════════════════════════════════════════════
// ── CONVERGENCIA FINAL (cierre de la obra) ──
// ══════════════════════════════════════════════
let convergiendo = false;
let progresoConvergencia = 0;
let duracionConvergencia = 90; // en frames (~3 seg a 30fps)
let margenBorde = -80; // negativo: el punto de destino puede caer más allá del borde,
                        // para que la figura "sangre" fuera del canvas y no queden huecos en las esquinas

let enPausaFinal = false;      // true mientras se muestra la mancha final quieta
let framesPausaFinal = 0;
const DURACION_PAUSA_FINAL = 90; // ~3 seg más, quieto, antes de resetear

function prepararGrilla() {
  celdasDisponibles = [];
  let anchoCelda = width / colsGrilla;
  let altoCelda = height / filasGrilla;
  for (let f = 0; f < filasGrilla; f++) {
    for (let c = 0; c < colsGrilla; c++) {
      celdasDisponibles.push({
        x: c * anchoCelda + anchoCelda / 2,
        y: f * altoCelda + altoCelda / 2,
        anchoCelda: anchoCelda,
        altoCelda: altoCelda
      });
    }
  }
  celdasDisponibles = shuffle(celdasDisponibles);
}

function proximaPosicion() {
  if (celdasDisponibles.length === 0) {
    prepararGrilla();
  }
  let celda = celdasDisponibles.pop();
  let jitterX = random(-celda.anchoCelda * 0.35, celda.anchoCelda * 0.35);
  let jitterY = random(-celda.altoCelda * 0.35, celda.altoCelda * 0.35);
  return { x: celda.x + jitterX, y: celda.y + jitterY };
}

function preload() {
  for (let i = 0; i < cantTrazos; i++) {
    let nombre = "data/trazo" + nf(i, 2) + ".png";
    trazos[i] = loadImage(nombre);
  }
}

function setup() {
  let cnv = createCanvas(800, 600);
  cnv.mousePressed(iniciarEntradaAudio);

  noStroke();
  imageMode(CENTER);
  colorMode(RGB, 255, 255, 255, 100);
  background(255);
  frameRate(30);

  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);

  gestorAmp  = new GestorSenial(AMP_MIN, AMP_MAX);
  gestorFrec = new GestorSenial(FREC_MIN, FREC_MAX);

  prepararGrilla();

  conectarMenu();
}

function conectarMenu() {

  let sliderAmpMin = document.getElementById('ctrl-amp-min');
  let valAmpMin = document.getElementById('val-amp-min');
  sliderAmpMin.addEventListener('input', () => {
    UMBRAL_SONIDO = parseFloat(sliderAmpMin.value);
    valAmpMin.textContent = UMBRAL_SONIDO.toFixed(2);
  });

  let sliderAmpMax = document.getElementById('ctrl-amp-max');
  let valAmpMax = document.getElementById('val-amp-max');
  sliderAmpMax.addEventListener('input', () => {
    AMP_MAX = parseFloat(sliderAmpMax.value);
    valAmpMax.textContent = AMP_MAX.toFixed(3);
    gestorAmp.maximo = AMP_MAX;
  });

  let sliderVol = document.getElementById('ctrl-volumen');
  let valVol    = document.getElementById('val-volumen');
  sliderVol.addEventListener('input', () => {
    gestorAmp.f = parseFloat(sliderVol.value);
    valVol.textContent = gestorAmp.f.toFixed(2);
  });

  document.getElementById('btn-reiniciar').addEventListener('click', () => {
    UMBRAL_SONIDO= DEFAULTS.ampMin;
    gestorAmp.maximo = DEFAULTS.ampMax;
    gestorAmp.f = DEFAULTS.volumen;

    sliderAmpMin.value = DEFAULTS.ampMin;
    sliderAmpMax.value = DEFAULTS.ampMax;
    sliderVol.value    = DEFAULTS.volumen;

    valAmpMin.textContent = DEFAULTS.ampMin.toFixed(2);
    valAmpMax.textContent = DEFAULTS.ampMax.toFixed(3);
    valVol.textContent = DEFAULTS.volumen.toFixed(2);

    reiniciarLienzo();
  });
}

function reiniciarLienzo() {
  trazosEnPantalla = [];
  convergiendo = false;
  enPausaFinal = false;
  progresoConvergencia = 0;
  framesPausaFinal = 0;
  prepararGrilla();
  background(255);
}

function draw() {
  amp_cruda = mic.getLevel();
  gestorAmp.actualizar(amp_cruda);
  amp  = gestorAmp.filtrada;
  frec = gestorFrec.filtrada;

  haySonido = amp > UMBRAL_SONIDO;
  let empezoElSonido  = !antesHabiaSonido && haySonido;
  let terminoElSonido = !haySonido && antesHabiaSonido;

  if (convergiendo) {
    // ── La obra está cerrando: pausamos la interacción normal ──
    animarConvergencia();

  } else if (enPausaFinal) {
    // ── Mancha final quieta unos segundos, luego reinicia sola ──
    framesPausaFinal++;
    if (framesPausaFinal >= DURACION_PAUSA_FINAL) {
      reiniciarLienzo();
    }

  } else {
    // ── Interacción normal ──
    if (haySonido) {
      escala = map(frec, 0, 1, escalaMax, escalaMin);

      let probabilidadDeAparicion = map(amp, UMBRAL_SONIDO, 1.0, 0.05, 0.4);
      if (random(1) < probabilidadDeAparicion) {
        let pos = proximaPosicion();
        dibujarTrazo(pos.x, pos.y);
      }

      if (frec > 0.65) {
        for (let i = 0; i < trazosEnPantalla.length; i++) {
          trazosEnPantalla[i].opacidadPropia = max(5, trazosEnPantalla[i].opacidadPropia - 1.5);
        }
        redibujarTodo();
      }
    }

    if (terminoElSonido) {
      if (trazosEnPantalla.length > 0) {
        let indiceAleatorio = int(random(trazosEnPantalla.length));
        trazosEnPantalla.splice(indiceAleatorio, 1);
        redibujarTodo();
      }
    }

    antesHabiaSonido = haySonido;
  }

  if (debug) {
    gestorAmp.dibujar(20, 20);
    gestorFrec.dibujar(20, 130);
  }
}

function iniciarEntradaAudio() {
  userStartAudio();
}

function dibujarTrazo(x, y) {
  if (trazosEnPantalla.length >= MAX_FIGURAS) {
    iniciarConvergencia();
    return;
  }

  let cual = int(random(cantTrazos));
  let colorElegido = random(paleta);

  let anchoT = random(ANCHO_MIN, ANCHO_MAX) * escala;
  let proporcion = trazos[cual].height / trazos[cual].width;
  let altoT = anchoT * proporcion;

  let rotacion = random(-QUARTER_PI, QUARTER_PI);
  let opacidad = 78;

  trazosEnPantalla.push({
    cual: cual,
    x: x, y: y,
    ancho: anchoT, alto: altoT,
    colorHex: colorElegido,
    opacidadPropia: opacidad,
    rotacion: rotacion
  });

  dibujarUnTrazo(trazos[cual], x, y, anchoT, altoT, colorElegido, opacidad, rotacion);
}

function dibujarUnTrazo(img, x, y, anchoT, altoT, colorHex, opacidad, rotacion) {
  push();
  translate(x, y);
  rotate(rotacion);
  let c = color(colorHex);
  tint(red(c), green(c), blue(c), opacidad);
  blendMode(BLEND);
  image(img, 0, 0, anchoT, altoT);
  pop();
}

function redibujarTodo() {
  background(255);
  for (let i = 0; i < trazosEnPantalla.length; i++) {
    let t = trazosEnPantalla[i];
    dibujarUnTrazo(trazos[t.cual], t.x, t.y, t.ancho, t.alto, t.colorHex, t.opacidadPropia, t.rotacion);
  }
  blendMode(BLEND);
}

// ══════════════════════════════════════════════
// ── LÓGICA DE CONVERGENCIA AL CENTRO ──
// ══════════════════════════════════════════════

function iniciarConvergencia() {
  if (convergiendo || enPausaFinal) return; // ya en curso, no reiniciar

  convergiendo = true;
  progresoConvergencia = 0;

  let cx = width / 2;
  let cy = height / 2;

  for (let t of trazosEnPantalla) {
    t.xOrigen = t.x;
    t.yOrigen = t.y;
    t.delay = random(0, 0.3); // stagger: cada trazo arranca en un instante levemente distinto

    // Punto de destino individual: no van todos al mismo pixel exacto,
    // sino a un punto sorteado dentro de un radio alrededor del centro
    // (distribución uniforme en el círculo, no solo en el borde).
    t.xDestino = random(margenBorde, width - margenBorde);
    t.yDestino = random(margenBorde, height - margenBorde);
  }
}

function animarConvergencia() {
  progresoConvergencia += 1 / duracionConvergencia;

  for (let t of trazosEnPantalla) {
    let p = constrain((progresoConvergencia - t.delay) / (1 - t.delay), 0, 1);
    let pEase = easeInOutCubic(p);
    t.x = lerp(t.xOrigen, t.xDestino, pEase);
    t.y = lerp(t.yOrigen, t.yDestino, pEase);
    t.rotacion += 0.03; // leve giro extra durante el viaje (efecto remolino)
  }

  redibujarTodo();

  if (progresoConvergencia >= 1.3) {
    convergiendo = false;
    enPausaFinal = true;
    framesPausaFinal = 0;
  }
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2;
}

function startPitch() {
  pitch = ml5.pitchDetection(pichModel, audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  getPitch();
}

function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency) {
      frec_cruda = frequency;
      gestorFrec.actualizar(frec_cruda);
    }
    getPitch();
  });
}
