// Bardzo prosty szkic: duży czarny kwadrat na środku.
// 3D sześcian — rysujemy tylko wierzchołki i krawędzie.
// Kamera jest opisana dwoma wektorami: `camPos` (położenie) i `camDir` (kierunek/wektor przód).
// Sześcian opisany jest przez `cubeSize` oraz Eulerowskie kąty `cubeAngles` (yaw, pitch, roll).

let camPos, camDir;
let cubeSize = 200; // długość krawędzi
let cubeAngles = { yaw: 0.6, pitch: 0.4, roll: 0.0 }; // radiany

// tryb sterowania: 'cube' lub 'camera'
let controlMode = 'cube';

// kąty kamery (Euler): domyślnie patrzy w stronę -Z
let camAngles = { yaw: 0.0, pitch: 0.0, roll: 0.0 };
let defaultCamPos, defaultCamAngles, defaultCubeAngles;
let trailG = null; // persistent graphics for vertex trails (same size as viewport)
let trails = []; // array of {pos: p5.Vector (world), t: seconds}
let prevWorldVerts = [];
let trailLife = 3.5; // seconds
let moveThreshold = 0.5; // world-space movement threshold to create a trail sample

function setup(){
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('display','block');
  cnv.position(0,0);
  pixelDensity(1);
  noSmooth();

  // zapobiegaj domyślnemu przewijaniu strony przy użyciu klawiszy sterowania
  window.addEventListener('keydown', (e) => {
    const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','q','Q','e','E','m','M','r','R'];
    if(keys.includes(e.key)) e.preventDefault();
  }, {passive:false});

  // Domyślna kamera: trochę z przodu i powyżej, patrzy w stronę środka układu (0,0,0)
  defaultCamPos = createVector(0, 0, 600);
  camPos = defaultCamPos.copy();
  camDir = createVector(0, 0, -1); // patrzy w stronę ujemnego Z

  // zapamiętaj wartości domyślne do resetu
  defaultCamAngles = Object.assign({}, camAngles);
  defaultCubeAngles = Object.assign({}, cubeAngles);
}

