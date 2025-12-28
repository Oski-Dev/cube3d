// Bardzo prosty szkic: duży czarny kwadrat na środku.

function setup(){
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
}

function draw(){
  clear(); // pozostaw tło strony (HTML) jako szare

  let side = min(width, height) * 0.75;
  let x = (width - side) / 2;
  let y = (height - side) / 2;

  noStroke();
  fill(0);
  rect(x, y, side, side);
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}
