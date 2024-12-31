import DamageCalculator from './components/DamageCalculator';

export default function Home() {
  return (
    <main className="min-h-screen bg-primary/5 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <DamageCalculator />
      </div>
    </main>
  );
}
