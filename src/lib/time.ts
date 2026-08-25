export function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Nunca";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return new Date(iso).toLocaleDateString("es");
}
