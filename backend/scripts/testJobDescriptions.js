require('dotenv').config();
const { searchPortfolio } = require('../services/retrievalService');

const jd1 = `
title
Custom Lead Distribution Software Buildout (Like Leadprosper)

description
Who we are
This is me
I spend $200k/on ads last month.
We run a seven-figure paid lead generation agency.
We buy traffic, generate leads, and sell those leads to buyers and our leads are not cheap. We sell them for $250 to $400 each. That means our system has to be tight. One bad route, one dropped lead, one wrong buyer, and we lose real money fast.

Right now we're leaning on tools like Lead Prospector and Leads Hook to run things. Lead Prospector alone costs around $600 a month, and platforms like LeadByte cost even more. We'd rather own our system instead of renting one so we're building our own.

The job
We want someone to build us a custom lead distribution software using Claude Code, basically our own private version of Lead Prospector that we fully control.

Here's what the software needs to do:
- Distribute leads by priority. Some buyers get first pick, others get what's left. The system decides who gets each lead and in what order.
- Handle API bidding and bid caps. Buyers bid on leads through their systems. The software should take those bids, respect each buyer's spending limit (their "bid cap"), and send the lead to the best fit.
- Route by conditional rules. This is the core. Qualified leads go to one buyer. Disqualified leads go to a different buyer. The system reads the lead, checks the rules, and sends it to the right place automatically.
- Be bulletproof. This is the most important part. Because each lead is worth $250-$400, the system can't break, drop leads, or misroute. It has to be rock solid.

Tools you'll be working with
- Lead Prospector
- LeadsHook
- Claude Code (for the actual build)

How to apply
Brother if you make a loom video showing the projects you have build out, I will look at it, because respectfully it's sometimes too many applications.
`;

const jd2 = `
title
EdTech MVP Platform for Online Learning & Student Progress Tracking

description
We are looking for an experienced product development team or full-stack developer to build an MVP for an EdTech platform.

Core MVP Features:
- Student registration and login
- Student dashboard
- Course/lesson listing
- Progress tracking per lesson or module
- Basic quiz or assessment functionality
- Admin panel for managing students, courses, lessons, and content

Preferred Tech Stack:
We are open to recommendations, but technologies such as React, Next.js, Node.js, Supabase, Firebase, PostgreSQL, or similar modern frameworks would be a strong fit.
`;

const singleShotQueries = [
    { name: 'Job Description 1 (Lead Distribution / Claude Code)', query: jd1 },
    { name: 'Job Description 2 (EdTech MVP Platform)', query: jd2 },
];

const multiTurnExample = [
    { role: 'user', content: jd2 },
    {
        role: 'assistant',
        content: 'Quick one before I draft this — do you have a preference between Firebase and Supabase for this, or is that open?',
    },
    { role: 'user', content: "Let's go with Supabase and Postgres, and we'd want Stripe for a paid tier later." },
];

function printResults(results, queryProfile, lowConfidence) {
    console.log('Query profile:', JSON.stringify(queryProfile, null, 2));
    console.log(`lowConfidence: ${lowConfidence}`);

    if (results.length === 0) {
        console.log('No results returned.');
        return;
    }

    results.forEach((r, i) => {
        console.log(
            `\n#${i + 1} — final score: ${r.score.toFixed(4)} (raw semantic: ${r.semanticScore.toFixed(
                4
            )}, keyword: ${r.keywordScore.toFixed(2)}) — ${r.title}`
        );
        console.log(`   industry: ${r.industry || 'n/a'} | tags: ${(r.tags || []).join(', ') || 'n/a'}`);
    });
}

async function runSingleShot() {
    for (const { name, query } of singleShotQueries) {
        console.log('\n============================================');
        console.log(`Testing: ${name}`);
        console.log('============================================');

        try {
            const { results, queryProfile, lowConfidence } = await searchPortfolio(query);
            printResults(results, queryProfile, lowConfidence);
        } catch (err) {
            console.error(`Query failed: ${err.message}`);
        }
    }
}

async function runMultiTurn() {
    console.log('\n============================================');
    console.log('Testing: Multi-turn chatbot conversation (JD + clarifying Q&A)');
    console.log('============================================');

    try {
        const { results, queryProfile, lowConfidence } = await searchPortfolio(multiTurnExample);
        printResults(results, queryProfile, lowConfidence);
    } catch (err) {
        console.error(`Query failed: ${err.message}`);
    }
}

async function runTests() {
    await runSingleShot();
    await runMultiTurn();
}

runTests();