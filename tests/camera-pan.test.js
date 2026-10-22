import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, OrthographicCamera, Vector3 } from "three";
import { CameraPan } from "../src/editor/camera-pan.js";

function setup(camera = new PerspectiveCamera(40, 1, 0.01, 100)) {
  camera.position.set(0, 0, 5);
  const controls = { target: new Vector3() };
  const target = new EventTarget(),
    page = new EventTarget();
  page.hidden = false;
  let enabled = true;
  const pan = new CameraPan({
    controls,
    getCamera: () => camera,
    enabled: () => enabled,
    target,
    page,
  });
  const key = (name, type = "keydown", modifiers = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { key: name, ...modifiers });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return {
    pan,
    camera,
    controls,
    target,
    page,
    key,
    disable: () => (enabled = false),
  };
}

test("WASD translates camera and orbit pivot along screen axes without rotation or distance changes", () => {
  for (const [key, axis, sign] of [
    ["w", "y", 1],
    ["s", "y", -1],
    ["a", "x", -1],
    ["d", "x", 1],
  ]) {
    const s = setup(),
      rotation = s.camera.quaternion.clone();
    assert(s.key(key));
    s.pan.update(0.02);
    assert(s.camera.position[axis] * sign > 0);
    assert(s.camera.quaternion.equals(rotation));
    assert(
      Math.abs(s.camera.position.distanceTo(s.controls.target) - 5) < 1e-10,
    );
    const pos = s.camera.position.clone();
    s.key(key, "keyup");
    s.pan.update(0.02);
    assert(s.camera.position.equals(pos));
  }
});

test("orthographic roof camera uses screen up and speed follows zoom; diagonals and frame rates stay consistent", () => {
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.01, 100),
    s = setup(camera);
  camera.position.set(0, 5, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  s.key("w");
  s.pan.update(0.02);
  assert(camera.position.z < 0);
  const movement = s.controls.target.length();
  camera.zoom = 2;
  s.controls.target.set(0, 0, 0);
  s.pan.update(0.02);
  assert(Math.abs(s.controls.target.length() - movement / 2) < 1e-10);
  const a = setup(),
    b = setup(),
    c = setup();
  a.key("d");
  b.key("d");
  c.key("d");
  c.key("w");
  for (let i = 0; i < 100; i++) a.pan.update(0.01);
  for (let i = 0; i < 50; i++) b.pan.update(0.02);
  for (let i = 0; i < 100; i++) c.pan.update(0.01);
  assert(a.controls.target.distanceTo(b.controls.target) < 1e-10);
  assert(
    Math.abs(a.controls.target.length() - c.controls.target.length()) < 1e-10,
  );
});

test("blur, focus, hidden page, editing fields and inactive view stop held movement; modifiers remain available", () => {
  for (const stop of [
    (s) => s.target.dispatchEvent(new Event("blur")),
    (s) => s.page.dispatchEvent(new Event("focusin")),
    (s) => (s.page.hidden = true),
    (s) => (s.page.activeElement = { closest: () => true }),
    (s) => s.disable(),
  ]) {
    const s = setup();
    s.key("w");
    stop(s);
    s.pan.update(0.02);
    assert.equal(s.controls.target.length(), 0);
  }
  const s = setup();
  for (const modifier of ["ctrlKey", "metaKey", "altKey"])
    assert.equal(s.key("a", "keydown", { [modifier]: true }), false);
  s.pan.update(0.02);
  assert.equal(s.controls.target.length(), 0);
});
