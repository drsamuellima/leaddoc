"use client";

import type { WidgetPosition } from "@/lib/types";
import { WIDGET_POSITION_META } from "@/lib/widget-appearance";

export function LocationPicker(props: {
  value: WidgetPosition;
  onChange: (next: WidgetPosition) => void;
}) {
  return (
    <div className="studio-locations" role="radiogroup" aria-label="Chat location">
      {WIDGET_POSITION_META.map((pos) => (
        <button
          key={pos.id}
          type="button"
          role="radio"
          aria-checked={props.value === pos.id}
          className="studio-location"
          data-on={props.value === pos.id}
          onClick={() => props.onChange(pos.id)}
        >
          <span className="studio-location-stage" data-side={pos.id} aria-hidden>
            <i />
          </span>
          <strong>{pos.name}</strong>
          <span>{pos.blurb}</span>
        </button>
      ))}
    </div>
  );
}
