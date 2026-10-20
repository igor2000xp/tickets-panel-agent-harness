import { STATUS_LABELS, type TicketStatus } from '../data/tickets'

interface Props {
  status: TicketStatus
}

export function StatusBadge({ status }: Props) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
}
