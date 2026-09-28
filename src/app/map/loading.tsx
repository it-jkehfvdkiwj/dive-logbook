export default function Loading() {
  return (
    <div
      className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] top-0 animate-pulse bg-[#aad3df] lg:bottom-0 lg:left-64 dark:bg-[#0e1a26]"
      aria-busy="true"
      aria-label="Loading map"
    />
  );
}
