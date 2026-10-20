import { describe, expect, it } from 'vitest'
import type { Ticket } from '../data/tickets'
import { sortByNewest } from './sortTickets'

const make = (id: number, createdAt: string): Ticket => ({
  id,
  title: `Обращение ${id}`,
  customer: 'Тест',
  status: 'new',
  createdAt,
})

describe('sortByNewest', () => {
  it('ставит свежие обращения первыми', () => {
    const list = [
      make(1, '2026-09-01T10:00:00Z'),
      make(2, '2026-09-03T10:00:00Z'),
      make(3, '2026-09-02T10:00:00Z'),
    ]

    expect(sortByNewest(list).map((t) => t.id)).toEqual([2, 3, 1])
  })

  it('не меняет исходный массив', () => {
    const list = [make(1, '2026-09-01T10:00:00Z'), make(2, '2026-09-03T10:00:00Z')]

    sortByNewest(list)

    expect(list.map((t) => t.id)).toEqual([1, 2])
  })
})
