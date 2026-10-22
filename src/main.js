import { AdvancedEditor } from "./editor/advanced.js";
import { LayerDocument } from "./editor/layers.js";
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
<aside class="right"><div class="panel-head"><span class="prop-title">${icon("sliders-horizontal")} Propriedades</span>${icon("ellipsis")}</div><div class="section"><div class="section-title">FERRAMENTA ATIVA <span class="mini-tag" id="tool-tag">PINCEL</span></div><div class="brush-only"><div class="label-row"><label for="size">Tamanho do pincel</label><output class="value" id="size-out">32 px</output></div><input id="size" type="range" min="2" max="180" value="32"><div class="label-row"><label for="opacity">Opacidade</label><output class="value" id="opacity-out">100%</output></div><input id="opacity" type="range" min="1" max="100" value="100"><div class="label-row"><label for="softness">Suavidade</label><output class="value" id="softness-out">25%</output></div><input id="softness" type="range" min="0" max="95" value="25"></div><div class="text-controls"><label class="section-title" for="text-content">TEXTO</label><textarea id="text-content" maxlength="500" rows="3" placeholder="Digite o texto da viatura">POLÍCIA</textarea><label class="section-title" for="text-font">FONTE</label><select id="text-font" class="full"><option value="Arial">Arial</option><option value="Arial Black">Arial Black</option><option value="Georgia">Georgia</option><option value="monospace">Monoespaçada</option></select><div class="label-row"><label for="text-size">Tamanho na textura (px)</label><input id="text-size" type="number" min="12" max="512" value="96"></div><div class="label-row"><label for="text-bold">Negrito</label><input id="text-bold" type="checkbox" checked></div><div class="label-row"><label for="text-opacity">Opacidade (%)</label><input id="text-opacity" type="number" min="1" max="100" value="100"></div></div><div class="decal-controls"><p class="help">Clique e arraste no 3D ou no mapa para posicionar. Ajuste antes de aplicar.</p><div class="image-scale"><div class="label-row"><label for="scale">Escala</label><output class="value" id="scale-out">30%</output></div><input id="scale" type="range" min="3" max="100" value="30"></div><div class="label-row"><label for="rotation">Rotação</label><output class="value" id="rotation-out">0°</output></div><input id="rotation" type="range" min="-180" max="180" value="0"><button id="apply-decal" class="accent full">${icon("check")} Aplicar imagem</button><button id="cancel-decal" class="full" style="margin-top:8px">Cancelar posicionamento</button></div></div><div class="section brush-only color-section"><div class="section-title">COR</div><div class="colors">${["#c7fa68", "#e9e4d8", "#17191d", "#ef695e", "#86a7ee", "#c19de5"].map((c) => `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="Cor ${c}"></button>`).join("")}</div><div class="color-entry"><input id="color" type="color" value="#c7fa68" aria-label="Cor personalizada"><span id="color-hex">#C7FA68</span></div></div><div class="section"><div class="section-title">MAPA DE TEXTURA <span style="margin-left:auto">${icon("maximize-2")}</span></div><canvas class="map" id="map" width="320" height="320"></canvas><div class="map-footer"><span>DIFFUSE / BASE COLOR</span><span id="map-size">2048²</span></div><p class="help">Abra o YFT da viatura e seu YTD. Selecione a textura para pintar e exporte uma cópia do dicionário editado ou o PNG.</p></div><div class="section"><div class="section-title">VISUALIZAÇÃO</div><button id="back-view" class="full">${icon("rotate-3d")} Alternar frente / verso</button><div class="label-row" style="margin-top:18px"><label for="wireframe">Exibir malha</label><input id="wireframe" type="checkbox"></div></div></aside></div><footer class="footer"><span><span class="green-dot"></span><b id="status">Pronto para criar</b></span><span>GODOY PAINT CAR <span> / </span> LOCAL WORKSPACE <span> / </span> v0.4.1</span></footer><div id="toast" role="status"></div><input type="file" id="model-file" accept=".glb,.gltf,.paintfive,.yft,.ydd,.ytd" hidden><input type="file" id="ytd-file" accept=".ytd" hidden><input type="file" id="texture-file" accept="image/png,image/jpeg,image/webp" hidden><input type="file" id="image-file" accept="image/png,image/jpeg,image/webp" hidden>`;
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
let camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
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
const ambient = new THREE.HemisphereLight(0xe8efff, 0x6e6657, 2.2);
scene.add(ambient);
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
let editor = null,
  decal = null;
