import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DFCS Desktop" },
      { name: "description", content: "How DFCS Desktop handles access requests, emails, and download activity." },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <main className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl space-y-8 text-sm leading-7 text-muted-foreground">
        <header>
          <Link to="/" className="text-primary underline">Back to DFCS Desktop</Link>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="mt-3">Effective September 15, 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Information we collect</h2>
          <p>When you request access, we collect your name, email address, and a password credential. The password is salted and stored as a one-way cryptographic hash; we do not store the plaintext password. When you use an approved account, we record sign-ins and download events, including the selected operating system.</p>
          <p>We use this information to review access, send approval and operational emails, protect the download portal, and understand release adoption.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Service providers</h2>
          <p>DFCS Desktop uses Supabase to store access records and Brevo to send transactional email. These providers process data only as needed to provide those services and under their own privacy terms.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Retention and your choices</h2>
          <p>We retain access and download records for as long as needed to operate the release program, meet security requirements, and resolve disputes. You may request access, correction, or deletion of your personal information by contacting the administrator at the email address used for this portal.</p>
          <p>Access can be revoked at any time. Revocation prevents future sign-in and downloads but may not remove records required for security or accounting.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p>For privacy questions or requests, contact the DFCS Desktop administrator at <a className="text-primary underline" href="mailto:sy386336@gmail.com">sy386336@gmail.com</a>.</p>
        </section>
      </article>
    </main>
  );
}