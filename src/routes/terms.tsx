import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — DFCS Desktop" },
      { name: "description", content: "Terms for requesting access to and using DFCS Desktop releases." },
    ],
  }),
  component: TermsOfUse,
});

function TermsOfUse() {
  return (
    <main className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl space-y-8 text-sm leading-7 text-muted-foreground">
        <header>
          <Link to="/" className="text-primary underline">Back to DFCS Desktop</Link>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-foreground">Terms of Use</h1>
          <p className="mt-3">Effective September 15, 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Access and authorization</h2>
          <p>DFCS Desktop releases are distributed through a private, approval-based portal. You may request access only for yourself, must provide accurate information, and may not share credentials or download links.</p>
          <p>Approval is discretionary and may be suspended or revoked without notice when security, eligibility, or operational requirements are not met.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Acceptable use</h2>
          <p>You must not reverse engineer, redistribute, sublicense, abuse, or use DFCS Desktop to violate applicable law or another person&apos;s rights. You are responsible for checking downloaded files and maintaining a secure device and account.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Software and availability</h2>
          <p>Releases are provided for authorized evaluation or use according to the instructions supplied with each release. Features, compatibility, and availability may change. Unless a separate written agreement says otherwise, the service and software are provided as available without guarantees of uninterrupted operation.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>Questions about access or these terms can be sent to <a className="text-primary underline" href="mailto:sy386336@gmail.com">sy386336@gmail.com</a>.</p>
        </section>
      </article>
    </main>
  );
}