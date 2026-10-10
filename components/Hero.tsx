import Link from "next/link";
import { UserRound, Trophy } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* Blended chess background image. The image is part of the hero background, not a separate card. */}
      <div className="absolute inset-0 bg-gradient-to-br from-hpcc-navy via-[#325B32] to-[#598F47] chessboard-subtle" />

      <div className="container-page relative min-h-[440px] py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-extrabold uppercase tracking-[0.35em] text-hpcc-gold">
            Welcome to
          </p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Howick-Pakuranga
            <span className="block text-hpcc-gold">Chess Club</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-100">
            Building strong minds and great friendships through the game of chess.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/join" className="btn-gold gap-2">
              <UserRound className="h-4 w-4" /> Join the Club
            </Link>
            <Link
              href="/tournaments"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-hpcc-gold/80 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition hover:bg-hpcc-gold hover:text-black"
            >
              <Trophy className="h-4 w-4" /> View Tournaments
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
