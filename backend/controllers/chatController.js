const Chat = require('../models/Chat');
const Message = require('../models/Message');

const createChat = async (req, res) => {
    try {
        const { title, clientBrief } = req.body;

        const chat = await Chat.create({
            user: req.user._id,
            title: title || 'New Chat',
            clientBrief: clientBrief || '',
        });

        return res.status(201).json(chat);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to create chat', error: err.message });
    }
};

const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({ user: req.user._id }).sort({ updatedAt: -1 });
        return res.status(200).json(chats);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch chats', error: err.message });
    }
};

const getChatById = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (chat.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this chat' });
        }

        const messages = await Message.find({ chat: chat._id }).sort({ createdAt: 1 });

        return res.status(200).json({ chat, messages });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch chat', error: err.message });
    }
};

const updateChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (chat.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to modify this chat' });
        }

        if (req.body.title !== undefined) chat.title = req.body.title;
        if (req.body.clientBrief !== undefined) chat.clientBrief = req.body.clientBrief;

        await chat.save();
        return res.status(200).json(chat);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update chat', error: err.message });
    }
};

const deleteChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        if (chat.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this chat' });
        }

        await Message.deleteMany({ chat: chat._id });
        await chat.deleteOne();

        return res.status(200).json({ message: 'Chat deleted' });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to delete chat', error: err.message });
    }
};

module.exports = { createChat, getChats, getChatById, updateChat, deleteChat };