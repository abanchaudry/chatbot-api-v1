import { ContentBlock, PageTriageResult } from "../types.js";

export function mergePageBlocks(
  triage: PageTriageResult,
  nativeBlocks: ContentBlock[],
  visionBlocks?: ContentBlock[]
): ContentBlock[] {
  if (triage.category === "text-native") {
    return sortBlocksByPosition(nativeBlocks);
  }

  if (triage.category === "image-only") {
    return sortBlocksByPosition(visionBlocks || nativeBlocks);
  }

  if (!visionBlocks || visionBlocks.length === 0) {
    return sortBlocksByPosition(nativeBlocks);
  }

  const visualTypes = new Set(["table", "figure", "chart", "equation"]);
  const visualVisionBlocks = visionBlocks.filter((b) => visualTypes.has(b.type));

  const filteredNativeBlocks = nativeBlocks.filter((nativeBlock) => {
    if (!nativeBlock.boundingBox) return true;

    for (const visBlock of visualVisionBlocks) {
      if (!visBlock.boundingBox) continue;

      if (calculateOverlapRatio(nativeBlock.boundingBox, visBlock.boundingBox) > 0.4) {
        return false;
      }
    }
    return true;
  });

  const merged = [...filteredNativeBlocks, ...visualVisionBlocks];
  return sortBlocksByPosition(merged);
}

function sortBlocksByPosition(blocks: ContentBlock[]): ContentBlock[] {
  return [...blocks].sort((a, b) => {
    const yA = a.boundingBox ? a.boundingBox[0] : 0;
    const yB = b.boundingBox ? b.boundingBox[0] : 0;
    if (Math.abs(yA - yB) < 15) {
      const xA = a.boundingBox ? a.boundingBox[1] : 0;
      const xB = b.boundingBox ? b.boundingBox[1] : 0;
      return xA - xB;
    }
    return yA - yB;
  });
}

function calculateOverlapRatio(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const [yminA, xminA, ymaxA, xmaxA] = boxA;
  const [yminB, xminB, ymaxB, xmaxB] = boxB;

  const interYmin = Math.max(yminA, yminB);
  const interXmin = Math.max(xminA, xminB);
  const interYmax = Math.min(ymaxA, ymaxB);
  const interXmax = Math.min(xmaxA, xmaxB);

  if (interYmax <= interYmin || interXmax <= interXmin) {
    return 0;
  }

  const interArea = (interYmax - interYmin) * (interXmax - interXmin);
  const areaA = Math.max(1, (ymaxA - yminA) * (xmaxA - xminA));
  return interArea / areaA;
}
