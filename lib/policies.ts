export const POLICY_VERSIONS={
 TERMS:"2026.10.05",
 PRIVACY:"2026.10.05",
 COMMUNITY_GUIDELINES:"2026.10.05"
} as const;

export type RequiredPolicyType=keyof typeof POLICY_VERSIONS;

export const REQUIRED_POLICIES=(Object.entries(POLICY_VERSIONS) as [RequiredPolicyType,string][])
 .map(([type,version])=>({type,version}));

export const LEGAL_EFFECTIVE_DATE="October 5, 2026";

export const LEGAL_DOCUMENTS={
 terms:{
  title:"Terms of Service",
  version:POLICY_VERSIONS.TERMS,
  sections:[
   ["Using OUTSiiDE","OUTSiiDE is an adults-only social platform. You must be at least 18, provide accurate account information, maintain account security, and use the service lawfully."],
   ["Accounts and security","One person may not operate duplicate accounts to evade enforcement, manipulate engagement, referrals, Battles, payouts, or platform rules. OUTSiiDE may use hashed network, device, authentication, and risk signals to detect abuse. Only one active login session is permitted per account at a time."],
   ["Content and conduct","You are responsible for content you create, upload, stream, send, or share. Content and conduct must follow the Community Rules, safety requirements, intellectual-property rules, and applicable law."],
   ["Coins, gifts and digital items","Coins, gifts, badges, Battle points, and other digital features are limited platform functionality and are not bank deposits, stored-value accounts, investments, or transferable currency unless OUTSiiDE expressly states otherwise. Refunds remain subject to the Refund Policy and applicable law."],
   ["Creators and payouts","Creator earnings are subject to eligibility, identity verification, tax onboarding, fraud review, chargeback adjustments, payout rules, and account standing. OUTSiiDE may hold or reverse pending amounts when required for fraud, disputes, refunds, chargebacks, legal obligations, or policy enforcement."],
   ["Battles","Battle scores, rankings, rewards, and features are subject to the Battle Program Rules. Manipulation, collusion, self-gifting schemes, bots, account farms, or exploitation may cause disqualification, holds, reversals, suspension, or removal."],
   ["Enforcement","OUTSiiDE may restrict, suspend, or terminate accounts and remove content for safety, fraud, legal, payment, or policy reasons. Qualifying enforcement actions may be appealable under the platform appeal process."],
   ["Service availability","Features may change, pause, or be disabled for maintenance, security, legal compliance, provider outages, or emergency operation. No feature is guaranteed to be continuously available."],
   ["Changes","Material changes may require you to accept a new policy version before continuing to use protected account features."]
  ]
 },
 privacy:{
  title:"Privacy Policy",
  version:POLICY_VERSIONS.PRIVACY,
  sections:[
   ["Information we collect","OUTSiiDE may collect account details, date of birth, profile content, posts, messages, livestream activity, reports, purchases, creator activity, payout status, device/browser information, and security events needed to operate the service."],
   ["Age information","Date of birth is used to enforce the 18+ requirement and is not displayed publicly."],
   ["Security and fraud data","OUTSiiDE may process hashed IP/network identifiers, user-agent/device information, session records, login events, payment risk signals, and linked-account indicators to prevent account abuse, fraud, takeover, platform manipulation, and duplicate-account evasion."],
   ["Payments and tax information","Payment cards, bank-account details, identity documents, SSNs, EINs, and taxpayer information should be collected and processed by approved payment, identity, or tax providers where practical. OUTSiiDE stores provider references and compliance status rather than full sensitive financial credentials."],
   ["How information is used","Information is used to provide the platform, personalize permitted experiences, secure accounts, process payments, operate creator programs, moderate content, investigate abuse, comply with law, maintain records, and improve reliability."],
   ["Sharing","Information may be shared with service providers such as hosting, database, streaming, email, storage, payments, fraud, identity, tax, analytics, and safety vendors when needed to operate OUTSiiDE, and with authorities when legally required."],
   ["Retention","OUTSiiDE retains information for operational, fraud, safety, financial, tax, dispute, and legal purposes as reasonably necessary. Account deletion does not require deletion of records that must lawfully be retained."],
   ["Your controls","Users may manage privacy settings, blocked users, sessions, notifications, profile information, and qualifying access/deletion requests through available account and support tools."],
   ["Policy changes","Material changes may require renewed acceptance."]
  ]
 },
 refund:{
  title:"Refund Policy",
  version:"2026.10.05",
  sections:[
   ["Digital purchases","Digital purchases are generally final after delivery or consumption."],
   ["Exceptions","OUTSiiDE can process refunds for duplicate charges, confirmed unauthorized charges, technical non-delivery, processor-required refunds, app-store-required refunds, and refunds required by law."],
   ["Chargebacks","Chargebacks and reversals remain recorded. Related creator earnings or Battle balances may be adjusted rather than deleting the original transaction."]
  ]
 },
 "creator-terms":{
  title:"Creator Terms",
  version:"2026.10.05",
  sections:[
   ["Eligibility","Creators must be 18+, in good standing, meet applicable program requirements, and complete required identity, tax, and payout onboarding before receiving cash payouts."],
   ["Earnings","Displayed earnings may be pending, held, adjusted, reversed, or unavailable until settlement and fraud/dispute review are complete."],
   ["Taxes","Creators are responsible for their own tax obligations. OUTSiiDE may require tax forms and may use approved providers to collect taxpayer information and prepare or deliver required information returns."],
   ["Conduct","Creators must follow Community Rules, livestream rules, Battle rules, copyright requirements, and platform safety controls."]
  ]
 },
 "battle-rules":{
  title:"Battle Program Rules",
  version:"2026.10.05",
  sections:[
   ["Fair play","No bots, self-gifting loops, coordinated fraud, fake engagement, account farms, collusion, stolen payment methods, or exploitation."],
   ["Scoring","Battle points and promotional multipliers affect competition scoring. They do not automatically multiply purchaser charges or creator cash earnings."],
   ["Revenue and rewards","Battle revenue allocation, creator earnings, reward-pool amounts, referral allocations, ranking boosts, bonuses, and featured placement are governed by current platform settings and eligibility rules."],
   ["Review","OUTSiiDE may pause, end, review, adjust, or void a Battle result when safety, fraud, technical error, or rule violations materially affect the competition."]
  ]
 },
 dmca:{
  title:"Copyright / DMCA Policy",
  version:"2026.10.05",
  sections:[
   ["Copyright","Users may only upload or stream content they have the right to use."],
   ["Notices","Copyright owners or authorized agents may submit a notice through OUTSiiDE Support identifying the work, allegedly infringing material, contact information, good-faith statement, accuracy/authority statement, and signature as required by applicable law."],
   ["Repeat infringement","OUTSiiDE may restrict or terminate repeat infringers where appropriate."]
  ]
 },
 safety:{
  title:"Safety & Reporting",
  version:"2026.10.05",
  sections:[
   ["Report, block, mute","Use report, block, and mute tools when available. Immediate threats or emergencies should be reported to appropriate local emergency services."],
   ["Review","Reports are reviewed in context. Filing a report does not itself establish a violation. OUTSiiDE may preserve evidence and account records needed for legitimate safety, fraud, or legal investigations."],
   ["Minor safety","OUTSiiDE is 18+ only. Suspected underage accounts may be restricted, reviewed, suspended, or removed."]
  ]
 },
 contact:{
  title:"Contact & Support",
  version:"2026.10.05",
  sections:[
   ["Support","Use the in-product Support Center for account access, payments, creator, Battle, safety, privacy, copyright, and technical issues."],
   ["Legal and compliance","Formal legal, tax, law-enforcement, and privacy-request contact channels will be published here before public launch."]
  ]
 }
} as const;
