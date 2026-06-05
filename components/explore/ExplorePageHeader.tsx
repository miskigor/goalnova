type ExplorePageHeaderProps = {
  title: string;
  subtitle: string;
};

/** Static /explore title — rendered on the server inside the bordered frame. */
export function ExplorePageHeader({ title, subtitle }: ExplorePageHeaderProps) {
  return (
    <header className="box-border min-w-0 max-w-full space-y-1 overflow-x-clip border-b border-gn-border-subtle pb-4">
      <h1
        id="explore-page-title"
        className="break-words text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl"
      >
        {title}
      </h1>
      <p className="text-xs text-gn-text-secondary sm:text-sm">{subtitle}</p>
    </header>
  );
}
