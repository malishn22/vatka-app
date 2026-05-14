export function useToggleSelection(
  selectedIds: number[],
  setSelectedIds: (ids: number[]) => void
) {
  const toggle = (id: number, additive: boolean) => {
    if (additive) {
      setSelectedIds(
        selectedIds.includes(id)
          ? selectedIds.filter(x => x !== id)
          : [...selectedIds, id]
      );
    } else {
      setSelectedIds(selectedIds.length === 1 && selectedIds[0] === id ? [] : [id]);
    }
  };
  return { toggle };
}
