// fetch(`https://${GetParentResourceName()}/close`) in a comment is not a call
const resource = GetParentResourceName();

window.addEventListener("message", (e) => {
  if (e.data.action === "open") document.body.style.display = "block";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.body.style.display = "none";
    fetch(`https://${resource}/close`, { method: "POST", body: "{}" });
  }
});

const toast = (el) => {
  el.style.color = "#f87171";
  el.className = "text-red-400";
  el.dataset.glow = "drop-shadow-[0_1px_1px_rgb(220_38_38/0.5)]";
};
