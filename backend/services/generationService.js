// backend/services/generationService.js
//
// Proposal generation layer — the final step in the pipeline.
//
// Takes outputs from BOTH retrieval layers and produces a finished
// Upwork cover letter in the user's voice.
//
// Inputs:
//   queryProfile        — from queryUnderstandingService (clean_query,
//                         core_requirements, tech_stack, project_type, etc.)
//   portfolioResults    — from searchPortfolio() (matched past projects)
//   lowConfidencePortfolio — boolean: no strong portfolio match exists
//   toneResult          — from searchToneExamples() (best matching past proposal)
//   lowConfidenceTone   — boolean: no strong tone example match exists
//
// Output: { proposal: string, usage: object }
//
// Model choice: Claude Sonnet (claude-sonnet-4-6) — this is where the
// quality budget goes. Extraction (Groq/free) is cheap; generation is the
// one call worth paying for. Proposals are short (300-600 words) so cost
// per generation is low even with a capable model.
//
// TESTING MODE: using Groq free API instead of Anthropic.
// Swap back to Anthropic for production — see comment on generateProposal().

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// llama-3.3-70b-versatile is Groq's strongest free model for generation.
// Not as good as Claude Sonnet at tone mimicry but sufficient for testing
// whether the prompt structure and pipeline wiring are correct.
const GENERATION_MODEL = 'llama-3.3-70b-versatile';

// ─── Default tone fallback ────────────────────────────────────────────────────
// Used when toneRetrievalService returns lowConfidence: true — i.e. no past
// proposal is semantically close enough to serve as a reliable style reference.
// Includes a short hardcoded style sample so the model sees the voice in
// action, not just described — description alone is too weak for instruction
// following on smaller models.
const DEFAULT_TONE_DESCRIPTION = `
VOICE: Direct, confident, a little irreverent. Reads the JD carefully and
proves it in the opener. References specific past work by name with a concrete
detail about what was built. Honest about gaps. No flattery, no filler.

BANNED OPENERS — never use these or anything like them:

- "Hi there," / "Hi," / "Hello,"
- "I am writing to apply"
- "I am excited about this opportunity"
- "I would love to work on"
- "I am interested in this role"
- Any opener that starts with "I"
- Any opener that compliments the company ("Great project!", "Impressive brief!")

[Specific detail from THIS job] — that's the part that actually determines
whether this works.

I haven't built exactly this before, but the underlying problem — [one-line
description of the core engineering challenge] — is something I've solved
in a different context. [Reference ONE actual project from the portfolio
section provided for THIS job, using its real name and real details.] The
pattern that transfers: [name the specific transferable skill in plain words].

RULES:

- Open with something specific from the JD — a number, constraint, feature,
  or technical detail that proves you actually read it. Never a greeting.
- Reference past projects by name when relevant, using ONLY projects and
  details from the actual portfolio context provided for THIS job.
- Never reuse project names, numbers, technologies, metrics, or claims from
  this style guide as if they belong to the current job or portfolio.
- If there's no direct match, be honest and pivot to what transfers.
- Keep the writing natural and conversational, not formulaic.
- Do not force the "I haven't built exactly this before" pattern when a strong
  portfolio match exists.
- Do not force a question at the end.
- End naturally with either a short project-specific CTA or a genuinely useful
  technical question when one exists.
- Never use "What would help me scope this accurately" as a default phrase.
- 200–350 words is preferred. Use fewer words when the job is simple.
`.trim();

// ─── Prompt assembly ──────────────────────────────────────────────────────────

function buildToneSection(toneResult, lowConfidenceTone) {
  if (!lowConfidenceTone && toneResult?.ourResponse) {
    // Truncate to the first ~1000 characters — the opener and first few
    // paragraphs are where the voice is clearest. Pasting the entire
    // our_response (some are 4000+ chars) bloats the prompt past the point
    // where the model has enough output budget to actually write the proposal.
    const toneSnippet = toneResult.ourResponse.length > 1000
      ? toneResult.ourResponse.slice(0, 1000) + '\n\n[... rest of proposal omitted for brevity ...]'
      : toneResult.ourResponse;
    return `
## TONE & STYLE REFERENCE
The following is a real past proposal written in the exact voice you must match.
Study its structure, its opener, how it references past work, how it handles
things it hasn't done, and how it closes. Do not copy it — use it as a
style template only.

<past_proposal>
${toneSnippet}
</past_proposal>
`.trim();
  }

  // Fallback: no good tone match — use the default description instead
  return `
## TONE & STYLE GUIDE
No closely-matching past proposal was available as a style reference.
Follow these tone guidelines precisely:

${DEFAULT_TONE_DESCRIPTION}
`.trim();
}

