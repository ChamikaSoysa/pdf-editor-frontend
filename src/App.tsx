// ✅ Import required CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { saveAs } from 'file-saver';
import api from './api/api';
import { DocumentTextIcon, PhotoIcon, DocumentIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

type TextEdit = { page: number; x: number; y: number; text: string };
type Metadata = { title: string; author: string; subject: string };

export default function App() {
  //#region State Variables
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [edits, setEdits] = useState<TextEdit[]>([]);
  const [metadata, setMetadata] = useState<Metadata>({ title: '', author: '', subject: '' });
  const [isEditingText, setIsEditingText] = useState(false);
  const [newText, setNewText] = useState('');
  const [modifiedPdfUrl, setModifiedPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({ 
    width: 0, 
    height: 0, 
    scale: 1 
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  //#endregion

  //#region Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  //#endregion

  //#region Effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (modifiedPdfUrl) URL.revokeObjectURL(modifiedPdfUrl);
    };
  }, [pdfUrl, modifiedPdfUrl]);
  //#endregion

  //#region PDF Document Handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = (page: pdfjs.PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    const displayWidth = 600;
    const scale = displayWidth / viewport.width;
    
    setPageDimensions({
      width: viewport.width,
      height: viewport.height,
      scale: scale
    });
  };
  //#endregion

  //#region File Upload & Drag/Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    const f = files[0];
    if (f.type !== 'application/pdf') {
      alert('Please drop a PDF file');
      return;
    }

    // Use the existing handleFileUpload logic
    setFile(f);
    const formData = new FormData();
    formData.append('file', f);

    try {
      const uploadRes = await api.post('/pdf/upload', formData);
      const path = uploadRes.data.filePath;
      setFilePath(path);

      const previewRes = await api.post('/pdf/preview', { filePath: path }, { responseType: 'blob' });
      const url = URL.createObjectURL(previewRes.data);
      setPdfUrl(url);
      setModifiedPdfUrl(null);
      setEdits([]);
      setPageNumber(1);
    } catch (err: any) {
      console.error('Upload/Preview error:', err);
      alert('Failed to load PDF: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    const formData = new FormData();
    formData.append('file', f);

    try {
      const uploadRes = await api.post('/pdf/upload', formData);
      const path = uploadRes.data.filePath;
      setFilePath(path);

      const previewRes = await api.post('/pdf/preview', { filePath: path }, { responseType: 'blob' });
      const url = URL.createObjectURL(previewRes.data);
      setPdfUrl(url);
      setModifiedPdfUrl(null);
      setEdits([]);
      setPageNumber(1);
    } catch (err: any) {
      console.error('Upload/Preview error:', err);
      alert('Failed to load PDF: ' + (err.response?.data?.error || err.message));
    }
  };
  //#endregion

  //#region Text Editing Functions
  const handleCanvasClick = async (e: React.MouseEvent) => {
    if (!isEditingText || !pageRef.current || !newText.trim() || pageDimensions.height === 0) return;

    const rect = pageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert display coordinates to PDF coordinates with proper scaling
    const pdfX = clickX / pageDimensions.scale;
    const pdfY = (pageDimensions.height - (clickY / pageDimensions.scale));

    console.log('Coordinate conversion:', {
      clickX, clickY,
      pdfX, pdfY,
      pageHeight: pageDimensions.height,
      scale: pageDimensions.scale,
      rect: rect
    });

    // Add the new edit
    const newEdit = { page: pageNumber, x: pdfX, y: pdfY, text: newText };
    const updatedEdits = [...edits, newEdit];
    setEdits(updatedEdits);

    // Immediately apply the edit to get updated PDF binary
    await applyEditAndUpdateCanvas(updatedEdits);
    
    setIsEditingText(false);
    setNewText('');
  };

  const applyEditAndUpdateCanvas = async (editsToApply: TextEdit[]) => {
    const grouped: Record<number, { X: number; Y: number; NewText: string }[]> = {};
    editsToApply.forEach(edit => {
      if (!grouped[edit.page]) grouped[edit.page] = [];
      grouped[edit.page].push({ 
        X: Math.round(edit.x), 
        Y: Math.round(edit.y), 
        NewText: edit.text 
      });
    });

    try {
      setIsLoading(true);
      const res = await api.post('/pdf/edit-text', 
        { filePath, edits: grouped },
        { responseType: 'blob' }
      );

      // Create new URL for the modified PDF
      const newModifiedUrl = URL.createObjectURL(res.data);
      
      // Clean up previous modified URL if it exists
      if (modifiedPdfUrl) {
        URL.revokeObjectURL(modifiedPdfUrl);
      }
      
      setModifiedPdfUrl(newModifiedUrl);
      
    } catch (err: any) {
      console.error('Edit error:', err);
      alert('Failed to apply text edit: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const applyTextEdits = async () => {
    if (edits.length === 0) {
      alert('No text edits to apply');
      return;
    }

    try {
      setIsLoading(true);
      const grouped: Record<number, { X: number; Y: number; NewText: string }[]> = {};
      edits.forEach(edit => {
        if (!grouped[edit.page]) grouped[edit.page] = [];
        grouped[edit.page].push({ 
          X: Math.round(edit.x), 
          Y: Math.round(edit.y), 
          NewText: edit.text 
        });
      });

      const res = await api.post('/pdf/edit-text', 
        { filePath, edits: grouped },
        { responseType: 'blob' }
      );
      
      saveAs(res.data, 'edited.pdf');
      alert('Text edits applied successfully! PDF downloaded.');
      
    } catch (err: any) {
      alert('Text edit failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const removeEdit = async (index: number) => {
    const updatedEdits = edits.filter((_, i) => i !== index);
    setEdits(updatedEdits);
    
    if (updatedEdits.length > 0) {
      await applyEditAndUpdateCanvas(updatedEdits);
    } else {
      // If no edits left, revert to original PDF
      if (modifiedPdfUrl) {
        URL.revokeObjectURL(modifiedPdfUrl);
        setModifiedPdfUrl(null);
      }
    }
  };
  //#endregion

  //#region Metadata Functions
  const applyMetadata = async () => {
    try {
      setIsLoading(true);
      
      // First apply text edits if any exist
      let currentFilePath = filePath;
      if (edits.length > 0) {
        const grouped: Record<number, { X: number; Y: number; NewText: string }[]> = {};
        edits.forEach(edit => {
          if (!grouped[edit.page]) grouped[edit.page] = [];
          grouped[edit.page].push({ 
            X: Math.round(edit.x), 
            Y: Math.round(edit.y), 
            NewText: edit.text 
          });
        });

        const editRes = await api.post('/pdf/edit-text', 
          { filePath, edits: grouped },
          { responseType: 'blob' }
        );
        
        // Upload the edited PDF to get a new file path
        const editedFile = new File([editRes.data], 'edited-with-text.pdf', { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', editedFile);
        const uploadRes = await api.post('/pdf/upload', formData);
        currentFilePath = uploadRes.data.filePath;
      }

      const res = await api.post('/pdf/edit-metadata', 
        { filePath: currentFilePath, metadata },
        { responseType: 'blob' }
      );
      
      saveAs(res.data, 'edited-with-metadata.pdf');
      alert('Metadata updated successfully! PDF downloaded.');
      
    } catch (err: any) {
      alert('Metadata update failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };
  //#endregion

  //#region Export Functions
  const exportFile = async (format: string) => {
    try {
      setIsLoading(true);
      
      // First apply text edits if any exist
      let currentFilePath = filePath;
      if (edits.length > 0) {
        const grouped: Record<number, { X: number; Y: number; NewText: string }[]> = {};
        edits.forEach(edit => {
          if (!grouped[edit.page]) grouped[edit.page] = [];
          grouped[edit.page].push({ 
            X: Math.round(edit.x), 
            Y: Math.round(edit.y), 
            NewText: edit.text 
          });
        });

        const editRes = await api.post('/pdf/edit-text', 
          { filePath, edits: grouped },
          { responseType: 'blob' }
        );
        
        // Upload the edited PDF to get a new file path
        const editedFile = new File([editRes.data], 'edited-for-export.pdf', { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', editedFile);
        const uploadRes = await api.post('/pdf/upload', formData);
        currentFilePath = uploadRes.data.filePath;
      }

      const url = `/pdf/export/${format}?filePath=${encodeURIComponent(currentFilePath)}`;
      const res = await api.get(url, { responseType: 'blob' });
      const ext = format === 'images' ? 'zip' : format;
      saveAs(res.data, `document.${ext}`);
      
    } catch (err: any) {
      alert('Export failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };
  //#endregion

  //#region Computed Values
  // Get current page edits
  const currentPageEdits = edits.filter(edit => edit.page === pageNumber);

  // When modifiedPdfUrl is null, it will show pdfUrl (the original uploaded PDF)
  const displayPdfUrl = modifiedPdfUrl || pdfUrl;
  //#endregion

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-8 px-4 sm:px-6 lg:px-8 w-full">
      {/* Fixed Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}>
        <div className="w-full py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className={`transition-opacity duration-300 ${isScrolled ? 'opacity-80' : 'opacity-100'}`}>
              <h1 className="text-2xl font-bold text-gray-800">PDF Editor</h1>
              <p className="text-gray-600 text-sm">Upload PDF, Edit, Export</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            {/* Upload Section */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-gray-700 mb-3 font-medium">Upload PDF</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label 
                  className={`w-full cursor-pointer ${
                    isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors w-full ${
                    isDragOver 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-300 hover:border-indigo-500'
                  }`}>
                    <div className="text-gray-500">
                      <span className="font-medium text-indigo-600">Choose File</span> or drag and drop
                    </div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </label>
                <span className="text-gray-500 whitespace-nowrap text-center sm:text-left">
                  {file ? file.name : 'No file chosen'}
                </span>
              </div>
            </div>

            {displayPdfUrl && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* Left Panel - Editing Tools */}
                <div className="xl:col-span-1 space-y-4 sm:space-y-6">
                  {/* Add Text Overlay */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
                    <h2 className="text-lg font-semibold mb-3 text-gray-800">Add Text Overlay</h2>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="Enter text to place on PDF"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <button
                        onClick={() => {
                          if (!newText.trim()) {
                            alert('Please enter some text first');
                            return;
                          }
                          setIsEditingText(true);
                        }}
                        disabled={isLoading}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          isEditingText
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        } disabled:opacity-50`}
                      >
                        {isEditingText ? 'Click on PDF...' : 'Place Text'}
                      </button>
                      {isEditingText && (
                        <button
                          onClick={() => {
                            setIsEditingText(false);
                            setNewText('');
                          }}
                          disabled={isLoading}
                          className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Edit Document Metadata */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
                    <h2 className="text-lg font-semibold mb-3 text-gray-800">Edit Document Metadata</h2>
                    <div className="space-y-3">
                      <input
                        value={metadata.title}
                        onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                        placeholder="Title"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <input
                        value={metadata.author}
                        onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                        placeholder="Author"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <input
                        value={metadata.subject}
                        onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                        placeholder="Subject"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <button
                        onClick={applyMetadata}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
                      >
                        <DocumentIcon className="w-4 h-4" /> Update Metadata & Download
                      </button>
                    </div>
                  </div>

                  {/* Export Options */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 w-full">
                    <h2 className="text-lg font-semibold mb-3 text-gray-800">Export Options</h2>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => exportFile('pdf')}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors disabled:opacity-50 border border-red-200"
                      >
                        <DocumentIcon className="w-6 h-6 mb-1" />
                        <span className="text-sm">PDF</span>
                      </button>
                      <button
                        onClick={() => exportFile('docx')}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors disabled:opacity-50 border border-blue-200"
                      >
                        <DocumentTextIcon className="w-6 h-6 mb-1" />
                        <span className="text-sm">Word</span>
                      </button>
                      <button
                        onClick={() => exportFile('images')}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium transition-colors disabled:opacity-50 border border-green-200"
                      >
                        <PhotoIcon className="w-6 h-6 mb-1" />
                        <span className="text-sm">Images</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Panel - PDF Viewer */}
                <div className="xl:col-span-3">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden w-full">
                    {/* PDF Viewer Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center justify-center sm:justify-start gap-4">
                        <button
                          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                          disabled={pageNumber <= 1 || isLoading}
                          className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="font-medium text-gray-700 text-center sm:text-left">
                          Page {pageNumber} of {numPages}
                        </span>
                        <button
                          onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                          disabled={pageNumber >= (numPages || 1) || isLoading}
                          className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          <ChevronRightIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center sm:justify-end gap-2">
                        {modifiedPdfUrl && (
                          <span className="text-green-600 text-sm font-medium">• Edited</span>
                        )}
                        {isLoading && (
                          <span className="text-blue-600 text-sm font-medium">• Updating...</span>
                        )}
                      </div>
                    </div>

                    {/* PDF Display */}
                    <div className="p-4 bg-gray-100 flex justify-center">
                      <div
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className={`relative bg-white inline-block shadow-md ${isEditingText ? 'cursor-crosshair' : 'cursor-default'}`}
                      >
                        <div ref={pageRef} className="relative">
                          <Document 
                            file={displayPdfUrl} 
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="text-center py-8">Loading PDF...</div>}
                          >
                            <Page 
                              pageNumber={pageNumber} 
                              width={600} 
                              onLoadSuccess={onPageLoadSuccess}
                              loading={<div className="text-center py-8">Loading page...</div>}
                            />
                          </Document>
                        </div>

                        {isEditingText && (
                          <div className="absolute inset-0 border-4 border-yellow-500 border-dashed pointer-events-none flex items-center justify-center bg-yellow-50 bg-opacity-40 rounded-lg">
                            <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg font-bold shadow-xl text-center">
                              📍 Click to place: "{newText}"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Edits */}
                    {edits.length > 0 && (
                      <div className="border-t bg-white p-4 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                          <h3 className="font-semibold text-gray-800 text-center sm:text-left">
                            Text Edits ({currentPageEdits.length} on this page, {edits.length} total)
                          </h3>
                          <div className="flex justify-center sm:justify-end gap-2">
                            <button
                              onClick={applyTextEdits}
                              disabled={isLoading}
                              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 text-sm"
                            >
                              <DocumentTextIcon className="w-4 h-4" /> Apply & Download
                            </button>
                          </div>
                        </div>
                        
                        {currentPageEdits.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {currentPageEdits.map((edit, index) => (
                              <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded border border-blue-200">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-800 truncate">"{edit.text}"</span>
                                  <span className="text-sm text-gray-600 ml-2 hidden sm:inline">
                                    (PDF Coordinates: {Math.round(edit.x)}, {Math.round(edit.y)})
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeEdit(edits.findIndex(e => e === edit))}
                                  disabled={isLoading}
                                  className="text-red-600 hover:text-red-800 font-medium p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                                  title="Remove this edit"
                                >
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}