let trazos = [];
let cantTrazos = 13;
let escala = 0.4;        
let escalaMin = 0.2;     // techo mínimo 
let escalaMax = 0.8;     // techo máximo 
let trazosEnPantalla = [];

const MAX_FIGURAS = 40;  

let paleta = [
  "#28b3a0", "#fec30e", "#e31d4e", "#e977a4", 
  "#3a373d", "#4d94cf", "#718c3e", "#c16a3f", "#fcfcfc"
];


// VARIABLES GLOBALES DE CALIBRACIÓN DE AUDIO (CONTROLADOR)

let AMP_MIN = 0.01;
let AMP_MAX = 0.035;
let FREC_MIN = 110;  // sonido Grave 
let FREC_MAX = 350;  // sonido Agudo 

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

  
  gestorAmp = new GestorSenial(AMP_MIN, AMP_MAX);
  gestorFrec = new GestorSenial(FREC_MIN, FREC_MAX);
}

function draw() {
  // ADQUISICIÓN Y FILTRADO DE SEÑALES
  amp_cruda = mic.getLevel(); 
  gestorAmp.actualizar(amp_cruda); 
  amp = gestorAmp.filtrada;    // salida limpia entre 0.0 y 1.0
  frec = gestorFrec.filtrada;  // salida limpia entre 0.0 y 1.0

  // LÓGICA DE DETECCIÓN

  haySonido = amp > 0.12; 

  let empezoElSonido = !antesHabiaSonido && haySonido;
  let terminoElSonido = !haySonido && antesHabiaSonido;

  // MAPEO EXPRESIVO DEL SISTEMA GENERATIVO
  if (haySonido) {
    
    // REEMPLAZO DE CLIC IZQUIERDO Y TECLA 'R':
    // el tono de la voz define el tamaño del trazo
    // voces graves (frec cercana a 0) -> trazo grande (escalaMax)
    // voces agudas (frec cercana a 1) -> trazo más chico (escalaMin)
    escala = map(frec, 0, 1, escalaMax, escalaMin);

    // REEMPLAZO DE TECLA 'I':
    // el volumen de la voz controla la frecuencia de aparición de los trazos
    // suanto más fuerte se haga el sonido, mayor es el porcentaje de probabilidad de pintar
    let probabilidadDeAparicion = map(amp, 0.12, 1.0, 0.05, 0.4);
    if (random(1) < probabilidadDeAparicion) {
      dibujarTrazo(random(width), random(height));
    }

    // REEMPLAZO DE CLIC DERECHO (opacidad):
    // si se hace un sonido agudo sostenido (ej. un silbido o tono alto, frec > 0.65), 
    // la opacidad de los trazos en la pantalla empezará a disminuir de forma gradual
    if (frec > 0.65) {
      for (let i = 0; i < trazosEnPantalla.length; i++) {
        trazosEnPantalla[i].opacidadPropia = max(5, trazosEnPantalla[i].opacidadPropia - 1.5);
      }
      redibujarTodo();
    }
  }

  // REREEMPLAZO DE LA BARRA ESPACIADORA:
  // al interrumpir el flujo de la voz (un silencio repentino), eliminamos un trazo al azar
  if (terminoElSonido) {
    if (trazosEnPantalla.length > 0) {
      let indiceAleatorio = int(random(trazosEnPantalla.length));
      trazosEnPantalla.splice(indiceAleatorio, 1);
      redibujarTodo();
    }
  }

  // guardamos el estado para el ciclo siguiente
  antesHabiaSonido = haySonido;

  // renderizador de la interfaz de diagnóstico 
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
    return; 
  }

  let cual = int(random(cantTrazos));
  let colorElegido = random(paleta);
  
  // guardamos las dimensiones fijas calculadas con la escala dictada por el tono exacto en ese frame
  let anchoT = trazos[cual].width * escala;  
  let altoT = trazos[cual].height * escala;  

  trazosEnPantalla.push({
    cual: cual,
    x: x,
    y: y,
    ancho: anchoT,
    alto: altoT,
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

// PROTOCOLO DE CONEXIÓN CON ML5.JS 
function startPitch() {
  pitch = ml5.pitchDetection(pichModel, audioContext , mic.stream, modelLoaded);
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
  })
}
