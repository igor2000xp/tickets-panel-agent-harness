import type { Ticket } from '../data/tickets'
import { StatusBadge } from './StatusBadge'

interface Props {
  tickets: Ticket[]
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

export function TicketList({ tickets }: Props) {
  return (
    <ul className="tickets">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="ticket">
          <span className="ticket-id">#{ticket.id}</span>
          <div className="ticket-main">
            <span className="ticket-title">{ticket.title}</span>
            <span className="ticket-customer">{ticket.customer}</span>
          </div>
          <time className="ticket-date" dateTime={ticket.createdAt}>
            {dateFormat.format(new Date(ticket.createdAt))}
          </time>
          <StatusBadge status={ticket.status} />
        </li>
      ))}
    </ul>
  )
}
