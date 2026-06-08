const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const {pdfDocument} = require('pdf-lib');
const Signature = require('../models/Signature');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');

router.post('/',async(req,res)=>{
    try{
        const {documentId,userId,x,y,page} = req.body;
        const newSig = new Signature({documentId,userId,x,y,page});
        await newSig.save();
        res.status(201).json(newSig);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
})

router.get('/:id',async(req,res)=>{
    try{
        const sigs = await Signature.find({ documentId: req.params.id});
        res.json(sigs);
    }catch(err){
        res.status(500).json({ error: err.message });
    }
})

router.post('/finalize',async(req,res)=>{
    try{
        const {documentId,signatureImageBase64} = req.body;
        const docRecord = await Document.findById(documentId);
        if(!docRecord){
            return res.status(404).json({message: 'Document missing'});
        }

        const existingSigData = await Signature.findOne({documentId});
        if(!existingSigData){
            return res.status(400).json({ message: 'No coordinate mappings found' });
        }

        const pdfPath = path.join(__dirname, '..', docRecord.filePath);
        const existingPdfBytes = fs.readFileSync(pdfPath);

        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const cleanBase64 = signatureImageBase64.replace(/^data:image\/png;base64,/, "");
        const embeddedImage = await pdfDoc.embedPng(cleanBase64);

        const targetPageIndex = Math.max(0, existingSigData.page - 1);
        const pages = pdfDoc.getPages();
        const targetPage = pages[targetPageIndex];

        targetPage.drawImage(embeddedImage, {
            x: existingSigData.x,
            y: existingSigData.y,
            width: 150,
            height: 50,
        });

        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, modifiedPdfBytes);

        docRecord.status = 'Signed';
        await docRecord.save();

        const auditTrail = new AuditLog({
            documentId: docRecord._id,
            action: 'Document Electronically Signed',
            ipAddress: req.ip
        });
        await auditTrail.save();

        res.json({ message: 'PDF cleanly stamped and completed!', status: 'Signed' });
    }catch(err){
        res.status(500).json({error: err.message});
    }
})

module.exports = router;