function buildPortfolioSection(portfolioResults, lowConfidencePortfolio) {
  if (!portfolioResults || portfolioResults.length === 0) {
    return `
## PORTFOLIO CONTEXT
No portfolio projects were retrieved. Do not invent or reference any specific
past projects. Focus the proposal on relevant skills and transferable experience
described in general terms, and be honest that this specific domain is new.
`.trim();
  }

  const projectBlocks = portfolioResults.map((p, i) => {
    const roleText = p.text?.split('\n').find(l => l.startsWith('Role:'))?.replace('Role: ', '') || 'Not specified';
    const urlText = p.url ? p.url : (p.text?.split('\n').find(l => l.startsWith('URL: '))?.replace('URL: ', '').trim() || 'None');
    return `
Project ${i + 1}: ${p.title}
Role: ${roleText}
URL: ${urlText}
${p.text}
`.trim();
  }).join('\n\n---\n\n');

  if (lowConfidencePortfolio) {
    return `
## PORTFOLIO CONTEXT
No portfolio project closely matches this job. The projects below are the
closest available — reference them only where the connection is genuine and
explicitly frame them as transferable experience, not direct matches. Do not
stretch or imply a closer match than actually exists.

<portfolio_projects>
${projectBlocks}
</portfolio_projects>
`.trim();
  }

  return `
## PORTFOLIO CONTEXT
The following past projects are directly relevant to this job. Reference them
by name where appropriate. Do not reference any project not listed here, and
do not invent or exaggerate details beyond what is written.

<portfolio_projects>
${projectBlocks}
</portfolio_projects>
`.trim();
}

function buildJobSection(queryProfile, rawInput) {
  return `
## THE JOB
${queryProfile.clean_query}

Core requirements: ${queryProfile.core_requirements}
${queryProfile.tech_stack?.length ? `Tech stack mentioned: ${queryProfile.tech_stack.join(', ')}` : ''}
${queryProfile.industry_guess ? `Industry: ${queryProfile.industry_guess}` : ''}

${rawInput ? `Original Prompt / Client Instructions:\n${rawInput}` : ''}
`.trim();
}

