export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)

  return next
}
