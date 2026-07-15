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
const { addMessage } = require('../controllers/messageController');

router.use(protect); // every route below requires a valid JWT

router.post('/', createChat);
router.get('/', getChats);
router.get('/:id', getChatById);
router.patch('/:id', updateChat);
router.delete('/:id', deleteChat);

router.post('/:id/messages', addMessage);

module.exports = router;