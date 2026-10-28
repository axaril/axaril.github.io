const splashes = [
  "Learning how to setup GPU pipelines...",
  "Debugging my personal death ray code...",
  "Crying because concurrent programming is hard...",
  "Bashing my head to understand OS internals...",
  "Evangelizing the Rust programming language...",
  "Wishing I have time for art instead...",
  "Wishing for a thought-to-program mind reading machine...",
  "Adding gotos to my code and discovering velociraptors...",
  "Programming using a magnetized needle and a steady hand...",
  "Using butterflies, eddy currents, and cosmic rays...",
  "Segmentation fault (core dumped)",
  "Finding what DenverCoder9 saw on that fateful day...",
  "Looking at the same manual page for the 10th time today...",
  "Arguing with the borrow checker...",
  "Explaining my bug to a rubber duck...",
  "Renaming a variable for the fourth time...",
  "Staring at a hex dump until it makes sense...",
  "Blaming the compiler, then myself...",
  "Leaving a TODO I will never read again...",
  "Checking if it's an off-by-one error...",
  "Reading the spec for the third time...",
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
