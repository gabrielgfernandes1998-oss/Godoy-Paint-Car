import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { parseYft } from "./formats/yft.js";
import { parseYdd } from "./formats/ydd.js";
import { parseYtd, writeYtd, canWriteTexture } from "./formats/ytd.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createIcons,
  Save,
  Download,
  Car,
  FolderOpen,
  ImagePlus,
  Eye,
  Images,
  Plus,
  Sparkles,
  Box,
  Scan,
  MousePointer2,
  Paintbrush,
  Eraser,
  Type,
  Pipette,
  Minus,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Focus,
  SlidersHorizontal,
  Ellipsis,
  Check,
  Maximize2,
  Rotate3d,
} from "lucide";
const icons = {
  Save,
  Download,
  Car,
  FolderOpen,
  ImagePlus,
  Eye,
  Images,
  Plus,
  Sparkles,
  Box,
  Scan,
  MousePointer2,
  Paintbrush,
  Eraser,
  Type,
  Pipette,
  Minus,
  Image: ImageIcon,
  Undo2,
  Redo2,
  Focus,
  SlidersHorizontal,
  Ellipsis,
  Check,
  Maximize2,
  Rotate3d,
};
const icon = (name) => `<i data-lucide="${name}"></i>`;
document.querySelector("#app").innerHTML = `
<header><div class="brand-lockup"><div class="brand"><div class="brand-mark">P</div>GODOY<em>PAINT CAR</em></div><div class="brand-credit">Developed By Gabriel Godoy</div></div><div class="header-divider"></div><div class="project-title">Pintura de viatura <small>Vehicle Studio / Projeto local</small></div><div class="header-actions"><button id="save-project">${icon("save")}<span>Salvar projeto</span></button><button id="export" class="accent">${icon("download")}<span>Exportar textura</span></button><div class="avatar">PF</div></div></header>
<div class="workspace"><aside class="left"><div class="panel-head"><span class="eyebrow">EXPLORADOR</span><span class="count">01</span></div><div class="asset"><div class="asset-icon">${icon("car")}</div><div><strong id="asset-name">Viatura demonstrativa</strong><small id="asset-type">MODELO DE DEMONSTRAÇÃO</small></div><div class="dot"></div></div><div class="section"><button class="upload" id="import-model">${icon("folder-open")} Importar modelo</button><p class="file-note">YFT / YDD / GLB / GLTF · Projeto .paintfive<br>YFT / YTD nativos · GTA V Legacy / FiveM</p></div><div id="native-model-controls" class="section hidden"><label class="section-title" for="drawable-select">MODELO / FRAGMENTO</label><select id="drawable-select" class="full"></select><label class="section-title" for="lod-select" style="margin-top:14px">NÍVEL DE DETALHE</label><select id="lod-select" class="full"></select></div><div class="panel-head"><span class="eyebrow">TEXTURA</span><span class="count">01</span></div><div class="section" style="padding-top:0"><div class="layer active"><div class="layer-preview"></div><span><span id="texture-name">Diffuse texture</span><small id="texture-dimensions">Canvas editável · 2048 × 2048</small></span>${icon("eye")}</div><button class="upload" id="import-ytd">${icon("folder-open")} Abrir dicionário YTD</button><div id="native-texture-controls" class="hidden"><label class="section-title" for="texture-select" style="margin-top:15px">TEXTURAS DO DICIONÁRIO</label><select id="texture-select" class="full"></select><p id="native-texture-info" class="help"></p><label class="section-title" for="material-select">APLICAR NA VIATURA</label><select id="material-select" class="full"><option value="all">Todas as superfícies</option></select><button id="bind-texture" class="full" style="margin-top:8px">Vincular textura selecionada</button><button id="export-native" class="accent full" style="margin-top:10px">Exportar YTD editado</button><p class="file-note">Salva uma cópia. O arquivo original é preservado.</p></div><button class="upload" id="import-texture" style="margin-top:10px">${icon("image-plus")} Abrir textura PNG / JPG</button></div><div class="panel-head"><span class="eyebrow">BIBLIOTECA</span>${icon("images")}</div><div class="section" style="padding-top:0"><button class="upload" id="import-image">${icon("plus")} Adicionar imagem</button><p class="file-note">Aplique uma arte na viatura e ajuste sua posição diretamente no modelo.</p></div><div class="info-card"><strong>${icon("sparkles")} Sua ideia. Na superfície.</strong><p>Pinte no 3D e acompanhe cada alteração no mapa de textura, em tempo real.</p></div></aside>
<main class="center"><div class="viewbar"><div class="tabs"><button id="tab-3d" class="active">${icon("box")} Editor 3D</button><button id="tab-uv">${icon("scan")} Mapa UV</button></div><div class="view-meta"><span class="green-dot"></span>Renderização em tempo real</div></div><div class="viewport"><canvas id="scene"></canvas><canvas id="uv-view" width="2048" height="2048"></canvas><div class="viewport-label"><strong id="view-name">PERSPECTIVA</strong><p>MATERIAL PREVIEW · STUDIO LIGHT</p></div><div class="tools"><button data-tool="orbit" title="Orbitar (V)">${icon("mouse-pointer-2")}</button><div class="tool-divider"></div><button data-tool="brush" class="active" title="Pincel (B)">${icon("paintbrush")}</button><button data-tool="erase" title="Restaurar textura base (E)">${icon("eraser")}</button><button data-tool="text" title="Texto (T)">${icon("type")}</button><button data-tool="line" title="Linha (L)">${icon("minus")}</button><button data-tool="eyedropper" title="Conta-gotas (I)">${icon("pipette")}</button><button data-tool="decal" title="Aplicar imagem (D)">${icon("image")}</button><div class="tool-divider"></div><button id="undo" title="Desfazer (Ctrl+Z)">${icon("undo-2")}</button><button id="redo" title="Refazer (Ctrl+Shift+Z)">${icon("redo-2")}</button></div><div class="view-hint"><kbd>Arraste</kbd> pintar &nbsp;·&nbsp; <kbd>Botão direito</kbd> orbitar &nbsp;·&nbsp; <kbd>Scroll</kbd> zoom</div><div class="axis"><b>Y</b><i>X</i><span>Z</span></div></div><div class="view-bottom"><span>${icon("car")}<span id="mesh-info">Importe o YFT da sua viatura</span></span><button id="reset-view">${icon("focus")} Centralizar</button><span class="badge">● TEXTURA CONECTADA</span></div></main>
<aside class="right"><div class="panel-head"><span class="prop-title">${icon("sliders-horizontal")} Propriedades</span>${icon("ellipsis")}</div><div class="section"><div class="section-title">FERRAMENTA ATIVA <span class="mini-tag" id="tool-tag">PINCEL</span></div><div class="brush-only"><div class="label-row"><label for="size">Tamanho do pincel</label><output class="value" id="size-out">32 px</output></div><input id="size" type="range" min="2" max="180" value="32"><div class="label-row"><label for="opacity">Opacidade</label><output class="value" id="opacity-out">100%</output></div><input id="opacity" type="range" min="1" max="100" value="100"><div class="label-row"><label for="softness">Suavidade</label><output class="value" id="softness-out">25%</output></div><input id="softness" type="range" min="0" max="95" value="25"></div><div class="text-controls"><label class="section-title" for="text-content">TEXTO</label><textarea id="text-content" maxlength="500" rows="3" placeholder="Digite o texto da viatura">POLÍCIA</textarea><label class="section-title" for="text-font">FONTE</label><select id="text-font" class="full"><option value="Arial">Arial</option><option value="Arial Black">Arial Black</option><option value="Georgia">Georgia</option><option value="monospace">Monoespaçada</option></select><div class="label-row"><label for="text-size">Tamanho na textura (px)</label><input id="text-size" type="number" min="12" max="512" value="96"></div><div class="label-row"><label for="text-bold">Negrito</label><input id="text-bold" type="checkbox" checked></div><div class="label-row"><label for="text-opacity">Opacidade (%)</label><input id="text-opacity" type="number" min="1" max="100" value="100"></div></div><div class="decal-controls"><p class="help">Clique e arraste no 3D ou no mapa para posicionar. Ajuste antes de aplicar.</p><div class="image-scale"><div class="label-row"><label for="scale">Escala</label><output class="value" id="scale-out">30%</output></div><input id="scale" type="range" min="3" max="100" value="30"></div><div class="label-row"><label for="rotation">Rotação</label><output class="value" id="rotation-out">0°</output></div><input id="rotation" type="range" min="-180" max="180" value="0"><button id="apply-decal" class="accent full">${icon("check")} Aplicar imagem</button><button id="cancel-decal" class="full" style="margin-top:8px">Cancelar posicionamento</button></div></div><div class="section brush-only color-section"><div class="section-title">COR</div><div class="colors">${["#c7fa68", "#e9e4d8", "#17191d", "#ef695e", "#86a7ee", "#c19de5"].map((c) => `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</div><div class="color-entry"><input id="color" type="color" value="#c7fa68" aria-label="Cor personalizada"><span id="color-hex">#C7FA68</span></div></div><div class="section"><div class="section-title">MAPA DE TEXTURA <span style="margin-left:auto">${icon("maximize-2")}</span></div><canvas class="map" id="map" width="320" height="320"></canvas><div class="map-footer"><span>DIFFUSE / BASE COLOR</span><span id="map-size">2048²</span></div><p class="help">Abra o YFT da viatura e seu YTD. Selecione a textura para pintar e exporte uma cópia do dicionário editado ou o PNG.</p></div><div class="section"><div class="section-title">VISUALIZAÇÃO</div><button id="back-view" class="full">${icon("rotate-3d")} Alternar frente / verso</button><div class="label-row" style="margin-top:18px"><label for="wireframe">Exibir malha</label><input id="wireframe" type="checkbox"></div></div></aside></div><footer class="footer"><span><span class="green-dot"></span><b id="status">Pronto para criar</b></span><span>GODOY PAINT CAR <span> / </span> LOCAL WORKSPACE <span> / </span> v0.3.1</span></footer><div id="toast" role="status"></div><input type="file" id="model-file" accept=".glb,.gltf,.paintfive,.yft,.ydd,.ytd" hidden><input type="file" id="ytd-file" accept=".ytd" hidden><input type="file" id="texture-file" accept="image/png,image/jpeg,image/webp" hidden><input type="file" id="image-file" accept="image/png,image/jpeg,image/webp" hidden>`;
createIcons({ icons });
const $ = (s) => document.querySelector(s);
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 5000);
}
let size = 2048,
  textureHeight = 2048;
