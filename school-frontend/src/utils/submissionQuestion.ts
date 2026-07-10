const IMG_MARKER = '|||IMG|||';
const SRC_MARKER = '|||SRC|||';

export function buildSubmissionQuestion(block: {
  question?: string;
  questionImage?: string;
  image?: string;
  source?: string;
  type?: string;
}): string {
  const img = block.questionImage || block.image;
  let q = block.question || '';
  if (img) q = `${q}${IMG_MARKER}${img}`;
  const isEssay = block.type === 'essay' || block.type === 'essay_final';
  if (isEssay && block.source?.trim()) {
    q = `${q}${SRC_MARKER}${block.source.trim()}`;
  }
  return q;
}

export function parseSubmissionQuestion(raw: string | null | undefined): {
  questionText: string;
  questionImage: string | null;
  sourceText: string | null;
} {
  const value = String(raw || '');
  let rest = value;
  let sourceText: string | null = null;
  const srcIdx = rest.indexOf(SRC_MARKER);
  if (srcIdx >= 0) {
    sourceText = rest.slice(srcIdx + SRC_MARKER.length).trim() || null;
    rest = rest.slice(0, srcIdx);
  }
  const imgIdx = rest.indexOf(IMG_MARKER);
  if (imgIdx >= 0) {
    return {
      questionText: rest.slice(0, imgIdx),
      questionImage: rest.slice(imgIdx + IMG_MARKER.length) || null,
      sourceText,
    };
  }
  return { questionText: rest, questionImage: null, sourceText };
}
