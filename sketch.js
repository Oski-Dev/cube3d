// Bardzo prosty szkic: duży czarny kwadrat na środku.
// 3D sześcian — rysujemy tylko wierzchołki i krawędzie.
// Kamera jest opisana dwoma wektorami: `camPos` (położenie) i `camDir` (kierunek/wektor przód).
// Sześcian opisany jest przez `cubeSize` oraz Eulerowskie kąty `cubeAngles` (yaw, pitch, roll).

let camPos, camDir;
let cubeSize = 200; // długość krawędzi
let cubeAngles = { yaw: 0.6, pitch: 0.4, roll: 0.0 }; // radiany

function setup(){
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();

  // Domyślna kamera: trochę z przodu i powyżej, patrzy w stronę środka układu (0,0,0)
  camPos = createVector(0, 0, 600);
  camDir = createVector(0, 0, -1); // patrzy w stronę ujemnego Z

  // Domyślne kąty obrotu (można sterować klawiszami)
  cubeAngles = { yaw: 0.6, pitch: 0.4, roll: 0.0 };
}

function draw(){
  clear(); // pozostaw tło strony (HTML) jako szare

  // Najpierw rysujemy viewport (czarny kwadrat) — obszar, gdzie będzie scena
  drawViewportBackground();

  // Przygotuj wierzchołki sześcianu w przestrzeni świata (środek w 0,0,0)
  let verts = cubeVertices(cubeSize);

  // Sterowanie klawiszami: strzałki -> yaw/pitch, Q/E -> roll
  const ROT_SPEED = 0.03;
  if (keyIsDown(LEFT_ARROW))  cubeAngles.yaw  -= ROT_SPEED;
  if (keyIsDown(RIGHT_ARROW)) cubeAngles.yaw  += ROT_SPEED;
  if (keyIsDown(UP_ARROW))    cubeAngles.pitch -= ROT_SPEED;
  if (keyIsDown(DOWN_ARROW))  cubeAngles.pitch += ROT_SPEED;
  if (keyIsDown(81)) /*Q*/    cubeAngles.roll -= ROT_SPEED;
  if (keyIsDown(69)) /*E*/    cubeAngles.roll += ROT_SPEED;

  // Obrót sześcianu: zastosuj kolejno roll(Z), pitch(X), yaw(Y)
  let rotated = verts.map(v => rotateVecByEuler(v, cubeAngles.yaw, cubeAngles.pitch, cubeAngles.roll));

  // Projektujemy punkty do współrzędnych ekranu używając kamery
  let projected = rotated.map(v => projectPoint(v, camPos, camDir));

  // Rysujemy krawędzie i wierzchołki
  push();
  translate(0,0); // brak transformacji p5, używamy współrzędnych ekranowych
  stroke(255);
  strokeWeight(2);
  drawCubeEdges(projected);

  // punkty
  noStroke();
  fill(255,180,0);
  drawCubeVertices(projected);
  pop();
  
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
function projectPoint(worldP, camPos, camDir){
  // 1) lokalne współrzędne kamery
  let zAxis = camDir.copy().normalize();
  // wyznacz oś X kamery (prawo) i Y (góra)
  let worldUp = createVector(0, 1, 0);
  // jeśli kamDir równoległy do worldUp, wybierz inny up
  if(abs(zAxis.dot(worldUp)) > 0.999) worldUp = createVector(0, 0, 1);
  let xAxis = p5.Vector.cross(zAxis, worldUp).normalize();
  let yAxis = p5.Vector.cross(xAxis, zAxis).normalize();

  // wektor z kamery do punktu
  let rel = p5.Vector.sub(worldP, camPos);
  let cx = rel.dot(xAxis);
  let cy = rel.dot(yAxis);
  let cz = rel.dot(zAxis);

  if(cz <= 0.0001) return null; // punkt za kamerą — odrzuć

  // prosty rzut perspektywiczny
  let f = 700; // ogniskowa / skalowanie perspektywy
  let sx = (cx / cz) * f + width/2;
  let sy = ( -cy / cz) * f + height/2; // minus: y rośnie w dół na ekranie

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
