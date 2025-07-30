// fix_trees.js
import mongoose from 'mongoose';
import Project from './models/project.model.js';
import 'dotenv/config'; // Load MONGODB_URI

// Allowed characters regex (POSIX-compliant)
const INVALID_FILENAME_REGEX = /[<>:"\\|?*\x00-\x1F]/;

// Recursively sanitizes and trims fileTree keys
function sanitizeFileTree(tree, path = '') {
  if (!tree || typeof tree !== 'object') return tree;

  const sanitized = {};

  for (const key of Object.keys(tree)) {
    const trimmedKey = key.trim();

    // Validate key
    if (!trimmedKey || INVALID_FILENAME_REGEX.test(trimmedKey)) {
      console.warn(`⛔️ Skipped invalid key "${path}/${key}"`);
      continue;
    }

    const value = tree[key];

    if (value.file) {
      if (typeof value.file.contents !== 'string') {
        console.warn(`⛔️ Skipped invalid file content at "${path}/${trimmedKey}"`);
        continue;
      }
      sanitized[trimmedKey] = {
        file: { contents: value.file.contents }
      };
    } else if (value.directory) {
      sanitized[trimmedKey] = {
        directory: sanitizeFileTree(value.directory, `${path}/${trimmedKey}`)
      };
    } else {
      console.warn(`⛔️ Skipped unknown type at "${path}/${trimmedKey}"`);
    }
  }

  return sanitized;
}

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const projects = await Project.find({});
    let updatedCount = 0;

    for (const project of projects) {
      if (project.fileTree && Object.keys(project.fileTree).length > 0) {
        const sanitizedTree = sanitizeFileTree(project.fileTree);
        project.fileTree = sanitizedTree;
        await project.save();
        updatedCount++;
      }
    }

    console.log(`✅ Migration complete. Updated ${updatedCount} projects.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
