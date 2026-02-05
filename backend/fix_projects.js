import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connect from './db/db.js';
import projectModel from './models/project.model.js';

dotenv.config();

async function fixProjects() {
  try {
    await connect();
    console.log('Connected to database');
    
    // Find all projects
    const projects = await projectModel.find({});
    console.log(`Found ${projects.length} total projects`);
    
    let fixedCount = 0;
    for (const project of projects) {
      // If project doesn't have an owner but has users
      if (!project.owner && project.users && project.users.length > 0) {
        // Set the first user as owner
        project.owner = project.users[0];
        await project.save({ validateBeforeSave: false });
        console.log(`Fixed project ${project._id}: set owner to ${project.owner}`);
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} projects`);
  } catch (error) {
    console.error('Error fixing projects:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixProjects();