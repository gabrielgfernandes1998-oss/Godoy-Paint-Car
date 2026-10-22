const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));
export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export function copy(c) {
  const d = canvas(c.width, c.height);
  d.getContext("2d").drawImage(c, 0, 0);
  return d;
}
export async function imageCanvas(url) {
  if (
    typeof url !== "string" ||
    !url.startsWith("data:image/png;base64,") ||
    url.length > 112000000
  )
    throw Error("Imagem de camada inválida.");
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(Error("Imagem de camada inválida."));
    img.src = url;
  });
  if (
    img.width > 8192 ||
    img.height > 8192 ||
    img.width * img.height > 16777216
  )
    throw Error("Camada acima do limite de resolução.");
  const c = canvas(img.width, img.height);
  c.getContext("2d").drawImage(img, 0, 0);
  return c;
}
function cloneLayer(l) {
  return {
    ...l,
    points: l.points?.map((p) => ({ ...p })),
    canvas: l.canvas && copy(l.canvas),
    mask: l.mask && copy(l.mask),
  };
}
export class LayerDocument {
  constructor(base, onUpdate = () => {}) {
    this.width = base.width;
    this.height = base.height;
    this.layers = [
      this.layer("raster", {
        name: "Base original",
        canvas: copy(base),
        locked: true,
      }),
    ];
    this.selected = this.layers[0].id;
    this.undoStack = [];
    this.redoStack = [];
    this.selection = null;
    this.onUpdate = onUpdate;
    this.scratch = canvas(this.width, this.height);
    this.lastRecord = "";
  }
  layer(type, props = {}) {
    return {
      id: crypto.randomUUID(),
      type,
      name: {
        raster: "Pintura",
        text: "Texto",
        image: "Imagem",
        shape: "Forma",
        path: "Curva Bézier",
      }[type],
      visible: true,
      opacity: 100,
      blend: "source-over",
      brightness: 100,
      contrast: 100,
      rotation: 0,
      x: this.width / 2,
      y: this.height / 2,
      ...props,
    };
  }
  get active() {
    return this.layers.find((l) => l.id === this.selected);
  }
  state() {
    return { layers: this.layers.map(cloneLayer), selected: this.selected };
  }
  record(key = "") {
    const now = Date.now();
    if (key && this.lastRecord === key && now - this.recordTime < 600) {
      this.recordTime = now;
      return;
    }
    this.undoStack.push(this.state());
    const pixels = (state) =>
      state.layers.reduce(
        (n, l) =>
          n +
          (l.canvas ? l.canvas.width * l.canvas.height : 0) +
          (l.mask ? l.mask.width * l.mask.height : 0),
        0,
      );
    while (
      this.undoStack.length > 1 &&
      (this.undoStack.length > 12 ||
        this.undoStack.reduce((n, s) => n + pixels(s), 0) > 67108864)
    )
      this.undoStack.shift();
    this.redoStack = [];
    this.lastRecord = key;
    this.recordTime = now;
  }
  update(dirty = true) {
    this.onUpdate(dirty);
  }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.state());
    Object.assign(this, this.undoStack.pop());
    this.lastRecord = "";
    this.update();
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.state());
    Object.assign(this, this.redoStack.pop());
    this.lastRecord = "";
    this.update();
  }
  add(type, props = {}, record = true) {
    if (this.layers.length >= 48)
      throw Error("Limite de 48 camadas por textura.");
    const bitmapPixels =
      this.layers.reduce(
        (n, l) =>
          n +
          (l.canvas ? l.canvas.width * l.canvas.height : 0) +
          (l.mask ? l.mask.width * l.mask.height : 0),
        0,
      ) +
      (props.canvas ? props.canvas.width * props.canvas.height : 0) +
      (props.mask ? props.mask.width * props.mask.height : 0);
    if (bitmapPixels > 67108864)
      throw Error("Limite de memória de camadas atingido (64 megapixels).");
    if (
      type === "raster" &&
      this.layers.reduce(
        (n, l) =>
          n + (l.type === "raster" ? l.canvas.width * l.canvas.height : 0),
        0,
      ) +
        this.width * this.height >
        33554432
    )
      throw Error(
        "Limite de 32 megapixels em camadas de pintura. Exporte ou reduza a resolução.",
      );
    if (record) this.record();
    const l = this.layer(type, props);
    this.layers.push(l);
    this.selected = l.id;
    if (record) this.update();
    return l;
  }
  select(id) {
    if (this.layers.some((l) => l.id === id)) {
      this.selected = id;
      this.update(false);
    }
  }
  edit(patch, key = "property") {
    if (!this.active) return;
    this.record(this.selected + ":" + key);
    Object.assign(this.active, patch);
    this.update();
  }
  remove() {
    if (!this.active || this.active.locked) return;
    this.record();
    this.layers = this.layers.filter((l) => l.id !== this.selected);
    this.selected = this.layers.at(-1)?.id;
    this.update();
  }
  duplicate() {
    if (!this.active) return;
    const l = cloneLayer(this.active);
    delete l.id;
    this.add(l.type, { ...l, locked: false, name: l.name + " cópia" });
  }
  reorder(delta) {
    const i = this.layers.findIndex((l) => l.id === this.selected),
      j = i + delta;
    if (i < 0 || j < 0 || j >= this.layers.length) return;
    this.record();
    [this.layers[i], this.layers[j]] = [this.layers[j], this.layers[i]];
    this.update();
  }
  raster() {
    let l = this.active;
    if (l?.type !== "raster" || l.locked)
      l = this.add(
        "raster",
        { canvas: canvas(this.width, this.height) },
        false,
      );
    return l;
  }
  // Draw all effects on a temporary bitmap so blend/opacity apply per layer.
  drawLayer(target, l) {
    if (!l.visible) return;
    const c = this.scratch.getContext("2d");
    c.clearRect(0, 0, this.width, this.height);
    c.save();
    if (l.type === "raster") c.drawImage(l.canvas, 0, 0);
    else {
      c.translate(l.x, l.y);
      c.rotate(((l.rotation || 0) * Math.PI) / 180);
      c.fillStyle = l.color || "#ffffff";
      c.strokeStyle = l.strokeColor || l.color || "#ffffff";
      c.lineWidth = l.strokeWidth || 0;
      c.lineJoin = "round";
      c.lineCap = "round";
      if (l.type === "text") {
        const fontSize = clamp(l.fontSize, 12, 512),
          font = `${l.bold ? "bold " : ""}${fontSize}px ${l.font === "monospace" ? "monospace" : JSON.stringify(l.font || "Arial")}`;
        c.font = font;
        c.textBaseline = "top";
        const lines = String(l.text || "")
          .slice(0, 500)
          .split("\n");
        const width = Math.max(1, ...lines.map((t) => c.measureText(t).width)),
          height = lines.length * fontSize * 1.25;
        l.width = width;
        l.height = height;
        c.shadowColor = l.shadowColor || "#000000";
        c.shadowBlur = clamp(l.shadowBlur, 0, 100);
        c.shadowOffsetX = clamp(l.shadowX, -200, 200);
        c.shadowOffsetY = clamp(l.shadowY, -200, 200);
        lines.forEach((text, i) => {
          const x = -width / 2,
            y = -height / 2 + i * fontSize * 1.25;
          if (l.strokeWidth > 0) c.strokeText(text, x, y);
          c.fillText(text, x, y);
        });
      } else if (l.type === "image")
        c.drawImage(l.canvas, -l.width / 2, -l.height / 2, l.width, l.height);
      else {
        c.beginPath();
        if (l.type === "path") {
          l.points.forEach((p, i) => {
            if (!i) c.moveTo(p.x, p.y);
            else {
              const a = l.points[i - 1];
              c.bezierCurveTo(
                a.outX ?? a.x,
                a.outY ?? a.y,
                p.inX ?? p.x,
                p.inY ?? p.y,
                p.x,
                p.y,
              );
            }
          });
          if (l.closed && l.points.length > 1) {
            const a = l.points.at(-1),
              b = l.points[0];
            c.bezierCurveTo(
              a.outX ?? a.x,
              a.outY ?? a.y,
              b.inX ?? b.x,
              b.inY ?? b.y,
              b.x,
              b.y,
            );
            c.closePath();
          }
        } else if (l.shape === "ellipse")
          c.ellipse(0, 0, l.width / 2, l.height / 2, 0, 0, Math.PI * 2);
        else if (l.shape === "rect")
          c.rect(-l.width / 2, -l.height / 2, l.width, l.height);
        else {
          const dx = l.lineDX ?? l.width,
            dy = l.lineDY ?? (l.lineSign || 1) * l.height;
          c.moveTo(-dx / 2, -dy / 2);
          c.lineTo(dx / 2, dy / 2);
        }
        if (l.fill && (l.type !== "path" || l.closed) && l.shape !== "line")
          c.fill();
        if (l.strokeWidth > 0) c.stroke();
      }
    }
    c.restore();
    if (l.mask) {
      c.save();
      c.globalCompositeOperation = "destination-in";
      c.drawImage(l.mask, 0, 0);
      c.restore();
    }
    target.save();
    target.globalAlpha = clamp(l.opacity, 0, 100) / 100;
    target.globalCompositeOperation = [
      "multiply",
      "overlay",
      "screen",
    ].includes(l.blend)
      ? l.blend
      : "source-over";
    target.filter =
      l.brightness === 100 && l.contrast === 100
        ? "none"
        : `brightness(${clamp(l.brightness, 0, 200)}%) contrast(${clamp(l.contrast, 0, 200)}%)`;
    target.drawImage(this.scratch, 0, 0);
    target.restore();
  }
  render(target, draft = null) {
    target.clearRect(0, 0, this.width, this.height);
    for (const l of this.layers) this.drawLayer(target, l);
    if (draft) this.drawLayer(target, draft);
  }
  patch(patch, erase = false) {
    const p = patch.getContext("2d");
    if (this.selection) {
      p.save();
      p.globalAlpha = 1;
      p.globalCompositeOperation = "destination-in";
      p.drawImage(this.selection, 0, 0);
      p.restore();
    }
    const l = this.raster(),
      c = l.canvas.getContext("2d");
    c.save();
    if (erase) c.globalCompositeOperation = "destination-out";
    c.drawImage(patch, 0, 0);
    c.restore();
  }
  hit(x, y) {
    for (const l of [...this.layers].reverse()) {
      if (!l.visible || l.type === "raster") continue;
      const a = (-(l.rotation || 0) * Math.PI) / 180,
        dx = x - l.x,
        dy = y - l.y,
        px = dx * Math.cos(a) - dy * Math.sin(a),
        py = dx * Math.sin(a) + dy * Math.cos(a);
      if (
        Math.abs(px) <= Math.max(l.width || 0, 12) / 2 + 8 &&
        Math.abs(py) <= Math.max(l.height || 0, 12) / 2 + 8
      )
        return l;
    }
    return null;
  }
  async serialize() {
    return {
      width: this.width,
      height: this.height,
      selected: this.selected,
      selection: this.selection?.toDataURL("image/png"),
      layers: this.layers.map((l) => ({
        ...l,
        canvas: l.canvas?.toDataURL("image/png"),
        mask: l.mask?.toDataURL("image/png"),
      })),
    };
  }
  static async restore(data, onUpdate) {
    if (
      !data ||
      !Number.isInteger(data.width) ||
      !Number.isInteger(data.height) ||
      data.width < 1 ||
      data.height < 1 ||
      data.width > 8192 ||
      data.height > 8192 ||
      data.width * data.height > 16777216 ||
      !Array.isArray(data.layers) ||
      !data.layers.length ||
      data.layers.length > 48
    )
      throw Error("Documento de camadas inválido.");
    const doc = new LayerDocument(canvas(data.width, data.height), onUpdate);
    doc.layers = [];
    const ids = new Set();
    for (const raw of data.layers) {
      if (
        !["raster", "text", "image", "shape", "path"].includes(raw.type) ||
        typeof raw.id !== "string" ||
        ids.has(raw.id)
      )
        throw Error("Camada inválida.");
      ids.add(raw.id);
      if (typeof raw.name !== "string" || raw.name.length > 200)
        throw Error("Nome de camada inválido.");
      if (raw.type !== "raster")
        for (const k of ["width", "height"])
          if (
            !Number.isFinite(raw[k]) ||
            raw[k] <= 0 ||
            raw[k] > (raw.type === "text" ? 500000 : 100000)
          )
            throw Error("Dimensão de camada inválida.");
      if (
        raw.type === "text" &&
        (typeof raw.text !== "string" ||
          raw.text.length > 500 ||
          typeof raw.font !== "string" ||
          raw.font.length > 200)
      )
        throw Error("Texto de camada inválido.");
      if (
        raw.type === "shape" &&
        !["line", "rect", "ellipse"].includes(raw.shape)
      )
        throw Error("Forma de camada inválida.");
      for (const k of [
        "x",
        "y",
        "rotation",
        "lineDX",
        "lineDY",
        "opacity",
        "brightness",
        "contrast",
        "fontSize",
        "strokeWidth",
        "shadowBlur",
        "shadowX",
        "shadowY",
      ])
        if (
          raw[k] !== undefined &&
          (!Number.isFinite(raw[k]) || Math.abs(raw[k]) > 100000)
        )
          throw Error("Propriedade de camada inválida.");
      if (
        raw.type === "path" &&
        (!Array.isArray(raw.points) ||
          raw.points.length < 2 ||
          raw.points.length > 512 ||
          raw.points.some(
            (p) =>
              !["x", "y", "inX", "inY", "outX", "outY"].every(
                (k) => Number.isFinite(p[k]) && Math.abs(p[k]) <= 100000,
              ),
          ))
      )
        throw Error("Curva inválida.");
      const l = {
        ...raw,
        canvas: raw.canvas ? await imageCanvas(raw.canvas) : undefined,
        mask: raw.mask ? await imageCanvas(raw.mask) : undefined,
      };
      if ((l.type === "raster" || l.type === "image") && !l.canvas)
        throw Error("Camada sem imagem.");
      if (
        l.type === "raster" &&
        (l.canvas.width !== doc.width || l.canvas.height !== doc.height)
      )
        throw Error("Resolução de camada incompatível.");
      if (
        doc.layers.reduce(
          (n, l) =>
            n +
            (l.canvas ? l.canvas.width * l.canvas.height : 0) +
            (l.mask ? l.mask.width * l.mask.height : 0),
          0,
        ) +
          (l.canvas ? l.canvas.width * l.canvas.height : 0) +
          (l.mask ? l.mask.width * l.mask.height : 0) >
        67108864
      )
        throw Error("Projeto excede o limite de memória de camadas.");
      if (
        l.mask &&
        (l.mask.width !== doc.width || l.mask.height !== doc.height)
      )
        throw Error("Máscara incompatível.");
      doc.layers.push(l);
    }
    doc.selected = ids.has(data.selected)
      ? data.selected
      : doc.layers.at(-1).id;
    doc.selection = data.selection ? await imageCanvas(data.selection) : null;
    if (
      doc.selection &&
      (doc.selection.width !== doc.width || doc.selection.height !== doc.height)
    )
      throw Error("Máscara de seleção incompatível.");
    return doc;
  }
}
// Contiguous fill compares the composed image, including alpha, and respects a UV mask.
export function floodPatch(source, x, y, color, tolerance, selection) {
  const w = source.width,
    h = source.height,
    src = source.getContext("2d").getImageData(0, 0, w, h).data;
  x = clamp(Math.floor(x), 0, w - 1);
  y = clamp(Math.floor(y), 0, h - 1);
  const start = y * w + x,
    ref = src.slice(start * 4, start * 4 + 4),
    mask = selection?.getContext("2d").getImageData(0, 0, w, h).data;
  const out = canvas(w, h),
    c = out.getContext("2d"),
    image = c.createImageData(w, h),
    visited = new Uint8Array(w * h),
    queue = new Uint32Array(w * h);
  let head = 0,
    tail = 0;
  const push = (i) => {
    if (visited[i]) return;
    visited[i] = 1;
    if (mask && !mask[i * 4 + 3]) return;
    for (let k = 0; k < 4; k++)
      if (Math.abs(src[i * 4 + k] - ref[k]) > tolerance) return;
    queue[tail++] = i;
  };
  push(start);
  while (head < tail) {
    const i = queue[head++],
      px = i % w;
    image.data.set(color, i * 4);
    if (px > 0) push(i - 1);
    if (px < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  c.putImageData(image, 0, 0);
  return out;
}
