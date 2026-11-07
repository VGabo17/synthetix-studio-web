export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Synthetix Studio
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          Infraestructura Edge, desarrollo a medida y diseño de alto rendimiento.
        </p>
        <button className="px-6 py-3 mt-4 rounded-full bg-primary hover:bg-accent transition-colors font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)]">
          Explorar Servicios
        </button>
      </div>
    </main>
  );
}
