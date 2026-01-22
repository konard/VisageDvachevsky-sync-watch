import type { Participant } from '../types';

interface ParticipantsListProps {
  participants: Participant[];
}

export default function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3">
        Participants ({participants.length})
      </h3>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {participants.map((participant) => (
          <div
            key={participant.odId}
            className="flex items-center gap-2 text-white/80"
          >
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm">
              {participant.nickname}
              {participant.isHost && (
                <span className="text-sky-400 ml-1">(Host)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
