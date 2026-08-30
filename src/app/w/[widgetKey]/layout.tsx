import { widgetFontClassName } from "./widget-fonts";

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`h-full max-h-full min-h-0 w-full overflow-hidden bg-transparent ${widgetFontClassName}`}>
      {children}
    </div>
  );
}
