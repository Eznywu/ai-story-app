import type { Metadata } from "next";
import Link from "next/link";
import "@/app/page.css";
import { AppChromeBar } from "@/app/components/AppChromeBar";

export const metadata: Metadata = {
  title: "Terms — Bedtime Story",
  description:
    "Terms of use for Bedtime Story, including membership, AI features, and third-party providers.",
};

const LAST_UPDATED = "April 2, 2026";

export default function TermsPage() {
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
        Terms of Use
      </h1>
      <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.95rem" }}>
        Last updated: {LAST_UPDATED}
      </p>

      <p style={{ marginTop: "1.25rem" }}>
        These Terms of Use (“Terms”) govern your use of <strong>Bedtime Story</strong> (the “App”) and related online
        services provided by the developer identified as the seller on the App Store (“we,” “us,” or “our”). By
        downloading, accessing, or using the App, you agree to these Terms. The App uses <strong>third-party AI,
        voice, and image services</strong>; those services have separate terms and may change availability,
        pricing, or behavior outside our control.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Apple App Store</h2>
      <p>
        If you obtained the App from Apple’s App Store, you acknowledge that these Terms are between you and us, not
        Apple. Apple has no obligation to provide support for the App. Apple is not responsible for the App or its
        content, maintenance, or claims relating to the App, except where required by Apple’s terms. Apple and its
        subsidiaries are third-party beneficiaries of these Terms: Apple may enforce these Terms against you as a
        third-party beneficiary.
      </p>
      <p>
        Your use of the App must also comply with the{" "}
        <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" rel="noopener noreferrer">
          Licensed Application End User License Agreement
        </a>{" "}
        (“Apple Standard EULA”) applicable to App Store applications, except where these Terms provide additional or
        different terms—in which case these Terms control as between you and us to the extent permitted by Apple.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Eligibility</h2>
      <p>
        You must be old enough to enter a binding contract where you live (and at least the age required by Apple’s
        terms for your region). If you allow a minor to benefit from content you create in the App, you are
        responsible for their supervision and for your use of the App.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Accounts, membership, and sample mode</h2>
      <p>
        Certain features require you to <strong>sign in</strong> and, where we use it, to activate{" "}
        <strong>membership</strong> with a code or other credential we provide (or with a subscription or purchase if
        we offer one). Until you do, you may only have access to a sample story, limited narration, or other
        restricted functionality as implemented in the App. You are responsible for keeping your login credentials
        confidential. You may not share membership codes or circumvent access controls.
      </p>
      <p>
        Optional <strong>kid profiles</strong>, <strong>character profiles</strong>, and <strong>reading stats</strong>{" "}
        may be stored only on your device; you choose whether to use that information when generating stories.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>License</h2>
      <p>
        Subject to these Terms, we grant you a personal, non-exclusive, non-transferable, revocable license to install
        and use the App for your own lawful, non-commercial or personal purposes, in accordance with the App Store
        rules and applicable law. You may not copy, modify, reverse engineer, or distribute the App except as
        permitted by law.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Accounts and purchases</h2>
      <p>
        Features that involve payment or subscriptions, if offered, will be presented in the App and processed in
        accordance with Apple’s rules. Unless stated otherwise at the time of purchase, subscriptions renew until
        canceled in your Apple ID account settings. Taxes and pricing are as shown at checkout.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>AI-generated content and third-party models</h2>
      <p>
        The App may generate stories, audio, images, or other content using artificial intelligence operated by
        vendors such as OpenAI, ElevenLabs, Google, or others we may add or substitute. You may provide optional
        guidance (including themes, moods, series shape, educational goals, or moral lessons); such fields are
        processed as part of your request. To improve variety, our systems may also include{" "}
        <strong>short excerpts from other stories saved on the same backend</strong> in prompts—do not save highly
        sensitive information in stories if that concerns you. Generated content{" "}
        <strong>may be inaccurate, incomplete, biased, or inappropriate</strong> for a particular child or situation.
        Outputs can vary run-to-run. You are solely responsible for reviewing all generated content before sharing it
        with children or others.
      </p>
      <p>
        We do not guarantee accuracy, safety, completeness, availability of any model or provider, or fitness for any
        purpose. Do not rely on generated content for medical, legal, safety-critical, or other professional advice.
        If something does not seem right, do not use it.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Voice features and cloning</h2>
      <p>
        If the App offers text-to-speech or voice cloning, you agree that: (a) you will provide recordings{" "}
        <strong>only of yourself</strong> or of another adult who has given you clear, informed consent to create a
        synthetic voice through our voice vendor; (b) you will not impersonate others, deceive listeners, or use cloned
        voices for fraud, harassment, or unlawful purposes; (c) you are responsible for complying with laws and
        third-party rights (including publicity and privacy rights) governing voice and biometric-style data in your
        region; (d) recordings you upload pass through our systems and are sent to our voice vendor under their terms.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul style={{ paddingLeft: "1.25rem" }}>
        <li>Use the App in violation of law or third-party rights;</li>
        <li>
          Attempt to interfere with or overwhelm the Services, probe or bypass security, or access non-public systems
          or credentials;
        </li>
        <li>Use automated means to scrape, bulk-download, or stress-test the Services without our prior written consent;</li>
        <li>Use the App to generate or distribute unlawful, harassing, hateful, sexually explicit, or violent content;</li>
        <li>Use the App to exploit, endanger, or harm minors;</li>
        <li>Misrepresent your identity or use another person’s voice or likeness without authorization;</li>
        <li>Circumvent technical limitations, usage rules, export controls, or payment requirements.</li>
      </ul>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>User content</h2>
      <p>
        You retain ownership of content you submit, subject to the license below. You represent that you have the
        rights needed for your inputs and that you use a child’s name or other details only with appropriate
        permission from a parent or guardian when required. You grant us a worldwide, non-exclusive license to host,
        process, transmit, display, and create derivative works (including AI outputs) and to use saved content in
        aggregated or excerpt form for features such as repetition reduction, as described in our Privacy Policy. We
        may remove content that violates these Terms or that we are required to remove.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Intellectual property</h2>
      <p>
        The App, branding, and our materials are owned by us or our licensors and protected by intellectual property
        laws. Except for the license above, no rights are granted. Rights in AI outputs may be unsettled or vary by
        jurisdiction and provider terms; you are responsible for how you use and share outputs.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Third-party services</h2>
      <p>
        The App relies on independent third parties (including AI, voice, image, and hosting providers). Their services
        are subject to their own terms, privacy policies, uptime, and acceptable use rules.{" "}
        <strong>We are not responsible for third-party services, outages, model behavior, pricing changes,
        discontinuations, or data practices.</strong> If a provider limits or terminates access, features may degrade
        or stop without liability to you except as required by law.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Disclaimer of warranties</h2>
      <p>
        THE APP AND SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
        DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. SOME JURISDICTIONS DO NOT ALLOW CERTAIN DISCLAIMERS; IN THOSE
        CASES, DISCLAIMERS APPLY TO THE FULLEST EXTENT PERMITTED.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE (AND OUR AFFILIATES, LICENSORS, AND PROVIDERS) WILL NOT
        BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
        DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE APP OR SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE
        POSSIBILITY. OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE APP OR SERVICES WILL NOT EXCEED THE GREATER OF
        (A) THE AMOUNT YOU PAID US FOR THE APP OR SERVICES IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE
        HUNDRED U.S. DOLLARS (USD $100), UNLESS APPLICABLE LAW REQUIRES OTHERWISE. SOME JURISDICTIONS LIMIT CERTAIN
        EXCLUSIONS OR LIMITATIONS; IN THOSE CASES, LIMITS APPLY TO THE FULLEST EXTENT PERMITTED.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Indemnity</h2>
      <p>
        You will defend and indemnify us and our affiliates and personnel against claims, damages, losses, and expenses
        (including reasonable attorneys’ fees) arising from your use of the App, your content, your voice samples, or
        your breach of these Terms, to the extent permitted by law.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Termination</h2>
      <p>
        We may suspend or terminate access to the App or Services if you violate these Terms or if we cease offering
        the App. Provisions that by their nature should survive (including licenses for processing to wind down,
        disclaimers, limitations, indemnity, and governing law) will survive termination.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Changes</h2>
      <p>
        We may modify these Terms by posting an updated version and updating the “Last updated” date. Continued use
        after changes become effective constitutes acceptance, except where stricter consent is required by law or
        Apple. If you do not agree, stop using the App and uninstall it.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction where the developer is established, without regard to
        conflict-of-law principles, except where mandatory consumer protection laws in your country require
        otherwise. Courts in that jurisdiction (subject to mandatory rules) have exclusive jurisdiction unless
        applicable law requires a different forum. Nothing limits your right to bring a claim in small claims court
        where eligible.
      </p>

      <h2 style={{ fontSize: "1.15rem", marginTop: "2rem" }}>Contact</h2>
      <p>
        For questions about these Terms, use the support URL or developer contact email on our App Store product page
        for Bedtime Story.
      </p>
    </main>
  );
}
