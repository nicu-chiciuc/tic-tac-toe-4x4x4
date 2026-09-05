export function SamebaseAttribution() {
  return (
    <footer className="flex justify-center px-4 py-4 text-sm text-slate-400">
      <a
        href="https://samebase.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded px-3 py-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
      >
        <span>Managed with</span>
        <img
          src="/samebase.svg"
          alt=""
          aria-hidden="true"
          width={16}
          height={16}
          className="size-4 invert"
        />
        <span>Samebase</span>
      </a>
    </footer>
  );
}
