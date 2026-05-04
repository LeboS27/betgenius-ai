import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-[var(--accent-primary)] hover:underline mb-6 inline-block">← Back</Link>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-6 tracking-wide">Terms of Service</h1>
        <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">1. Service Description</h2>
            <p>BetGenius AI is an analysis and information platform only. We provide statistical analysis and probability assessments for football matches. We are <strong className="text-[var(--text-primary)]">not</strong> a gambling service and do not accept bets.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">2. Not Gambling Service</h2>
            <p>Users are solely responsible for any betting decisions made. BetGenius AI analysis should not be construed as betting advice. Always gamble responsibly and within your means.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">3. Subscription Terms</h2>
            <p>Subscriptions are monthly and do not auto-renew. Refunds are subject to review. Subscription activation is manual and may take up to 24 hours after payment verification.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">4. Account Termination</h2>
            <p>We reserve the right to suspend accounts that violate these terms. Users may delete their account at any time via the Account page.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">5. Data Usage</h2>
            <p>Anonymised usage data may be used to improve AI models. See our Privacy Policy for details.</p>
          </section>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-8">Last updated: April 2024 · Contact: <a href="mailto:lebohangsbeta20@gmail.com" className="text-[var(--accent-primary)]">lebohangsbeta20@gmail.com</a></p>
      </div>
    </div>
  )
}