function draw(){
  clear(); // pozostaw tło strony (HTML) jako szare

  // Najpierw rysujemy viewport (czarny kwadrat) — obszar, gdzie będzie scena
  // oblicz viewport
  let side = floor(min(width, height) * 0.75);
  let vx = floor((width - side) / 2);
  let vy = floor((height - side) / 2);
  // narysuj tło viewportu na głównym canvas (czarne)
  noStroke();
  fill(0);
  rect(vx, vy, side, side);

  // Przygotuj wierzchołki sześcianu w przestrzeni świata (środek w 0,0,0)
  let verts = cubeVertices(cubeSize);

  // Sterowanie klawiszami: strzałki -> yaw/pitch, Q/E -> roll
  const ROT_SPEED = 0.03;
  // active wskazuje na obiekt (cubeAngles lub camAngles) sterowany aktualnie
  let active = (controlMode === 'cube') ? cubeAngles : camAngles;
  if (keyIsDown(LEFT_ARROW))  active.yaw  -= ROT_SPEED;
  if (keyIsDown(RIGHT_ARROW)) active.yaw  += ROT_SPEED;
  if (keyIsDown(UP_ARROW))    active.pitch -= ROT_SPEED;
  if (keyIsDown(DOWN_ARROW))  active.pitch += ROT_SPEED;
  if (keyIsDown(81)) /*Q*/    active.roll -= ROT_SPEED;
  if (keyIsDown(69)) /*E*/    active.roll += ROT_SPEED;

  // Jeśli sterujemy kamerą, przelicz kierunek
  camDir = eulerToDir(camAngles.yaw, camAngles.pitch);

  // Obrót sześcianu: zastosuj kolejno roll(Z), pitch(X), yaw(Y)
  let rotated = verts.map(v => rotateVecByEuler(v, cubeAngles.yaw, cubeAngles.pitch, cubeAngles.roll));

  // Dodaj próbki do śladu tylko jeśli wierzchołek zmienił pozycję w przestrzeni
  let now = millis() / 1000;
  for(let i=0;i<rotated.length;i++){
    if(prevWorldVerts[i]){
      let d = p5.Vector.dist(rotated[i], prevWorldVerts[i]);
      if(d > moveThreshold){
        // dodaj próbkę (światowe współrzędne)
        trails.push({ pos: rotated[i].copy(), t: now });
      }
    } else {
      // init previous positions without creating trails
    }
  }
  // zapisz aktualne world positions jako poprzednie
  prevWorldVerts = rotated.map(v=>v.copy());

  // Przygotuj osie kamery (uwzględniają roll) i rzutuj do współrzędnych viewportu
  let camAxes = camAxesFromEuler(camAngles.yaw, camAngles.pitch, camAngles.roll);

  // renderujemy scenę do grafiki o rozmiarze viewportu — to automatycznie przytnie wszystko na krawędziach
  let g = createGraphics(side, side);
  g.pixelDensity(1);
  g.clear(); // transparentny tło — pozwala smudom (trailG) być widocznymi pod rysunkiem

  // przygotuj / zainicjuj bufor smug jeśli trzeba
  if(!trailG || trailG.width !== side || trailG.height !== side){
    trailG = createGraphics(side, side);
    trailG.pixelDensity(1);
    trailG.clear();
  }

  // wyczyść bufor smug i narysuj próbki (usuwając przeterminowane)
  trailG.clear();
  // przefiltruj i narysuj
  for(let i = trails.length-1; i>=0; i--){
    let item = trails[i];
    let age = now - item.t;
    if(age > trailLife){
      trails.splice(i,1);
      continue;
    }
    // projektuj pozycję próbki do współrzędnych bufora
    let proj = projectPoint(item.pos, camPos, camAxes, trailG.width/2, trailG.height/2, 700);
    if(!proj) continue; // poza kamerą
    let alpha = map(age, 0, trailLife, 220, 0);
    let size = map(proj.depth, 100, 800, 8, 2, true) * 1.8;
    trailG.noStroke();
    trailG.fill(255, alpha);
    trailG.ellipse(proj.screen.x, proj.screen.y, size, size);
  }

  // projektuj względem środka bufora
  let projected = rotated.map(v => projectPoint(v, camPos, camAxes, g.width/2, g.height/2, 700));

  // Rysujemy krawędzie i wierzchołki
  // rysuj do grafiki 'g'
  g.push();
  g.stroke(255);
  g.strokeWeight(2);
  // edges
  for(let e of cubeEdges){
    let a = projected[e[0]];
    let b = projected[e[1]];
    if(a && b){
      g.line(a.screen.x, a.screen.y, b.screen.x, b.screen.y);
    }
  }
  // vertices
  g.noStroke();
  g.fill(255,180,0);
  for(let p of projected){
    if(p){
      let r = map(p.depth, 100, 800, 6, 2, true);
      g.ellipse(p.screen.x, p.screen.y, r, r);
    }
  }
  g.pop();

  // Nie doklejamy próbek bezpośrednio z projekcji — ślady są tworzone tylko gdy
  // wierzchołek faktycznie zmienił pozycję w przestrzeni (patrz powyżej).

  // wklej grafikę na główny canvas w miejscu viewportu
  // najpierw narysuj smugi (w tle), potem aktualny obraz
  image(trailG, vx, vy);
  image(g, vx, vy);

  // HUD na głównym canvas
  drawHUD();
  
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight); 

}

// --- HELPERS ---

function drawViewportBackground(){
  let side = min(width, height) * 0.75;
  let x = (width - side) / 2;
  let y = (height - side) / 2;
  noStroke();
  fill(0);
  rect(x, y, side, side);
}

// Zwraca tablicę 8 wektorów (p5.Vector) — wierzchołki sześcianu w układzie świata
function cubeVertices(size){
  let h = size/2;
  let points = [];
  for(let xi of [-1,1]){
    for(let yi of [-1,1]){
      for(let zi of [-1,1]){
        points.push(createVector(xi*h, yi*h, zi*h));
      }
    }
  }
  // Kolejność: (-,-,-),(-,-,+),(-,+,-),(-,+,+),(+,-,-),(+,-,+),(+,+,-),(+,+,+)
  return points;
}

// Obrót punktu `p` przez kąty Eulerowskie: yaw (Y), pitch (X), roll (Z)
function rotateVecByEuler(p, yaw, pitch, roll){
  // we pracujemy na kopii
  let v = p.copy();

  // roll around Z
  if(roll !== 0){
    let c = cos(roll), s = sin(roll);
    let x = v.x*c - v.y*s;
    let y = v.x*s + v.y*c;
    v.x = x; v.y = y;
  }

  // pitch around X
  if(pitch !== 0){
    let c = cos(pitch), s = sin(pitch);
    let y = v.y*c - v.z*s;
    let z = v.y*s + v.z*c;
    v.y = y; v.z = z;
  }

  // yaw around Y
  if(yaw !== 0){
    let c = cos(yaw), s = sin(yaw);
    let x = v.x*c + v.z*s;
    let z = -v.x*s + v.z*c;
    v.x = x; v.z = z;
  }

  return v;
}

