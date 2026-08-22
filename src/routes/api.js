/**
 * API Router for SQL Generator Application
 */

const express = require('express');
const router = express.Router();
const sqlController = require('../controllers/sqlController');

// Generation routes
router.post('/generate/builder', (req, res) => sqlController.generateFromBuilder(req, res));
router.post('/generate/nl', (req, res) => sqlController.generateFromNl(req, res));

// Analysis & formatting routes
router.post('/explain', (req, res) => sqlController.explainQuery(req, res));
router.post('/format', (req, res) => sqlController.formatQuery(req, res));

// Sandbox execution
router.post('/execute', (req, res) => sqlController.executeQuery(req, res));

// Metadata & templates
router.get('/schemas', (req, res) => sqlController.getSchemas(req, res));
router.get('/templates', (req, res) => sqlController.getTemplates(req, res));

module.exports = router;
