import { ShieldCheck, Sparkles, Stethoscope, Users, Hospital, Clock3 } from 'lucide-react';

export default function About() {
  return (
    <div className="page-stack">
      <section className="page-hero fade-in-up">
        <p className="page-hero__eyebrow">About</p>
        <h2 className="page-hero__title">Health Link</h2>
        <p className="page-hero__copy">A prototype for cross-clinic patient records in Mukono district, now styled as a more desktop-centric clinical workspace.</p>
      </section>

      <div className="feature-grid fade-in-up delay-1">
        <div className="feature-card">
          <ShieldCheck className="h-6 w-6 text-[#1f6feb]" />
          <h3 className="mt-4 text-lg font-black tracking-tight">Protected access</h3>
          <p className="section-copy">Patient records are gated behind OTP verification for a cleaner access flow.</p>
        </div>
        <div className="feature-card">
          <Stethoscope className="h-6 w-6 text-[#16a34a]" />
          <h3 className="mt-4 text-lg font-black tracking-tight">Clinical operations</h3>
          <p className="section-copy">Staff can register patients and document visits without leaving the workspace.</p>
        </div>
        <div className="feature-card">
          <Sparkles className="h-6 w-6 text-[#ff9f1c]" />
          <h3 className="mt-4 text-lg font-black tracking-tight">Responsive visuals</h3>
          <p className="section-copy">The shell now uses richer gradients, cards, motion, and a web-app visual hierarchy.</p>
        </div>
      </div>

      <div className="split-grid fade-in-up delay-2">
        <div className="surface-card">
          <p className="section-eyebrow">How it works</p>
          <h3 className="surface-card__title">Workflow overview</h3>
          <div className="mini-grid mt-5">
            <div className="mini-card"><Users className="h-4 w-4 text-[#1f6feb]" /><p className="mt-2 font-semibold">Login as staff or admin.</p></div>
            <div className="mini-card"><Hospital className="h-4 w-4 text-[#ff9f1c]" /><p className="mt-2 font-semibold">Register patients and clinics.</p></div>
            <div className="mini-card"><Clock3 className="h-4 w-4 text-[#16a34a]" /><p className="mt-2 font-semibold">Request OTP and open protected history.</p></div>
          </div>
        </div>

        <div className="surface-card">
          <p className="section-eyebrow">Prototype notice</p>
          <div className="empty-state text-center">
            <p className="text-lg font-black tracking-tight text-[#173047]">PROTOTYPE - NOT FOR REAL MEDICAL USE</p>
            <p className="section-copy">This app is for demonstration only and should not be used for live clinical decision-making.</p>
          </div>
        </div>
      </div>
    </div>
  );
}