import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <h1 className="text-2xl font-extrabold">Page introuvable</h1>
      <p className="mt-2 text-neutral-700">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="btn-primary mt-5">Réserver une course</Link>
    </div>
  );
}
