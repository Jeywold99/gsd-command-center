import EventItem from "./event-item";
import type { CalEvent, ClientOpt, UserOpt } from "./event-modal";

// Agenda grid under the month view. Each square card opens the details/edit
// modal and shows enough at a glance to skip opening it for the routine case.
export default function EventList({
  events,
  clients,
  users,
}: {
  events: CalEvent[];
  clients: ClientOpt[];
  users: UserOpt[];
}) {
  if (events.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-10 text-center">
        <p className="text-black/50">No events scheduled. Add one with “New Event”.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {events.map((e) => (
        <EventItem key={e.id} event={e} clients={clients} users={users} variant="card" />
      ))}
    </div>
  );
}
