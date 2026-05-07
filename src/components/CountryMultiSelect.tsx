import { useCountries } from "@/hooks/useCountries";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  value: string[];
  onChange: (codes: string[]) => void;
  className?: string;
}

export default function CountryMultiSelect({ value, onChange, className }: Props) {
  const { data: countries = [] } = useCountries();

  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else onChange([...value, code]);
  };

  return (
    <div className={`grid grid-cols-2 gap-2 ${className || ""}`}>
      {countries.map((c) => (
        <Label
          key={c.code}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card p-2.5 hover:border-primary/40"
        >
          <Checkbox
            checked={value.includes(c.code)}
            onCheckedChange={() => toggle(c.code)}
          />
          <span className="text-sm">
            <span className="mr-1.5">{c.flag_emoji}</span>
            {c.name}
          </span>
        </Label>
      ))}
    </div>
  );
}
