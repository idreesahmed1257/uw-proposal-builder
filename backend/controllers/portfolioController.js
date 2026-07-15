const PortfolioProject = require('../models/PortfolioProject');

// @desc    Get all portfolio projects
// @route   GET /api/portfolio
// @access  Private/Admin
const getProjects = async (req, res) => {
    try {
        const projects = await PortfolioProject.find({}).sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
};

// @desc    Create a portfolio project
// @route   POST /api/portfolio
// @access  Private/Admin
const createProject = async (req, res) => {
    try {
        const { title, role, description, skillsAndDeliverables, tags, industry } = req.body;

        const project = new PortfolioProject({
            title,
            role,
            description,
            skillsAndDeliverables,
            tags,
            industry,
        });

        const createdProject = await project.save();
        res.status(201).json(createdProject);
    } catch (error) {
        res.status(400).json({ message: 'Error creating project', error: error.message });
    }
};

// @desc    Update a portfolio project
// @route   PUT /api/portfolio/:id
// @access  Private/Admin
const updateProject = async (req, res) => {
    try {
        const { title, role, description, skillsAndDeliverables, tags, industry } = req.body;

        const project = await PortfolioProject.findById(req.params.id);

        if (project) {
            project.title = title || project.title;
            project.role = role || project.role;
            project.description = description || project.description;
            project.skillsAndDeliverables = skillsAndDeliverables || project.skillsAndDeliverables;
            project.tags = tags || project.tags;
            project.industry = industry || project.industry;

            const updatedProject = await project.save();
            res.json(updatedProject);
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error updating project', error: error.message });
    }
};

// @desc    Delete a portfolio project
// @route   DELETE /api/portfolio/:id
// @access  Private/Admin
const deleteProject = async (req, res) => {
    try {
        const project = await PortfolioProject.findById(req.params.id);

        if (project) {
            await project.deleteOne();
            res.json({ message: 'Project removed' });
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting project', error: error.message });
    }
};

module.exports = {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
};
