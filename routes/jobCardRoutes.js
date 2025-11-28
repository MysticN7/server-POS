const express = require('express');
const router = express.Router();
const jobCardController = require('../controllers/jobCardController');
const auth = require('../middleware/auth');

router.get('/', auth, jobCardController.getAllJobCards);
router.post('/', auth, jobCardController.createJobCard);
router.put('/:id', auth, jobCardController.updateJobCard);
router.delete('/:id', auth, jobCardController.deleteJobCard);

module.exports = router;
