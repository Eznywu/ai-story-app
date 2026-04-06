import type { Metadata } from "next";
import Link from "next/link";
import "@/app/page.css";
import { AppChromeBar } from "@/app/components/AppChromeBar";

export const metadata: Metadata = {
  title: "Privacy — Bedtime Story",
  description:
    "How Bedtime Story handles accounts, membership, local profiles, AI providers, and optional voice features.",
};

const LAST_UPDATED = "April 2, 2026";

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        lineHeight: 1.65,
        color: "#0f172a",
      }}
    >
      <AppChromeBar />
      <p>
        <Link href="/">← Back to app</Link>
      </p>
      <h1 style={{ fontSize: "1.5rem", marginTop: "1.5rem", marginBottom: "0.25rem" }}>
        Privacy Policy
      </h1>
      <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.95rem" }}>
        Last updated: {LAST_UPDATED}
      </p>

      <p style={{ marginTop: "1.25rem" }}>
        This Privacy Policy explains how we collect, use, store, and share information when you use{" "}
        <strong>Bedtime Story</strong> (the “App”) and the online services that power it (together, the
        “Services”). The App may offer a <strong>sample mode</strong> with limited features, and a{" "}
        <strong>signed-in membership</strong> experience that unlocks custom story generation, saving to your
        library, posters, narration beyond the sample, and optional voice cloning. The Services use{" "}
        <strong>third-party artificial intelligence and voice providers</strong>; when you use those features, your
        inputs are sent to those providers so they can run. This policy is designed for distribution on the{" "}
        <strong>Apple App Store</strong> and to help you make informed privacy choices.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Who we are</h2>
      <p>
        The Services are operated by the developer identified as the seller on the App Store for Bedtime Story
        (“we,” “us,” or “our”). For privacy questions or requests, use the support URL or contact email shown on
        our App Store product page.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Scope and audience</h2>
      <p>
        The App is intended for use by <strong>adults</strong> (for example, parents and caregivers) who create
        stories and related content for children in their care. It is not intended for use by children under 13 on
        their own. If you are a parent or guardian, you decide what child-related details (such as a name or age
        band) to enter. If you believe we have collected personal information from a child under 13 without
        appropriate consent, contact us using the information on our App Store listing and we will take appropriate
        steps.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Information we collect</h2>
      <h3 style={{ fontSize: "1rem", marginTop: "1rem", fontWeight: 600 }}>Accounts, membership, and sign-in</h3>
      <p>
        Where sign-in is enabled, we process the <strong>email address and password</strong> you use to log in, and
        we issue an <strong>HTTP-only session cookie</strong> so the Services can recognize your browser and whether
        your account has <strong>active membership</strong> (for example, after you enter a membership or access
        code). Session data may include your email as an account identifier and membership status. We use this to gate
        features such as generation, saving, posters, extended narration, and voice cloning. Authentication is checked
        on the server; do not store passwords in client-visible storage.
      </p>

      <h3 style={{ fontSize: "1rem", marginTop: "1rem", fontWeight: 600 }}>Information you provide</h3>
      <ul style={{ paddingLeft: "1.25rem" }}>
        <li>
          <strong>Story settings and prompts</strong>, such as genre, story length, child age band, language,
          optional child gender preference, main character name, optional title, and optional free-text{" "}
          <strong>guidance</strong> for the model.
        </li>
        <li>
          <strong>Optional story setup fields</strong> that we may combine with your guidance—such as theme, mood,
          whether the story is standalone or part of a series, educational goals, or a moral lesson—are sent to our
          AI providers as part of the generation request when you use those fields.
        </li>
        <li>
          <strong>Generated and saved content</strong>, including story text, titles, and related metadata you choose
          to save. If you save a poster, we may store a <strong>poster image file</strong> on our servers and link it
          to your saved story record.
        </li>
        <li>
          <strong>Voice recordings (optional)</strong>, when you use instant voice cloning: audio you record is
          uploaded through our servers to our voice vendor (for example, ElevenLabs) to create a synthetic voice for
          text-to-speech. Do not upload recordings of anyone without their legally required consent (see our Terms).
          Separate internal or diagnostic uploads of voice samples may be written to server storage when that path is
          enabled.
        </li>
      </ul>

      <h3 style={{ fontSize: "1rem", marginTop: "1rem", fontWeight: 600 }}>Information stored on your device</h3>
      <p>
        Some features store data only in your browser or app storage (for example, <strong>local storage</strong>) on
        your device, including:
      </p>
      <ul style={{ paddingLeft: "1.25rem" }}>
        <li>
          <strong>Kid profiles</strong> and <strong>story character profiles</strong> you create (such as names, age
          bands, interests, personality notes, and related fields you enter);
        </li>
        <li>
          <strong>Reading habits</strong> for in-app stats (for example, plays today, streaks, last story played,
          optional draft summaries);
        </li>
        <li>
          References to <strong>cloned or selected voices</strong> (such as vendor voice identifiers and labels) so
          narration can use your preferred voice.
        </li>
      </ul>
      <p>
        This device-only data is not sent to our servers unless you trigger a feature that includes it in a request
        (for example, applying a profile to pre-fill story fields, or using a cloned voice for TTS). Clearing site
        data or uninstalling the App may erase it.
      </p>

      <h3 style={{ fontSize: "1rem", marginTop: "1rem", fontWeight: 600 }}>Information collected automatically</h3>
      <ul style={{ paddingLeft: "1.25rem" }}>
        <li>
          <strong>Technical and usage data</strong> processed when you use the Services, such as device or browser
          type, general IP-derived information, timestamps, request metadata, and data our servers need to operate
          securely and diagnose errors.
        </li>
        <li>
          <strong>Crash or error reports</strong>, if we enable diagnostic tools; we will describe material changes in
          an updated policy.
        </li>
      </ul>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>How we use information</h2>
      <p>We use information to:</p>
      <ul style={{ paddingLeft: "1.25rem" }}>
        <li>Provide, maintain, secure, and improve the App and the Services;</li>
        <li>Authenticate sessions, enforce membership or access rules, and deliver gated features;</li>
        <li>
          Send necessary inputs to third-party AI and voice systems to generate stories, text-to-speech audio,
          optional poster or illustration imagery, and optional cloned voices;
        </li>
        <li>Save and display your story library when you use features backed by our servers;</li>
        <li>
          <strong>Reduce repetitive story lines</strong> by including short excerpts from recently saved stories on the
          same backend deployment in prompts sent to the AI (for example, titles, genres, and short text snippets).
          This processing helps diversify outputs for all users of that deployment and may reference content saved by
          other accounts on the same service.
        </li>
        <li>Detect, investigate, and help prevent abuse, fraud, or violations of our Terms;</li>
        <li>Comply with law and respond to lawful requests;</li>
        <li>
          Record product events in development or through analytics tools we enable later (we will update this policy
          before any material change to analytics collection).
        </li>
      </ul>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>AI processing, accuracy, and human review</h2>
      <p>
        Outputs from AI systems can be wrong, inconsistent, or inappropriate for a particular audience. We use
        third-party models that we do not fully control. <strong>You should review AI-generated stories, audio, and
        images</strong> before sharing them with children or others. Our processing of your information for AI
        features is described in this policy; the underlying model providers process content under their own policies
        as further described below.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>AI and third-party service providers</h2>
      <p>
        We rely on vendors that process data on our behalf or as independent controllers according to their own terms.
        Depending on which features you use and how the App is configured, content and parameters may be transmitted
        to providers in the United States and other countries. We do not sell your personal information. Set out
        below are categories of providers that are typical for the Services as implemented today:
      </p>
      <ul style={{ paddingLeft: "1.25rem" }}>
        <li>
          <strong>OpenAI</strong>, for generating story text and related language tasks; for optional poster imagery
          (for example, scene composition plus image models such as DALL·E) when that provider path is configured;
          and for optional OpenAI text-to-speech when that route is selected.
        </li>
        <li>
          <strong>ElevenLabs</strong>, for text-to-speech and optional instant voice cloning from a sample you provide.
          Voice cloning sends audio from your device (through our servers) to ElevenLabs so a synthetic voice can be
          created or updated there.
        </li>
        <li>
          <strong>Google (Gemini, Imagen, and related Google AI / cloud APIs)</strong>, for optional poster or
          image-related generation and related text processing when that provider path is enabled.
        </li>
        <li>
          <strong>Hosting, infrastructure, and database</strong> providers used to operate the Services (for example,
          servers and storage where the App backend runs).
        </li>
      </ul>
      <p>
        Each provider has its own privacy policy, security practices, subprocessors, and terms. Their use of data may
        include processing in jurisdictions with different privacy laws than your own. We select and configure
        providers to deliver the Services, but <strong>we cannot guarantee their availability, outputs, or
        practices</strong>.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Storage and retention</h2>
      <p>
        Content you save may be stored on systems we control, including a <strong>database</strong> for story
        records and metadata, and <strong>disk storage</strong> for poster image files and any optional diagnostic
        voice uploads. We retain information only as long as needed to provide the Services, comply with law, resolve
        disputes, and enforce our agreements, unless a longer period is required by law. Deletion features in the App
        (where available) may remove items from your library but backups or residual copies can persist for a limited
        time in ordinary IT systems. For other deletion or access requests, contact us via our App Store support
        contact.
      </p>
      <p>
        If you use voice cloning, our voice vendor may retain data according to its own policies; we do not control
        their internal retention clocks.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Security</h2>
      <p>
        We use reasonable administrative, technical, and organizational measures designed to protect information,
        including keeping API credentials on the server side where they belong. No method of transmission or storage
        is completely secure. Risks inherent in internet-connected services include unauthorized access, disclosure,
        or disruption. If we become aware of a breach that affects you and requires notice under applicable law, we
        will follow required notification procedures.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Apple and App Store</h2>
      <p>
        If you download the App from the App Store, Apple may collect information as described in Apple’s privacy
        policy. Our use of information we receive through the App is covered by this Privacy Policy, not Apple’s.
        Apple is not responsible for our privacy practices.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Tracking and advertising</h2>
      <p>
        We do not use your data to track you across third-party apps and websites for advertising purposes. If that
        changes, we will update this policy and, where required, seek permission (for example, through Apple’s App
        Tracking Transparency framework on iOS).
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Your rights and choices</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or port your personal
        information, or to object to or restrict certain processing. To exercise these rights, contact us using the
        information on our App Store listing. Residents of the EEA, UK, or Switzerland may also have the right to
        complain to a supervisory authority. California residents may have additional rights under the CCPA/CPRA; we do
        not “sell” or “share” personal information as those terms are defined in California law.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>International transfers</h2>
      <p>
        We and our vendors may process information in countries other than where you live (including the United
        States). Those countries may have different data protection laws. Where required, we use appropriate
        safeguards for cross-border transfers; nonetheless, <strong>governmental access, surveillance, or legal
        demands</strong> may apply differently abroad.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the updated version in the App or at this
        URL and revise the “Last updated” date. If changes are material, we will provide notice as required by law or
        by platform rules (including the App Store).
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Contact</h2>
      <p>
        For privacy-related requests or questions, use the support URL or developer contact email on our App Store
        product page for Bedtime Story.
      </p>
    </main>
  );
}
