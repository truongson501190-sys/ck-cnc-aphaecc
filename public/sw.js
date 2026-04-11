if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("SW OK"))
      .catch(() => console.log("SW lỗi"));
  });
}