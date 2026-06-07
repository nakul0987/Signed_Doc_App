const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/upload',upload.single('pdf'),async(req,res)=>{
    try{
        if(!req.file){
            return res.status(400).json({message: 'No document uploaded'});
        }

        const newDoc = new Document({
            filename: req.file.filename,
            filepath: '/uploads/' + req.file.filename,
            owner: req.body.userId || null
        })
        await newDoc.save();

        const log = new AuditLog({
            documentId: newDoc._id,
            action: 'Document Uploaded',
            performedBy: req.body.userId || null,
            ipAddress: req.ip
        })
        await log.save();

        res.status(201).json({ message: 'Uploaded successfully', document: newDoc });
    }catch(err){
        res.status(500).json({error: err.message});
    }
})

router.get('/',async(req,res)=>{
    try{
        const docs = await Document.find().sort({createdAt: -1});
        res.json(docs);
    }catch(err){
        res.status(500).json({error: err.message});
    }
})

router.get('/:id',async(req,res)=>{
    try{
        const doc = await Document.findById(req.params.id);
        if(!doc){
            return res.status(404).json({message: 'Document not found'});
        }
        res.json(doc);
    }catch(err){
        res.status(500).json({error: err.message});
    }
})

module.exports = router;