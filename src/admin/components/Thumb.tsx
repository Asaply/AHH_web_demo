import { useState } from 'preact/hooks';

/* Prueba la foto publicada; si el deploy todavía no la trae, la toma del repo. */
export function Thumb({ src, rawBase, alt, class: className }: { src: string; rawBase: string; alt: string; class: string }) {
  const [url, setUrl] = useState(src);
  if (!url) return <div class={`${className} bg-bone-2`} aria-hidden="true" />;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      class={`${className} object-cover bg-bone-2`}
      onError={() => setUrl(current => (current === src && src.startsWith('/') ? rawBase + src : ''))}
    />
  );
}