const textureCanvas = document.createElement("canvas");
textureCanvas.width = size;
textureCanvas.height = textureHeight;
const ctx = textureCanvas.getContext("2d", { willReadFrequently: true });
const base = document.createElement("canvas");
base.width = size;
base.height = textureHeight;
const baseCtx = base.getContext("2d");
baseCtx.fillStyle = "#d9d4c7";
baseCtx.fillRect(0, 0, size, size);
// A subtle, deterministic woven material; the export remains an ordinary diffuse map.
for (let y = 0; y < size; y += 4) {
  baseCtx.fillStyle = y % 8 ? "#ffffff06" : "#00000005";
  baseCtx.fillRect(0, y, size, 1);
}
ctx.drawImage(base, 0, 0);
const texture = new THREE.CanvasTexture(textureCanvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = 8;
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
camera.position.set(0, 0.3, 5.8);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $("#scene"),
    antialias: true,
    alpha: true,
  });
} catch (e) {
  toast("WebGL indisponível: abra em um navegador com aceleração gráfica.");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
scene.add(new THREE.HemisphereLight(0xe8efff, 0x6e6657, 2.2));
const key = new THREE.DirectionalLight(0xfff3df, 3.5);
key.position.set(2, 4, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xa0b5dd, 2);
rim.position.set(-4, 2, -2);
scene.add(rim);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.05, 0);
controls.enableDamping = true;
controls.minDistance = 1.5;
controls.maxDistance = 10;
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};
const material = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 0.93,
  metalness: 0,
  side: THREE.DoubleSide,
  alphaTest: 0.05,
});
const shape = new THREE.Shape();
shape.moveTo(-1.2, -0.45);
shape.lineTo(1.2, -0.45);
shape.lineTo(1.2, 0.02);
shape.lineTo(0.65, 0.13);
shape.lineTo(0.35, 0.62);
shape.lineTo(-0.55, 0.62);
shape.lineTo(-0.8, 0.16);
shape.lineTo(-1.2, 0.16);
shape.closePath();
const geo = new THREE.ExtrudeGeometry(shape, {
  depth: 0.85,
  bevelEnabled: true,
  bevelSegments: 5,
  steps: 1,
  bevelSize: 0.065,
  bevelThickness: 0.09,
  curveSegments: 28,
});
geo.translate(0, 0, -0.425);
const positions = geo.attributes.position,
  normals = geo.attributes.normal,
  uvs = geo.attributes.uv;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i),
    y = positions.getY(i),
    z = positions.getZ(i);
  const back = normals.getZ(i) < 0;
  uvs.setXY(
    i,
    (back ? 0.5 : 0) + (0.045 + ((back ? -x : x) / 2.6) * 0.41 + 0.205),
    0.08 + ((y + 1.08) / 2.3) * 0.84,
  );
  positions.setZ(i, z);
}
geo.computeVertexNormals();
const demoGeometry = geo.clone();
let model = new THREE.Group();
model.add(new THREE.Mesh(geo, material));
scene.add(model);
const grid = new THREE.GridHelper(20, 40, 0x44484a, 0x303438);
grid.position.y = -1.2;
grid.material.transparent = true;
grid.material.opacity = 0.4;
scene.add(grid);
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let tool = "brush",
  painting = false,
  lastUV = null,
  changed = false,
  showUV = false,
  backView = false;
