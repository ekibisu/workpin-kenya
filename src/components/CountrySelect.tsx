import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountries } from "@/hooks/useCountries";

interface Props {
  value: string | null | undefined;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function CountrySelect({ value, onChange, placeholder = "Select country", disabled, className }: Props) {
  const { data: countries = [], isLoading } = useCountries();

  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="mr-2">{c.flag_emoji}</span>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
