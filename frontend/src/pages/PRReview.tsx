import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { GitPullRequest, GitMerge, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";

export function PRReview() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col space-y-4 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add payment retry mechanism</h1>
            <span className="text-2xl text-slate-400 font-light">#42</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <GitPullRequest className="w-3 h-3 mr-1" /> Open
            </Badge>
            <span className="text-slate-600">
              <span className="font-medium text-slate-900">alex-dev</span> wants to merge 3 commits into <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">main</span> from <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">feature/payment-retry</span>
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="text-slate-700">Review Changes</Button>
          <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
            <GitMerge className="w-4 h-4 mr-2" /> Merge Pull Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" />
                StructurAI Review Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-slate-600">
                I've reviewed this PR. The implementation of the retry mechanism looks solid overall, but I've identified a few edge cases and potential improvements regarding error handling and rate limiting.
              </p>
              <div className="space-y-3">
                <div className="flex p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-rose-900">Missing Idempotency Key</h4>
                    <p className="text-xs text-rose-700 mt-1">The retry logic on line 45 does not pass an idempotency key to the Stripe API. Retrying without this key could result in duplicate charges.</p>
                  </div>
                </div>
                <div className="flex p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-emerald-900">Exponential Backoff</h4>
                    <p className="text-xs text-emerald-700 mt-1">Excellent use of exponential backoff for the retry mechanism. This will prevent overwhelming the payment gateway during outages.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diff Viewer Mock */}
          <Card>
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
              <span className="font-medium text-sm text-slate-900">src/services/PaymentProcessor.ts</span>
              <div className="text-xs text-slate-500 flex space-x-3">
                <span className="text-emerald-600">+14 additions</span>
                <span className="text-rose-600">-3 deletions</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 font-mono text-xs overflow-x-auto">
              <div className="bg-white min-w-full">
                <div className="flex bg-rose-50/50 text-rose-900">
                  <div className="w-12 py-1 px-2 text-right border-r border-rose-200 text-rose-400 select-none">42</div>
                  <div className="w-12 py-1 px-2 text-right border-r border-rose-200 text-rose-400 select-none"></div>
                  <div className="py-1 px-4 whitespace-pre">- const charge = await StripeClient.Charge(paymentMethod.token);</div>
                </div>
                <div className="flex bg-emerald-50/50 text-emerald-900">
                  <div className="w-12 py-1 px-2 text-right border-r border-emerald-200 text-emerald-400 select-none"></div>
                  <div className="w-12 py-1 px-2 text-right border-r border-emerald-200 text-emerald-400 select-none">42</div>
                  <div className="py-1 px-4 whitespace-pre">+ let charge;</div>
                </div>
                <div className="flex bg-emerald-50/50 text-emerald-900">
                  <div className="w-12 py-1 px-2 text-right border-r border-emerald-200 text-emerald-400 select-none"></div>
                  <div className="w-12 py-1 px-2 text-right border-r border-emerald-200 text-emerald-400 select-none">43</div>
                  <div className="py-1 px-4 whitespace-pre">+ let attempts = 0;</div>
                </div>
                <div className="flex bg-emerald-50/50 text-emerald-900">
                  <div className="w-12 py-1 px-2 text-right border-r border-emerald-200 text-emerald-400 select-none"></div>
                  <div className="w-12 py-1 px-2 text-right border-r border-emerald-200 text-emerald-400 select-none">44</div>
                  <div className="py-1 px-4 whitespace-pre">+ while (attempts &lt; MAX_RETRIES) {'{'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-base">StructurAI Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Code Health Impact</span>
                  <span className="font-medium text-emerald-600">+1.2%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">AI Slop Score</span>
                  <span className="font-medium text-slate-900">Low (4%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-400 h-2 rounded-full" style={{ width: '4%' }}></div>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className="w-full justify-center py-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Safe to Merge
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
