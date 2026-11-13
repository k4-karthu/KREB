import { derivePaintTokens } from '../tokens/contrast';

interface PaintSwatchProps {
  name: string;
  hex: string;
}

export function PaintSwatch({ name, hex }: PaintSwatchProps) {
  const { paint } = derivePaintTokens(hex);

  return (
    <span className="inline-flex items-center gap-2 text-caption text-text-2">
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-3.5 rounded-s border border-border shrink-0"
        style={{ backgroundColor: paint }}
      />
      <span>{name}</span>
    </span>
  );
}
