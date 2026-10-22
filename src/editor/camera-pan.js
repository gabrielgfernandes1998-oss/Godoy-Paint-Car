import { Vector3 } from "three";

export function isEditingField(target) {
  return Boolean(
    target?.closest?.(
      "input, textarea, select, [contenteditable]:not([contenteditable=false])",
    ),
  );
}

// Translate both ends of the view along the screen axes, preserving the orbit
// pivot's distance and the camera's orientation in perspective and ortho views.
export class CameraPan {
  constructor({
    controls,
    getCamera,
    enabled,
    target = window,
    page = document,
  }) {
    this.keys = new Set();
    this.controls = controls;
    this.getCamera = getCamera;
    this.enabled = enabled;
    this.page = page;
    this.offset = new Vector3();
    this.up = new Vector3();
    const clear = () => this.keys.clear();
    target.addEventListener("keydown", (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isEditingField(event.target)
      ) {
        clear();
        return;
      }
      const key = event.key.toLowerCase();
      if (!"wasd".includes(key) || key.length !== 1 || !this.enabled()) return;
      event.preventDefault();
      this.keys.add(key);
    });
    target.addEventListener("keyup", (event) =>
      this.keys.delete(event.key.toLowerCase()),
    );
    target.addEventListener("blur", clear);
    page.addEventListener("visibilitychange", clear);
    page.addEventListener("focusin", clear);
  }

  update(delta) {
    if (
      !this.enabled() ||
      isEditingField(this.page.activeElement) ||
      this.page.hidden
    ) {
      this.keys.clear();
      return;
    }
    const x = Number(this.keys.has("d")) - Number(this.keys.has("a"));
    const y = Number(this.keys.has("w")) - Number(this.keys.has("s"));
    if (!x && !y) return;
    const camera = this.getCamera();
    const span = camera.isOrthographicCamera
      ? (camera.top - camera.bottom) / camera.zoom
      : (2 *
          camera.position.distanceTo(this.controls.target) *
          Math.tan((camera.fov * Math.PI) / 360)) /
        camera.zoom;
    camera.updateMatrixWorld();
    this.offset.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(x);
    this.up.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(y);
    this.offset
      .add(this.up)
      .normalize()
      .multiplyScalar(span * 0.55 * Math.min(Math.max(delta, 0), 0.05));
    camera.position.add(this.offset);
    this.controls.target.add(this.offset);
  }
}
