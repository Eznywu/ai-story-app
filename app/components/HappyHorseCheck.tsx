"use client";

type Props = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

/** Shared checkbox. The native box stays 22px so global input styles cannot stretch it. */
export function HappyHorseCheck(props: Props) {
  return (
    <label className="hhCheck">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}
