const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
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
        const {documentId,userId,signatureImageBase64,x,y,page,width,height} = req.body;
        if(!signatureImageBase64){
            return res.status(400).json({ message: 'No signature image found' });
        }

        const docRecord = await Document.findById(documentId);
        if(!docRecord){
            return res.status(404).json({message: 'Document missing'});
        }

        const existingSigData = await Signature.findOneAndUpdate(
            {documentId},
            {
                userId: userId || undefined,
                x: Math.round(Number(x) || 0),
                y: Math.round(Number(y) || 0),
                page: Math.max(1, Number(page) || 1)
            },
            {new: true, upsert: true, setDefaultsOnInsert: true}
        );

        const storedPath = docRecord.filePath || docRecord.filepath;
        const pdfPath = path.join(__dirname, '..', storedPath);
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
            width: Math.max(30, Math.round(Number(width) || 150)),
            height: Math.max(15, Math.round(Number(height) || 50)),
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
