import Link from "next/link"
import { VisualizerShowcase } from "@/components/VisualizerShowcase"
import { Button } from "@/components/ui/button"

export default function VisualizersPage() {
  return (
    <main className="page-layout">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-wide text-brand-600">Choreo Visual Explorations</p>
          <h1 className="text-4xl font-bold text-slate-900">Compare Recording Visualizations</h1>
          <p className="text-slate-600">
            Start a quick mic test to see four visualization styles side-by-side. Pick the one you love for the final recorder.
          </p>
        </div>

        <VisualizerShowcase />

        <div className="text-center">
          <Link href="/">
            <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              Back to main page
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
