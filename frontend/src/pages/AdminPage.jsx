import { useState, useEffect } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api/portfolio';
import api from '../api/client';
import './AdminPage.css';

export default function AdminPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    role: '',
    industry: '',
    description: '',
    skillsAndDeliverables: '',
    tags: '',
  });

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      role: '',
      industry: '',
      description: '',
      skillsAndDeliverables: '',
      tags: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (project) => {
    setFormData({
      title: project.title,
      role: project.role,
      industry: project.industry || '',
      description: project.description,
      skillsAndDeliverables: project.skillsAndDeliverables.join(', '),
      tags: project.tags.join(', '),
    });
    setEditingId(project._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id);
      loadProjects();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      skillsAndDeliverables: formData.skillsAndDeliverables.split(',').map((s) => s.trim()).filter(Boolean),
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    try {
      if (editingId) {
        await updateProject(editingId, payload);
      } else {
        await createProject(payload);
      }
      resetForm();
      loadProjects();
    } catch (error) {
      console.error('Failed to save project', error);
      alert('Failed to save project.');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminMsg('Creating...');
    try {
      await api.post('/auth/register-admin', { name: adminName, email: adminEmail, password: adminPassword });
      setAdminMsg('Admin created successfully!');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
    } catch (error) {
      setAdminMsg(error.response?.data?.message || 'Error creating admin');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        {!showForm && (
          <button className="admin-new-btn" onClick={() => setShowForm(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New Project
          </button>
        )}
      </header>

      <div className="admin-form-card">
        <h2>Create New Admin</h2>
        <form onSubmit={handleCreateAdmin}>
          <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="admin-form-group">
               <label>Name</label>
               <input required value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin Name" />
            </div>
            <div className="admin-form-group">
               <label>Email</label>
               <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@domain.com" />
            </div>
            <div className="admin-form-group">
               <label>Password</label>
               <input required type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" minLength={6} />
            </div>
          </div>
          <div className="admin-form-actions" style={{ alignItems: 'center' }}>
            {adminMsg && <span style={{ marginRight: 'auto', color: adminMsg.includes('success') ? '#4ade80' : '#f87171' }}>{adminMsg}</span>}
            <button type="submit" className="admin-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>Create Admin</button>
          </div>
        </form>
      </div>

      <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Portfolio Projects</h2>
      </div>

      {showForm && (
        <div className="admin-form-card">
          <h2>{editingId ? 'Edit Project' : 'New Project'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Title</label>
                <input required name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Visent E-commerce" />
              </div>
              <div className="admin-form-group">
                <label>Role</label>
                <input required name="role" value={formData.role} onChange={handleInputChange} placeholder="e.g. Full-Stack Developer" />
              </div>
              <div className="admin-form-group">
                <label>Industry</label>
                <input name="industry" value={formData.industry} onChange={handleInputChange} placeholder="e.g. Retail, FinTech" />
              </div>
              <div className="admin-form-group full-width">
                <label>Description</label>
                <textarea required name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe the project challenges and solutions..." />
              </div>
              <div className="admin-form-group">
                <label>Skills & Deliverables (comma separated)</label>
                <input name="skillsAndDeliverables" value={formData.skillsAndDeliverables} onChange={handleInputChange} placeholder="React, Node.js, API Design" />
              </div>
              <div className="admin-form-group">
                <label>Tags (comma separated)</label>
                <input name="tags" value={formData.tags} onChange={handleInputChange} placeholder="web, mobile, backend" />
              </div>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="admin-btn-primary">Save Project</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading projects...</p>
      ) : (
        <div className="admin-projects-grid">
          {projects.map((project) => (
            <div key={project._id} className="admin-project-card">
              <div className="admin-project-header">
                <div>
                  <h3 className="admin-project-title">{project.title}</h3>
                  <div className="admin-project-role">{project.role}</div>
                </div>
                <div className="admin-project-actions">
                  <button className="admin-action-btn" onClick={() => handleEdit(project)} title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button className="admin-action-btn delete" onClick={() => handleDelete(project._id)} title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="admin-project-desc">{project.description}</div>
              <div className="admin-project-meta">
                {project.skillsAndDeliverables.slice(0, 3).map((skill, i) => (
                  <span key={i} className="admin-tag">{skill}</span>
                ))}
                {project.skillsAndDeliverables.length > 3 && (
                  <span className="admin-tag">+{project.skillsAndDeliverables.length - 3} more</span>
                )}
              </div>
            </div>
          ))}
          {projects.length === 0 && !showForm && (
            <p style={{ color: '#a3a3a3' }}>No projects found. Create one to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}
