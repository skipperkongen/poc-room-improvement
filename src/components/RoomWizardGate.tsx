"use client";

import dynamic from "next/dynamic";

/** Client-only load: undgår hydration mismatch omkring fil-input, blob-URL og forhåndsvisning. */
const RoomWizard = dynamic(
  () => import("./RoomWizard").then((m) => m.RoomWizard),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Indlæser …</p>
      </div>
    ),
  },
);

export function RoomWizardGate() {
  return <RoomWizard />;
}
