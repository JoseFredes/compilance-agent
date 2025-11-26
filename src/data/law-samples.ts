/**
 * Sample law texts for demonstration and fallback
 * These are curated excerpts focusing on data protection and compliance obligations
 */

export const LAW_TEXT_SAMPLES: Record<string, string> = {
  LEY_21521: `
LEY 21.521 - FINTECH LAW

Article 1: This law regulates Financial Service Providers (FSP) that use technological platforms to offer financial services, establishing a regulatory framework that promotes financial innovation, competition, and user protection.

Article 12 - Personal Data Protection:
FSPs must:
a) Adopt appropriate technical and organizational measures to protect personal data of their clients against unauthorized access, loss, alteration, or disclosure.
b) Ensure confidentiality, integrity, and availability of information.
c) Inform data subjects about the processing of their personal data, including purpose, recipients, and data subject rights.
d) Obtain express and informed consent from the data subject for personal data processing, except for legal exceptions.
e) Allow the exercise of rights of access, rectification, deletion, and opposition.
f) Not transfer data to third parties without authorization from the data subject or legal basis.
g) Implement data retention and secure deletion policies.

Article 15 - Information Security:
FSPs must implement:
- Encryption of sensitive data in transit and at rest
- Multi-factor authentication for account access
- Continuous monitoring of threats and vulnerabilities
- Security incident response plans
- Annual security audits

Article 18 - Coordination with CMF:
FSPs are subject to supervision by the Financial Market Commission (CMF) and must report security incidents affecting personal data within 24 hours.

Sanctions: Non-compliance may result in fines of up to 10,000 UF and revocation of authorization to operate.
  `,

  LEY_19496: `
LAW 19.496 - CONSUMER PROTECTION LAW

Article 3 - Consumer Rights:
Consumers have the right to:
a) Free choice of goods or services
b) Truthful and timely information about goods and services
c) Not to be arbitrarily discriminated against
d) Safety in consumption
e) Adequate and timely repair and compensation
f) Protection of their personal data

Article 12A - Consumer Data Protection:
The provider that collects, stores, or uses personal data from consumers must:

1. Inform clearly and understandably:
   - The specific purpose of data processing
   - Recipients or categories of recipients
   - The mandatory or optional nature of providing data
   - The consequences of not providing data
   - The rights of the data subject

2. Purpose Principle:
   - Only use data for informed and consented purposes
   - Not use data for advertising purposes without express consent
   - Not share data with third parties without authorization

3. Consumer Rights:
   a) Right of access: know what data is held
   b) Right of rectification: correct inaccurate data
   c) Right of deletion: request deletion of data
   d) Right of opposition: oppose to data processing

4. Data Security:
   - Implement appropriate security measures
   - Notify SERNAC and data subjects in case of security breaches
   - Retain data only for the necessary time

Article 23 - Provider Database:
Providers managing consumer databases must register them in the SERNAC public registry.

Article 24 - Violations and Sanctions:
Improper use of personal data constitutes a serious violation, punishable by:
- Fines of up to 300 UTM
- Publication of the sanction
- Compensation for damages to those affected

Article 28A - Direct Marketing:
Unsolicited advertising is prohibited. Consumers must be able to opt out of receiving commercial communications (opt-out).
  `,

  LEY_20393: `
LAW 20.393 - CORPORATE CRIMINAL LIABILITY LAW

Article 1: Establishes criminal liability of legal entities for crimes of:
- Money laundering (Law 19.913)
- Terrorism financing (Law 18.314)
- Bribery (articles 250 and 251 Penal Code)
- Receiving stolen goods (article 456 bis A Penal Code)
- Corruption between individuals
- Embezzlement
- Disloyal administration
- Incompatible negotiation

Article 3 - Crime Prevention Model (CPM):
Companies can be exempt from liability if they implement a certified CPM that includes:

1. Appointment of Prevention Officer:
   - Independent from management
   - With sufficient resources and autonomy

2. Risk Identification and Analysis:
   - Mapping of risky processes and activities
   - Assessment of probability and impact
   - Periodic review (minimum annually)

3. Policies and Procedures:
   - Code of conduct
   - Anti-bribery and anti-corruption policies
   - Due diligence procedures
   - Financial and accounting controls

4. Training and Communication:
   - Mandatory training programs
   - Communication and reporting channels
   - Policy dissemination

5. Monitoring and Auditing:
   - Continuous review of controls
   - Internal and external audits
   - Investigation of reports

PERSONAL DATA PROTECTION IN THE CPM:

Article 4 bis - Personal Data Processing:
When the CPM involves personal data processing (internal investigations, due diligence, transaction monitoring), the company must:

a) Legal basis: Have legal basis (consent, legitimate interest, legal compliance)
b) Proportionality: Limit collection to the minimum necessary
c) Confidentiality: Restrict access only to authorized personnel
d) Security: Implement technical protection measures
e) Limited retention: Retain data only for the necessary time (recommended: 5 years for due diligence records)
f) Data subject rights: Inform about rights, although they may be limited by investigation

Record of Operations:
- Document all investigations and their results
- Protect the identity of whistleblowers
- Comply with data protection regulations when reporting to authorities

Article 6 - Sanctions:
- Dissolution of the legal entity (in serious cases)
- Fines from 200 to 20,000 UTM
- Temporary or permanent prohibition to contract with the State
- Loss of tax benefits
  `,

  LEY_19886: `
LAW 19.886 - PUBLIC PROCUREMENT LAW

Article 1: Regulates administrative procurement of supplies and services through the ChileCompra system.

Article 10 - Publicity and Transparency:
All tenders must be published on the portal www.mercadopublico.cl, including:
- Tender specifications
- Questions and answers
- Received offers
- Evaluations and award
- Signed contracts

PERSONAL DATA PROCESSING:

Article 15 bis - Data Protection in Public Procurement:

1. Bidder Data:
   - Tax ID, name or business name, address
   - Legal representatives
   - Financial and tax information
   - Labor and social security background

   Purpose: Evaluation of offers, award, and contract compliance
   Legal basis: Compliance with legal obligation (Law 19.886)

2. Publicity vs Privacy:
   Although there is a principle of publicity, the following must be protected:
   - Sensitive personal data (health, beliefs)
   - Trade secrets
   - Detailed financial information of natural persons

   Public information: name, tax ID, awarded amount, contract object

3. Obligations of the Public Body:
   a) Inform bidders about data processing
   b) Limit publication to strictly necessary data
   c) Implement security measures in systems
   d) Retain data according to public archives regulations
   e) Allow exercise of data subject rights (with limitations for public interest)

4. Access to Information:
   Third parties can request public information according to Law 20.285 (Transparency), but it must be balanced with personal data protection.

5. Security in ChileCompra:
   - Authentication via ClaveÚnica
   - Encrypted communications
   - Access traceability
   - Periodic backups

Retention Period: Minimum 5 years from contract completion (Law 19.880)

Sanctions: Misuse of personal data by public officials may constitute serious administrative misconduct and crimes against privacy.
  `,

  LEY_19913: `
LAW 19.913 - FINANCIAL INTELLIGENCE UNIT (UAF) LAW

Article 1: Creates the UAF to prevent and impede the use of the financial system for money laundering and terrorism financing.

Article 3 - Obligated Subjects:
Must report to the UAF:
- Banks and financial institutions
- Exchange houses
- Factoring, leasing companies
- Casinos and gambling houses
- Stock brokers, insurance companies
- Notaries, registrars
- Investment advisory companies
- Virtual asset service providers

REPORTING OBLIGATIONS AND PERSONAL DATA:

Article 3 bis - Suspicious Operation Reports (SOR):
Obligated subjects must report to UAF operations that present indications of money laundering or terrorism financing.

Personal data in SOR:
- Complete client identification (tax ID, name, address)
- Economic activity and profession
- Source of funds
- Nature and amount of operations
- Transaction patterns
- Relationship with other clients or third parties

Article 4 - Know Your Customer (KYC) Duty:
Obligated subjects must:
1. Identify and verify customer identity
2. Know the customer's economic activity
3. Determine the source of funds
4. Continuously monitor transactions
5. Maintain updated records

PERSONAL DATA PROTECTION:

Article 5 - Personal Data Processing:

1. Legal Basis: Data processing is authorized by law to comply with anti-money laundering prevention obligations (does not require data subject consent).

2. Applicable Principles:
   a) Necessity: Only collect data necessary for due diligence
   b) Proportionality: Level of verification according to customer risk
   c) Confidentiality: Protect collected information
   d) Security: Appropriate technical and organizational measures

3. Prohibition to Inform Customer:
   CRITICAL: It is prohibited to inform the customer that a SOR has been submitted about their operations (art. 4 final paragraph)
   Sanction: Up to 5 years in prison for revealing SOR

4. Record Retention:
   - Identification documents: 5 years from end of relationship
   - Transaction records: 5 years from the operation
   - Suspicious operation analysis: indefinitely

5. Restricted Access:
   Only authorized personnel can access:
   - Customer database
   - Monitoring systems
   - Suspicious operation reports

6. Information Sharing:
   The UAF can share information with:
   - Public Prosecutor's Office
   - Police (PDI, Carabineros)
   - SII, Customs, CMF, other superintendencies
   - Foreign financial intelligence units (with agreement)

Article 7 - Security Measures:
Obligated subjects must:
- Implement secure storage systems
- Encryption of sensitive data
- Role-based access control
- Periodic audits
- Contingency and recovery plans

Article 10 - Limited Data Subject Rights:
Rights of access, rectification, and deletion may be limited when:
- They interfere with ongoing investigations
- They compromise the effectiveness of the prevention system
- They are requested by a data subject under investigation

Article 20 - Sanctions:
For non-compliance with obligations:
- Warning
- Fines from 50 to 15,000 UF
- Suspension of authorization to operate
- Revocation of authorization
- Criminal liability for concealment if there is intent
  `,
};
