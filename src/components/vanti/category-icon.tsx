import { icons, Shapes } from "lucide-react";

/** Renders a lucide icon by the name stored on the category row. */
export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && (icons as Record<string, typeof Shapes>)[name]) || Shapes;
  return <Icon className={className} />;
}