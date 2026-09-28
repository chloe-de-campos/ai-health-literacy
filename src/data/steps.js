// steps.js
// Each step drives both the narrative panel and the fingerprint state.
// citationIds reference SOURCES array by id.

const STEPS = [
  {
    step: 0,
    heading: 'The Search',
    body: `To find eligible participants, researchers comb through patient records looking for the right lab values, the right diagnosis codes, AND the right clinical history.

While a human coordinator might review a few hundred charts, AI can screen hundreds of thousands of records across entire health systems at once. This expands trial reach to include participants from underrepresented groups.[18]

Though your record was reviewed for research purposes before you had any say in it, that's a more limited intrusion than it sounds: the algorithm only checks whether you match the criteria and moves on — it doesn't copy or retain your data.[1]`,
    citationIds: [1, 18],
    question: 'Who authorized the screening of my record, and can I see the contract governing what the sponsor can do with the fact that I was found eligible?',
    questionHint: 'Look for a specific IRB approval number. "Our IRB approved it" without details is a non-answer.',
  },
  {
    step: 1,
    heading: 'The Agreement',
    body: `Before you join a trial, you have to understand the details and consent for your data to be used.

Informed consent is a legal requirement.[11] Under the Common Rule, the federal regulation governing human subjects research, you must legally be told what data will be collected, how it will be used, and what rights you retain. You must also be allowed to withdraw at any time.

These protections existed long before AI. What's harder to anticipate is the range of things your data might eventually be used for that no consent form can name in advance.`,
    citationIds: [11],
    question: 'If I withdraw, what will happen to data already collected, and does my consent cover using my data in AI model training?',
    questionHint: 'Retained data is normal and legal. What matters is whether AI training is explicitly named in your consent form — if it isn\'t, ask for a written clarification.',
  },
  {
    step: 2,
    heading: 'The Record Grows',
    body: `Once you're enrolled, you begin to generate new data as part of the trial.

Depending on the trial you join, you may use wearables to log activity, heart rate, and sleep; surveys to capture symptoms; or regular lab draws to track your biological response. An AI system may review all of this new data continuously, flagging safety signals faster than a human reviewer could. Earlier detection of side effects is one of the more concrete benefits AI brings to trial monitoring.[18]`,
    citationIds: [18],
    question: 'Which data streams are required, which are optional, and can I opt out of any without affecting my place in the trial?',
    questionHint: 'Any "all or nothing" answer deserves follow-up. Most trials have optional components, and a good coordinator can point to which ones.',
  },
  {
    step: 3,
    heading: 'The Vulnerabilities',
    body: `Your data can't just be set away from the hospital database to be analyzed immediately, since it contains sensitive information that is directly linked to you. A study from 2000 found that ZIP code, date of birth, and sex alone were sufficient to uniquely identify 87% of Americans from publicly available data.[7] It works because many ZIP codes are small enough that your exact birthday and sex make you the only person who fits all three.

However, clinical studies have strategies to protect study data from allowing people to identify participants. A 2022 analysis of more than 10,000 U.S. news publications found no documented cases of patient re-identification from clinical research data.[13]

But the underlying arithmetic carries over. Even without your name, certain combinations of fields — a rare diagnosis, a specific age bracket, a small ZIP region — can narrow a record to very few people. The fields shown in red are the ones most likely to give you away — not on their own, but in combination.`,
    citationIds: [7, 13],
    question: 'What de-identification method does this trial use: HIPAA Safe Harbor or Expert Determination? Who certified it?',
    questionHint: 'Safe Harbor and Expert Determination are the two legal standards — they should be able to name one. If they can\'t, ask to speak with the data privacy officer.',
  },
  {
    step: 4,
    heading: 'The Safeguards',
    intro: `Federal law requires trial sponsors to address several fields before your data can enter a shared dataset.[10] Here's what those protections look like in practice.`,
    subSteps: [
      {
        technique: 'Suppression',
        body: 'Direct identifiers, like your name, address, Social Security number, and clinical notes, are deleted entirely from your dataset.',
        citationIds: [10],
      },
      {
        technique: 'Generalization',
        body: 'Quasi-identifiers get blurred into more general buckets. Your exact ZIP becomes a three-digit region, your birthdate becomes an age bracket, your precise diagnosis becomes a broader category.',
        citationIds: [10],
      },
      {
        technique: 'Noise Addition',
        body: "Small random shifts are added to lab values so it's no longer possible to find you directly from your lab data.",
        citationIds: [10],
      },
      {
        isOutro: true,
        body: `These three protections address the re-identification problem directly. Your name is gone. Your exact ZIP is gone. The precise values that could be matched back to you have been blurred or shifted.\n\nUnder HIPAA Safe Harbor, a record that has passed through this process is no longer legally classified as protected health information. It is considered to be no longer traceable to you, and is therefore not subject to the protective rules that governed it when it was yours.`,
      },
    ],
    citationIds: [10],
    question: 'Can I see the data use agreement governing my de-identified record, and does it cover use by commercial AI companies?',
    questionHint: 'You have a right to see this document. Reluctance to share it, or "I\'d have to check on that," is worth noting.',
  },
  {
    step: 5,
    heading: 'The Pool',
    body: `Your de-identified record now leaves the institution where it was collected and joins a shared research dataset.


This is where your data may move into commercial hands. By 2020, Mayo Clinic had licensed de-identified patient data to at least 16 companies for AI development.[14] Since de-identified data is not classified as protected health information under federal law,[10] it can be licensed without your explicit consent. Companies use it for purposes like AI model training, drug repurposing research, and health economics analysis. Although not a direct risk to your privacy, it's worth knowing where your data might end up. Data use agreements govern who can access these datasets and for what purpose. For the re-identification risk you saw in step four, the framework works as designed.`,
    citationIds: [10, 14],
    question: 'Will my de-identified data be shared with commercial partners, and under what agreement?',
    questionHint: 'De-identified data can legally be shared without your explicit consent. What matters is whether the data use agreement actually limits how partners can use it — "standard terms" is too vague.',
  },
  {
    step: 6,
    heading: 'Finding Patterns',
    body: `To detect a treatment effect in a subgroup (a specific age range, rare diagnosis, or  genetic variant) researchers typically need thousands of records with the right combination of characteristics. No single institution sees enough of the same patients to get there.

Pooled datasets change that arithmetic. AI models scan for patterns across the full dataset: certain lab values paired with certain diagnoses, predicting who responds to a treatment and who doesn't. Using this analysis, scientists are able to make progress on understanding whether a treatment will be effective for a condition.

For common conditions, your record is one of many. For rare ones, it may be one of just a few, which makes it both more scientifically valuable and harder to fully anonymize.[4]`,
    citationIds: [4],
    question: 'Will AI models trained on this dataset be commercialized, and do participants have any rights in that process?',
    questionHint: 'Most sponsors retain commercial rights to any discoveries — that\'s standard. What\'s rarer is any form of participant benefit-sharing. If it exists, it should be in writing.',
  },
  {
    step: 7,
    heading: 'The Risk of Inference',
    body: `In 2021, researchers demonstrated that depression and anxiety could be predicted from entirely non-psychiatric data — general health metrics, biometric measurements like blood pressure, and demographic and lifestyle information collected during routine health screenings — with no mental health assessments involved in the model.[15] The pattern was embedded in routine health data, and the model found it.

This is the difference between what your consent form covers and what your data reveals. Unlike re-identification, it can't be solved by manipulating the data, since there is nothing to suppress or generalize. The [[inference|a conclusion an AI model draws about you — something never directly recorded, but derived from patterns in your data across many records]] doesn't exist until the model runs. The consent form structurally cannot name it, because at the time you sign it, the inference doesn't exist yet.

Once generated, an inference can follow your de-identified record into downstream datasets, into commercial products, into systems you'll never know about. No U.S. federal law governs what happens to it — HIPAA covers the original record, not what can be derived from it.[10] The federal framework for human subjects research says nothing about AI inference.[11] `,
    citationIds: [15, 10, 11],
    question: "What can the sponsor do with inferences the model generates about me? Do the data use agreements covering my record extend to those inferences?",
    questionHint: 'Few sponsors have a clear policy here yet. If they don\'t know, that itself tells you something about how much thought has gone into downstream privacy.',
  },
  {
    step: 8,
    heading: 'Advanced Protections',
    body: `Differential privacy adds mathematical noise to the model training process itself, not just to the data, so that even sophisticated analysis cannot confirm whether your specific record was included, or what it contributed.[8] The protection extends beyond the record to what can be derived from it.

[[Federated learning|A technique where AI models are trained locally at your hospital without your data ever being copied or sent elsewhere — only mathematical pattern summaries leave the institution, never your records.]] keeps your data inside your hospital entirely. The model learns from patterns in your record without the record ever leaving the institution, which means it cannot be pooled, shared, or inferred against in downstream systems.[9]

Synthetic data replaces real records with statistically generated ones: artificial patients who don't exist but whose characteristics preserve the population patterns researchers need. A model trained on synthetic data learns from structure rather than from you.[12]

`,
    citationIds: [8, 9, 12],
    question: 'Does this trial use differential privacy, federated learning, or synthetic data? Do any of those protections apply to what the model might infer from my record?',
    questionHint: 'It\'s fine if a trial doesn\'t use these — they\'re advanced. But a coordinator who can name which protections do exist is a good sign.',
  },
  {
    step: 9,
    heading: 'Your Questions',
    body: `These risks aren't the same for everyone. If your participation reveals something with real consequences — a stigmatized diagnosis you haven't disclosed, a pregnancy, an identity — the stakes of a failure are higher for you than for someone else. The rarer your condition, the more uniquely identifiable your record may be.

A few things worth keeping in mind:

• The sensitive categories that represent inference risks in a clinical trial — your mental health, your pregnancy status, your identity — are likely already for sale. In 2023, Duke University researchers found data brokers openly selling lists of people flagged for depression, anxiety, and bipolar disorder, bundled with ethnicity, net worth, and ZIP code, for as little as $275 per 5,000 records.[16]

• Participation makes things possible. Across oncology drugs approved by the FDA, over 12,000 trial participants contributed to each drug's pre-license studies.[19] Participants often gain something concrete too: closer monitoring, more frequent contact with specialists, and sometimes access to treatments not yet available anywhere else.

What's right for someone else may not be right for you. These questions are how you figure out which is which.`,
    citationIds: [16, 19],
    question: "What does this trial's privacy record look like, and who do I contact if I have concerns after joining?",
    questionHint: 'A coordinator who can name a specific privacy officer — not just "contact us" — is a good sign. Ask for that person\'s contact information in writing.',
  },
];

export default STEPS;
