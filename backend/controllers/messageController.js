const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { searchPortfolio } = require('../services/retrievalService');
const { searchToneExamples } = require('../services/toneRetrievalService');
const { generateProposal } = require('../services/generationService');

const addMessage = async (req, res) => {
    try {
        const { role, content } = req.body;

        if (!role || !content) {
            return res.status(400).json({ message: 'role and content are required' });
        }
        if (!['user', 'assistant', 'system'].includes(role)) {
            return res.status(400).json({ message: 'role must be one of: user, assistant, system' });
        }

        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (chat.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to post to this chat' });
        }

        const message = await Message.create({
            chat: chat._id,
            role,
            content,
        });

        // Bump chat's updatedAt so it re-sorts to the top of "recent chats"
        chat.updatedAt = new Date();
        await chat.save();

        return res.status(201).json(message);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to add message', error: err.message });
    }
};

/**
 * POST /api/chats/:id/generate
 *
 * The main RAG endpoint. The frontend sends the user's latest message
 * (a job description, a follow-up question, or a clarification). This
 * controller:
 *   1. Validates and saves the user message
 *   2. Loads the full conversation history for multi-turn context
 *   3. Runs the full RAG pipeline:
 *        queryUnderstanding → portfolioRetrieval → toneRetrieval → generation
 *   4. Saves the assistant response with sources populated
 *   5. Auto-populates chat.clientBrief from the first user message if empty
 *   6. Returns both the assistant message and pipeline metadata
 *
 * Request body: { content: string }
 * Response: { message: Message, meta: { queryProfile, lowConfidencePortfolio,
 *             lowConfidenceTone, portfolioMatches, toneMatch } }
 */
const generateResponse = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'content is required' });
        }

        // ── Auth + chat lookup ────────────────────────────────────────────────
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (chat.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to post to this chat' });
        }

        // ── Save user message first ───────────────────────────────────────────
        // Save before running the pipeline so if generation fails, the user's
        // message isn't lost and they can retry or continue the conversation.
        const userMessage = await Message.create({
            chat: chat._id,
            role: 'user',
            content: content.trim(),
        });

        // Auto-populate clientBrief from the first user message in this chat
        // so the original JD is always retrievable from the Chat document.
        if (!chat.clientBrief) {
            chat.clientBrief = content.trim();
        }

        // ── Load conversation history for multi-turn context ──────────────────
        // Includes the message we just saved — queryUnderstanding gets the
        // full picture including this latest turn.
        const allMessages = await Message.find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .select('role content');

        // Shape for queryUnderstandingService: [{ role, content }, ...]
        // Filter out 'system' role messages — they're internal metadata,
        // not part of the job-description conversation context.
        const conversationHistory = allMessages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content }));

        // ── RAG Pipeline ──────────────────────────────────────────────────────

        // Step 1 + 2: query understanding + portfolio retrieval
        // searchPortfolio() calls buildQueryProfile() internally, so one call
        // handles both. Pass the full conversation array for multi-turn context.
        const {
            results: portfolioResults,
            queryProfile,
            lowConfidence: lowConfidencePortfolio,
        } = await searchPortfolio(conversationHistory);

        // Step 3: tone retrieval — use the cleaned query for semantic matching
        const {
            results: toneResults,
            lowConfidence: lowConfidenceTone,
        } = await searchToneExamples(queryProfile.clean_query);

        const toneResult = toneResults[0] || null;

        // Step 4: generate the proposal
        const { proposal, usage } = await generateProposal({
            queryProfile,
            portfolioResults,
            lowConfidencePortfolio,
            toneResult,
            lowConfidenceTone,
        });

        // ── Save assistant response with sources ──────────────────────────────
        // sources maps portfolio results to their MongoDB IDs so the frontend
        // can optionally show which projects were cited and with what confidence.
        const sources = portfolioResults
            .filter((r) => r.portfolioProjectId)
            .map((r) => ({
                portfolioProject: r.portfolioProjectId,
                chunkId: r.id,
                score: r.score,
            }));

        const assistantMessage = await Message.create({
            chat: chat._id,
            role: 'assistant',
            content: proposal,
            sources,
        });

        // ── Update chat metadata ──────────────────────────────────────────────
        chat.updatedAt = new Date();
        await chat.save();

        // ── Respond ───────────────────────────────────────────────────────────
        return res.status(201).json({
            message: assistantMessage,
            // meta is useful for the frontend to show confidence indicators,
            // which projects were used, and for debugging retrieval quality.
            meta: {
                queryProfile,
                lowConfidencePortfolio,
                lowConfidenceTone,
                portfolioMatches: portfolioResults.map((r) => ({
                    title: r.title,
                    score: r.score,
                    keywordScore: r.keywordScore,
                })),
                toneMatch: toneResult
                    ? { docId: toneResult.docId, score: toneResult.score }
                    : null,
                tokenUsage: usage,
            },
        });
    } catch (err) {
        console.error('generateResponse error:', err);
        return res.status(500).json({
            message: 'Failed to generate proposal',
            error: err.message,
        });
    }
};

module.exports = { addMessage, generateResponse };