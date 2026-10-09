import { Calendar, MapPin, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import QRCodeDisplay from "./QRCodeDisplay";
import type { DigitalTicket } from "@/lib/events/events-client";

interface TicketPassCardProps {
  ticket: DigitalTicket;
  onDownload?: () => void;
}

export default function TicketPassCard({ ticket }: TicketPassCardProps) {
  const isUsed = ticket.status === "used";
  const isCancelled = ticket.status === "cancelled";
  const isActive = ticket.status === "active";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-all hover:shadow-lg">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-[#071a3d] via-[#0b54a9] to-[#0073e6] px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Official Admission Pass</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 backdrop-blur-sm">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            )}
            {isUsed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/30 px-2.5 py-0.5 text-xs font-bold text-slate-300 backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                Checked In
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-300 backdrop-blur-sm">
                <AlertCircle className="h-3 w-3" />
                Cancelled
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
          {ticket.event?.title || "Event Admission"}
        </h3>
        {ticket.program && (
          <p className="mt-1 text-sm font-semibold text-blue-100">
            Session: {ticket.program.title}
          </p>
        )}
      </div>

      {/* Ticket Body with Cutouts */}
      <div className="p-6">
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          {/* Info Details */}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-slate-600">Attendee Name</span>
              <p className="text-lg font-extrabold text-slate-900">{ticket.attendee_name}</p>
              {ticket.attendee_email && (
                <p className="text-xs text-slate-500">{ticket.attendee_email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold uppercase text-slate-600">Ticket Tier</span>
                <p className="mt-0.5 font-bold text-slate-800">
                  {ticket.ticket_type?.name || "General Admission"}
                </p>
              </div>
              <div>
                <span className="font-bold uppercase text-slate-600">Pass Code</span>
                <p className="mt-0.5 font-mono font-bold text-[#0073e6]">{ticket.ticket_number}</p>
              </div>
            </div>

            {ticket.registration?.team_name && (
              <div>
                <span className="text-xs font-bold uppercase text-slate-600">Team / Group</span>
                <p className="font-bold text-slate-800">{ticket.registration.team_name}</p>
              </div>
            )}

            <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
              {ticket.event?.start_date && (
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#0073e6]" />
                  <span>{new Date(ticket.event.start_date).toLocaleString()}</span>
                </p>
              )}
              {ticket.event?.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#0073e6]" />
                  <span>{ticket.event.location}</span>
                </p>
              )}
            </div>

            {isUsed && ticket.checked_in_at && (
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                Checked in at: {new Date(ticket.checked_in_at).toLocaleString()}
              </div>
            )}
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center border-t border-dashed border-slate-200 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <QRCodeDisplay value={ticket.qr_token} size={150} />
            <span className="mt-2 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
              Scan at entrance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
