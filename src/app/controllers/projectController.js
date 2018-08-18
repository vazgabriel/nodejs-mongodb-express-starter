const express = require("express");
const authMiddleware = require("../middlewares/auth");

const Project = require("../models/Project");
const Task = require("../models/Task");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const projects = await Project.find({
      user: req.userId
    }).populate("user");

    return res.json({
      projects
    });
  } catch (error) {
    return res.status(400).json({
      error: "Error loading projects"
    });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate([
      "user",
      "tasks"
    ]);

    // Here we don't use triple equals because can accuse different type
    if (project.user._id != req.userId) {
      return res.status(401).json({
        error: "You haven't access to this project"
      });
    }

    return res.json({
      project
    });
  } catch (error) {
    return res.status(400).json({
      error: "Error loading project"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, tasks } = req.body;

    const project = await Project.create({
      title,
      description,
      user: req.userId
    });

    await Promise.all(
      tasks.map(async task => {
        const projectTask = new Task({
          ...task,
          project: project._id
        });

        await projectTask.save();
        project.tasks.push(projectTask);
      })
    );

    await project.save();

    return res.json({ project });
  } catch (error) {
    return res.status(400).json({
      error: "Error creating new project"
    });
  }
});

router.put("/:projectId", async (req, res) => {
  try {
    const { title, description, tasks } = req.body;

    const project = await Project.findById(req.params.projectId);

    // Here we don't use triple equals because can accuse different type
    if (project.user != req.userId) {
      return res.status(401).json({
        error: "You haven't access to this project"
      });
    }

    project.title = title;
    project.description = description;

    project.tasks = [];
    await Task.deleteMany({ project: project._id });

    await Promise.all(
      tasks.map(async task => {
        const projectTask = new Task({
          ...task,
          project: project._id
        });

        await projectTask.save();
        project.tasks.push(projectTask);
      })
    );

    await project.save();

    return res.json({ project });
  } catch (error) {
    return res.status(400).json({
      error: "Error updating new project"
    });
  }
});

router.delete("/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate(
      "user"
    );

    // Here we don't use triple equals because can accuse different type
    if (project.user._id != req.userId) {
      return res.status(401).json({
        error: "You haven't access to this project"
      });
    }

    // Remove project
    await project.remove();

    return res.send();
  } catch (error) {
    return res.status(400).json({
      error: "Error deleting project"
    });
  }
});

module.exports = app => app.use("/projects", router);
