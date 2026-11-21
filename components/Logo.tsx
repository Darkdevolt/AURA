/* Logo de l'en-tête : remplacez public/logo.svg par le logo officiel. */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="" width={size} height={size} style={{ width: size, height: size }} className="object-contain" />
  );
}
