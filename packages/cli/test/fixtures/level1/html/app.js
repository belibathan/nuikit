window.addEventListener("message", (e) => {
  const { action, data } = e.data;
  if (action === "garage:open") document.body.dataset.open = "true";
});

document.querySelector(".primary").addEventListener("click", () => {
  fetch(`https://${GetParentResourceName()}/garage:close`, { method: "POST", body: "{}" });
});
