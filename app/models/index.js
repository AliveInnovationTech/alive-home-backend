'use strict';

const fs = require('fs');
const path = require('path');
const DataTypes = require('sequelize').DataTypes;
const basename = path.basename(__filename);
const logger = require('../utils/logger');

module.exports = (sequelize) => {
  const db = {};
  const modelDefiners = [];
  
  fs.readdirSync(__dirname)
    .filter(file => (
      file !== basename &&
      file.endsWith('.js') &&
      !file.includes('.test.js')
    ))
    .forEach(file => {
      try {
        const modelPath = path.join(__dirname, file);
        const modelDefiner = require(modelPath);
        
        if (typeof modelDefiner === 'function') {
          modelDefiners.push({
            name: path.basename(file, '.js'),
            definer: modelDefiner
          });
        }
      } catch (error) {
        logger.error(`❌ Failed loading model ${file}:`, error);
      }
    });

  modelDefiners.forEach(({name, definer}) => {
    try {
      const model = definer(sequelize, DataTypes);
      db[model.name] = model;
      logger.debug(`✅ Defined model: ${model.name}`);
    } catch (error) {
      logger.error(`❌ Failed defining model ${name}:`, error);
    }
  });

  Object.keys(db).forEach(modelName => {
    try {
      if (typeof db[modelName].associate === 'function') {
        db[modelName].associate(db);
        logger.debug(`🔗 Associated relations for: ${modelName}`);
      }
    } catch (error) {
      logger.error(`❌ Error associating ${modelName}:`, error);
    }
  });

  Object.keys(db).forEach(modelName => {
    try {
      if (typeof db[modelName].registerHooks === 'function') {
        db[modelName].registerHooks(db);
        logger.debug(`🎣 Registered hooks for: ${modelName}`);
      }
    } catch (error) {
      logger.error(`❌ Error registering hooks for ${modelName}:`, error);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = require('sequelize');

  return db;
};