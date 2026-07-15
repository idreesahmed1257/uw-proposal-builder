const Chat = require('../models/Chat');
const Message = require('../models/Message');

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

module.exports = { addMessage };