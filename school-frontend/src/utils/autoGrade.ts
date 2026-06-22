export const AUTO_GRADABLE_BLOCK_TYPES = new Set(['test', 'test_short', 'matching']);

export function isAutoGradableBlockType(type: string) {
  return AUTO_GRADABLE_BLOCK_TYPES.has(type);
}

export function gradeAutoBlock(block: any, selected: string[]): { isSuccess: boolean; answer: string } {
  let isSuccess = false;
  let finalAnswerString = selected.join(', ');

  if (block.type === 'test') {
    const correctOptions = Array.isArray(block.options)
      ? block.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.text)
      : [];
    isSuccess =
      correctOptions.length > 0 &&
      selected.length === correctOptions.length &&
      selected.every((val: string) => correctOptions.includes(val));
  } else if (block.type === 'test_short') {
    const userAnswer = (selected[0] || '').trim();
    finalAnswerString = userAnswer;
    if (block.ignoreTypos !== false) {
      const cleanUser = userAnswer.toLowerCase().replace(/ё/g, 'е');
      isSuccess = (block.correctAnswers || []).some(
        (ans: string) => ans.trim().toLowerCase().replace(/ё/g, 'е') === cleanUser,
      );
    } else {
      isSuccess = (block.correctAnswers || []).some((ans: string) => ans.trim() === userAnswer);
    }
  } else if (block.type === 'matching') {
    const userAnswersMap: Record<string, string> = {};
    selected.forEach((s: string) => {
      const parts = s.split('|||');
      if (parts.length === 2) userAnswersMap[parts[0]] = parts[1].trim();
    });

    isSuccess = (block.pairs || []).every((pair: any) => {
      const studentAns = (userAnswersMap[pair.left] || '').toLowerCase().trim();
      const correctAns = (pair.right || '').toLowerCase().trim();
      return studentAns === correctAns;
    });
    finalAnswerString = Object.entries(userAnswersMap)
      .map(([k, v]) => `${k} - ${v}`)
      .join(', ');
  }

  return { isSuccess, answer: finalAnswerString };
}
