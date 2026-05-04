import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-[var(--accent-primary)] hover:underline mb-6 inline-block">← Back</Link>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-6 tracking-wide">Privacy Policy</h1>
        <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Data Collected</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Email address and full name (registration)</li>
              <li>Zimbabwe phone number (optional, for SMS alerts)</li>
              <li>Usage data: matches analysed, analysis types, session timestamps</li>
              <li>Payment reference numbers (not card details)</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">How AI Analysis Data is Used</h2>
            <p>Analysis outputs and anonymised usage patterns may be used to improve our AI models. No personally identifiable information is sent to AI providers.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Third-Party Services</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Supabase — database and authentication</li>
              <li>Anthropic Claude — AI analysis (anonymised data only)</li>
              <li>Africa&apos;s Talking — SMS delivery</li>
              <li>Resend — transactional email</li>
              <li>Sentry — error monitoring</li>
            </ul>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">User Rights</h2>
            <p>You may delete your account at any time. Upon deletion, your data is anonymised and retained for AI training purposes only. Contact us to request full data removal.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Data Retention</h2>
            <p>Active account data is retained indefinitely. Deleted accounts are anonymised within 30 days.</p>
          </section>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-8">Contact: <a href="mailto:lebohangsbeta20@gmail.com" className="text-[var(--accent-primary)]">lebohangsbeta20@gmail.com</a></p>
      </div>
    </div>
  )
}
