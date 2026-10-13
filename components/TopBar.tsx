export default function TopBar() {
  return (
    <div className="flex mb-6 mt-6 justify-center">
      <div className="flex gap-6 items-center">
        <div className="grid md:grid-rows-2 gap-2 md:gap-4">
          <h1 className="text-[32px] font-normal leading-tight text-[var(--foreground)] md:text-[40px]">
            Germán Ampuero
          </h1>
          <h2 className="text-center text-sm font-normal text-[var(--muted-foreground)] md:text-xl">
            A veces tomo fotos
          </h2>
        </div>
      </div>
    </div>
  );
}
