import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Rnd } from 'react-rnd';

// --- PRODUCTION API URL CONFIGURATION ---
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://signed-doc-app.onrender.com' // 👈 Your exact live backend link!
  : 'http://localhost:8080';

function App() {
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  // App Functional State
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Drag & Drop / Coordinate State
  const [coords, setCoords] = useState({ x: 120, y: 330, page: 1 });
  const [signatureSize, setSignatureSize] = useState({ width: 150, height: 50 });
  const [signatureImage, setSignatureImage] = useState(null);
  const [finalizeStatus, setFinalizeStatus] = useState('');

  // Fixed initialization from {} to null for precise instance checks
  const sigPad = useRef(null);

  const getSignatureDataUrl = () => {
    if (!sigPad.current || typeof sigPad.current.isEmpty !== 'function') {
      return null;
    }

    if (sigPad.current.isEmpty()) {
      return null;
    }

    try {
      if (typeof sigPad.current.getTrimmedCanvas === 'function') {
        return sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      }
    } catch (err) {
      console.error('Could not trim signature canvas:', err);
    }

    if (typeof sigPad.current.toDataURL === 'function') {
      return sigPad.current.toDataURL('image/png');
    }

    return null;
  };

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token]);

  // --- API Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setUser(null);
    setSelectedDoc(null);
    setSignatureImage(null);
    setSignatureSize({ width: 150, height: 50 });
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/docs`);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select a PDF document first.');

    const formData = new FormData();
    formData.append('pdf', file);
    if (user) formData.append('userId', user.id);

    try {
      setUploadStatus('Uploading document...');
      const res = await fetch(`${API_BASE_URL}/api/docs/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload server error');
      setUploadStatus('Document uploaded successfully! ✅');
      setFile(null);
      fetchDocuments();
    } catch (err) {
      setUploadStatus('Upload failed.');
    }
  };

  // Save coordinates to backend
  const saveCoordinates = async () => {
    if (!selectedDoc) return alert('Please select a working document from the queue.');
    try {
      const res = await fetch(`${API_BASE_URL}/api/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc._id,
          userId: user?.id || "60c72b2f9b1d8b2bad723456",
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          page: coords.page,
          width: Math.round(signatureSize.width),
          height: Math.round(signatureSize.height)
        })
      });
      if (res.ok) alert('Signature placement coordinates saved! 🎯');
    } catch (err) {
      console.error(err);
    }
  };

  // Finalize: Flatten signature visual layer directly into PDF via server
  const finalizeDocument = async () => {
    if (!selectedDoc) return alert('Select a document.');

    const currentSignatureImage = signatureImage || getSignatureDataUrl();
    if (!currentSignatureImage) return alert('Please draw a signature first.');

    try {
      setFinalizeStatus('Embedding layers into PDF...');
      const res = await fetch(`${API_BASE_URL}/api/signatures/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc._id,
          userId: user?.id,
          signatureImageBase64: currentSignatureImage,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          page: coords.page,
          width: Math.round(signatureSize.width),
          height: Math.round(signatureSize.height)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFinalizeStatus('PDF successfully signed and burned! 🚀');
        fetchDocuments();
        setSelectedDoc(null);
        setSignatureImage(null);
        setSignatureSize({ width: 150, height: 50 });
      } else {
        setFinalizeStatus(`Error: ${data.message}`);
      }
    } catch (err) {
      setFinalizeStatus('Error connecting to backend finalizer.');
    }
  };

  // Safe signature capture logic to update state accurately
  const captureSignature = () => {
    const base64 = getSignatureDataUrl();
    if (!base64) {
      return alert('Draw a signature first.');
    }

    setSignatureImage(base64);
    alert('Signature captured into memory successfully! 🖋️ You can now position it on the PDF workspace.');
  };

  // --- Auth View Layout ---
  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
        <h2>🔒 {isLogin ? 'Login to SignApp' : 'Create SaaS Account'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isLogin && (
            <input type="text" placeholder="Full Name" required onChange={e => setAuthForm({...authForm, name: e.target.value})} />
          )}
          <input type="email" placeholder="Email Address" required onChange={e => setAuthForm({...authForm, email: e.target.value})} />
          <input type="password" placeholder="Password" required onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button type="submit" style={{ padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '15px', cursor: 'pointer', color: '#0066cc' }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </p>
      </div>
    );
  }

  // --- Main Workspace Application Layout ---
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <h2>🖋️ Secure Enterprise Signer Workspace</h2>
        <div>
          <span style={{ marginRight: '15px' }}>Welcome, <strong>{user?.name}</strong>!</span>
          <button onClick={handleLogout} style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        
        {/* LEFT COLUMN: CONTROL DASHBOARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Document Upload section */}
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fcfcfc' }}>
            <h4>1. Secure Document Ingestion</h4>
            <form onSubmit={handleFileUpload}>
              <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} style={{ width: '100%', marginBottom: '10px' }} />
              <button type="submit" style={{ width: '100%', padding: '6px', cursor: 'pointer' }}>Upload PDF</button>
            </form>
            {uploadStatus && <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{uploadStatus}</p>}
          </div>

          {/* Real-time Status Tracker List */}
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h4>2. Document Tracking Queue</h4>
            {documents.length === 0 ? <p style={{ fontSize: '13px' }}>No files found.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map(doc => (
                  <div 
                    key={doc._id} 
                    onClick={() => setSelectedDoc(doc)}
                    style={{ 
                      padding: '8px', 
                      border: selectedDoc?._id === doc._id ? '2px solid #007bff' : '1px solid #eee', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      background: selectedDoc?._id === doc._id ? '#e6f2ff' : '#fff'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 6px', 
                      borderRadius: '3px', 
                      background: doc.status === 'Signed' ? '#28a745' : '#ffc107',
                      color: doc.status === 'Signed' ? '#fff' : '#000'
                    }}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature Studio */}
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
            <h4>3. Signature Capture Canvas</h4>
            <div style={{ border: '1px solid #000', background: '#fafafa', borderRadius: '4px' }}>
              <SignatureCanvas
                ref={sigPad}
                onEnd={() => {
                  const base64 = getSignatureDataUrl();
                  if (base64) setSignatureImage(base64);
                }}
                canvasProps={{ width: 315, height: 120 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => {
                sigPad.current?.clear();
                setSignatureImage(null);
              }} style={{ flex: 1, padding: '5px' }}>Clear</button>
              <button onClick={captureSignature} style={{ flex: 1, padding: '5px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px' }}>Capture</button>
            </div>
          </div>

          {/* Coordinate Mapping Telemetry Control Panel */}
          <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#f8f9fa' }}>
            <h4>4. Mapping Telemetry</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              <div><strong>Target Page:</strong> <input type="number" min="1" value={coords.page} onChange={e => setCoords({...coords, page: parseInt(e.target.value) || 1})} style={{ width: '50px' }} /></div>
              <div><strong>Mapped X coordinate:</strong> {Math.round(coords.x)}px</div>
              <div><strong>Mapped Y coordinate:</strong> {Math.round(coords.y)}px</div>
              <div><strong>Sign box size:</strong> {Math.round(signatureSize.width)} × {Math.round(signatureSize.height)}px</div>
            </div>
            <button onClick={saveCoordinates} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Save Mapping Positions
            </button>
            <button onClick={finalizeDocument} style={{ width: '100%', padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              Finalize & Burn PDF
            </button>
            {finalizeStatus && <p style={{ fontSize: '12px', color: '#dc3545', marginTop: '5px', fontWeight: 'bold' }}>{finalizeStatus}</p>}
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE PDF VIEWPORT */}
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', background: '#525659', position: 'relative', minHeight: '700px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflow: 'auto' }}>
          {selectedDoc ? (
            <div id="pdf-container-viewport" style={{ position: 'relative', width: '600px', height: '800px', background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
              
              {/* Dynamic Fallback PDF Embed Layer tracking the API base configuration */}
              <embed 
                src={`${API_BASE_URL}${selectedDoc.filePath}#page=${coords.page}&toolbar=0&navpanes=0`} 
                type="application/pdf" 
                width="100%" 
                height="100%" 
              />

              {/* Draggable and Resizable Drag Component Wrapper */}
              {signatureImage && (
                <Rnd
                  size={signatureSize}
                  position={{ x: coords.x, y: coords.y }}
                  minWidth={80}
                  minHeight={30}
                  maxWidth={420}
                  maxHeight={180}
                  onDragStop={(e, d) => {
                    setCoords({ ...coords, x: d.x, y: d.y });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    setSignatureSize({
                      width: parseInt(ref.style.width, 10),
                      height: parseInt(ref.style.height, 10)
                    });
                    setCoords({ ...coords, x: position.x, y: position.y });
                  }}
                  bounds="#pdf-container-viewport"
                  resizeHandleStyles={{
                    bottomRight: {
                      width: '14px',
                      height: '14px',
                      right: '-7px',
                      bottom: '-7px',
                      borderRadius: '50%',
                      background: '#007bff',
                      border: '2px solid #fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
                    }
                  }}
                >
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: '2px dashed #007bff', 
                    background: 'rgba(0, 123, 255, 0.15)', 
                    cursor: 'move',
                    position: 'relative'
                  }}>
                    <img src={signatureImage} alt="Drawn signature overlay" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <span style={{ position: 'absolute', top: '-18px', left: 0, background: '#007bff', fontSize: '10px', padding: '1px 4px', borderRadius: '3px', color: '#fff' }}>
                      Sign Block
                    </span>
                  </div>
                </Rnd>
              )}
            </div>
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', marginTop: '200px' }}>
              <h3>No Document Active Inside Viewport</h3>
              <p>Select an item from your tracking queue list on the left column to run electronic mapping operations.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;