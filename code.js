function start() {
  const scale = { "1x": 1, "2x": 2, "3x": 3, "4x": 4 }[figma.command] || 1;
  const slides = [];
  for (const frame of figma.currentPage.selection) {
    if (frame.type !== "FRAME") continue;
    const match = frame.name.match(/\d+/);
    if (!match) return figma.closePlugin("「" + frame.name + "」缺少编号，请先给 Frame 编号。");
    const bounds = frame.absoluteBoundingBox;
    if (!bounds) return figma.closePlugin("无法读取「" + frame.name + "」的画布范围。");
    slides.push({ frame, bounds, digits: match[0].replace(/^0+(?=\d)/, "") });
  }
  if (!slides.length) return figma.closePlugin("请先选中要导出的 Frame。");
  slides.sort((a, b) => a.digits.length - b.digits.length ||
    (a.digits < b.digits ? -1 : a.digits > b.digits ? 1 : 0) ||
    a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x || a.frame.id.localeCompare(b.frame.id));
  let index = 0;
  let busy = false;
  figma.showUI(__html__, { width: 330, height: 145, title: "Frame 转图片 PPT · " + scale + "×" });
  figma.ui.onmessage = async msg => {
    if (msg.type === "close") return figma.closePlugin();
    if (msg.type !== "next" || busy || index >= slides.length) return;
    busy = true;
    const frame = slides[index].frame;
    try {
      figma.ui.postMessage({type: "progress", index: index + 1, total: slides.length, name: frame.name});
      const bytes = await frame.exportAsync({format: "JPG", contentsOnly: true, useAbsoluteBounds: true,
        constraint: {type: "SCALE", value: scale}});
      index++;
      figma.ui.postMessage({type: "slide", name: frame.name, data: figma.base64Encode(bytes),
        expectedWidth: slides[index - 1].bounds.width * scale,
        expectedHeight: slides[index - 1].bounds.height * scale,
        last: index === slides.length, title: figma.root.name + " - " + figma.currentPage.name + " - " + scale + "x"});
    } catch (error) {
      figma.ui.postMessage({type: "error", text: "导出「" + frame.name + "」失败：" + error.message});
    } finally { busy = false; }
  };
}
start();
