import { ContentBlock, PageBlock } from "../types.js";

export function spatialDAGTopologicalSortPages(pages: PageBlock[]): PageBlock[] {
  return pages.map((page) => ({
    pageNumber: page.pageNumber,
    blocks: sortPageBlocksWithSpatialDAG(page.blocks),
  }));
}

export function sortPageBlocksWithSpatialDAG(blocks: ContentBlock[]): ContentBlock[] {
  if (blocks.length <= 1) return [...blocks];

  const n = blocks.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  const inDegree: number[] = new Array(n).fill(0);

  // Build DAG Directed Edges (i -> j means block i precedes block j in reading order)
  for (let i = 0; i < n; i++) {
    const boxA = blocks[i].boundingBox || [0, 0, 100, 100];
    const [yminA, xminA, ymaxA, xmaxA] = boxA;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const boxB = blocks[j].boundingBox || [0, 0, 100, 100];
      const [yminB, xminB, ymaxB, xmaxB] = boxB;

      // 1. Column-aware precedence (if in different horizontal columns)
      const isColumnLeft = xmaxA <= xminB + 50 && (yminA < ymaxB && ymaxA > yminB);
      const isClearlyAbove = ymaxA <= yminB + 10 && Math.abs(xminA - xminB) < 400;

      if (isClearlyAbove || isColumnLeft) {
        adj[i].push(j);
        inDegree[j]++;
      }
    }
  }

  // Kahn's Topological Sort algorithm
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const resultIndices: number[] = [];
  while (queue.length > 0) {
    // Sort queue elements by ymin primary, xmin secondary for stable tie-breaking
    queue.sort((a, b) => {
      const bA = blocks[a].boundingBox || [0, 0, 0, 0];
      const bB = blocks[b].boundingBox || [0, 0, 0, 0];
      if (Math.abs(bA[0] - bB[0]) < 15) return bA[1] - bB[1];
      return bA[0] - bB[0];
    });

    const curr = queue.shift()!;
    resultIndices.push(curr);

    for (const neighbor of adj[curr]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Fallback if cycles existed
  if (resultIndices.length < n) {
    const remaining = Array.from({ length: n }, (_, i) => i).filter((i) => !resultIndices.includes(i));
    remaining.sort((a, b) => {
      const bA = blocks[a].boundingBox || [0, 0, 0, 0];
      const bB = blocks[b].boundingBox || [0, 0, 0, 0];
      return bA[0] - bB[0] || bA[1] - bB[1];
    });
    resultIndices.push(...remaining);
  }

  return resultIndices.map((idx) => blocks[idx]);
}
