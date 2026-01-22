import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function Home() {
  return (
    <main className="page-layout">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-slate-900">
            Choreo
          </h1>
          <p className="text-xl text-slate-600">
            Your 3-Minute AI Work Journal
          </p>
          <p className="text-sm text-slate-500">
            Voice → Summary + Tasks + Insights
          </p>
        </div>

        {/* Recording Card */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="text-slate-900">Daily Reflection</CardTitle>
            <CardDescription className="text-slate-600">
              Record a 3-minute voice reflection about your workday
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Recording Progress</span>
                <span>45 / 180 seconds</span>
              </div>
              <Progress value={25} className="h-2" />
            </div>

            {/* Status - Using brand colors */}
            <div className="text-center p-4 bg-brand-100 border border-brand-200 rounded-lg">
              <p className="text-sm text-brand-700">
                Ready to record your reflection
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white">
              Start Recording
            </Button>
            <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              View Demo
            </Button>
          </CardFooter>
        </Card>

        {/* Features */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-3xl">🎤</div>
                <p className="text-sm font-medium text-slate-900">Record</p>
                <p className="text-xs text-slate-500">3-min voice reflection</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">🤖</div>
                <p className="text-sm font-medium text-slate-900">AI Process</p>
                <p className="text-xs text-slate-500">Generate summary + tasks</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">📊</div>
                <p className="text-sm font-medium text-slate-900">Insights</p>
                <p className="text-xs text-slate-500">Track patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Summary - Using semantic colors */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Example Summary</CardTitle>
            <CardDescription className="text-slate-600">What your AI-generated summary looks like</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wins - Using success colors */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Wins</h3>
              <div className="space-y-1 text-sm text-slate-700 bg-success-50 border border-success-200 rounded-lg p-3">
                <p>• Finished OAuth integration</p>
                <p>• Resolved critical API bug</p>
                <p>• Deployed to staging</p>
              </div>
            </div>

            {/* Energy Drains - Using warning colors */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Energy Drains</h3>
              <div className="space-y-1 text-sm text-slate-700 bg-warning-50 border border-warning-200 rounded-lg p-3">
                <p>• Too many context switches</p>
                <p>• Urgent code review interruption</p>
              </div>
            </div>

            {/* Tomorrow's Focus - Using brand colors */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Future Focus</h3>
              <div className="space-y-1 text-sm text-slate-700 bg-brand-100 border border-brand-200 rounded-lg p-3">
                <p>• Start analytics dashboard</p>
                <p>• Deploy OAuth to production</p>
              </div>
            </div>

            {/* Tasks */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="font-semibold mb-3 text-slate-900 text-sm">Extracted Tasks (8)</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  OAuth integration
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  Fixed API bug
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  Deployed to staging
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  + 5 more
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-500 text-center w-full">
              🔒 Privacy-first: Audio deleted after transcription
            </p>
          </CardFooter>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Sign Up Free
          </Button>
        </div>
      </div>
    </main>
  )
}