// Kamera: opisana przez `camPos` i `camDir` (oba p5.Vector). Zwraca punkt w współrzędnych ekranu lub null jeśli za kamerą.
// projectPoint: project world point into screen coords using provided camera axes and screen center
// camAxes: {xAxis,yAxis,zAxis} in world coordinates
function projectPoint(worldP, camPos, camAxes, centerX, centerY, f=700){
  let xAxis = camAxes.xAxis;
  let yAxis = camAxes.yAxis;
  let zAxis = camAxes.zAxis;

  let rel = p5.Vector.sub(worldP, camPos);
  let cx = rel.dot(xAxis);
  let cy = rel.dot(yAxis);
  let cz = rel.dot(zAxis);
  if(cz <= 0.0001) return null;

  let sx = (cx / cz) * f + centerX;
  let sy = (-cy / cz) * f + centerY;
  return {screen: createVector(sx, sy), depth: cz};
}

// Lista krawędzi jako par indeksów odpowiadających kolejności z cubeVertices()
const cubeEdges = [
  [0,1],[0,2],[0,4],
  [1,3],[1,5],
  [2,3],[2,6],
  [3,7],
  [4,5],[4,6],
  [5,7],
  [6,7]
];

function drawCubeEdges(projected){
  // Rysujemy tylko te krawędzie, których oba końce są widoczne (nie za kamerą)
  for(let e of cubeEdges){
    let a = projected[e[0]];
    let b = projected[e[1]];
    if(a && b){
      line(a.screen.x, a.screen.y, b.screen.x, b.screen.y);
    }
  }
}

function drawCubeVertices(projected){
  for(let p of projected){
    if(p){
      let r = map(p.depth, 100, 800, 6, 2, true);
      ellipse(p.screen.x, p.screen.y, r, r);
    }
  }
}

// Pomocnicze: konwertuj yaw/pitch do wektora kierunku (czasem roll nie wpływa na kierunek)
function eulerToDir(yaw, pitch){
  // yaw: obrót wokół Y, pitch: odwrotny obrót wokół X
  let x = sin(yaw) * cos(pitch);
  let y = sin(pitch);
  let z = -cos(yaw) * cos(pitch);
  return createVector(x, y, z).normalize();
}

// Key events: M = przełącz tryb sterowania, R = reset pozycji
function keyPressed(){
  if(key === 'm' || key === 'M'){
    controlMode = (controlMode === 'cube') ? 'camera' : 'cube';
  }
  if(key === 'r' || key === 'R'){
    // resetuj wartości
    cubeAngles = Object.assign({}, defaultCubeAngles);
    camAngles = Object.assign({}, defaultCamAngles);
    camPos = defaultCamPos.copy();
    camDir = eulerToDir(camAngles.yaw, camAngles.pitch);
    // wyczyść smugi
    trailG = null;
  }
}

// HUD: pokaż tryb i instrukcje
function drawHUD(){
  push();
  noStroke();
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text(`Mode: ${controlMode}  (M to toggle)`, 10, 10);
  text(`Controls: Arrows yaw/pitch, Q/E roll, R reset`, 10, 30);
  text(`Cube angles: yaw ${nf(cubeAngles.yaw,1,2)} pitch ${nf(cubeAngles.pitch,1,2)} roll ${nf(cubeAngles.roll,1,2)}`, 10, 52);
  text(`Cam angles: yaw ${nf(camAngles.yaw,1,2)} pitch ${nf(camAngles.pitch,1,2)} roll ${nf(camAngles.roll,1,2)}`, 10, 72);
  pop();
}

// Build camera axes (xAxis,yAxis,zAxis) from Euler yaw/pitch/roll by rotating basis vectors
function camAxesFromEuler(yaw, pitch, roll){
  // use the same order as rotateVecByEuler (roll Z, pitch X, yaw Y)
  let forward = rotateVecByEuler(createVector(0,0,-1), yaw, pitch, roll).normalize();
  let right   = rotateVecByEuler(createVector(1,0,0), yaw, pitch, roll).normalize();
  let up      = rotateVecByEuler(createVector(0,1,0), yaw, pitch, roll).normalize();
  return { xAxis: right, yAxis: up, zAxis: forward };
}
