const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  processing: "En cours",
  completed: "Terminé",
  failed: "Échec",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-${status} text-xs px-2.5 py-1 rounded-full font-medium`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
