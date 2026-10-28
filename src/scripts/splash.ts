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
if (splash) splash.textContent = splashes[Math.floor(Math.random() * splashes.length)];

export {};