let lineStart = null, lineSnapshot = null;
let decal = null,
  decalUV = null,
  decalSnapshot = null;
const history = [],
  future = [];
let modelSource = null,
  modelFilename = null;
function snapshot() {
  return ctx.getImageData(0, 0, size, textureHeight);
}
function pushHistory() {
  markTextureDirty();
  history.push(snapshot());
  if (history.length > 12) history.shift();
  future.length = 0;
  updateHistory();
}
function updateHistory() {
  $("#undo").disabled = !history.length;
  $("#redo").disabled = !future.length;
}
function refresh() {
  texture.needsUpdate = true;
  for (const selector of ["#map", "#uv-view"]) {
    const c = $(selector),
      cctx = c.getContext("2d");
    cctx.clearRect(0, 0, c.width, c.height);
    const scale = Math.min(
        c.width / textureCanvas.width,
        c.height / textureCanvas.height,
      ),
      w = textureCanvas.width * scale,
      h = textureCanvas.height * scale;
    cctx.drawImage(textureCanvas, (c.width - w) / 2, (c.height - h) / 2, w, h);
  }
  $("#status").textContent = "Alterações locais · textura atualizada";
}
refresh();
updateHistory();
$("#status").textContent = "Pronto para criar";
function setTool(next) {
  if (next !== tool) { cancelDecal(); endStroke(); }
  tool = next;
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
  $(".right").classList.toggle("decal-mode", isStamp());
  $(".right").classList.toggle("text-mode", tool === "text");
  $("#apply-decal").textContent = tool === "text" ? "Aplicar texto" : "Aplicar imagem";
  $("#tool-tag").textContent = {
    brush: "PINCEL",
    erase: "RESTAURAR",
    orbit: "NAVEGAR",
    decal: "IMAGEM",
    text: "TEXTO",
    line: "LINHA",
    eyedropper: "CONTA-GOTAS",
  }[tool];
  controls.mouseButtons.LEFT = tool === "orbit" ? THREE.MOUSE.ROTATE : null;
  $("#scene").style.cursor = tool === "orbit" ? "grab" : "crosshair";
  if (tool === "decal" && !decal)
    toast("Adicione uma imagem para posicioná-la sobre a viatura.");
}
document.querySelectorAll("[data-tool]").forEach(
  (b) =>
    (b.onclick = () => {
      setTool(b.dataset.tool);
      if (tool === "decal" && !decal) $("#image-file").click();
    }),
);
for (const id of ["size", "opacity", "softness", "scale", "rotation"]) {
  $("#" + id).oninput = (e) => {
    $("#" + id + "-out").textContent =
      e.target.value + ({ size: " px", rotation: "°" }[id] || "%");
    if (isStamp() && decalUV) previewDecal();
  };
}
$("#color").oninput = (e) => {
  $("#color-hex").textContent = e.target.value.toUpperCase();
  if (tool === "text" && decalUV) previewDecal();
};
for (const id of ["text-content", "text-font", "text-size", "text-bold", "text-opacity"]) {
  $("#" + id).addEventListener("input", () => { if (tool === "text" && decalUV) previewDecal(); });
}
function isStamp() { return tool === "decal" || tool === "text"; }
function textStamp() {
  const lines = $("#text-content").value.slice(0, 500).split("\n");
  if (!lines.some(line => line.trim())) return null;
  const fontSize = Math.max(12, Math.min(512, Number($("#text-size").value) || 96));
  const font = `${$("#text-bold").checked ? "bold " : ""}${fontSize}px "${$("#text-font").value}"`;
  const canvas = document.createElement("canvas"), c = canvas.getContext("2d");
  c.font = font;
  const padding = Math.ceil(fontSize * 0.25);
  canvas.width = Math.min(8192, Math.max(1, Math.ceil(Math.max(...lines.map(line => c.measureText(line).width))) + padding * 2));
  canvas.height = Math.min(2048, Math.ceil(lines.length * fontSize * 1.25 + padding * 2));
  c.font = font;
  c.textBaseline = "top";
  c.fillStyle = $("#color").value;
  lines.forEach((line, i) => c.fillText(line, padding, padding + i * fontSize * 1.25));
  return canvas;
}
function uvHit(event) {
  const r = $("#uv-view").getBoundingClientRect();
  const scale = Math.min(r.width / size, r.height / textureHeight);
  const w = size * scale, h = textureHeight * scale;
  const x = event.clientX - r.left - (r.width - w) / 2;
  const y = event.clientY - r.top - (r.height - h) / 2;
  return x >= 0 && y >= 0 && x <= w && y <= h ? new THREE.Vector2(x / w, 1 - y / h) : null;
}
function sampleColor(uv) {
  const x = Math.max(0, Math.min(size - 1, Math.floor(uv.x * size)));
  const y = Math.max(0, Math.min(textureHeight - 1, Math.floor((1 - uv.y) * textureHeight)));
  const rgb = ctx.getImageData(x, y, 1, 1).data;
  const color = "#" + [...rgb].slice(0, 3).map(v => v.toString(16).padStart(2, "0")).join("");
  $("#color").value = color;
  $("#color").dispatchEvent(new Event("input"));
  toast(`Cor capturada: ${color.toUpperCase()}`);
}
function previewLine(uv) {
  if (!lineSnapshot || !lineStart) return;
  ctx.putImageData(lineSnapshot, 0, 0);
  ctx.save();
  ctx.globalAlpha = Number($("#opacity").value) / 100;
  ctx.strokeStyle = $("#color").value;
  ctx.lineWidth = Number($("#size").value);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(lineStart.x * size, (1 - lineStart.y) * textureHeight);
  ctx.lineTo(uv.x * size, (1 - uv.y) * textureHeight);
  ctx.stroke();
  ctx.restore();
  refresh();
}
function cancelLine() {
  if (lineSnapshot) {
    ctx.putImageData(lineSnapshot, 0, 0);
    lineSnapshot = lineStart = null;
    painting = false;
    controls.enabled = true;
    refresh();
  }
}

