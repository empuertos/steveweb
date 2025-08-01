hls.on(Hls.Events.ERROR, function (event, data) {
  console.warn("hls.js error", data);
  errorsEl.textContent = `Error: ${data.type} / ${data.details} (fatal=${data.fatal})`;
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        errorsEl.textContent += " — network issue, retrying...";
        hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        errorsEl.textContent += " — media decode issue, attempting recover...";
        hls.recoverMediaError();
        break;
      default:
        errorsEl.textContent += " — cannot recover.";
        hls.destroy();
        break;
    }
  }
});
