/* eslint-disable @next/next/no-img-element */
/**
 * Logo Luxus Asaad.
 * - variant "mark"  : lion + couronne, version claire pour fond noir (en-tête)
 * - variant "full"  : logo complet, version claire pour fond noir (pied de page)
 * - variant "full-dark" : logo complet d'origine pour fond clair
 */
const SRC = {
  mark: { src: "/logo-mark-light.png", ratio: 190 / 160 },
  full: { src: "/logo-light.png", ratio: 640 / 543 },
  "full-dark": { src: "/logo.png", ratio: 640 / 543 },
} as const;

export default function Logo({
  variant = "mark",
  height = 40,
  className = "",
  alt = "",
}: {
  variant?: keyof typeof SRC;
  height?: number;
  className?: string;
  alt?: string;
}) {
  const { src, ratio } = SRC[variant];
  const width = Math.round(height * ratio);
  return <img src={src} alt={alt} width={width} height={height} style={{ width, height }} className={className} decoding="async" />;
}