document.querySelectorAll("[data-color]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#color").value = b.dataset.color;
      $("#color").dispatchEvent(new Event("input"));
    }),
);
function hit(event) {
  const rect = $("#scene").getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const first = raycaster.intersectObject(model, true).find((h) => h.uv);
  if (!first || first.object.material.map !== texture) return null;
  const uv = first.uv.clone();
  uv.set(THREE.MathUtils.euclideanModulo(uv.x, 1), THREE.MathUtils.euclideanModulo(uv.y, 1));
  return uv;
}
function dab(u, v) {
  const x = u * size,
    y = (1 - v) * textureHeight,
    r = Number($("#size").value) / 2;
  ctx.save();
  ctx.globalAlpha = Number($("#opacity").value) / 100;
  if (tool === "erase") {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.clearRect(0, 0, size, textureHeight);
    ctx.drawImage(base, 0, 0);
  } else {
    const soft = Number($("#softness").value) / 100,
      color = $("#color").value;
    const gradient = ctx.createRadialGradient(
      x,
      y,
      Math.max(0.01, r * (1 - soft)),
      x,
      y,
      r,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + "00");
    ctx.fillStyle = soft ? gradient : color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function paint(uv) {
  if (lastUV && lastUV.distanceTo(uv) < 0.1) {
    const distance = Math.hypot(
      (lastUV.x - uv.x) * size,
      (lastUV.y - uv.y) * textureHeight,
    );
    const steps = Math.max(
      1,
      Math.ceil(distance / (Number($("#size").value) * 0.18)),
    );
    for (let i = 1; i <= steps; i++)
      dab(
        THREE.MathUtils.lerp(lastUV.x, uv.x, i / steps),
        THREE.MathUtils.lerp(lastUV.y, uv.y, i / steps),
      );
  } else dab(uv.x, uv.y);
  lastUV = uv.clone();
  refresh();
}
for (const surface of [$("#scene"), $("#uv-view")]) {
  const coordinates = event => surface.id === "uv-view" ? uvHit(event) : hit(event);
  surface.addEventListener("pointerdown", e => {
    if (e.button !== 0 || tool === "orbit") return;
    const uv = coordinates(e);
    if (!uv) return;
    if (tool === "eyedropper") { sampleColor(uv); return; }
    if (isStamp() && !(tool === "text" ? textStamp() : decal)) {
      toast(tool === "text" ? "Digite um texto antes de posicionar." : "Adicione uma imagem primeiro.");
      return;
    }
    e.preventDefault();
    painting = true;
    surface.setPointerCapture(e.pointerId);
    controls.enabled = false;
    if (isStamp()) {
      if (!decalSnapshot) decalSnapshot = snapshot();
      decalUV = uv.clone();
      previewDecal();
    } else if (tool === "line") {
      lineStart = uv.clone();
      lineSnapshot = snapshot();
      previewLine(uv);
    } else {
      pushHistory();
      paint(uv);
      changed = true;
    }
  });
  surface.addEventListener("pointermove", e => {
    if (!painting) return;
    const uv = coordinates(e);
    if (!uv) { lastUV = null; return; }
    if (isStamp()) { decalUV = uv.clone(); previewDecal(); }
    else if (tool === "line") previewLine(uv);
    else paint(uv);
  });
  surface.addEventListener("pointercancel", () => { cancelLine(); endStroke(); });
  surface.addEventListener("lostpointercapture", endStroke);
  surface.addEventListener("contextmenu", e => e.preventDefault());
}
function endStroke() {
  if (lineSnapshot) {
    history.push(lineSnapshot);
    if (history.length > 12) history.shift();
    future.length = 0;
    lineSnapshot = lineStart = null;
    markTextureDirty();
    changed = true;
    updateHistory();
  }
  painting = false;
  lastUV = null;
  controls.enabled = true;
}
window.addEventListener("pointerup", endStroke);
function previewDecal() {
  if (!decalSnapshot || !decalUV) return;
  ctx.putImageData(decalSnapshot, 0, 0);
  const stamp = tool === "text" ? textStamp() : decal;
  if (!stamp) { refresh(); return; }
  const width = tool === "text" ? stamp.width : (size * Number($("#scale").value)) / 100;
  const height = (width * stamp.height) / stamp.width;
  ctx.save();
  ctx.translate(decalUV.x * size, (1 - decalUV.y) * textureHeight);
  ctx.rotate((Number($("#rotation").value) * Math.PI) / 180);
  ctx.globalAlpha = tool === "text" ? Math.max(0.01, Math.min(1, Number($("#text-opacity").value) / 100 || 1)) : 1;
  ctx.drawImage(stamp, -width / 2, -height / 2, width, height);
  ctx.restore();
  refresh();
}
function cancelDecal() {
  cancelLine();
  if (decalSnapshot) {
    ctx.putImageData(decalSnapshot, 0, 0);
    decalSnapshot = null;
    decalUV = null;
    refresh();
  }
}
$("#cancel-decal").onclick = () => {
  cancelDecal();
  setTool("brush");
};
$("#apply-decal").onclick = () => {
  if (!decalSnapshot)
    return toast("Clique no 3D ou na textura para posicionar primeiro.");
  markTextureDirty();
  history.push(decalSnapshot);
  if (history.length > 12) history.shift();
  future.length = 0;
  decalSnapshot = null;
  decalUV = null;
  changed = true;
  updateHistory();
  const applied = tool === "text" ? "Texto aplicado" : "Imagem aplicada";
  setTool("brush");
  toast(`${applied} ao mapa de textura.`);
};
$("#undo").onclick = () => {
  cancelDecal();
  if (!history.length) return;
  changed = true;
  markTextureDirty();
  future.push(snapshot());
  ctx.putImageData(history.pop(), 0, 0);
  refresh();
  updateHistory();
};
$("#redo").onclick = () => {
  cancelDecal();
  if (!future.length) return;
  changed = true;
  markTextureDirty();
  history.push(snapshot());
  ctx.putImageData(future.pop(), 0, 0);
  refresh();
  updateHistory();
};
function view(uv) {
  showUV = uv;
  $("#uv-view").style.display = uv ? "block" : "none";
  $("#scene").style.visibility = uv ? "hidden" : "visible";
  $(".tools").style.display = "flex";
  $(".view-hint").style.display = uv ? "none" : "block";
  $("#tab-uv").classList.toggle("active", uv);
  $("#tab-3d").classList.toggle("active", !uv);
  $("#view-name").textContent = uv ? `MAPA UV · ${size} × ${textureHeight}` : "PERSPECTIVA";
}
$("#tab-3d").onclick = () => view(false);
$("#tab-uv").onclick = () => view(true);
$("#map").onclick = () => view(true);
$("#reset-view").onclick = () => {
  if (/\.yft$/i.test($("#asset-name").textContent)) camera.position.set(2.8, 1.25, 3.1);
  else camera.position.set(0, 0.3, 5.8);
  controls.target.set(0, 0.05, 0);
  backView = false;
};
$("#back-view").onclick = () => {
  backView = !backView;
  if (/\.yft$/i.test($("#asset-name").textContent)) camera.position.set(backView ? -2.8 : 2.8, 1.25, backView ? -3.1 : 3.1);
  else camera.position.set(0, 0.3, backView ? -5.8 : 5.8);
  controls.target.set(0, 0.05, 0);
};
$("#wireframe").onchange = (e) =>
  model.traverse((m) => {
    if (m.isMesh) m.material.wireframe = e.target.checked;
  });
const download = (name, blob) => {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#export").onclick = () => {
  if (decalSnapshot)
    return toast("Aplique ou cancele o texto/imagem antes de exportar.");
  textureCanvas.toBlob(
    (blob) =>
      download(
        (activeEntry()?.name || "paintfive_diffuse").replace(
          /[^a-zA-Z0-9_-]/g,
          "_",
        ) + ".png",
        blob,
      ),
    "image/png",
  );
  toast(
    `PNG exportado em ${size} × ${textureHeight}. Para salvar o dicionário, use Exportar YTD editado.`,
  );
};
const readImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Imagem inválida ou formato não suportado."));
    };
    img.src = url;
  });
