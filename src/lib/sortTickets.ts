import type { Ticket } from '../data/tickets'

/** Возвращает новый массив: сначала самые свежие обращения. Исходный массив не меняет. */
export function sortByNewest(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
