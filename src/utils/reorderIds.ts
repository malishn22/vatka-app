export function reorderIds(
  ids: number[],
  fromId: number,
  targetId: number,
  position: 'above' | 'below',
): number[] {
  const result = ids.filter((id) => id !== fromId);
  const targetIdx = result.indexOf(targetId);
  if (targetIdx === -1) return ids;
  const insertIdx = position === 'below' ? targetIdx + 1 : targetIdx;
  result.splice(insertIdx, 0, fromId);
  return result;
}
