function abrirVideo(nombreArchivo) {
  const ruta = `videos-instructivos/${nombreArchivo}`;
  const video = document.getElementById("videoPlayer");
  video.src = ruta;
  document.getElementById("modalVideo").classList.remove("hidden");
  video.play();
}

function cerrarVideo() {
  const video = document.getElementById("videoPlayer");
  video.pause();
  video.currentTime = 0; // reinicia el video
  document.getElementById("modalVideo").classList.add("hidden");
}