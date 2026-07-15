const express = require('express');
const router = express.Router();
const {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
} = require('../controllers/portfolioController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getProjects)
    .post(protect, admin, createProject);

router.route('/:id')
    .put(protect, admin, updateProject)
    .delete(protect, admin, deleteProject);

module.exports = router;
