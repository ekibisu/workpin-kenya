import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegions } from "@/hooks/useRegions";

interface Props {
  countryCode: string | null | undefined;
  value: string | null | undefined;
  onChange: (regionId: string) => void;
  className?: string;
}

export default function RegionSelect({ countryCode, value, onChange, className }: Props) {
  const { data: regions = [], isLoading } = useRegions(countryCode);

  if (!countryCode) {
    return (
      <Select disabled>
        <SelectTrigger className={className}><SelectValue placeholder="Select a country first" /></SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  if (!isLoading && regions.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Region selection coming soon" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className={className}><SelectValue placeholder="Select region" /></SelectTrigger>
      <SelectContent>
        {regions.map((r) => (
          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
