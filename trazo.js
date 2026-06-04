class Trazo {
  constructor(img, x, y, rot, col, escala) {
    this.img = img; 
    this.x = x;     
    this.y = y;     
    this.rot = rot; 
    this.col = col; 
    this.escala = escala; 
  }

  display() {
    push(); 
    translate(this.x, this.y); 
    rotate(this.rot); 
    
    scale(this.escala);
    tint(this.col); 
    image(this.img, 0, 0); 
    pop(); 
  }
}