const root = document.documentElement;
const toggle = document.getElementById("theme-toggle") as HTMLButtonElement;
const dark = matchMedia("(prefers-color-scheme: dark)");

function current() {
  return root.dataset.theme || (dark.matches ? "dark" : "light");
}

function render() {
  const next = current() === "dark" ? "light" : "dark";
  toggle.dataset.next = next;
  toggle.setAttribute("aria-label", `Switch to ${next} mode`);
}

function apply(next: string) {
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {}
  render();
}

toggle.hidden = false;
toggle.addEventListener("click", () => {
  const next = current() === "dark" ? "light" : "dark";
  const animate =
    typeof document.startViewTransition === "function" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate) return apply(next);

  // Expand the new theme as a circle from the button.
  const box = toggle.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  const transition = document.startViewTransition(() => apply(next));
  transition.ready.then(() =>
    root.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 600,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    ),
  );
});
dark.addEventListener("change", render);
render();

export {};
