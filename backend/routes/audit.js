const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

router.get('/:docId',async(req,res)=>{
    try{
        const history = await AuditLog.find({documentId: req.params.docId})
            .populate('performedBy', 'name email')
            .sort({ timestamp: 1 });
        res.json(history);
    }catch(err){
        res.status(500).json({error: err.message});
    }
})

module.exports = router;