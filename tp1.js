let trazos = [];
let cantTrazos = 13;
let opacidad = 95; // opacidad general de las figuras 
let comenzar = false;

function preload() {
  for (let i = 0; i < cantTrazos; i++) {
    let nombre = "data/trazo" + nf(i, 2) + ".png";
    trazos[i] = loadImage(nombre);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  window.addEventListener('contextmenu', function(event) {
    event.preventDefault();
  });
  colorMode(HSB, 360, 100, 100, 100);
  background(255);
  frameRate(10);
  noLoop();
}

function dibujarTrazo(x, y) {
  let cual = int(random(cantTrazos));
  let escala = 0.3;
  let anchoT = trazos[cual].width * escala;
  let altoT = trazos[cual].height * escala;

  tint(random(0, 360), random(80, 100), 100, opacidad); // usa la opacidad en todas las figuras
  image(trazos[cual], x, y, anchoT, altoT);
}

function mousePressed() {
  if (mouseButton === RIGHT) {
    opacidad = max(5, opacidad - 10); // baja la opacidad con click derecho
    return;
  }

  if (!comenzar) {
    comenzar = true;
    loop();
  }
}

function draw() {
  if (!comenzar) {
    return;
  }

  let x = random(width);
  let y = random(height);
  dibujarTrazo(x, y);
}
