export default function Partners() {
  const logos = [
    { name: "Partner One" },
    { name: "Partner Two" },
    { name: "Partner Three" },
    { name: "Partner Four" },
  ];
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-2xl font-bold text-center mb-6">Our Partners</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center">
          {logos.map((l) => (
            <div key={l.name} className="h-16 rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">
              {l.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