function buildUserProfileSection(userProfile) {
  return `
## APPLICANT PROFILE & LINKS
GitHub Profile: ${userProfile?.githubUrl || 'None provided'}
Portfolio Website: ${userProfile?.portfolioUrl || 'None provided'}
LinkedIn Profile: ${userProfile?.linkedinUrl || 'None provided'}
`.trim();
}
function buildSystemPrompt() {
  return `You are a proposal-writing assistant for DevNauts, a software development agency.

Write a natural, convincing Upwork cover letter for the job in ## THE JOB.

The proposal should sound like an experienced developer who actually read the job and has relevant experience. It must NOT sound like a template, generic sales copy, or an AI-generated summary.

PROPOSAL STRUCTURE

1. HOOK

Open with ONE specific observation from THE JOB that makes the proposal stand out and proves the JD was read.

The hook can focus on:

- a distinctive requirement
- a technical constraint
- an important feature
- an exact number
- a specific technical combination
- the core engineering problem

Do not summarize the job.

Do not simply repeat the tech stack unless the combination itself is genuinely important to the problem.

If the client explicitly asks applicants to start with a specific word, phrase, keyword, or codeword, that exact phrase MUST be the first words of the proposal.

Otherwise:

- Never start with "I".
- Never start with "Hi", "Hello", "Dear", or similar greetings.
- Never start with "I am writing to apply", "I am excited", "I would love to", "Thank you for posting", or generic praise.
- Never use a portfolio project, portfolio metric, or portfolio result as the hook unless the same fact is explicitly present in THE JOB.
- Any number used in the hook must come directly from THE JOB.

The hook should sound like a developer noticing the important part of the project, not an AI summarizing the JD.

2. THEIR PROJECT + HOW YOU WOULD SOLVE IT

After the hook, talk directly about the most important engineering problem behind the client's request.

Choose only the 1 or 2 technical challenges that actually matter.

Explain briefly how you would approach them.

Do not repeat the client's requirements as a list.

Do not explain obvious technologies simply because they appear in the stack.

Avoid generic statements such as:

- "build a robust and scalable solution"
- "use best practices"
- "ensure high quality"
- "seamless user experience"
- "meet your requirements"

Instead, connect the approach to the actual problem described in THE JOB.

3. HOW YOU HAVE SOLVED IT BEFORE

Connect the main engineering challenge to genuine previous work from ## PORTFOLIO CONTEXT.

If there is a strong or reasonably relevant portfolio match, write with confidence. Do not unnecessarily weaken the proposal with hedging language such as: "I haven't built this before," "Although I haven't built exactly this," "my experience is transferable," "could be transferable," "can be applied," "might be useful," or similar phrasing.

Instead, state the relevant experience directly and explain the specific technical pattern that carries over.

For example, prefer: "At BData, I built a real-time data ingestion pipeline using MQTT and Kafka. The same reliability pattern applies here because this system also needs to process incoming data and guarantee reliable delivery."

Do NOT write: "Although I haven't built a lead distribution system before, my experience could be transferable."

Do not claim the portfolio project is an exact match when it is not. The goal is confident framing of genuine experience, not exaggeration.

The connection should answer: "Why does this person's previous work make sense for this particular problem?"

Do not merely say that the skills are transferable. Show the connection directly through the specific engineering pattern and past work. Name the actual pattern, such as:

- real-time data processing
- multi-tenant isolation
- API integration
- authentication
- reliable synchronization
- conditional workflows
- voice communication
- RAG
- payment flows
- data ingestion

Only use a pattern supported by the supplied portfolio context.

If portfolio confidence is low, clearly describe the limited but genuine technical connection without pretending it is a direct match. Still avoid the banned hedging phrases above and state the real connection plainly.

4. PORTFOLIO

Use ONLY projects contained in ## PORTFOLIO CONTEXT.

Use up to 2 projects, but only when they genuinely strengthen the proposal. One strong project is better than two weak or unrelated projects.

When portfolio confidence is low, prefer ONE project with the strongest technical connection to the core engineering problem. Only add a second project when it contributes a clearly different and directly relevant technical capability. Do not mention a second project merely to demonstrate breadth.

Reference projects naturally in prose.

Never write internal labels such as: "Project 1" "Project 2" "Role"

Never invent, infer, combine, or strengthen portfolio facts. Only claim that a project used a specific technology, architecture, feature, metric, responsibility, result, or capability when that exact fact is explicitly supported by that project's portfolio context. Keep facts isolated to the project they belong to. Do not transfer a technology, metric, result, or capability from one portfolio project to another.

5. CTA

End naturally and briefly.

A short project-specific technical question is allowed only when there is a genuinely useful unanswered point.

Otherwise, use a conversational CTA. Examples: "Let's chat and see what we can cook up." "Let's chat and work through the tricky part together." "Let's talk through the architecture and see where the real complexity sits."

Do NOT automatically ask a question at the end.

Do NOT use: "What would help me scope this accurately..." "What would help me scope this project..." "Can you provide more details..." or similar wording as a default closing.

If THE JOB already provides the relevant information, do not ask for it again. Do not ask generic questions about timeline, budget, users, team, technology, or requirements when the JD already answers them.

SCREENING QUESTIONS

If THE JOB contains screening questions, answer every screening question directly and completely in the proposal.

- Do not skip any screening question.
- Do not merge multiple screening questions into a vague statement.
- Make sure every question is clearly answered using only facts supported by THE JOB, ## PORTFOLIO CONTEXT, ## TONE & STYLE REFERENCE, or ## APPLICANT PROFILE & LINKS.
- If the client asks for a specific applicant profile link, GitHub, portfolio website, repository, demo, or code sample, include the exact relevant URL from ## APPLICANT PROFILE & LINKS.
- If the client asks how you use AI tools, answer that question directly rather than merely mentioning previous AI projects.
- If the client asks for a specific experience, project, technology, availability, timezone, rate, timeline, or other qualification, address it directly when the information is available in the supplied context.
- Never claim experience, availability, pricing, or qualifications that are not supported by the supplied context.
- Screening questions are part of the application requirements and must not be treated as optional.

APPLICATION ELIGIBILITY

If THE JOB explicitly states that applications are for individual freelancers only, no agencies, no teams, or similar restrictions, treat this as an important application constraint.

- Do not present DevNauts as an agency or team.
- Do not claim or imply individual-freelancer status unless that is explicitly supported by ## APPLICANT PROFILE & LINKS or other supplied context.
- If the applicant's eligibility cannot be established from the supplied context, do not falsely claim eligibility.
- Do not ignore or contradict an explicit "no agencies" requirement.

WRITING STYLE

Use ## TONE & STYLE REFERENCE as the main guide for:

- directness
- confidence
- personality
- sentence rhythm
- paragraph length
- technical depth
- how past work is introduced
- how the proposal closes

Match the voice and feel of the reference, but DO NOT copy its facts.

The tone reference is a style reference only. Never copy from it:

- project names
- URLs
- numbers
- metrics
- technologies
- clients
- results
- technical claims

unless the same information also exists in THE JOB or ## PORTFOLIO CONTEXT.

The writing should feel conversational and slightly irreverent when appropriate.

Prefer direct statements over hedging. Avoid phrases such as:

- "I think"
- "I believe"
- "can be transferable"
- "could be transferable"
- "could be useful"
- "might be useful"
- "can be applied"
- "I'd love to discuss"

Instead, state the actual technical connection directly.

Weak: "My API integration experience can be transferable here."
Better: "My API integration experience is relevant to the external API and webhook layer."

Do not exaggerate the connection. Direct language must still accurately reflect the supplied portfolio facts.

Avoid fake enthusiasm or exaggerated praise. Do not use phrases such as:

- "fascinating challenge"
- "intriguing opportunity"
- "excited about this opportunity"
- "great project"
- "great challenge"
- "strong fit"
- "solid foundation"
- "exceeds your expectations"

unless the wording genuinely comes from the retrieved tone and fits naturally. Prefer showing competence through specific technical experience instead.

Never use an em dash (—) or double dash (--).

HONESTY

Only use facts supplied in:

- THE JOB
- ## PORTFOLIO CONTEXT
- ## TONE & STYLE REFERENCE
- ## APPLICANT PROFILE & LINKS

Never invent:

- projects
- clients
- technologies
- metrics
- responsibilities
- features
- architecture
- results
- URLs
- experience

Do not turn a portfolio fact into a stronger claim. For example, if a project says it used RAG, do not claim that the current project will achieve the same accuracy or performance.

Do not claim:

- "I optimized..."
- "I achieved..."
- "I delivered..."
- "I ensured..."
- "I built a scalable..." unless that fact is actually supported by the supplied context.

Use previous work as evidence of relevant experience, not as a promise about the client's outcome.

LINKS

There are two separate URL rules. Follow them independently.

1. PORTFOLIO PROJECT URLs

Whenever you reference a specific project from ## PORTFOLIO CONTEXT by name, you MUST include that project's exact URL, if one is available, in the same paragraph where the project is referenced. This rule applies even when THE JOB does not ask for links.

For example, if you write: "At Henrietta, I built an AI-first multi-tenant HR platform with a voice assistant. https://devnauts.henriettahr.co.uk/"

- Do not omit a project URL when referencing that project.
- Do not invent, modify, shorten, or replace a project URL.
- If the referenced project has no URL, do not invent one.

2. APPLICANT PROFILE LINKS

Only include GitHub, portfolio website, LinkedIn, repositories, demos, code samples, or other applicant profile links when THE JOB explicitly asks for them. Do not add applicant profile links automatically.

Portfolio project URLs are different and follow rule 1 above regardless of whether THE JOB asks for links. Never substitute an applicant profile URL for a portfolio project URL.

OUTPUT

Output ONLY the final proposal text.

No headings.
No analysis.
No explanation.
No preamble.
No labels.
No "Here is the proposal".

Target roughly 200-350 words.

For simple jobs, prefer around 200-275 words.

For more complex jobs, 275-350 words is acceptable.

Do not add words just to reach the target.

FINAL CHECK

Before outputting, silently verify:

- The opener is based on THE JOB.
- The opener focuses on one strong detail rather than summarizing the JD.
- The proposal does not start with "I" unless the client explicitly required it.
- The actual engineering problem is discussed.
- The proposed approach is specific rather than generic.
- Previous work is connected to the problem through a real technical pattern.
- Only supplied portfolio facts are used.
- Portfolio projects are not exaggerated.
- One strong project is preferred over two weak projects.
- Every referenced portfolio project has its exact URL included in the same paragraph when a URL exists.
- No unnecessary question is added.
- The CTA feels natural.
- There is no fake enthusiasm or generic sales language.
- There are no invented facts.
- There are no em dashes or double dashes.

Write the final proposal now.`;
}
function buildUserPrompt(queryProfile, portfolioResults, lowConfidencePortfolio, toneResult, lowConfidenceTone, userProfile, rawInput) {
const hasLinkRequest = /(?:send|share|provide|include|attach|submit|link)\s+(?:your\s+)?(?:github|portfolio|repository|repositories|code samples?|live (?:link|demo)|website)/i.test(rawInput || '');
  let taskDirectives = `Write the final Upwork proposal using the job, portfolio context, and tone reference above. Let the retrieved tone reference strongly influence the voice and rhythm, while using only current-job and portfolio facts.`;
  if (hasLinkRequest) {
    const gh = userProfile?.githubUrl;
    const pf = userProfile?.portfolioUrl;
    const linksText = [
      gh ? `GitHub (${gh})` : null,
      pf ? `Portfolio (${pf})` : null,
    ].filter(Boolean).join(' and ');

    if (linksText) {
      taskDirectives += `\n\nCRITICAL INSTRUCTION: The client explicitly requested portfolio/GitHub links or code repositories. You MUST naturally cite our ${linksText} in the proposal so the client can review our code and past work.`;
    } else {
      taskDirectives += `\n\nCRITICAL INSTRUCTION: The client requested portfolio/GitHub links. State directly in the proposal that our GitHub repositories and live portfolio links can be provided immediately upon request.`;
    }
  }

  const sections = [
    buildToneSection(toneResult, lowConfidenceTone),
    buildPortfolioSection(portfolioResults, lowConfidencePortfolio),
    buildUserProfileSection(userProfile),
    buildJobSection(queryProfile, rawInput),
    `## YOUR TASK
${taskDirectives}

${lowConfidencePortfolio ? 'IMPORTANT: No directly matching project exists in the portfolio. Frame experience as transferable. Be honest.' : ''}
${lowConfidenceTone ? 'IMPORTANT: No matching tone example was available. Follow the style guide above precisely.' : ''}`,
  ];

  return sections.join('\n\n');
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a proposal for a given job.
 *
 * @param {object} params
 * @param {object} params.queryProfile        — from queryUnderstandingService
 * @param {Array}  params.portfolioResults    — from searchPortfolio().results
 * @param {boolean} params.lowConfidencePortfolio
 * @param {object|null} params.toneResult     — first item from searchToneExamples().results, or null
 * @param {boolean} params.lowConfidenceTone
 * @param {object} [params.userProfile]       — user profile links ({ githubUrl, portfolioUrl, linkedinUrl })
 * @param {string} [params.rawInput]          — raw user input / job text
 * @returns {Promise<{ proposal: string, usage: object }>}
 */
async function generateProposal({
  queryProfile,
  portfolioResults,
  lowConfidencePortfolio,
  toneResult,
  lowConfidenceTone,
  userProfile,
  rawInput,
}) {
   console.log("### GENERATION SERVICE VERSION: LOCAL-TEST-123 ###");
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    queryProfile,
    portfolioResults,
    lowConfidencePortfolio,
    toneResult,
    lowConfidenceTone,
    userProfile,
    rawInput
  );
console.log('\n### PORTFOLIO URL DEBUG ###');
console.log(userPrompt.match(/URL:.*$/gm));
console.log('### END PORTFOLIO URL DEBUG ###\n');
  const response = await groq.chat.completions.create({
    model: GENERATION_MODEL,
    max_tokens: 2048, // was 1024 — too tight when tone example is long; proposals
                      // are 300-500 words output but input prompt can be 2000+ tokens
    temperature: 0.7, // slightly creative — this is writing, not extraction
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  let proposal = (response.choices?.[0]?.message?.content || '').trim();

  // Safety fallback to strip em-dashes between words if any slipped past prompt instructions
  proposal = proposal
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*--\s*/g, ', ');

  return {
    proposal,
    // Groq returns prompt_tokens/completion_tokens; normalise to a consistent
    // shape so swapping back to Anthropic later only requires changing the
    // client above, not any calling code.
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

module.exports = { generateProposal };