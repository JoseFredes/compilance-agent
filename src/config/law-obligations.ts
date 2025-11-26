/**
 * Structured obligations for each law
 * These provide consistent, accurate compliance guidance
 */

export const LAW_OBLIGATIONS: Record<string, string> = {
  LEY_21521: `As a fintech company under Law 21.521, you must:

• **Data Protection Measures**: Implement appropriate technical and organizational security measures to protect customer personal data against unauthorized access, loss, alteration, or disclosure
• **User Consent**: Obtain express and informed consent from data subjects before processing their personal data, clearly explaining the purpose, recipients, and their rights
• **Data Subject Rights**: Enable customers to exercise their rights of access, rectification, deletion, and opposition to data processing
• **Security Incidents**: Report any security incidents affecting personal data to the Financial Market Commission (CMF) within 24 hours
• **Data Retention**: Implement policies for secure data retention and deletion, only keeping data for the necessary time period
• **Third-Party Transfers**: Do not transfer personal data to third parties without explicit authorization from the data subject or a legal basis`,

  LEY_19496: `Under Law 19.496 (Consumer Protection), your obligations include:

• **Transparent Data Usage**: Clearly inform consumers about how their personal data will be used, including specific purposes, recipients, and consequences of not providing the data
• **Purpose Limitation**: Only use consumer data for the purposes that were informed and consented to - do not use data for advertising without express consent
• **Consumer Rights**: Allow consumers to access, rectify, cancel, or oppose the processing of their personal data
• **Security Measures**: Implement appropriate security measures and notify SERNAC and affected consumers in case of data breaches
• **Marketing Opt-Out**: Provide consumers the ability to opt out of commercial communications - unsolicited advertising is prohibited
• **Database Registration**: Register consumer databases with SERNAC's public registry`,

  LEY_20393: `Under Law 20.393 (Corporate Criminal Liability), your crime prevention model must:

• **Data Processing in Investigations**: Establish legal basis for processing personal data in internal investigations and due diligence procedures
• **Proportionality**: Limit data collection to the minimum necessary for compliance and prevention purposes
• **Confidential Handling**: Restrict access to investigation data only to authorized personnel
• **Whistleblower Protection**: Protect the identity of individuals who report compliance concerns
• **Record Retention**: Maintain due diligence and investigation records for at least 5 years with appropriate security measures
• **Authority Reporting**: Comply with data protection regulations when reporting findings to authorities`,

  LEY_19886: `For public procurement under Law 19.886, you must:

• **Bidder Data Protection**: Handle personal data of bidders (ID, legal representatives, financial information) only for evaluation and contract purposes
• **Transparency vs Privacy**: Balance public transparency requirements with protection of sensitive personal data and commercial secrets
• **Secure Systems**: Implement security measures in procurement systems, including authentication and access traceability
• **Data Retention**: Retain procurement-related personal data for minimum 5 years from contract completion
• **Public Disclosure Limits**: Only publish necessary personal data (name, ID, award amount) while protecting sensitive information`,

  LEY_19913: `As a subject obligated under Law 19.913 (AML), you must:

• **Know Your Customer (KYC)**: Identify and verify customer identity, understand their economic activity, and determine the source of funds
• **Continuous Monitoring**: Implement systems to continuously monitor transactions and identify suspicious patterns
• **Suspicious Activity Reporting**: Report suspicious operations to the Financial Intelligence Unit (UAF) - note you cannot inform customers about these reports
• **Record Retention**: Maintain identification documents for 5 years after relationship ends, and transaction records for 5 years from the operation
• **Data Security**: Implement secure storage systems with encryption, role-based access control, and regular audits
• **Limited Data Subject Rights**: You may limit customer rights to access or delete data when it would interfere with ongoing investigations`,
};

/**
 * Gets structured obligations for a law, with optional LLM enhancement
 */
export const getObligationsForLaw = (lawId: string): string => {
  return (
    LAW_OBLIGATIONS[lawId] ||
    `Companies must comply with data protection and privacy requirements under this law, including maintaining security measures, obtaining user consent, and implementing appropriate data handling procedures.`
  );
};