let modelSource = null,
  modelFilename = null;
function updateHistory() {
  if (editor) editor.syncUI();
}
function refresh(compose = true) {
  if (editor && compose) editor.doc.render(ctx, editor.draft);
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
}
function setTool(next) {
  tool = next;
  document
    .querySelectorAll("[data-tool]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
  $("#tool-tag").textContent =
    {
      brush: "PINCEL",
      erase: "BORRACHA",
      orbit: "NAVEGAR",
      text: "TEXTO",
      decal: "IMAGEM",
      line: "LINHA",
      eyedropper: "CONTA-GOTAS",
      select: "MOVER / EDITAR",
      rect: "RETÂNGULO",
      ellipse: "ELIPSE",
      pen: "BÉZIER",
      bucket: "PREENCHIMENTO",
      island: "ILHA UV",
    }[tool] || tool;
  controls.mouseButtons.LEFT = tool === "orbit" ? THREE.MOUSE.ROTATE : null;
  $("#scene").style.cursor = tool === "orbit" ? "grab" : "crosshair";
  editor?.setTool(next);
}
function uvHit(event) {
  const r = $("#uv-view").getBoundingClientRect(),
    scale = Math.min(r.width / size, r.height / textureHeight),
    w = size * scale,
    h = textureHeight * scale;
  const x = event.clientX - r.left - (r.width - w) / 2,
    y = event.clientY - r.top - (r.height - h) / 2;
  return x >= 0 && y >= 0 && x <= w && y <= h
    ? new THREE.Vector2(x / w, 1 - y / h)
    : null;
}
function sceneHit(event) {
  const r = $("#scene").getBoundingClientRect();
  pointer.set(
    ((event.clientX - r.left) / r.width) * 2 - 1,
    -((event.clientY - r.top) / r.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const first = raycaster.intersectObject(model, true).find((h) => h.uv);
  if (!first || first.object.material.map !== texture) return null;
  const uv = first.uv.clone();
  uv.set(
    THREE.MathUtils.euclideanModulo(uv.x, 1),
    THREE.MathUtils.euclideanModulo(uv.y, 1),
  );
  return { uv, mesh: first.object, face: first.faceIndex };
}
function sampleColor(uv) {
  const x = Math.max(0, Math.min(size - 1, Math.floor(uv.x * size))),
    y = Math.max(
      0,
      Math.min(textureHeight - 1, Math.floor((1 - uv.y) * textureHeight)),
    );
  const rgb = ctx.getImageData(x, y, 1, 1).data;
  $("#color").value =
    "#" +
    [...rgb]
      .slice(0, 3)
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  $("#color-hex").textContent = $("#color").value.toUpperCase();
  toast("Cor capturada: " + $("#color-hex").textContent);
}
for (const surface of [$("#scene"), $("#uv-view")]) {
  const coordinates = (e) =>
    surface.id === "scene" ? sceneHit(e) : { uv: uvHit(e) };
  surface.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || tool === "orbit" || !editor) return;
    try {
      const hit = coordinates(e);
      if (!hit?.uv) return;
      if (tool === "eyedropper") {
        sampleColor(hit.uv);
        return;
      }
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      surface.setPointerCapture(e.pointerId);
      controls.enabled = false;
      editor.begin(hit.uv, hit);
      painting = !!editor.drag;
    } catch (err) {
      toast(err.message);
      controls.enabled = true;
    }
  });
  surface.addEventListener("pointermove", (e) => {
    if (!painting) return;
    try {
      const hit = coordinates(e);
      if (hit?.uv) editor.move(hit.uv);
    } catch (err) {
      toast(err.message);
    }
  });
  surface.addEventListener("pointercancel", () => {
    cancelDecal();
    endStroke();
  });
  surface.addEventListener("lostpointercapture", endStroke);
  surface.addEventListener("contextmenu", (e) => e.preventDefault());
}
function endStroke() {
  try {
    if (painting || editor?.drag) editor?.end();
  } catch (err) {
    if (editor) editor.drag = null;
    toast(err.message);
  } finally {
    painting = false;
    controls.enabled = true;
  }
}
window.addEventListener("pointerup", endStroke);
function cancelDecal() {
  editor?.cancel();
  painting = false;
  controls.enabled = true;
}
$("#cancel-decal").onclick = () => {
  cancelDecal();
  setTool("brush");
};
$("#apply-decal").onclick = () => editor?.attempt(() => editor.apply());
$("#undo").onclick = () => {
  cancelDecal();
  editor?.doc.undo();
};
$("#redo").onclick = () => {
  cancelDecal();
  editor?.doc.redo();
};
for (const id of ["size", "opacity", "softness", "scale", "rotation"]) {
  $("#" + id).oninput = (e) => {
    $("#" + id + "-out").textContent =
      e.target.value + ({ size: " px", rotation: "°" }[id] || "%");
    if (id === "size" && tool === "line")
      $("#shape-stroke").value = e.target.value;
    if (id === "rotation")
      editor?.modifyObject({ rotation: Number(e.target.value) }, id);
    if (
      id === "scale" &&
      (editor?.draft?.type === "image" || editor?.doc.active?.type === "image")
    ) {
      const l = editor.draft || editor.doc.active,
        w = (size * Number(e.target.value)) / 100;
      editor.modifyObject(
        { width: w, height: (w * l.canvas.height) / l.canvas.width },
        id,
      );
    }
  };
}
$("#color").oninput = (e) => {
  $("#color-hex").textContent = e.target.value.toUpperCase();
  if (["text", "select"].includes(tool))
    editor?.modifyObject(
      {
        color: e.target.value,
        strokeColor:
          editor.draft?.type === "text" || editor.doc.active?.type === "text"
            ? $("#text-stroke-color").value
            : e.target.value,
      },
      "color",
    );
};
document.querySelectorAll("[data-color]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#color").value = b.dataset.color;
      $("#color").dispatchEvent(new Event("input"));
    }),
);
refresh();
function view(uv) {
  showUV = uv;
  $("#uv-view").style.display = uv ? "block" : "none";
  $("#scene").style.visibility = uv ? "hidden" : "visible";
  $(".tools").style.display = "flex";
  $(".view-hint").style.display = uv ? "none" : "block";
  $("#tab-uv").classList.toggle("active", uv);
  $("#tab-3d").classList.toggle("active", !uv);
  $("#view-name").textContent = uv
    ? `MAPA UV · ${size} × ${textureHeight}`
    : "PERSPECTIVA";
  if (editor) {
    editor.overlayCanvas.style.display = uv ? "block" : "none";
    if (uv) editor.overlay();
  }
}
$("#tab-3d").onclick = () => view(false);
$("#tab-uv").onclick = () => view(true);
$("#map").onclick = () => view(true);
$("#reset-view").onclick = () => {
  if (/\.yft$/i.test($("#asset-name").textContent))
    camera.position.set(2.8, 1.25, 3.1);
  else camera.position.set(0, 0.3, 5.8);
  controls.target.set(0, 0.05, 0);
  backView = false;
};
$("#back-view").onclick = () => {
  backView = !backView;
  if (/\.yft$/i.test($("#asset-name").textContent))
    camera.position.set(backView ? -2.8 : 2.8, 1.25, backView ? -3.1 : 3.1);
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
  if (editor?.pending())
    return toast("Conclua ou cancele a criação atual antes de exportar.");
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
    if (file.size > 80 * 1024 * 1024) throw Error("A imagem excede 80 MB.");
    const image = await readImage(file);
    if (
      image.width > 8192 ||
      image.height > 8192 ||
      image.width * image.height > 16777216
    )
      throw Error(
        "Imagem de camada acima do limite: use até 8192 pixels por lado e 16 megapixels.",
      );
    decal = image;
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
    if (
      !nativeTextures &&
      (img.width !== size || img.height !== textureHeight)
    ) {
      resizeTexture(img.width, img.height);
      const source = document.createElement("canvas");
      source.width = size;
      source.height = textureHeight;
      source.getContext("2d").drawImage(img, 0, 0, size, textureHeight);
      editor.reset(source);
    } else {
      const source = document.createElement("canvas");
      source.width = size;
      source.height = textureHeight;
      source.getContext("2d").drawImage(img, 0, 0, size, textureHeight);
      editor.doc.add("raster", { name: file.name, canvas: source });
    }
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
    state.document = editor?.doc;
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
    model.traverse((m) => {
      if (m.isMesh && m.material.map) displayed.add(m.material.map);
    });
    for (const [key, state] of textureStates) {
      if (state.dirty || key === activeKey || displayed.has(state.map))
        continue;
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
    const family = (name) => name.toLowerCase().replace(/_\d+$/, "");
    nativeModel.drawables[nativeModelIndex].shaders.forEach((shader, index) => {
      if (shader.liveryName && family(shader.liveryName) === family(entry.name))
        materialBindings.set(`${nativeModelIndex}:${index}`, entry.key);
    });
  }
  resizeTexture(entry.width, entry.height);
  ctx.drawImage(state.canvas, 0, 0);
  baseCtx.drawImage(state.base, 0, 0);
  if (editor) {
    if (!state.document) state.document = new LayerDocument(state.canvas);
    editor.setDocument(state.document);
  }
  updateHistory();
  $("#texture-select").value = key;
  $("#texture-name").textContent = entry.name;
  $("#native-texture-info").textContent =
    `${entry.formatName} · ${entry.width} × ${entry.height} · ${entry.levels} mipmap(s). Camadas e histórico pertencem a esta textura.`;
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
    const liveryIndex = drawable.shaders.findIndex(
      (s) => nativeModel.format === "yft" && s.liveryName,
    );
    if (liveryIndex >= 0) select.value = String(liveryIndex);
  }
}
function setTextureDictionary(doc, buffer, name) {
  const liveryNames =
    nativeModel?.format === "yft"
      ? nativeModel.drawables.flatMap((d) =>
          d.shaders.map((s) => s.liveryName?.toLowerCase()).filter(Boolean),
        )
      : [];
  const supported =
    doc.textures.find(
      (t) => t.supported && liveryNames.includes(t.name.toLowerCase()),
    ) || doc.textures.find((t) => t.supported);
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
    const paintUVs =
      doc.format === "yft" && shader?.liveryName && data.uvs1
        ? data.uvs1
        : data.uvs;
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
      diffuseName:
        (doc.format === "yft" ? shader?.liveryName : "") ||
        shader?.diffuseName ||
        "",
      liveryName: doc.format === "yft" ? shader?.liveryName || "" : "",
    };
    group.add(mesh);
  }
  installModel(group, name, true);
  nativeModel = doc;
  $("#asset-type").textContent =
    `${doc.format === "yft" ? "YFT" : "YDD"} NATIVO · UV ATIVO`;
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
  const liveryIndex = drawable.shaders.findIndex(
    (s) => doc.format === "yft" && s.liveryName,
  );
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
  if (!nativeTextures || editor?.pending())
    return toast("Conclua ou cancele a criação atual antes de exportar.");
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
      extension = nativeTextures.embedded
        ? nativeModel?.format || "ydd"
        : "ytd";
    download(
      nativeTextureName.replace(/\.(yft|ydd|ytd)$/i, "") +
        "_editado." +
        extension,
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
$("#save-project").onclick = async () => {
  if (editor?.pending())
    return toast("Conclua ou cancele a criação atual antes de salvar.");
  flushTexture();
  const project = {
    format: "paintfive",
    version: 3,
    fonts: editor.fonts,
    layers: nativeTextures ? null : await editor.doc.serialize(),
    view: {
      camera: $("#camera-view").value,
      lighting: $("#lighting-select").value,
    },
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
    textureEdits: await Promise.all(
      [...textureStates]
        .filter(([, s]) => s.dirty || s.document?.selection)
        .map(async ([key, s]) => ({
          key,
          layers: s.document ? await s.document.serialize() : null,
          texture: s.canvas.toDataURL("image/png"),
          base: s.base.toDataURL("image/png"),
        })),
    ),
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
  if (p.format !== "paintfive" || ![1, 2, 3].includes(p.version))
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
        ? (p.modelFormat === "yft" ? parseYft : parseYdd)(modelBuffer)
        : null;
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
  if (p.fonts && (!Array.isArray(p.fonts) || p.fonts.length > 16))
    throw Error("Lista de fontes inválida.");

  const standaloneLayers = p.layers
    ? await LayerDocument.restore(p.layers)
    : null;
  if (
    standaloneLayers &&
    (standaloneLayers.width !== image.width ||
      standaloneLayers.height !== image.height)
  )
    throw Error("Resolução de camadas incompatível.");
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
    const document = edit.layers
      ? await LayerDocument.restore(edit.layers)
      : legacyDocument(a, b);
    if (document.width !== entry.width || document.height !== entry.height)
      throw Error("Resolução de camadas incompatível.");
    restored.push({ key: edit.key, a, b, document });
  }
  const fontFamilies = new Set((p.fonts || []).map((f) => f.family));
  for (const doc of [
    standaloneLayers,
    ...restored.map((r) => r.document),
  ].filter(Boolean))
    for (const layer of doc.layers)
      if (
        layer.type === "text" &&
        layer.font?.startsWith("GodoyFont_") &&
        !fontFamilies.has(layer.font)
      )
        throw Error("Fonte personalizada ausente no projeto.");
  await editor.restoreFonts(p.fonts || []);
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
      state.document = item.document;
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
  updateHistory();
  if (!textureDoc)
    editor.setDocument(standaloneLayers || legacyDocument(image, baseImage));
  if (p.view) {
    setCameraView(p.view.camera || "perspective");
    setLighting(p.view.lighting || "studio");
  }
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
      const doc = /\.yft$/i.test(file.name)
        ? parseYft(buffer)
        : parseYdd(buffer);
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
  if (e.key === "Escape") {
    cancelDecal();
    setTool("orbit");
    return;
  }
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    $(e.shiftKey ? "#redo" : "#undo").click();
    return;
  }
  if (e.key === "Enter" && tool === "pen") {
    editor.finishPath(false);
    return;
  }
  if (
    tool === "select" &&
    editor.doc.active?.type !== "raster" &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
  ) {
    e.preventDefault();
    const l = editor.doc.active,
      step = e.shiftKey ? 10 : 1;
    editor.doc.edit(
      {
        x: l.x + ({ ArrowLeft: -step, ArrowRight: step }[e.key] || 0),
        y: l.y + ({ ArrowUp: -step, ArrowDown: step }[e.key] || 0),
      },
      "nudge",
    );
    return;
  }
  const next = {
    b: "brush",
    e: "erase",
    v: "orbit",
    d: "decal",
    t: "text",
    l: "line",
    i: "eyedropper",
    a: "select",
    r: "rect",
    c: "ellipse",
    p: "pen",
    f: "bucket",
    u: "island",
  }[e.key.toLowerCase()];
  if (next) setTool(next);
});
window.addEventListener("beforeunload", (e) => {
  if (changed || editor?.pending()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
function legacyDocument(image, original) {
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = image.width;
  baseCanvas.height = image.height;
  baseCanvas.getContext("2d").drawImage(original, 0, 0);
  const doc = new LayerDocument(baseCanvas),
    layerCanvas = document.createElement("canvas");
  layerCanvas.width = image.width;
  layerCanvas.height = image.height;
  layerCanvas.getContext("2d").drawImage(image, 0, 0);
  doc.add(
    "raster",
    { name: "Pintura importada (pixels)", canvas: layerCanvas },
    false,
  );
  return doc;
}
editor = new AdvancedEditor({
  textureCanvas,
  ctx,
  notify: toast,
  setTool,
  view,
  isUV: () => showUV,
  getImage: () => decal,
  meshes: () => {
    const meshes = [];
    model.traverse((m) => {
      if (m.isMesh && m.material.map === texture) meshes.push(m);
    });
    return meshes;
  },
  update: (dirty) => {
    if (dirty) {
      changed = true;
      markTextureDirty();
      $("#status").textContent = "Camadas locais · alterações não salvas";
    }
    refresh(false);
  },
});
setTool("brush");
const viewPanel = document.createElement("div");
viewPanel.className = "section studio-controls";
viewPanel.innerHTML = `<label class="section-title" for="camera-view">CÂMERAS / VISTAS</label><select id="camera-view" class="full"><option value="perspective">Perspectiva livre</option><option value="front">Frente · Ortográfica</option><option value="back">Trás · Ortográfica</option><option value="left">Esquerda · Ortográfica</option><option value="right">Direita · Ortográfica</option><option value="top">Topo / Teto · Ortográfica</option></select><div class="camera-buttons"><button data-view="front">Frente</button><button data-view="back">Trás</button><button data-view="left">Esquerda</button><button data-view="right">Direita</button><button data-view="top">Teto</button></div><label class="section-title" for="lighting-select">ILUMINAÇÃO 3D</label><select id="lighting-select" class="full"><option value="studio">Estúdio</option><option value="day">Dia</option><option value="night">Noite</option></select>`;
$(".right").append(viewPanel);
const quickViews = document.createElement("div");
quickViews.className = "quick-studio";
quickViews.append(viewPanel.querySelector(".camera-buttons"));
quickViews.insertAdjacentHTML(
  "beforeend",
  `<select id="quick-lighting" aria-label="Iluminação rápida"><option value="studio">Estúdio</option><option value="day">Dia</option><option value="night">Noite</option></select>`,
);
$(".viewport").append(quickViews);
function setCameraView(name) {
  if (!["perspective", "front", "back", "left", "right", "top"].includes(name))
    name = "perspective";
  const rect = $(".viewport").getBoundingClientRect(),
    aspect = rect.width / rect.height;
  if (name === "perspective") {
    camera = new THREE.PerspectiveCamera(36, aspect, 0.01, 100);
    camera.position.set(
      /\.yft$/i.test($("#asset-name").textContent) ? 2.8 : 0,
      /\.yft$/i.test($("#asset-name").textContent) ? 1.25 : 0.3,
      /\.yft$/i.test($("#asset-name").textContent) ? 3.1 : 5.8,
    );
  } else {
    const half = Math.max(1.4, 1.4 / aspect);
    camera = new THREE.OrthographicCamera(
      -half * aspect,
      half * aspect,
      half,
      -half,
      0.01,
      100,
    );
    camera.position.fromArray(
      {
        front: [0, 0, -4],
        back: [0, 0, 4],
        left: [-4, 0, 0],
        right: [4, 0, 0],
        top: [0, 4, 0],
      }[name],
    );
    if (name === "top") camera.up.set(0, 0, -1);
  }
  controls.object = camera;
  controls.target.set(0, 0, 0);
  controls.update();
  camera.updateProjectionMatrix();
  $("#camera-view").value = name;
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  $("#view-name").textContent =
    name === "perspective"
      ? "PERSPECTIVA"
      : $("#camera-view").selectedOptions[0].textContent.toUpperCase();
}
function setLighting(name) {
  if (!["studio", "day", "night"].includes(name)) name = "studio";
  const modes = {
      studio: [2.2, 3.5, 2, 1.25, 0xfff3df],
      day: [2.8, 4.4, 0.3, 1.1, 0xffffff],
      night: [0.3, 0.5, 0.6, 0.85, 0x9dbbff],
    },
    m = modes[name];
  ambient.intensity = m[0];
  key.intensity = m[1];
  rim.intensity = m[2];
  renderer.toneMappingExposure = m[3];
  key.color.setHex(m[4]);
  $("#lighting-select").value = name;
  $(".viewport").dataset.lighting = name;
  $("#quick-lighting").value = name;
}
$("#camera-view").onchange = (e) => {
  view(false);
  setCameraView(e.target.value);
};
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      view(false);
      setCameraView(b.dataset.view);
    }),
);
$("#lighting-select").onchange = (e) => setLighting(e.target.value);
$("#quick-lighting").onchange = (e) => setLighting(e.target.value);
$("#reset-view").onclick = () => setCameraView("perspective");
$("#back-view").onclick = () =>
  setCameraView($("#camera-view").value === "front" ? "back" : "front");
const resize = new ResizeObserver(() => {
  const rect = $(".viewport").getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  const aspect = rect.width / rect.height;
  if (camera.isOrthographicCamera) {
    const half = Math.max(1.4, 1.4 / aspect);
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
  } else camera.aspect = aspect;
  camera.updateProjectionMatrix();
});
resize.observe($(".viewport"));
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
