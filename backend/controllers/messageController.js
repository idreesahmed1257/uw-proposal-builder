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

const generateResponse = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'content is required' });
        }

        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (chat.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to post to this chat' });
        }

        const userMessage = await Message.create({
            chat: chat._id,
            role: 'user',
            content: content.trim(),
        });

        if (!chat.clientBrief) {
            chat.clientBrief = content.trim();
        }

        const allMessages = await Message.find({ chat: chat._id })
            .sort({ createdAt: 1 })
            .select('role content');

        const conversationHistory = allMessages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content }));

        const {
            results: portfolioResults,
            queryProfile,
            lowConfidence: lowConfidencePortfolio,
        } = await searchPortfolio(conversationHistory);

        const {
            results: toneResults,
            lowConfidence: lowConfidenceTone,
        } = await searchToneExamples(queryProfile.clean_query);

        const toneResult = toneResults[0] || null;

        const userProfile = {
            name: req.user.name,
            githubUrl: req.user.githubUrl || '',
            portfolioUrl: req.user.portfolioUrl || '',
            linkedinUrl: req.user.linkedinUrl || '',
        };

        const { proposal, usage } = await generateProposal({
            queryProfile,
            portfolioResults,
            lowConfidencePortfolio,
            toneResult,
            lowConfidenceTone,
            userProfile,
            rawInput: content.trim(),
        });

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

        chat.updatedAt = new Date();
        await chat.save();

        return res.status(201).json({
            message: assistantMessage,
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