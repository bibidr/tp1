let trazos = [];
let cantTrazos = 13;
let escala = 0.2;
let escalaMin = 0.2;
let escalaMax = 0.8;
let trazosEnPantalla = [];

const MAX_FIGURAS = 25;

let paleta = [
  "#28b3a0", "#fec30e", "#e31d4e", "#e977a4",
  "#3a373d", "#4d94cf", "#718c3e", "#c16a3f", "#fcfcfc"
];

// VARIABLES DE CALIBRACIÓN — el menú las modifica en tiempo real
let AMP_MIN = 0.01;
let AMP_MAX = 0.035;
let FREC_MIN = 110;
let FREC_MAX = 350;
let UMBRAL_SONIDO = 0.12;  // antes era hardcodeado en draw()

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

  // ── CONEXIÓN DEL MENÚ HTML CON EL SKETCH ──
  conectarMenu();
}

function conectarMenu() {

  // Slider: umbral de sonido
  let sliderAmpMin = document.getElementById('ctrl-amp-min');
  let valAmpMin    = document.getElementById('val-amp-min');
  sliderAmpMin.addEventListener('input', () => {
    UMBRAL_SONIDO = parseFloat(sliderAmpMin.value);
    valAmpMin.textContent = UMBRAL_SONIDO.toFixed(2);
  });

  // Slider: amplitud máxima (rango del gestorAmp)
  let sliderAmpMax = document.getElementById('ctrl-amp-max');
  let valAmpMax    = document.getElementById('val-amp-max');
  sliderAmpMax.addEventListener('input', () => {
    AMP_MAX = parseFloat(sliderAmpMax.value);
    valAmpMax.textContent = AMP_MAX.toFixed(3);
    gestorAmp.maximo = AMP_MAX; // actualiza el gestor en vivo
  });

  // Slider: sensibilidad / suavizado del volumen (factor f del gestor)
  let sliderVol = document.getElementById('ctrl-volumen');
  let valVol    = document.getElementById('val-volumen');
  sliderVol.addEventListener('input', () => {
    gestorAmp.f = parseFloat(sliderVol.value);
    valVol.textContent = gestorAmp.f.toFixed(2);
  });

  // Botón reiniciar
  document.getElementById('btn-reiniciar').addEventListener('click', () => {
    // Restaurar valores
    UMBRAL_SONIDO    = DEFAULTS.ampMin;
    gestorAmp.maximo = DEFAULTS.ampMax;
    gestorAmp.f      = DEFAULTS.volumen;

    // Restaurar sliders visualmente
    sliderAmpMin.value = DEFAULTS.ampMin;
    sliderAmpMax.value = DEFAULTS.ampMax;
    sliderVol.value    = DEFAULTS.volumen;

    // Restaurar labels
    valAmpMin.textContent = DEFAULTS.ampMin.toFixed(2);
    valAmpMax.textContent = DEFAULTS.ampMax.toFixed(3);
    valVol.textContent    = DEFAULTS.volumen.toFixed(2);

    // Limpiar canvas
    trazosEnPantalla = [];
    background(255);
  });
}

function draw() {
  amp_cruda = mic.getLevel();
  gestorAmp.actualizar(amp_cruda);
  amp  = gestorAmp.filtrada;
  frec = gestorFrec.filtrada;

  // Umbral controlado desde el menú
  haySonido = amp > UMBRAL_SONIDO;

  let empezoElSonido  = !antesHabiaSonido && haySonido;
  let terminoElSonido = !haySonido && antesHabiaSonido;

  if (haySonido) {
    escala = map(frec, 0, 1, escalaMax, escalaMin);

    let probabilidadDeAparicion = map(amp, UMBRAL_SONIDO, 1.0, 0.05, 0.4);
    if (random(1) < probabilidadDeAparicion) {
      dibujarTrazo(random(width), random(height));
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

  if (debug) {
    gestorAmp.dibujar(20, 20);
    gestorFrec.dibujar(20, 130);
  }
}

function iniciarEntradaAudio() {
  userStartAudio();
}

function dibujarTrazo(x, y) {
  if (trazosEnPantalla.length >= MAX_FIGURAS) return;

  let cual        = int(random(cantTrazos));
  let colorElegido = random(paleta);
  let anchoT      = trazos[cual].width  * escala;
  let altoT       = trazos[cual].height * escala;

  trazosEnPantalla.push({
    cual: cual,
    x: x, y: y,
    ancho: anchoT, alto: altoT,
    colorHex: colorElegido,
    opacidadPropia: 100
  });

  let c = color(colorElegido);
  tint(red(c), green(c), blue(c), 100);
  blendMode(DIFFERENCE);
  image(trazos[cual], x, y, anchoT, altoT);
  blendMode(BLEND);
}

function redibujarTodo() {
  blendMode(BLEND);
  background(255);
  for (let i = 0; i < trazosEnPantalla.length; i++) {
    let t = trazosEnPantalla[i];
    let c = color(t.colorHex);
    tint(red(c), green(c), blue(c), t.opacidadPropia);
    blendMode(DIFFERENCE);
    image(trazos[t.cual], t.x, t.y, t.ancho, t.alto);
  }
  blendMode(BLEND);
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
