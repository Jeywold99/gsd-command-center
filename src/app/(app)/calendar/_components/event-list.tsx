import EventItem from "./event-item";
import type { CalEvent, ClientOpt } from "./event-modal";

// Agenda list under the month grid. Each row opens the details/edit modal.
export default function EventList({
  events,
  clients,
}: {
  events: CalEvent[];
  clients: ClientOpt[];
}) {
  if (events.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-10 text-center">
        <p className="text-black/50">No events scheduled. Add one with “New Event”.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] divide-y divide-black/[0.05]">
      {events.map((e) => (
        <EventItem key={e.id} event={e} clients={clients} variant="row" />
      ))}
    </div>
  );
}
