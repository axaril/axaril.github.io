const splashes = [
  "Learning how to setup GPU pipelines...",
  "Debugging my personal death ray code...",
  "Copy and pasting from Stack Overflow...",
  "Testing on production environment...",
  "Crying because concurrent programming is hard...",
  "Bashing my head to understand OS internals...",
  "Evangelizing the Rust programming language...",
  "Voodoo programming...",
  "Wishing I have time for art instead...",
  "Reaching to you about your car's extended warranty...",
  "Becoming the best that there ever was...",
  "Wishing for a thought-to-program mind reading machine...",
  "Adding gotos to my code and discovering velociraptors...",
  "Trying to exit vim...",
  "Programming using a magnetized needle and a steady hand...",
  "Using butterflies, eddy currents, and cosmic rays...",
  "Segmentation fault (core dumped)",
  "Waiting for my code to compile...",
  "Waiting to reach my Ballmer's peak...",
  "Finding what DenverCoder9 saw on that fateful day...",
  "Looking at the same manual page for the 10th time today...",
];

const splash = document.getElementById("splash");

// Fisher-Yates, so each visit shows the lines in a different order.
const shuffled = [...splashes];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

function sleep(ms: number) {
  return new Promise((done) => setTimeout(done, ms));
}

// Types each line out, holds it, then erases it.
async function run(el: HTMLElement) {
  for (let i = 0; ; i++) {
    const line = shuffled[i % shuffled.length];
    for (let n = 1; n <= line.length; n++) {
      el.textContent = line.slice(0, n);
      await sleep(28);
    }
    await sleep(2400);
    for (let n = line.length - 1; n >= 0; n--) {
      el.textContent = line.slice(0, n);
      await sleep(10);
    }
    await sleep(300);
  }
}

if (splash) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    splash.textContent = shuffled[0];
  } else {
    run(splash);
  }
}

export {};
