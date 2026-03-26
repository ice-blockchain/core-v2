export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length === 0 || vectorB.length === 0) {
    return 0;
  }

  const { dotProduct, magnitudeA, magnitudeB } = computeDotAndMagnitudes(vectorA, vectorB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

function computeDotAndMagnitudes(vectorA: number[], vectorB: number[]) {
  let dotProduct = 0;
  let sumSquaresA = 0;
  let sumSquaresB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const a = vectorA[i]!;
    const b = vectorB[i]!;
    dotProduct += a * b;
    sumSquaresA += a * a;
    sumSquaresB += b * b;
  }

  return {
    dotProduct,
    magnitudeA: Math.sqrt(sumSquaresA),
    magnitudeB: Math.sqrt(sumSquaresB),
  };
}
