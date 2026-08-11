import { LegalShell, LegalSection } from '../components/LegalShell';

export function PrivacyView({ variant }) {
  return (
    <LegalShell
      title="Privacy Policy"
      effectiveDate="August 10, 2026"
      variant={variant}
    >
      <LegalSection heading="1. Introduction">
        <p>
          This Privacy Policy explains how <span className="text-foreground">[Company Name]</span>{' '}
          (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) collects, uses, discloses, and
          protects information in connection with the A-yos Admin application and the A-yos
          platform. We are committed to safeguarding your privacy and handling personal data in
          accordance with applicable data protection laws, including the Philippine Data Privacy
          Act of 2012.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information We Collect">
        <p>Depending on your role and use of the platform, we may collect:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="text-foreground">Account information:</span> name, email address,
            phone number, and administrator role.
          </li>
          <li>
            <span className="text-foreground">Usage information:</span> log-in times, pages
            accessed, features used, and audit log entries for platform operations.
          </li>
          <li>
            <span className="text-foreground">Platform data:</span> information about customers,
            workers, bookings, and payments that you access in the course of your duties.
          </li>
          <li>
            <span className="text-foreground">Device and technical data:</span> IP address, browser
            type, and device information where relevant to security.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How We Use Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, maintain, and secure the A-yos Admin application.</li>
          <li>Verify identities and manage access controls.</li>
          <li>Operate, monitor, and audit platform activities.</li>
          <li>Prevent, detect, and investigate fraud or security incidents.</li>
          <li>Comply with legal and regulatory obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Legal Basis for Processing">
        <p>
          We process personal data based on one or more lawful grounds, including your consent,
          the performance of a contract, compliance with legal obligations, and our legitimate
          interest in operating and securing the platform.
        </p>
      </LegalSection>

      <LegalSection heading="5. Information Sharing and Disclosure">
        <p>We do not sell personal information. We may disclose information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>To service providers who assist us in operating the platform, under confidentiality obligations.</li>
          <li>To authorized personnel who need access to perform their duties.</li>
          <li>When required by law, regulation, or legal process.</li>
          <li>To protect the rights, property, or safety of A-yos, its users, or the public.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Data Retention and Security">
        <p>
          We retain personal data only for as long as necessary to fulfill the purposes described
          in this Policy or as required by law. We implement appropriate technical and
          organizational safeguards, including access controls and encryption, to protect data
          against unauthorized access, alteration, disclosure, or destruction.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cookies and Analytics">
        <p>
          The application may use cookies and similar technologies to maintain secure sessions and
          improve usability. We may also use analytics tools to understand how the application is
          used, in aggregated form, to improve performance and reliability.
        </p>
      </LegalSection>

      <LegalSection heading="8. Your Rights">
        <p>
          Subject to applicable law, you may have the right to access, correct, or delete personal
          data we hold about you, to object to or restrict certain processing, and to lodge a
          complaint with the National Privacy Commission (NPC) of the Philippines.
        </p>
        <p>
          To exercise any of these rights, contact us using the details in the Contact Us section
          below.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will post any changes within the
          application and update the effective date above. Your continued use of the application
          after the effective date constitutes acceptance of the updated Policy.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact Us">
        <p>
          If you have questions about this Privacy Policy or how we handle personal data, please
          contact us at{' '}
          <a
            href="mailto:[privacy@ayos.ph]"
            className="text-brand-link hover:underline transition-colors"
          >
            [privacy@ayos.ph]
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
