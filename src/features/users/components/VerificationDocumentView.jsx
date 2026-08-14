import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

const isPdfPath = (path) => /\.pdf$/i.test(String(path ?? ''));

export default function VerificationDocumentView({
  src,
  alt = 'Verification document',
  path,
  linkable = true,
  className = 'max-h-80 w-full rounded-lg border object-contain',
}) {
  const [failed, setFailed] = useState(false);

  if (!src) return <p className="text-sm text-foreground-lighter">No image</p>;

  if (failed || isPdfPath(path)) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-200 p-4">
        <iframe
          src={src}
          title={alt}
          className="h-80 w-full rounded-lg border border-border bg-card"
        />
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-500"
        >
          <ExternalLink size={16} /> Open document in new tab
        </a>
      </div>
    );
  }

  const image = (
    <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />
  );

  if (!linkable) return image;

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg border border-border"
    >
      {image}
    </a>
  );
}
