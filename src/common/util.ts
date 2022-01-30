export function reorderList<T = any>(
  array: T[],
  index: number,
  offset: number
) {
  if (
    !offset ||
    index < 0 ||
    index >= array.length ||
    index + offset < 0 ||
    index + offset >= array.length
  )
    return false;
  const items = array.splice(index, 1);
  array.splice(index + offset, 0, ...items);
  return true;
}
