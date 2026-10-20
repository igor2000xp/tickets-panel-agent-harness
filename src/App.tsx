import { tickets } from './data/tickets'
import { sortByNewest } from './lib/sortTickets'
import { TicketList } from './components/TicketList'

export function App() {
  const visible = sortByNewest(tickets)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Обращения</h1>
        <span className="count">{visible.length}</span>
      </header>

      <TicketList tickets={visible} />
    </main>
  )
}
