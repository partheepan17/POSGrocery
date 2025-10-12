import React from 'react';

type BadgeProps =
  | { variant?: 'label'; text: string; why?: string }
  | { variant: 'amount'; why: string; amount: number };

export default function PromoBadge(props: BadgeProps) {
  if (props.variant === 'amount') {
    if (!props.amount) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded" title={props.why}>
        −{props.amount.toFixed(2)}
        <span className="opacity-80">Info</span>
      </span>
    );
  }
  const { text, why } = props;
  return (
    <span title={why || text} className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-purple-600 text-white">
      {text}
    </span>
  );
}



