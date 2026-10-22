import { LayerDocument, canvas, copy, floodPatch } from "./layers.js";
import { meshIsland, findUVFace, uvMask, allFaces } from "./uv.js";
const $ = (s) => document.querySelector(s),
  value = (id) => $(id).value,
  num = (id) => Number(value(id));
const editable = (l) => l && l.type !== "raster";
export class AdvancedEditor {
  constructor(host) {
    this.host = host;
    this.doc = new LayerDocument(host.textureCanvas, (d) => this.changed(d));
    this.tool = "brush";
    this.fonts = [];
    this.fontFaces = new Map();
    this.draft = null;
    this.drag = null;
    this.pen = null;
    this.bindUI();
    this.changed(false);
  }
  changed(dirty = true) {
    this.doc.render(this.host.ctx, this.draft);
    this.syncUI();
    this.host.update(dirty);
    this.overlay();
  }
  setDocument(doc) {
    this.cancel();
    this.doc = doc;
    doc.onUpdate = (d) => this.changed(d);
    this.changed(false);
  }
  reset(base) {
    this.setDocument(new LayerDocument(base));
  }
  pending() {
    return !!(this.draft || this.pen || this.drag);
  }
  bindUI() {
    const buttons = [
      ["select", "↖", "Selecionar / mover (Q)"],
      ["rect", "▭", "Retângulo (R)"],
      ["ellipse", "◯", "Círculo / elipse (C)"],
      ["pen", "⌁", "Caneta Bézier (P)"],
      ["bucket", "▰", "Preenchimento (F)"],
      ["island", "▨", "Selecionar ilha UV (U)"],
    ];
    for (const [tool, label, title] of buttons) {
      const b = document.createElement("button");
      b.dataset.tool = tool;
      b.textContent = label;
      b.title = title;
      $(".tools").insertBefore(b, $("#undo").previousElementSibling);
    }
    $("[data-tool=erase]").title = "Borracha da camada ativa (E)";
    document.querySelectorAll("[data-tool]").forEach(
      (b) =>
        (b.onclick = () => {
          this.host.setTool(b.dataset.tool);
          if (this.tool === "decal" && !this.host.getImage())
            $("#image-file").click();
        }),
    );
    const panel = document.createElement("section");
    panel.className = "section layer-panel";
    panel.innerHTML = `<div class="section-title">CAMADAS EDITÁVEIS</div><div class="layer-actions"><button id="new-layer">+ Pintura</button><button id="duplicate-layer" title="Duplicar camada">Duplicar</button><button id="delete-layer">Excluir</button></div><div id="layers-list" role="list" aria-label="Camadas"></div><div class="layer-actions"><button id="layer-up">Subir ↑</button><button id="layer-down">Descer ↓</button></div><label class="control-label" for="layer-name">Nome</label><input id="layer-name" class="full" maxlength="80"><label class="control-label" for="layer-blend">Mesclagem</label><select id="layer-blend" class="full"><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="overlay">Overlay</option><option value="screen">Screen</option></select><label class="control-label" for="layer-opacity">Opacidade (%)</label><input id="layer-opacity" type="range" min="0" max="100" value="100"><label class="control-label" for="layer-brightness">Brilho (%)</label><input id="layer-brightness" type="range" min="0" max="200" value="100"><label class="control-label" for="layer-contrast">Contraste (%)</label><input id="layer-contrast" type="range" min="0" max="200" value="100"><p class="help">Selecione uma camada para editar. Use ↖ para mover texto, imagem ou forma no 3D / UV. Pintura e borracha atuam em camadas de pixels.</p><div class="section-title">SELEÇÃO UV</div><button id="clear-layer-mask" class="full">Remover máscara da camada</button><button id="clear-selection" class="full">Limpar seleção / máscara</button><p id="selection-info" class="help">Sem restrição de ilha.</p>`;
    $("#native-model-controls").after(panel);
    $(".text-controls").insertAdjacentHTML(
      "beforeend",
      `<button id="load-font" class="full">Carregar fonte .ttf / .otf</button><input id="font-file" type="file" accept=".ttf,.otf" hidden><label class="control-label" for="text-stroke">Contorno (px)</label><input id="text-stroke" type="number" min="0" max="32" value="0"><input id="text-stroke-color" type="color" value="#000000" aria-label="Cor do contorno"><label class="control-label" for="text-shadow-blur">Sombra: suavidade (px)</label><input id="text-shadow-blur" type="number" min="0" max="100" value="0"><input id="text-shadow-color" type="color" value="#000000" aria-label="Cor da sombra"><label class="control-label" for="text-shadow-x">Sombra X / Y (px)</label><input id="text-shadow-x" type="number" min="-200" max="200" value="0"><input id="text-shadow-y" type="number" min="-200" max="200" value="0">`,
    );
    const properties = document.createElement("div");
    properties.className = "object-controls hidden";
    properties.innerHTML = `<div class="section-title">OBJETO SELECIONADO</div><div class="transform-grid"><label>X<input id="object-x" type="number"></label><label>Y<input id="object-y" type="number"></label><label>Largura<input id="object-width" type="number" min="1" max="8192"></label><label>Altura<input id="object-height" type="number" min="1" max="8192"></label><label>Rotação<input id="object-rotation" type="number" min="-360" max="360"></label></div><button id="edit-path" class="full">Editar pontos da curva no UV</button><p class="help">Textos e formas permanecem editáveis após aplicar.</p>`;
    $(".right .section").prepend(properties);
    const shapes = document.createElement("div");
    shapes.className = "shape-controls hidden";
    shapes.innerHTML = `<label class="control-label" for="shape-fill">Preencher forma</label><input id="shape-fill" type="checkbox"><label class="control-label" for="shape-stroke">Espessura do contorno / linha</label><input id="shape-stroke" type="number" min="1" max="180" value="8"><button id="finish-path" class="full">Concluir curva (Enter)</button><button id="close-path" class="full">Fechar forma Bézier</button><p class="help">Caneta: clique para criar nós; arraste para definir as alças Bézier. Conclua com Enter. Para alterar um ponto, selecione a curva e use Editar pontos.</p>`;
    $(".right .section").append(shapes);
    const bucket = document.createElement("div");
    bucket.className = "bucket-controls hidden";
    bucket.innerHTML = `<label class="control-label" for="bucket-mode">Preenchimento</label><select id="bucket-mode" class="full"><option value="contiguous">Área contígua da textura</option><option value="material">Material clicado</option></select><label class="control-label" for="bucket-tolerance">Tolerância (0–255)</label><input id="bucket-tolerance" type="number" min="0" max="255" value="24">`;
    $(".right .section").append(bucket);
    const overlay = document.createElement("canvas");
    overlay.id = "edit-overlay";
    $(".viewport").append(overlay);
    this.overlayCanvas = overlay;
    $("#new-layer").onclick = () =>
      this.attempt(() => {
        this.cancel();
        this.doc.add("raster", {
          canvas: canvas(this.doc.width, this.doc.height),
        });
        this.host.setTool("brush");
      });
    $("#duplicate-layer").onclick = () =>
      this.attempt(() => this.doc.duplicate());
    $("#delete-layer").onclick = () => this.doc.remove();
    $("#layer-up").onclick = () => this.doc.reorder(1);
    $("#layer-down").onclick = () => this.doc.reorder(-1);
    $("#clear-layer-mask").onclick = () => this.doc.edit({ mask: undefined });
    $("#clear-selection").onclick = () => {
      this.doc.selection = null;
      this.changed(false);
    };
    for (const [id, key] of [
      ["layer-name", "name"],
      ["layer-blend", "blend"],
      ["layer-opacity", "opacity"],
      ["layer-brightness", "brightness"],
      ["layer-contrast", "contrast"],
    ])
      $("#" + id).oninput = () => {
        const patch = {
          [key]:
            key === "name" || key === "blend" ? value("#" + id) : num("#" + id),
        };
        if (this.draft) {
          Object.assign(this.draft, patch);
          this.changed(false);
        } else this.doc.edit(patch, id);
      };

    const textFields = {
      "text-content": "text",
      "text-font": "font",
      "text-size": "fontSize",
      "text-bold": "bold",
      "text-opacity": "opacity",
      "text-stroke": "strokeWidth",
      "text-stroke-color": "strokeColor",
      "text-shadow-blur": "shadowBlur",
      "text-shadow-color": "shadowColor",
      "text-shadow-x": "shadowX",
      "text-shadow-y": "shadowY",
    };
    for (const [id, key] of Object.entries(textFields))
      $("#" + id).oninput = () => {
        const el = $("#" + id),
          v =
            el.type === "checkbox"
              ? el.checked
              : el.type === "number"
                ? Number(el.value)
                : el.value;
        this.modifyObject({ [key]: v }, id, "text");
      };
    for (const [id, key] of [
      ["object-x", "x"],
      ["object-y", "y"],
      ["object-width", "width"],
      ["object-height", "height"],
      ["object-rotation", "rotation"],
    ])
      $("#" + id).oninput = () => {
        const l = this.draft || this.doc.active;
        if (!editable(l)) return;
        let v = num("#" + id);
        if (!Number.isFinite(v) || Math.abs(v) > 100000) return;
        if (key === "width" || key === "height")
          v = Math.max(1, Math.min(8192, v));
        if (l.type === "path" && (key === "width" || key === "height")) {
          const axis = key === "width" ? "x" : "y",
            ratio = v / l[key];
          this.modifyObject(
            {
              [key]: v,
              points: l.points.map((p) => ({
                ...p,
                [axis]: p[axis] * ratio,
                ["in" + axis.toUpperCase()]:
                  p["in" + axis.toUpperCase()] * ratio,
                ["out" + axis.toUpperCase()]:
                  p["out" + axis.toUpperCase()] * ratio,
              })),
            },
            id,
          );
        } else if (
          l.type === "shape" &&
          l.shape === "line" &&
          (key === "width" || key === "height")
        ) {
          const axis = key === "width" ? "lineDX" : "lineDY",
            previous =
              l[axis] ??
              (axis === "lineDX" ? l.width : (l.lineSign || 1) * l.height);
          this.modifyObject({ [key]: v, [axis]: (previous * v) / l[key] }, id);
        } else this.modifyObject({ [key]: v }, id);
      };
    $("#shape-fill").oninput = () =>
      this.modifyObject({ fill: $("#shape-fill").checked }, "shape-fill");
    $("#shape-stroke").oninput = () => {
      if (this.tool === "line") {
        $("#size").value = Math.max(2, Math.min(180, num("#shape-stroke")));
        $("#size-out").textContent = $("#size").value + " px";
      }
      this.modifyObject(
        { strokeWidth: Math.max(1, Math.min(180, num("#shape-stroke"))) },
        "shape-stroke",
      );
    };
    $("#finish-path").onclick = () => this.finishPath(false);
    $("#close-path").onclick = () => this.finishPath(true);
    $("#edit-path").onclick = () => {
      this.editPoints = true;
      this.host.setTool("pen");
      this.host.view(true);
      this.overlay();
    };
    $("#load-font").onclick = () => $("#font-file").click();
    $("#font-file").onchange = async (e) => {
      try {
        const f = e.target.files[0];
        if (!f) return;
        if (!/\.(ttf|otf)$/i.test(f.name) || f.size > 10 * 1024 * 1024)
          throw Error("Use fonte TTF/OTF de até 10 MB.");
        const bytes = new Uint8Array(await f.arrayBuffer());
        let raw = "";
        for (let i = 0; i < bytes.length; i += 32768)
          raw += String.fromCharCode(...bytes.subarray(i, i + 32768));
        const font = {
          family: "GodoyFont_" + crypto.randomUUID().replaceAll("-", ""),
          label: f.name,
          data: btoa(raw),
        };
        await this.loadFont(font);
        $("#text-font").value = font.family;
        $("#text-font").dispatchEvent(new Event("input"));
        this.host.update(true);
        this.host.notify("Fonte carregada e incluída no projeto.");
      } catch (err) {
        this.host.notify(err.message);
      } finally {
        e.target.value = "";
      }
    };
  }
  attempt(action) {
    try {
      return action();
    } catch (err) {
      this.host.notify(err.message);
    }
  }
  async loadFont(font) {
    if (this.fonts.some((f) => f.family === font.family)) return;
    if (
      this.fonts.length >= 16 ||
      !/^GodoyFont_[a-zA-Z0-9_]+$/.test(font.family) ||
      typeof font.data !== "string" ||
      font.data.length > 14000000
    )
      throw Error("Fonte de projeto inválida ou limite de 16 fontes.");
    const bytes = Uint8Array.from(atob(font.data), (c) => c.charCodeAt(0));
    const face = new FontFace(font.family, bytes);
    await face.load();
    document.fonts.add(face);
    this.fontFaces.set(font.family, face);
    this.fonts.push(font);
    $("#text-font").add(new Option(font.label, font.family));
  }
  async restoreFonts(fonts) {
    if (!Array.isArray(fonts) || fonts.length > 16)
      throw Error("Lista de fontes inválida.");
    const faces = [];
    const names = new Set();
    for (const font of fonts) {
      if (
        names.has(font.family) ||
        !/^GodoyFont_[a-zA-Z0-9_]+$/.test(font.family) ||
        typeof font.data !== "string" ||
        font.data.length > 14000000
      )
        throw Error("Fonte de projeto inválida.");
      names.add(font.family);
      const bytes = Uint8Array.from(atob(font.data), (c) => c.charCodeAt(0)),
        face = new FontFace(font.family, bytes);
      await face.load();
      faces.push([font, face]);
    }
    for (const face of this.fontFaces.values()) document.fonts.delete(face);
    this.fontFaces.clear();
    this.fonts = [];
    for (const option of [...$("#text-font").options])
      if (option.value.startsWith("GodoyFont_")) option.remove();
    for (const [font, face] of faces) {
      document.fonts.add(face);
      this.fontFaces.set(font.family, face);
      this.fonts.push(font);
      $("#text-font").add(new Option(font.label, font.family));
    }
  }
  modifyObject(patch, key, type) {
    if (!this.draft && this.tool !== "select" && !this.editPoints) return;
    const l = this.draft || this.doc.active;
    if (!editable(l) || (type && l.type !== type)) return;
    if (this.draft) {
      Object.assign(l, patch);
      this.changed(false);
    } else this.doc.edit(patch, key);
  }
  textProps() {
    return {
      text: value("#text-content"),
      font: value("#text-font"),
      fontSize: Math.max(12, Math.min(512, num("#text-size") || 96)),
      bold: $("#text-bold").checked,
      color: value("#color"),
      opacity: num("#text-opacity"),
      rotation: num("#rotation"),
      strokeWidth: num("#text-stroke"),
      strokeColor: value("#text-stroke-color"),
      shadowColor: value("#text-shadow-color"),
      shadowBlur: num("#text-shadow-blur"),
      shadowX: num("#text-shadow-x"),
      shadowY: num("#text-shadow-y"),
    };
  }
  setTool(tool) {
    if (tool !== this.tool) this.cancel();
    this.tool = tool;
    if (tool !== "pen") this.editPoints = false;
    this.syncUI();
    this.overlay();
  }
  syncUI() {
    const l = this.draft || this.doc.active,
      object = editable(l),
      textMode =
        this.tool === "text" || (this.tool === "select" && l?.type === "text"),
      imageMode =
        this.tool === "decal" ||
        (this.tool === "select" && l?.type === "image");
    $(".right").classList.toggle("text-mode", textMode);
    $(".right").classList.toggle(
      "vector-mode",
      ["rect", "ellipse", "pen"].includes(this.tool) ||
        (this.tool === "select" && ["shape", "path"].includes(l?.type)),
    );
    $(".right").classList.toggle("decal-mode", textMode || imageMode);
    $(".object-controls").classList.toggle("hidden", !object);
    $(".shape-controls").classList.toggle(
      "hidden",
      !["line", "rect", "ellipse", "pen"].includes(this.tool) &&
        !["shape", "path"].includes(l?.type),
    );
    $(".bucket-controls").classList.toggle("hidden", this.tool !== "bucket");
    $("#apply-decal").textContent = textMode
      ? "Aplicar texto como camada"
      : "Aplicar imagem como camada";
    const layerSignature = JSON.stringify([
      this.doc.selected,
      this.doc.layers.map((l) => [l.id, l.name, l.visible]),
    ]);
    if (layerSignature !== this.layerSignature) {
      this.layerSignature = layerSignature;
      const listScroll = $("#layers-list").scrollTop;
      $("#layers-list").replaceChildren();
      for (const layer of [...this.doc.layers].reverse()) {
        const row = document.createElement("div");
        row.className =
          "layer-row" + (layer.id === this.doc.selected ? " selected" : "");
        row.dataset.layerId = layer.id;
        const visible = document.createElement("input");
        visible.type = "checkbox";
        visible.checked = layer.visible;
        visible.setAttribute("aria-label", "Visibilidade de " + layer.name);
        visible.onchange = () => {
          this.doc.select(layer.id);
          this.doc.edit({ visible: visible.checked });
        };
        const select = document.createElement("button");
        select.textContent = (layer.locked ? "🔒 " : "") + layer.name;
        select.dataset.layerType = layer.type;
        select.onclick = () => {
          this.cancel();
          this.doc.select(layer.id);
          this.host.setTool("select");
          this.syncUI();
        };
        row.append(visible, select);
        $("#layers-list").append(row);
      }
      $("#layers-list").scrollTop = listScroll;
    }
    const sync = (id, v) => {
      const el = $("#" + id);
      if (document.activeElement !== el) {
        if (el.type === "checkbox") el.checked = !!v;
        else el.value = v ?? "";
      }
    };
    if (l) {
      for (const k of ["name", "blend", "opacity", "brightness", "contrast"])
        sync("layer-" + k, l[k]);
      for (const k of ["x", "y", "width", "height", "rotation"])
        sync("object-" + k, Math.round((l[k] || 0) * 100) / 100);
    }
    $("#delete-layer").disabled = !l || l.locked;
    $("#clear-layer-mask").disabled = !l?.mask;
    $("#edit-path").classList.toggle("hidden", l?.type !== "path");
    $("#object-width").disabled = l?.type === "text";
    $("#object-height").disabled = l?.type === "text";
    if (
      textMode &&
      l?.type === "text" &&
      (this.draft || this.tool === "select")
    ) {
      const fields = {
        "text-content": "text",
        "text-font": "font",
        "text-size": "fontSize",
        "text-bold": "bold",
        "text-opacity": "opacity",
        "text-stroke": "strokeWidth",
        "text-stroke-color": "strokeColor",
        "text-shadow-blur": "shadowBlur",
        "text-shadow-color": "shadowColor",
        "text-shadow-x": "shadowX",
        "text-shadow-y": "shadowY",
      };
      for (const [id, k] of Object.entries(fields)) sync(id, l[k]);
    }
    if (
      (l?.type === "shape" || l?.type === "path") &&
      (this.tool === "select" || this.editPoints)
    ) {
      sync("shape-fill", l.fill);
      sync("shape-stroke", l.strokeWidth);
    }
    if (object && this.tool === "select") {
      sync("rotation", l.rotation || 0);
      $("#rotation-out").textContent = (l.rotation || 0) + "°";
      if (l.type === "image") {
        sync(
          "scale",
          Math.max(3, Math.min(100, (l.width / this.doc.width) * 100)),
        );
        $("#scale-out").textContent =
          Math.round((l.width / this.doc.width) * 100) + "%";
      }
    }
    if (object && this.tool === "select") {
      sync("color", l.color || "#ffffff");
      $("#color-hex").textContent = value("#color").toUpperCase();
    }
    $("#selection-info").textContent = this.doc.selection
      ? "Máscara ativa: alterações limitadas à região selecionada."
      : "Sem restrição de ilha.";
    $("#undo").disabled = !this.doc.undoStack.length;
    $("#redo").disabled = !this.doc.redoStack.length;
  }
  point(uv) {
    return { x: uv.x * this.doc.width, y: (1 - uv.y) * this.doc.height };
  }
  begin(uv, hit) {
    const p = this.point(uv),
      tool = this.tool;
    if (tool === "island") {
      const target = this.target(hit, uv);
      if (!target) {
        this.host.notify(
          "Clique em uma superfície com UV da textura selecionada.",
        );
        return;
      }
      this.doc.selection = uvMask(this.doc.width, this.doc.height, [
        { mesh: target.mesh, faces: meshIsland(target.mesh, target.face) },
      ]);
      this.changed(false);
      this.host.notify(
        "Ilha UV selecionada. Use Limpar seleção para pintar fora dela.",
      );
      return;
    }
    if (tool === "bucket") {
      this.bucket(uv, hit);
      return;
    }
    if (tool === "select") {
      const l = this.doc.hit(p.x, p.y);
      if (!l) return;
      this.doc.select(l.id);
      this.doc.record();
      this.drag = { type: "move", start: p, x: l.x, y: l.y, layer: l };
      return;
    }
    if (tool === "pen") {
      this.penBegin(p);
      return;
    }
    if (tool === "text" || tool === "decal") {
      if (tool === "text" && !value("#text-content").trim()) {
        this.host.notify("Digite um texto.");
        return;
      }
      const image = this.host.getImage();
      if (tool === "decal" && !image) {
        this.host.notify("Adicione uma imagem.");
        return;
      }
      if (!this.draft) {
        const props =
          tool === "text"
            ? this.textProps()
            : {
                canvas: copy(image),
                width: (this.doc.width * num("#scale")) / 100,
                height:
                  (((this.doc.width * num("#scale")) / 100) * image.height) /
                  image.width,
                rotation: num("#rotation"),
              };
        this.draft = this.doc.layer(tool === "text" ? "text" : "image", {
          ...props,
          mask: this.doc.selection ? copy(this.doc.selection) : undefined,
        });
      }
      this.draft.x = p.x;
      this.draft.y = p.y;
      this.drag = { type: "draft" };
      this.changed(false);
      return;
    }
    if (["line", "rect", "ellipse"].includes(tool)) {
      this.draft = this.doc.layer("shape", {
        shape: tool,
        color: value("#color"),
        strokeColor: value("#color"),
        strokeWidth: tool === "line" ? num("#size") : num("#shape-stroke"),
        opacity: num("#opacity"),
        fill: $("#shape-fill").checked,
        x: p.x,
        y: p.y,
        width: 1,
        height: 1,
        mask: this.doc.selection ? copy(this.doc.selection) : undefined,
      });
      this.drag = { type: "shape", start: p };
      this.changed(false);
      return;
    }
    this.doc.record();
    this.doc.raster();
    this.drag = { type: "paint", last: p };
    this.stroke(p, p, tool === "erase");
  }
  move(uv) {
    if (!this.drag) return;
    const p = this.point(uv),
      d = this.drag;
    if (d.type === "move") {
      d.layer.x = d.x + p.x - d.start.x;
      d.layer.y = d.y + p.y - d.start.y;
      this.changed(true);
    }
    if (d.type === "draft") {
      this.draft.x = p.x;
      this.draft.y = p.y;
      this.changed(false);
    }
    if (d.type === "shape") {
      const dx = p.x - d.start.x,
        dy = p.y - d.start.y;
      Object.assign(this.draft, {
        x: (p.x + d.start.x) / 2,
        y: (p.y + d.start.y) / 2,
        width: Math.max(1, Math.abs(dx)),
        height: Math.max(1, Math.abs(dy)),
        lineSign: Math.sign(dx * dy) || 1,
        lineDX: dx,
        lineDY: dy,
      });
      this.changed(false);
    }
    if (d.type === "paint") {
      if (
        Math.hypot(p.x - d.last.x, p.y - d.last.y) <
        Math.max(this.doc.width, this.doc.height) * 0.1
      )
        this.stroke(d.last, p, this.tool === "erase");
      else this.stroke(p, p, this.tool === "erase");
      d.last = p;
    }
    if (d.type === "pen") {
      const node = d.node;
      node.outX = p.x;
      node.outY = p.y;
      node.inX = 2 * node.x - p.x;
      node.inY = 2 * node.y - p.y;
      this.penPreview();
    }
    if (d.type === "node") {
      const n = d.layer.points[d.index],
        a = (-(d.layer.rotation || 0) * Math.PI) / 180,
        dx = p.x - d.layer.x,
        dy = p.y - d.layer.y,
        q = {
          x: dx * Math.cos(a) - dy * Math.sin(a),
          y: dx * Math.sin(a) + dy * Math.cos(a),
        };
      if (d.handle === "node") {
        const mx = q.x - n.x,
          my = q.y - n.y;
        for (const k of ["x", "inX", "outX"]) n[k] += mx;
        for (const k of ["y", "inY", "outY"]) n[k] += my;
      } else {
        n[d.handle + "X"] = q.x;
        n[d.handle + "Y"] = q.y;
      }
      this.changed(true);
    }
  }
  stroke(a, b, erase) {
    if (!this.paintPatch)
      this.paintPatch = canvas(this.doc.width, this.doc.height);
    if (this.paintPatch.width !== this.doc.width)
      this.paintPatch.width = this.doc.width;
    if (this.paintPatch.height !== this.doc.height)
      this.paintPatch.height = this.doc.height;
    const patch = this.paintPatch,
      c = patch.getContext("2d");
    c.clearRect(0, 0, patch.width, patch.height);
    c.globalCompositeOperation = "source-over";
    const r = num("#size") / 2,
      soft = num("#softness") / 100,
      steps = Math.max(
        1,
        Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, r * 0.35)),
      );
    c.globalAlpha = num("#opacity") / 100;
    for (let i = 1; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps,
        y = a.y + ((b.y - a.y) * i) / steps;
      let fill = erase ? "#ffffff" : value("#color");
      if (soft && !erase) {
        const g = c.createRadialGradient(
          x,
          y,
          Math.max(0.01, r * (1 - soft)),
          x,
          y,
          r,
        );
        g.addColorStop(0, fill);
        g.addColorStop(1, fill + "00");
        fill = g;
      }
      c.fillStyle = fill;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    this.doc.patch(patch, erase);
    this.changed(true);
  }
  end() {
    if (this.drag?.type === "shape") this.apply(false);
    if (this.drag?.type === "node") {
      const l = this.drag.layer,
        all = l.points.flatMap((p) => [
          { x: p.x, y: p.y },
          { x: p.inX, y: p.inY },
          { x: p.outX, y: p.outY },
        ]),
        minX = Math.min(...all.map((p) => p.x)),
        maxX = Math.max(...all.map((p) => p.x)),
        minY = Math.min(...all.map((p) => p.y)),
        maxY = Math.max(...all.map((p) => p.y)),
        cx = (minX + maxX) / 2,
        cy = (minY + maxY) / 2,
        a = ((l.rotation || 0) * Math.PI) / 180;
      l.x += cx * Math.cos(a) - cy * Math.sin(a);
      l.y += cx * Math.sin(a) + cy * Math.cos(a);
      l.width = Math.max(1, maxX - minX);
      l.height = Math.max(1, maxY - minY);
      for (const p of l.points) {
        for (const key of ["x", "inX", "outX"]) p[key] -= cx;
        for (const key of ["y", "inY", "outY"]) p[key] -= cy;
      }
      this.changed(true);
    }
    this.drag = null;
    this.syncUI();
  }
  apply(notify = true) {
    if (!this.draft) {
      if (notify)
        this.host.notify("Posicione o texto ou a imagem antes de aplicar.");
      return;
    }
    const l = this.draft;
    this.draft = null;
    try {
      this.doc.add(l.type, { ...l, id: crypto.randomUUID() });
    } catch (err) {
      this.draft = l;
      this.changed(false);
      throw err;
    }
    this.changed(true);
    if (notify) {
      this.host.setTool("brush");
      this.host.notify(
        "Camada aplicada. Selecione-a na lista para mover ou editar novamente.",
      );
    }
  }
  cancel() {
    if (
      this.drag?.type === "paint" ||
      this.drag?.type === "move" ||
      this.drag?.type === "node"
    ) {
      const prior = this.doc.undoStack.pop();
      if (prior) Object.assign(this.doc, prior);
      this.doc.lastRecord = "";
      this.drag = null;
    }
    this.draft = null;
    this.pen = null;
    this.drag = null;
    if (this.doc) this.changed(false);
  }
  target(hit, uv) {
    return hit?.mesh ? hit : findUVFace(this.host.meshes(), uv);
  }
  bucket(uv, hit) {
    const p = this.point(uv),
      col = value("#color"),
      rgba = [
        parseInt(col.slice(1, 3), 16),
        parseInt(col.slice(3, 5), 16),
        parseInt(col.slice(5, 7), 16),
        Math.round((num("#opacity") * 255) / 100),
      ];
    let patch;
    if (value("#bucket-mode") === "material") {
      const target = this.target(hit, uv);
      if (!target) {
        this.host.notify("Material não encontrado.");
        return;
      }
      const meshes = this.host
        .meshes()
        .filter(
          (m) => m.userData.shaderIndex === target.mesh.userData.shaderIndex,
        );
      patch = canvas(this.doc.width, this.doc.height);
      const c = patch.getContext("2d");
      c.fillStyle = col;
      c.globalAlpha = rgba[3] / 255;
      c.fillRect(0, 0, patch.width, patch.height);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "destination-in";
      c.drawImage(
        uvMask(
          patch.width,
          patch.height,
          meshes.map((mesh) => ({ mesh, faces: allFaces(mesh) })),
        ),
        0,
        0,
      );
    } else
      patch = floodPatch(
        this.host.textureCanvas,
        p.x,
        p.y,
        rgba,
        Math.max(0, Math.min(255, num("#bucket-tolerance"))),
        this.doc.selection,
      );
    this.doc.record();
    this.doc.patch(patch);
    this.changed(true);
  }
  penBegin(p) {
    if (this.editPoints && this.doc.active?.type === "path") {
      const l = this.doc.active,
        a = (-(l.rotation || 0) * Math.PI) / 180,
        dx = p.x - l.x,
        dy = p.y - l.y,
        q = {
          x: dx * Math.cos(a) - dy * Math.sin(a),
          y: dx * Math.sin(a) + dy * Math.cos(a),
        },
        radius = Math.max(6, this.doc.width / 100);
      for (let i = 0; i < l.points.length; i++)
        for (const [name, x, y] of [
          ["node", l.points[i].x, l.points[i].y],
          ["in", l.points[i].inX, l.points[i].inY],
          ["out", l.points[i].outX, l.points[i].outY],
        ])
          if (Math.hypot(q.x - x, q.y - y) < radius) {
            this.doc.record();
            this.drag = { type: "node", layer: l, index: i, handle: name };
            return;
          }
      return;
    }
    if (!this.pen) this.pen = [];
    if (this.pen.length >= 512) throw Error("Limite de 512 nós.");
    const node = { x: p.x, y: p.y, inX: p.x, inY: p.y, outX: p.x, outY: p.y };
    this.pen.push(node);
    this.drag = { type: "pen", node };
    this.penPreview();
  }
  penPreview() {
    this.draft = this.doc.layer("path", {
      x: 0,
      y: 0,
      points: this.pen.map((p) => ({ ...p })),
      strokeWidth: num("#shape-stroke") || 8,
      strokeColor: value("#color"),
      color: value("#color"),
      fill: $("#shape-fill").checked,
      mask:
        this.draft?.mask ||
        (this.doc.selection ? copy(this.doc.selection) : undefined),
    });
    this.changed(false);
  }
  finishPath(closed) {
    if (!this.pen || this.pen.length < 2) {
      this.host.notify("Adicione pelo menos dois nós à curva.");
      return;
    }
    const points = this.pen,
      all = points.flatMap((p) => [
        { x: p.x, y: p.y },
        { x: p.inX, y: p.inY },
        { x: p.outX, y: p.outY },
      ]),
      minX = Math.min(...all.map((p) => p.x)),
      maxX = Math.max(...all.map((p) => p.x)),
      minY = Math.min(...all.map((p) => p.y)),
      maxY = Math.max(...all.map((p) => p.y)),
      x = (minX + maxX) / 2,
      y = (minY + maxY) / 2;
    Object.assign(this.draft, {
      x,
      y,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      closed,
      points: points.map((p) => ({
        x: p.x - x,
        y: p.y - y,
        inX: p.inX - x,
        inY: p.inY - y,
        outX: p.outX - x,
        outY: p.outY - y,
      })),
    });
    this.pen = null;
    this.drag = null;
    this.apply(false);
    this.host.setTool("select");
  }
  overlay() {
    const c = this.overlayCanvas;
    if (!c || (this.host.isUV && !this.host.isUV())) return;
    const doc = this.doc;
    if (c.width !== doc.width) c.width = doc.width;
    if (c.height !== doc.height) c.height = doc.height;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    if (doc.selection) {
      ctx.drawImage(doc.selection, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = "#e326362e";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = "source-over";
    }
    const l = this.draft || doc.active;
    if (editable(l)) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(((l.rotation || 0) * Math.PI) / 180);
      ctx.strokeStyle = "#ff6373";
      ctx.lineWidth = Math.max(1, doc.width / 500);
      ctx.setLineDash([doc.width / 100, doc.width / 150]);
      ctx.strokeRect(
        -(l.width || 1) / 2,
        -(l.height || 1) / 2,
        l.width || 1,
        l.height || 1,
      );
      ctx.setLineDash([]);
      if (l.type === "path") {
        ctx.fillStyle = "#ffffff";
        for (const p of l.points) {
          ctx.beginPath();
          ctx.moveTo(p.inX, p.inY);
          ctx.lineTo(p.outX, p.outY);
          ctx.stroke();
          for (const [x, y] of [
            [p.x, p.y],
            [p.inX, p.inY],
            [p.outX, p.outY],
          ])
            ctx.fillRect(
              x - doc.width / 250,
              y - doc.width / 250,
              doc.width / 125,
              doc.width / 125,
            );
        }
      }
      ctx.restore();
    }
  }
}