$("#import-ytd").onclick = () => $("#ytd-file").click();
$("#import-image").onclick = () => $("#image-file").click();
$("#import-texture").onclick = () => $("#texture-file").click();
$("#import-model").onclick = () => $("#model-file").click();
$("#image-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    cancelDecal();
    decal = await readImage(file);
    setTool("decal");
    view(false);
    toast(
      "Clique e arraste na viatura. Ajuste a escala e a rotação, depois aplique.",
    );
  } catch (err) {
    toast(err.message);
  }
  e.target.value = "";
};
$("#texture-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await readImage(file);
    cancelDecal();
    if (!nativeTextures) {
      resizeTexture(img.width, img.height);
      history.length = future.length = 0;
      updateHistory();
    } else pushHistory();
    ctx.clearRect(0, 0, size, textureHeight);
    ctx.drawImage(img, 0, 0, size, textureHeight);
    baseCtx.clearRect(0, 0, size, textureHeight);
    baseCtx.drawImage(textureCanvas, 0, 0);
    refresh();
    changed = true;
    toast(
      "Textura importada. As dimensões do YTD são preservadas quando ele está aberto.",
    );
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
function installModel(imported, name, native = false) {
  const bounds = new THREE.Box3().setFromObject(imported),
    center = bounds.getCenter(new THREE.Vector3()),
    extent = bounds.getSize(new THREE.Vector3()),
    max = Math.max(extent.x, extent.y, extent.z);
  if (!Number.isFinite(max) || max <= 0)
    throw Error("Modelo sem dimensões válidas.");
  imported.position.sub(center);
  const group = new THREE.Group();
  group.add(imported);
  group.scale.setScalar(2.2 / max);
  scene.remove(model);
  model.traverse((m) => {
    if (m.isMesh) {
      m.geometry.dispose();
      if (m.material !== material) m.material.dispose();
    }
  });
  model = group;
  scene.add(model);
  $("#asset-name").textContent = name;
  $("#asset-type").textContent = native
    ? "MODELO NATIVO · UV ATIVO"
    : "MODELO IMPORTADO · UV ATIVO";
  $("#mesh-info").textContent = name;
  $("#wireframe").checked = false;
  material.wireframe = false;
  $("#reset-view").click();
}
function loadModel(buffer, name) {
  return new Promise((resolve, reject) =>
    new GLTFLoader().parse(
      buffer,
      "",
      (gltf) => {
        try {
          let count = 0,
            missing = false;
          gltf.scene.traverse((m) => {
            if (m.isMesh) {
              count++;
              if (!m.geometry.attributes.uv) missing = true;
              m.material = material;
            }
          });
          if (!count || missing)
            throw Error("O modelo precisa conter malhas com coordenadas UV.");
          installModel(gltf.scene, name);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      reject,
    ),
  );
}
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i += 32768)
    result += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(result);
}
// Native format session: source bytes remain immutable; canvas edits are kept separately.
let nativeModel = null,
  nativeModelIndex = 0,
  nativeLodIndex = 0,
  nativeTextures = null,
  nativeTextureName = "",
  nativeTextureBuffer = null,
  activeKey = null;
const textureStates = new Map(),
  materialBindings = new Map();
function copyCanvas(canvas) {
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext("2d").drawImage(canvas, 0, 0);
  return copy;
}
function resizeTexture(width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > 16777216
  )
    throw Error("Textura inválida: limite de 8192 por lado e 16 megapixels.");
  size = width;
  textureHeight = height;
  textureCanvas.width = base.width = width;
  textureCanvas.height = base.height = height;
  $("#uv-view").width = width;
  $("#uv-view").height = height;
  $("#texture-dimensions").textContent =
    `Canvas editável · ${width} × ${height}`;
  $("#map-size").textContent = `${width} × ${height}`;
  texture.dispose();
  texture.image = textureCanvas;
  texture.needsUpdate = true;
}
function markTextureDirty() {
  const state = textureStates.get(activeKey);
  if (state) state.dirty = true;
}
function activeEntry() {
  return nativeTextures?.textures.find((t) => t.key === activeKey);
}
function flushTexture() {
  const state = textureStates.get(activeKey);
  if (state) {
    state.canvas.getContext("2d").clearRect(0, 0, size, textureHeight);
    state.canvas.getContext("2d").drawImage(textureCanvas, 0, 0);
    state.base = copyCanvas(base);
    state.map.needsUpdate = true;
  }
}
function textureState(entry) {
  if (textureStates.has(entry.key)) return textureStates.get(entry.key);
  let pixelsInCache = [...textureStates.values()].reduce(
    (n, s) => n + s.canvas.width * s.canvas.height,
    0,
  );
  if (pixelsInCache + entry.width * entry.height > 33554432) {
    const displayed = new Set();
    model.traverse(m => { if (m.isMesh && m.material.map) displayed.add(m.material.map); });
    for (const [key, state] of textureStates) {
      if (state.dirty || key === activeKey || displayed.has(state.map)) continue;
      pixelsInCache -= state.canvas.width * state.canvas.height;
      state.map.dispose();
      textureStates.delete(key);
      if (pixelsInCache + entry.width * entry.height <= 33554432) break;
    }
  }
  if (pixelsInCache + entry.width * entry.height > 33554432)
    throw Error(
      "Limite de memória de texturas atingido (32 megapixels). Salve o projeto e reabra o dicionário.",
    );
  const canvas = document.createElement("canvas");
  canvas.width = entry.width;
  canvas.height = entry.height;
  canvas
    .getContext("2d")
    .putImageData(
      new ImageData(entry.decode(), entry.width, entry.height),
      0,
      0,
    );
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const state = { canvas, base: copyCanvas(canvas), map, dirty: false };
  textureStates.set(entry.key, state);
  return state;
}
function disposeTextureStates() {
  for (const state of textureStates.values()) state.map.dispose();
  textureStates.clear();
  activeKey = null;
}
function updateNativeMaterials() {
  if (!nativeModel) {
    material.map = texture;
    material.needsUpdate = true;
    return;
  }
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const shader = mesh.userData.shaderIndex,
      name = mesh.userData.diffuseName?.toLowerCase();
    let key = materialBindings.get(`${nativeModelIndex}:${shader}`);
    if (!key && nativeTextures) {
      const match = nativeTextures.textures.find(
        (t) => t.supported && t.name.toLowerCase() === name,
      );
      key = match?.key;
      if (
        !key &&
        nativeTextures.textures.length === 1 &&
        nativeTextures.textures[0].supported
      )
        key = nativeTextures.textures[0].key;
    }
    const entry = nativeTextures?.textures.find(
      (t) => t.key === key && t.supported,
    );
    mesh.material.map = entry
      ? entry.key === activeKey
        ? texture
        : textureState(entry).map
      : nativeTextures
        ? null
        : texture;
    mesh.material.color.set(entry || !nativeTextures ? 0xffffff : 0xd9d4c7);
    mesh.material.needsUpdate = true;
  });
}
function selectTexture(key, { flush = true } = {}) {
  const entry = nativeTextures?.textures.find((t) => t.key === key);
  if (!entry?.supported)
    throw Error("Esta textura ainda não tem um decodificador disponível.");
  const state = textureState(entry);
  cancelDecal();
  if (flush) flushTexture();
  activeKey = key;
  if (nativeModel?.format === "yft") {
    const family = name => name.toLowerCase().replace(/_\d+$/, "");
    nativeModel.drawables[nativeModelIndex].shaders.forEach((shader, index) => {
      if (shader.liveryName && family(shader.liveryName) === family(entry.name))
        materialBindings.set(`${nativeModelIndex}:${index}`, entry.key);
    });
  }
  resizeTexture(entry.width, entry.height);
  ctx.drawImage(state.canvas, 0, 0);
  baseCtx.drawImage(state.base, 0, 0);
  history.length = future.length = 0;
  updateHistory();
  $("#texture-select").value = key;
  $("#texture-name").textContent = entry.name;
  $("#native-texture-info").textContent =
    `${entry.formatName} · ${entry.width} × ${entry.height} · ${entry.levels} mipmap(s). O histórico é separado a cada troca de textura.`;
  $("#export-native").disabled = false;
  refresh();
  updateNativeMaterials();
}
function resetMaterialOptions() {
  const select = $("#material-select");
  select.replaceChildren(new Option("Todas as superfícies", "all"));
  if (nativeModel) {
    const drawable = nativeModel.drawables[nativeModelIndex],
      seen = new Set();
    model.traverse((mesh) => {
      if (!mesh.isMesh || seen.has(mesh.userData.shaderIndex)) return;
      const id = mesh.userData.shaderIndex;
      seen.add(id);
      select.add(
        new Option(
          `Material ${id} · ${(nativeModel.format === "yft" && drawable.shaders[id]?.liveryName) || drawable.shaders[id]?.diffuseName || "sem diffuse"}`,
          String(id),
        ),
      );
    });
    const liveryIndex = drawable.shaders.findIndex(s => nativeModel.format === "yft" && s.liveryName);
    if (liveryIndex >= 0) select.value = String(liveryIndex);
  }
}
function setTextureDictionary(doc, buffer, name) {
  const liveryNames = nativeModel?.format === "yft"
    ? nativeModel.drawables.flatMap(d => d.shaders.map(s => s.liveryName?.toLowerCase()).filter(Boolean)) : [];
  const supported = doc.textures.find(t => t.supported && liveryNames.includes(t.name.toLowerCase()))
    || doc.textures.find((t) => t.supported);
  if (!supported)
    throw Error(
      "Nenhuma textura deste dicionário é suportada. BC7 e formatos desconhecidos ainda não estão disponíveis.",
    );
  // Decode the first entry before replacing the current session.
  supported.decode();
  cancelDecal();
  disposeTextureStates();
  nativeTextures = doc;
  nativeTextureBuffer = buffer;
  nativeTextureName = name;
  materialBindings.clear();
  const select = $("#texture-select");
  select.replaceChildren();
  for (const entry of doc.textures) {
    const option = new Option(
      `${entry.name} · ${entry.formatName}${entry.supported ? "" : " · não suportado"}`,
      entry.key,
    );
    option.disabled = !entry.supported;
    select.add(option);
  }
  $("#native-texture-controls").classList.remove("hidden");
  $("#export-native").textContent = doc.embedded
    ? `Exportar ${(nativeModel?.format || "ydd").toUpperCase()} editado`
    : "Exportar YTD editado";
  selectTexture(supported.key, { flush: false });
  resetMaterialOptions();
}
function buildNativeModel(
  doc,
  drawableIndex = 0,
  lodIndex = 0,
  name = modelFilename,
) {
  const drawable = doc.drawables[drawableIndex];
  if (!drawable) throw Error("Drawable não encontrado.");
  const geometries = drawable.readLod(lodIndex),
    group = new THREE.Group();
  for (const data of geometries) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(data.positions, 3),
    );
    const shader = drawable.shaders[data.shaderIndex];
    const paintUVs = doc.format === "yft" && shader?.liveryName && data.uvs1 ? data.uvs1 : data.uvs;
    geometry.setAttribute("uv", new THREE.BufferAttribute(paintUVs, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    if (data.normals)
      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(data.normals, 3),
      );
    else geometry.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.93,
      side: THREE.DoubleSide,
      alphaTest: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.userData = {
      shaderIndex: data.shaderIndex,
      diffuseName: (doc.format === "yft" ? shader?.liveryName : "") || shader?.diffuseName || "",
      liveryName: doc.format === "yft" ? shader?.liveryName || "" : "",
    };
    group.add(mesh);
  }
  installModel(group, name, true);
  nativeModel = doc;
  $("#asset-type").textContent = `${doc.format === "yft" ? "YFT" : "YDD"} NATIVO · UV ATIVO`;
  nativeModelIndex = drawableIndex;
  nativeLodIndex = lodIndex;
  $("#native-model-controls").classList.remove("hidden");
  const ds = $("#drawable-select");
  ds.replaceChildren(
    ...doc.drawables.map((d, i) => new Option(d.name, String(i))),
  );
  ds.value = String(drawableIndex);
  const ls = $("#lod-select");
  ls.replaceChildren(...drawable.lods.map((l, i) => new Option(l, String(i))));
  ls.value = String(lodIndex);
  const vertices = geometries.reduce((n, g) => n + g.vertexCount, 0),
    triangles = geometries.reduce((n, g) => n + g.triangleCount, 0);
  $("#mesh-info").textContent =
    `${drawable.name} · ${vertices.toLocaleString("pt-BR")} vértices · ${triangles.toLocaleString("pt-BR")} triângulos`;
  resetMaterialOptions();
  const liveryIndex = drawable.shaders.findIndex(s => doc.format === "yft" && s.liveryName);
  if (liveryIndex >= 0) $("#material-select").value = String(liveryIndex);
  updateNativeMaterials();
}
$("#texture-select").onchange = (e) => {
  try {
    selectTexture(e.target.value);
    changed = true;
  } catch (err) {
    $("#texture-select").value = activeKey;
    toast(err.message);
  }
};
$("#bind-texture").onclick = () => {
  if (!activeKey) return;
  const target = $("#material-select").value;
  model.traverse((m) => {
    if (
      m.isMesh &&
      (target === "all" || String(m.userData.shaderIndex) === target)
    )
      materialBindings.set(
        `${nativeModelIndex}:${m.userData.shaderIndex}`,
        activeKey,
      );
  });
  updateNativeMaterials();
  changed = true;
  toast(
    "Textura vinculada. Pinte sobre as superfícies que usam a textura selecionada.",
  );
};
$("#drawable-select").onchange = (e) => {
  try {
    cancelDecal();
    buildNativeModel(nativeModel, Number(e.target.value), 0);
    changed = true;
  } catch (err) {
    e.target.value = String(nativeModelIndex);
    toast(err.message);
  }
};
$("#lod-select").onchange = (e) => {
  try {
    cancelDecal();
    buildNativeModel(nativeModel, nativeModelIndex, Number(e.target.value));
    changed = true;
  } catch (err) {
    e.target.value = String(nativeLodIndex);
    toast(err.message);
  }
};
$("#ytd-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (
      changed &&
      nativeTextures &&
      !confirm(
        "Abrir outro dicionário? Salve o projeto ou exporte o YTD atual para preservar suas edições.",
      )
    )
      return;
    const bytes = await file.arrayBuffer(),
      doc = parseYtd(bytes);
    setTextureDictionary(doc, bytes, file.name);
    changed = true;
    toast(
      "YTD aberto. Se a viatura estiver sem textura, use Vincular textura selecionada.",
    );
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};
function mipPixels(canvas, entry) {
  const levels = [];
  let source = canvas;
  for (const mip of entry.mipmaps) {
    const dest = document.createElement("canvas");
    dest.width = mip.width;
    dest.height = mip.height;
    const c = dest.getContext("2d");
    c.drawImage(source, 0, 0, mip.width, mip.height);
    levels.push(c.getImageData(0, 0, mip.width, mip.height).data);
    source = dest;
  }
  return levels;
}
$("#export-native").onclick = async () => {
  if (!nativeTextures || decalSnapshot)
    return toast("Aplique ou cancele o texto/imagem antes de exportar.");
  const button = $("#export-native");
  button.disabled = true;
  button.textContent = "Preparando arquivo…";
  try {
    await new Promise((resolve) => setTimeout(resolve, 40));
    flushTexture();
    const edits = new Map();
    for (const [key, state] of textureStates) {
      if (!state.dirty) continue;
      const entry = nativeTextures.textures.find((t) => t.key === key),
        pixels = state.canvas
          .getContext("2d")
          .getImageData(0, 0, entry.width, entry.height).data,
        originalCanvas = document.createElement("canvas");
      originalCanvas.width = entry.width;
      originalCanvas.height = entry.height;
      const originalContext = originalCanvas.getContext("2d");
      originalContext.putImageData(
        new ImageData(entry.decode(), entry.width, entry.height),
        0,
        0,
      );
      const original = originalContext.getImageData(
        0,
        0,
        entry.width,
        entry.height,
      ).data;
      let edited = false;
      for (let i = 0; i < pixels.length; i++)
        if (pixels[i] !== original[i]) {
          edited = true;
          break;
        }
      if (edited) {
        if (!canWriteTexture(entry))
          throw Error(
            `A textura ${entry.name} (${entry.formatName}) pode ser aberta, mas ainda não pode ser gravada. Exporte PNG.`,
          );
        edits.set(key, mipPixels(state.canvas, entry));
      }
    }
    const data = writeYtd(nativeTextures, edits),
      extension = nativeTextures.embedded ? nativeModel?.format || "ydd" : "ytd";
    download(
      nativeTextureName.replace(/\.(yft|ydd|ytd)$/i, "") + "_editado." + extension,
      new Blob([data], { type: "application/octet-stream" }),
    );
    toast(
      `Cópia ${extension.toUpperCase()} exportada. ${edits.size} textura(s) alterada(s); demais recursos preservados. DXT usa compressão com perda.`,
    );
  } catch (err) {
    toast(err.message);
  } finally {
    button.disabled = false;
    button.textContent = nativeTextures?.embedded
      ? `Exportar ${(nativeModel?.format || "ydd").toUpperCase()} editado`
      : "Exportar YTD editado";
  }
};
$("#save-project").onclick = () => {
  if (decalSnapshot)
    return toast("Aplique ou cancele o texto/imagem antes de salvar.");
  flushTexture();
  const project = {
    format: "paintfive",
    version: 2,
    texture: textureCanvas.toDataURL("image/png"),
    base: base.toDataURL("image/png"),
    model: modelSource ? bufferToBase64(modelSource) : null,
    modelName: modelFilename,
    modelFormat: nativeModel ? nativeModel.format || "ydd" : "gltf",
    drawableIndex: nativeModelIndex,
    lodIndex: nativeLodIndex,
    nativeTexture: nativeTextureBuffer
      ? bufferToBase64(nativeTextureBuffer)
      : null,
    nativeTextureName,
    nativeEmbedded: !!nativeTextures?.embedded,
    activeTexture: activeKey,
    bindings: [...materialBindings],
    textureEdits: [...textureStates]
      .filter(([, s]) => s.dirty)
      .map(([key, s]) => ({
        key,
        texture: s.canvas.toDataURL("image/png"),
        base: s.base.toDataURL("image/png"),
      })),
  };
  const projectFile = new Blob([JSON.stringify(project)], {
    type: "application/json",
  });
  if (projectFile.size > 80 * 1024 * 1024)
    return toast(
      "O projeto excede 80 MB. Exporte os dicionários e texturas separadamente; este projeto não pode ser salvo neste formato.",
    );
  download("projeto.paintfive", projectFile);
  changed = false;
  toast("Projeto salvo com arquivos nativos, vínculos e texturas.");
};
function base64Buffer(value) {
  if (
    typeof value !== "string" ||
    value.length > 112000000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw Error("Dados binários inválidos no projeto.");
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)).buffer;
}
async function projectImage(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("data:image/png;base64,") ||
    value.length > 112000000
  )
    throw Error("Imagem inválida no projeto.");
  return readImage(await (await fetch(value)).blob());
}
async function restoreProject(p) {
  if (p.format !== "paintfive" || ![1, 2].includes(p.version))
    throw Error("Projeto inválido ou versão não suportada.");
  const [image, baseImage] = await Promise.all([
    projectImage(p.texture),
    projectImage(p.base),
  ]);
  if (image.width !== baseImage.width || image.height !== baseImage.height)
    throw Error("Dimensões inconsistentes no projeto.");
  const modelBuffer = p.model ? base64Buffer(p.model) : null,
    modelDoc =
      modelBuffer && ["ydd", "yft"].includes(p.modelFormat)
        ? (p.modelFormat === "yft" ? parseYft : parseYdd)(modelBuffer) : null;
  const textureBuffer = p.nativeTexture ? base64Buffer(p.nativeTexture) : null,
    textureDoc = textureBuffer
      ? p.nativeEmbedded
        ? {
            resource: modelDoc?.resource,
            textures: modelDoc?.drawables
              .flatMap((d) => d.textures)
              .filter(
                (t, i, a) => a.findIndex((v) => v.pointer === t.pointer) === i,
              ),
            embedded: true,
          }
        : parseYtd(textureBuffer)
      : null;
  if (textureDoc && !textureDoc.resource)
    throw Error("Projeto com texturas embutidas sem YDD.");
  const restored = [];
  for (const edit of p.textureEdits || []) {
    const entry = textureDoc?.textures.find((t) => t.key === edit.key);
    if (!entry) throw Error("Textura de projeto não encontrada no dicionário.");
    const [a, b] = await Promise.all([
      projectImage(edit.texture),
      projectImage(edit.base),
    ]);
    if (
      a.width !== entry.width ||
      a.height !== entry.height ||
      b.width !== entry.width ||
      b.height !== entry.height
    )
      throw Error("Dimensões editadas incompatíveis com o recurso.");
    restored.push({ key: edit.key, a, b });
  }
  if (modelDoc)
    buildNativeModel(
      modelDoc,
      p.drawableIndex || 0,
      p.lodIndex || 0,
      p.modelName || "Modelo YDD",
    );
  else if (modelBuffer) {
    await loadModel(modelBuffer, p.modelName || "Modelo importado");
    nativeModel = null;
    $("#native-model-controls").classList.add("hidden");
  } else {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(demoGeometry.clone(), material));
    installModel(group, "Viatura demonstrativa");
    nativeModel = null;
    $("#native-model-controls").classList.add("hidden");
  }
  cancelDecal();
  disposeTextureStates();
  nativeTextures = null;
  nativeTextureBuffer = null;
  nativeTextureName = "";
  materialBindings.clear();
  $("#native-texture-controls").classList.add("hidden");
  modelSource = modelBuffer;
  modelFilename = p.modelName || null;
  if (textureDoc) {
    setTextureDictionary(
      textureDoc,
      textureBuffer,
      p.nativeTextureName || "texturas.ytd",
    );
    for (const item of restored) {
      const state = textureState(
        textureDoc.textures.find((t) => t.key === item.key),
      );
      state.canvas
        .getContext("2d")
        .clearRect(0, 0, item.a.width, item.a.height);
      state.canvas.getContext("2d").drawImage(item.a, 0, 0);
      state.base.getContext("2d").clearRect(0, 0, item.b.width, item.b.height);
      state.base.getContext("2d").drawImage(item.b, 0, 0);
      state.map.needsUpdate = true;
      state.dirty = true;
    }
    for (const [slot, key] of p.bindings || [])
      if (
        typeof slot === "string" &&
        textureDoc.textures.some((t) => t.key === key)
      )
        materialBindings.set(slot, key);
    selectTexture(
      p.activeTexture || textureDoc.textures.find((t) => t.supported).key,
      { flush: false },
    );
  } else {
    resizeTexture(image.width, image.height);
    ctx.drawImage(image, 0, 0);
    baseCtx.drawImage(baseImage, 0, 0);
    $("#texture-name").textContent = "Diffuse texture";
    updateNativeMaterials();
  }
  history.length = future.length = 0;
  updateHistory();
  refresh();
  changed = false;
}
$("#model-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 80 * 1024 * 1024)
      throw Error("O arquivo excede o limite de 80 MB.");
    if (/\.ytd$/i.test(file.name)) {
      if (
        changed &&
        nativeTextures &&
        !confirm(
          "Abrir outro YTD e substituir as texturas atuais? Salve seu trabalho antes de continuar.",
        )
      )
        return;
      const buffer = await file.arrayBuffer();
      setTextureDictionary(parseYtd(buffer), buffer, file.name);
      changed = true;
      toast("YTD carregado.");
      return;
    }
    if (
      changed &&
      !confirm(
        "Substituir o modelo/projeto? Salve seu trabalho antes de continuar.",
      )
    )
      return;
    if (/\.paintfive$/i.test(file.name)) {
      await restoreProject(JSON.parse(await file.text()));
      toast("Projeto restaurado.");
      return;
    }
    const buffer = await file.arrayBuffer();
    if (/\.(ydd|yft)$/i.test(file.name)) {
      const doc = /\.yft$/i.test(file.name) ? parseYft(buffer) : parseYdd(buffer);
      doc.drawables[0].readLod();
      if (nativeTextures?.embedded) {
        disposeTextureStates();
        nativeTextures = null;
        nativeTextureBuffer = null;
        $("#native-texture-controls").classList.add("hidden");
      }
      materialBindings.clear();
      buildNativeModel(doc, 0, 0, file.name);
      modelSource = buffer;
      modelFilename = file.name;
      const embedded = doc.drawables
        .flatMap((d) => d.textures)
        .filter((t, i, a) => a.findIndex((v) => v.pointer === t.pointer) === i);
      if (!nativeTextures && embedded.some((t) => t.supported))
        setTextureDictionary(
          { resource: doc.resource, textures: embedded, embedded: true },
          buffer,
          file.name,
        );
      toast(
        "Modelo aberto. Abra o YTD correspondente para aplicar as texturas.",
      );
    } else {
      await loadModel(buffer, file.name);
      nativeModel = null;
      $("#native-model-controls").classList.add("hidden");
      modelSource = buffer;
      modelFilename = file.name;
      updateNativeMaterials();
      toast(
        "Modelo carregado. Use uma textura correspondente ao UV dessa viatura.",
      );
    }
    changed = true;
  } catch (err) {
    toast(err.message || "Não foi possível abrir o arquivo.");
  } finally {
    e.target.value = "";
  }
};
window.addEventListener("keydown", (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    $(e.shiftKey ? "#redo" : "#undo").click();
    return;
  }
  if (e.key === "Escape") {
    cancelDecal();
    setTool("orbit");
  }
  const keyTool = { b: "brush", e: "erase", v: "orbit", d: "decal", t: "text", l: "line", i: "eyedropper" }[
    e.key.toLowerCase()
  ];
  if (keyTool) setTool(keyTool);
});
window.addEventListener("beforeunload", (e) => {
  if (changed || decalSnapshot || lineSnapshot) {
    e.preventDefault();
    e.returnValue = "";
  }
});
const resize = new ResizeObserver(() => {
  const rect = $(".viewport").getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
});
resize.observe($(".viewport"));
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
