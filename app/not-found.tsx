import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap py-16 text-center">
      <h1 className="font-display text-3xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-neutral-700">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="btn-primary mt-5">Réserver une course</Link>
    </div>
  );
}
