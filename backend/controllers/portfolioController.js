const PortfolioProject = require('../models/PortfolioProject');
const { syncProjectToPinecone, deleteProjectFromPinecone } = require('../services/pineconeService');

const getProjects = async (req, res) => {
    try {
        const projects = await PortfolioProject.find({}).sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching projects', error: error.message });
    }
};

const createProject = async (req, res) => {
    try {
        const { title, role, description, skillsAndDeliverables, tags, industry, url } = req.body;

        const project = new PortfolioProject({
            title,
            role,
            description,
            skillsAndDeliverables,
            tags,
            industry,
            url,
        });

        const createdProject = await project.save();

        try {
            await syncProjectToPinecone(createdProject);
        } catch (syncErr) {
            console.error('Pinecone sync failed on create:', syncErr.message);
            createdProject.embeddingStatus = 'failed';
            await createdProject.save();
        }

        res.status(201).json(createdProject);
    } catch (error) {
        res.status(400).json({ message: 'Error creating project', error: error.message });
    }
};

const updateProject = async (req, res) => {
    try {
        const { title, role, description, skillsAndDeliverables, tags, industry, url } = req.body;

        const project = await PortfolioProject.findById(req.params.id);

        if (project) {
            project.title = title || project.title;
            project.role = role || project.role;
            project.description = description || project.description;
            project.skillsAndDeliverables = skillsAndDeliverables || project.skillsAndDeliverables;
            project.tags = tags || project.tags;
            project.industry = industry || project.industry;
            if (url !== undefined) project.url = url;

            const updatedProject = await project.save();

            try {
                await syncProjectToPinecone(updatedProject);
            } catch (syncErr) {
                console.error('Pinecone sync failed on update:', syncErr.message);
                updatedProject.embeddingStatus = 'failed';
                await updatedProject.save();
            }

            res.json(updatedProject);
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error updating project', error: error.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        const project = await PortfolioProject.findById(req.params.id);

        if (project) {
            try {
                await deleteProjectFromPinecone(project);
            } catch (syncErr) {
                console.error('Pinecone cleanup failed on delete:', syncErr.message);
                return res.status(500).json({ message: 'Error deleting project from vector database', error: syncErr.message });
            }

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