let trazosRaw = [];
let trazosObjetos = [];
let totalTrazosArchivos = 13;

// CONTROL DE ANIMACIÓN
let spawnActivo = false;

// CONTROL DEL MICRÓFONO
let mic;
let amplitud;
let micActivado = false;
const UMBRAL_MIC = 0.01;

let paletaHasper = [
  "#28b3a0",
  "#fec30e",
  "#e31d4e",
  "#e977a4",
  "#3a373d",
  "#4d94cf",
  "#718c3e",
  "#c16a3f",
  "#fcfcfc"
];

function preload() {
  for (let i = 0; i < totalTrazosArchivos; i++) {
    let strNumero = nf(i, 2); 
    let nombreArchivo = 'data/trazo' + strNumero + '.png';
    trazosRaw[i] = loadImage(nombreArchivo);
  }
}

function setup() {
  createCanvas(800, 600);
  background(255);
  noStroke();
  imageMode(CENTER);

  mic = new p5.AudioIn();
  amplitud = new p5.Amplitude();
  amplitud.setInput(mic);

  textAlign(CENTER, CENTER);
  textSize(18);
  fill(50);

  console.log("¡TP Graciela Hasper - Modo Diferencia Cromática!");
}

function draw() {
  if (!micActivado) {
    background(255);
    text('Haz click solo para habilitar el micrófono', width / 2, height / 2);
    return;
  }

  let nivel = amplitud.getLevel();
  console.log("nivel:", nivel.toFixed(4));

if (nivel > UMBRAL_MIC) {
    spawnActivo = true;
  } else {
    spawnActivo = false;
  }

  if (spawnActivo) {
    crearNuevoTrazo();
  }

  blendMode(DIFFERENCE);

  for (let i = 0; i < trazosObjetos.length; i++) {
    trazosObjetos[i].display();
  }

  blendMode(BLEND);
}

function mousePressed() {
  if (!micActivado) {
    userStartAudio().then(() => {
      mic.start();
      micActivado = true;
      console.log('Micrófono activado. Esperando sonido...');
    }).catch((err) => {
      console.log('Error al activar el micrófono:', err);
    });
  }
}

function keyPressed() {
  if (key === 'R' || key === 'r') {
    trazosObjetos = [];
    background(255);
    spawnActivo = false;
    console.log("Lienzo reiniciado.");
  } else {
    spawnActivo = !spawnActivo;
  }
}

function crearNuevoTrazo() {
  let idImagen = floor(random(trazosRaw.length));
  let tinteColor = color(random(paletaHasper));
  
  let x = random(-50, width + 50);
  let y = random(-50, height + 50);
  let angulo = random(TWO_PI);
  
  let tamanoObjetivo = random(width * 0.20, width * 0.45);
  let imgBase = trazosRaw[idImagen];
  let factorEscala = tamanoObjetivo / imgBase.width;
  
  trazosObjetos.push(new Trazo(imgBase, x, y, angulo, tinteColor, factorEscala));
}

