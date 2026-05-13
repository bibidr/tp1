let trazos = [];
let cantTrazos = 13;
let ultimoX, ultimoY;
let espaciado = 90; 

function preload() {
  for (let i = 0; i < cantTrazos; i++) {
    let nombre = "data/trazo" + nf(i, 2) + ".png";
    trazos[i] = loadImage(nombre);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(255);
  noLoop();
}

function dibujarTrazo(x, y) {
  let cual = int(random(cantTrazos));
  let escala = 0.3;
  let anchoT = trazos[cual].width * escala;
  let altoT = trazos[cual].height * escala;
  
  tint(random(0, 360), random(80, 100), 100,80);
  image(trazos[cual], x, y, anchoT, altoT);
}

function mousePressed() {
  ultimoX = mouseX;
  ultimoY = mouseY;
  dibujarTrazo(mouseX, mouseY);
}

function mouseDragged() {
  let d = dist(mouseX, mouseY, ultimoX, ultimoY);
  if (d > espaciado) {
    dibujarTrazo(mouseX, mouseY);
    ultimoX = mouseX;
    ultimoY = mouseY;
  }
}

function draw() {}


