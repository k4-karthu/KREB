import Image from 'next/image';
import { thumbHashToDataURL } from 'thumbhash';

export interface CarStudioImageProps {
  src: string;
  alt: string;
  thumbhash?: string;
  priority?: boolean;
  className?: string;
}

function decodeThumbHashDataUrl(thumbhash?: string): string | undefined {
  if (!thumbhash) return undefined;
  try {
    const binary = atob(thumbhash);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return thumbHashToDataURL(bytes);
  } catch {
    return undefined;
  }
}

/**
 * 3:2 studio vehicle photograph frame on a pure white plate (`--plate`).
 */
export function CarStudioImage({
  src,
  alt,
  thumbhash,
  priority = false,
  className = '',
}: CarStudioImageProps) {
  const blurDataURL = decodeThumbHashDataUrl(thumbhash);

  return (
    <div
      className={`kerb-studio-plate relative aspect-[3/2] w-full overflow-hidden bg-plate ${className}`.trim()}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        className="kerb-studio-img object-contain transition-transform duration-300 ease-out motion-reduce:transition-none"
      />
    </div>
  );
}
