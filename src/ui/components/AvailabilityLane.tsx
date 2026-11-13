import { VehicleTile, type VehicleTileData } from '@/ui/data/VehicleTile';

export function AvailabilityLane({
  vehicles,
  startAt,
  endAt,
}: {
  vehicles: VehicleTileData[];
  startAt: number;
  endAt: number;
}) {
  if (vehicles.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((v) => (
        <VehicleTile
          key={v.slug}
          vehicle={v}
          href={`/cars/${v.slug}?start=${startAt}&end=${endAt}`}
        />
      ))}
    </div>
  );
}
