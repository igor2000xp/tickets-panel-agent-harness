import data from './tickets.json'

export type TicketStatus = 'new' | 'in_progress' | 'closed'

export interface Ticket {
  id: number
  title: string
  customer: string
  status: TicketStatus
  /** Дата создания в формате ISO */
  createdAt: string
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  closed: 'Закрыто',
}

/** Демо-данные лежат в tickets.json */
export const tickets = data as Ticket[]
