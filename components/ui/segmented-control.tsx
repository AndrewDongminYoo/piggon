type Segment<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: Segment<T>[];
  value: T;
};

export function SegmentedControl<T extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <div aria-label={ariaLabel} className="segmented-control" role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className="segmented-control__item"
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
