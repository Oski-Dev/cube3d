// Prosty szkic p5: na środku kwadratowy viewport z czarną przestrzenią
// Wokół metaliczna powierzchnia uzyskana prostymi metodami (linie, przezroczystości)

function setup(){
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
}

function draw(){
  background(30);
  drawMetalSurface();
  drawViewport();
}

function drawMetalSurface(){
  // "Brushed metal" — cienkie pionowe linie z drobną wariacją
  noFill();
  for(let x=0; x<width; x+=2){
    let n = noise(x*0.005, frameCount*0.001);
    let g = floor(lerp(80, 210, n));
    stroke(g);
    strokeWeight(2);
    line(x, 0, x, height);
  }

  // poruszający się pas światła dla efektu połysku
  push();
  blendMode(ADD);
  noStroke();
  let bandW = max(120, width*0.08);
  let bandX = (frameCount*2) % (width + bandW) - bandW/2;
  fill(255, 255, 255, 35);
  rect(bandX, -50, bandW, height+100);
  pop();

  // delikatna vignetta (głębia)
  push();
  noFill();
  for(let i=0;i<200;i+=12){
    stroke(0, map(i,0,200,10,80));
    rect(i/2, i/2, width-i, height-i);
  }
  pop();
}

function drawViewport(){
  // kwadratowy viewport na środku
  let side = min(width, height) * 0.6;
  let x = (width - side) / 2;
  let y = (height - side) / 2;
  let r = side * 0.04; // promień narożników

  // obramowanie metaliczne (wiele cienkich ramek z gradientem)
  push();
  translate(x, y);
  for(let i=0;i<10;i++){
    let t = i / 9;
    let c = lerpColor(color(230,230,230), color(70,70,70), t);
    stroke(c);
    strokeWeight(1.6);
    noFill();
    rect(-i, -i, side + i*2, side + i*2, r + i*0.6);
  }

  // czarna przestrzeń wewnątrz viewportu
  noStroke();
  fill(0);
  rect(10, 10, side - 20, side - 20, r*0.8);

  // delikatny cień wewnętrzny (głębia)
  for(let s=0; s<8; s++){
    let a = map(s,0,7,80,6);
    noFill();
    stroke(0, a);
    strokeWeight(2);
    rect(12+s, 12+s, side - 24 - s*2, side - 24 - s*2, r*0.7);
  }

  pop();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}
