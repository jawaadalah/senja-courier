// input.js: keyboard + mouse controls, one shared state object.
// Keyboard: Up/W throttle up, Down/S throttle down, Left/A pitch down,
// Right/D pitch up, Enter start, P pause, R restart, M mute.
// Mouse: click the on-screen buttons, or drag the throttle slider.
export function createInput() {
  return {
    keys: new Set(), pitch: 0, throttle: 0,
    clicked: null, throttleDrag: null, muted: false,
  };
}

export function bindControls(input, canvas, buttons) {
  const down = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    input.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    if (event.key === 'm' || event.key === 'M') input.muted = !input.muted;
  };
  const up = (event) => input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    input.clicked = { x, y };
    input.throttleDrag = { x, y };
  });
  window.addEventListener('mouseup', () => { input.throttleDrag = null; });
  window.addEventListener('mousemove', (event) => {
    if (!input.throttleDrag) return;
    const rect = canvas.getBoundingClientRect();
    input.throttleDrag = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  });
  return buttons;
}

/** Read the held keys into -1/0/1 pitch and throttle steps each frame. */
export function readControls(input) {
  const keys = input.keys;
  const pitchUp = keys.has('ArrowRight') || keys.has('d');
  const pitchDown = keys.has('ArrowLeft') || keys.has('a');
  const thrUp = keys.has('ArrowUp') || keys.has('w');
  const thrDown = keys.has('ArrowDown') || keys.has('s');
  input.pitch = (pitchUp ? 1 : 0) - (pitchDown ? 1 : 0);
  input.throttle = (thrUp ? 1 : 0) - (thrDown ? 1 : 0);
  input.pressedEnter = keys.has('Enter') || keys.has(' ');
  input.pressedPause = keys.has('p') || keys.has('P');
  input.pressedRestart = keys.has('r') || keys.has('R');
  return input;
}
