const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
    return res.json({
      user: req.user
    });
});

module.exports = router;
