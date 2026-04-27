import { Seat } from '../models/Seat';
import { ArchiveLayout } from '../models/WorldState';

export class SeatUseCase {
  public findFreeSeat(layout: ArchiveLayout, seats: Map<string, Seat>): string | null {
    // Basic logic: find first unassigned seat
    for (const [uid, seat] of seats) {
      if (!seat.assigned) return uid;
    }
    return null;
  }

  public assignSeat(seatId: string, seats: Map<string, Seat>): void {
    const seat = seats.get(seatId);
    if (seat) seat.assigned = true;
  }

  public unassignSeat(seatId: string, seats: Map<string, Seat>): void {
    const seat = seats.get(seatId);
    if (seat) seat.assigned = false;
  }
}
