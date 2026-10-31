type BrandMarkProps = {
  className?: string;
  alt?: string;
};

export function BrandMark({ className = "size-8", alt = "DFCS" }: BrandMarkProps) {
  return <img src="/icons/icon.png" alt={alt} className={className} />;
}