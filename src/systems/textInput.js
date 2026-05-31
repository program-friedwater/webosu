export function createBeatmapTextInput(app) {
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.spellcheck = false;
  input.dataset.mizosuTextInput = "beatmap-search";
  input.style.position = "fixed";
  input.style.left = "0";
  input.style.top = "0";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.style.zIndex = "-1";

  input.addEventListener("input", () => {
    app.beatmapQuery = input.value.slice(0, 72);
  });

  document.body.append(input);

  function focusBeatmapSearch() {
    input.value = app.beatmapQuery;
    input.focus({ preventScroll: true });
  }

  function blurBeatmapSearch() {
    input.blur();
  }

  return {
    element: input,
    focusBeatmapSearch,
    blurBeatmapSearch,
  };
}
