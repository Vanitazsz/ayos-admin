import { LegalShell, LegalSection } from '../components/LegalShell';

export function TermsView() {
  return (
    <LegalShell
      title="Terms of Service"
      effectiveDate="August 10, 2026"
    >
      <LegalSection heading="1. Acceptance of Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the A-yos
          Admin application and related services operated by <span className="text-foreground">[Company Name]</span>{' '}
          (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing the A-yos Admin
          application, you acknowledge that you have read, understood, and agree to be bound by
          these Terms and our Privacy Policy.
        </p>
        <p>
          If you do not agree to these Terms, you must not access or use the application.
        </p>
      </LegalSection>

      <LegalSection heading="2. Eligibility and Access">
        <p>
          Access to the A-yos Admin application is limited to authorized administrators and
          personnel of A-yos and its partners. Accounts are granted at our discretion and may be
          revoked at any time without prior notice.
        </p>
        <p>You are responsible for:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Maintaining the confidentiality of your credentials.</li>
          <li>All activity that occurs under your account.</li>
          <li>Notifying us immediately of any unauthorized use or security breach.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Acceptable Use">
        <p>You agree not to use the application to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Engage in any unlawful, fraudulent, or deceptive activity.</li>
          <li>Access or attempt to access data outside your authorized scope.</li>
          <li>Alter platform settings or records without proper authorization.</li>
          <li>Introduce malware, viruses, or any code designed to disrupt the platform.</li>
          <li>Probe, scan, or test the vulnerability of the platform without permission.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Administrator Responsibilities">
        <p>
          As an administrator, you may have access to personal and sensitive information of
          customers, workers, and other users. You agree to handle such information in accordance
          with our Privacy Policy, applicable data protection laws, and the principle of least
          privilege. Use of platform data is limited to legitimate platform operations.
        </p>
      </LegalSection>

      <LegalSection heading="5. Intellectual Property">
        <p>
          All software, documentation, design, and content of the A-yos Admin application are the
          property of <span className="text-foreground">[Company Name]</span> or its licensors and
          are protected by intellectual property laws. These Terms do not grant you any ownership
          or intellectual property rights in the application.
        </p>
      </LegalSection>

      <LegalSection heading="6. Confidentiality">
        <p>
          You agree to keep confidential all non-public information you obtain through your use of
          the application, including business operations, financial data, and personal information
          of users. This obligation survives the termination of your access.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, <span className="text-foreground">[Company Name]</span>{' '}
          shall not be liable for any indirect, incidental, special, consequential, or punitive
          damages, or any loss of profits, data, or goodwill, arising out of or in connection with
          your use of the application.
        </p>
        <p>
          Our total liability shall not exceed the amount you paid, if any, for access to the
          application in the twelve (12) months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection heading="8. Termination">
        <p>
          We may suspend or terminate your access to the application at any time, with or without
          cause and with or without notice. Upon termination, your right to access the application
          ceases immediately. Provisions that by their nature should survive termination shall
          survive, including sections on confidentiality, intellectual property, and limitation of
          liability.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to These Terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes by
          posting the revised Terms within the application. Your continued use of the application
          after the effective date of the revised Terms constitutes acceptance of the changes.
        </p>
      </LegalSection>

      <LegalSection heading="10. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the
          Republic of the Philippines. Any disputes arising under these Terms shall be subject to
          the exclusive jurisdiction of the courts of the Philippines.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact Us">
        <p>
          If you have questions about these Terms, please contact us at{' '}
          <a
            href="mailto:[legal@ayos.ph]"
            className="text-brand-link hover:underline transition-colors"
          >
            [legal@ayos.ph]
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
