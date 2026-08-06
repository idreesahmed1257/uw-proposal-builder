const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createChat,
    getChats,
    getChatById,
    updateChat,
    deleteChat,
} = require('../controllers/chatController');
const { addMessage, generateResponse } = require('../controllers/messageController');

router.use(protect); // every route below requires a valid JWT

router.post('/', createChat);
router.get('/', getChats);
router.get('/:id', getChatById);
router.patch('/:id', updateChat);
router.delete('/:id', deleteChat);

// Manual message store (for system messages or direct saves)
router.post('/:id/messages', addMessage);

// RAG pipeline endpoint — user sends a message, gets a generated proposal back
// This is the main endpoint the chatbot frontend should call
router.post('/:id/generate', generateResponse);

module.exports = router;