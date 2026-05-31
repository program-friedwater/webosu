import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants.js";
import { clamp } from "../utils/math.js";

export function createInput(canvas, pointer, app, renderer) {
  function updatePointerFromEvent(event) {
    const rawActive = app.rawInputEnabled && document.pointerLockElement === canvas;
    if (rawActive) {
      if (event.type === "pointermove") {
        pointer.x = clamp(pointer.x + event.movementX, 0, LOGICAL_WIDTH);
        pointer.y = clamp(pointer.y + event.movementY, 0, LOGICAL_HEIGHT);
      }
      return;
    }

    const point = renderer.toLogicalPoint(event);
    pointer.x = point.x;
    pointer.y = point.y;
  }

  async function enableRawInput() {
    app.rawInputEnabled = true;
    if (canvas.requestPointerLock) {
      try {
        await canvas.requestPointerLock({ unadjustedMovement: true });
      } catch {
        await canvas.requestPointerLock();
      }
    }
  }

  function disableRawInput() {
    app.rawInputEnabled = false;
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }

  function toggleRawInput() {
    if (app.rawInputEnabled) {
      disableRawInput();
    } else {
      enableRawInput();
    }
  }

  canvas.addEventListener("pointerenter", () => {
    pointer.inside = true;
  });

  canvas.addEventListener("pointerleave", () => {
    if (document.pointerLockElement !== canvas) {
      pointer.inside = false;
      pointer.down = false;
    }
  });

  canvas.addEventListener("pointermove", updatePointerFromEvent);

  canvas.addEventListener("pointerdown", (event) => {
    updatePointerFromEvent(event);
    pointer.down = true;
  });

  document.addEventListener("pointerlockchange", () => {
    app.rawInputLocked = document.pointerLockElement === canvas;
    pointer.inside = app.rawInputLocked || pointer.inside;
  });

  return {
    updatePointerFromEvent,
    toggleRawInput,
  };
}
