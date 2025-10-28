const router = require('express').Router();
router.use('/system', require('./system.routes'));
module.exports = router;
