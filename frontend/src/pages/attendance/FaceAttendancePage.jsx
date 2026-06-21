import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { attendanceAPI, departmentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  Camera, Upload, CheckCircle, XCircle, AlertTriangle,
  Loader2, RefreshCw, User, Smile, ShieldCheck, Shield, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useEffect } from 'react'

const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', angry: '😠', neutral: '😐',
  fear: '😨', surprise: '😲', disgust: '🤢', unknown: '🤔',
}

function RecognitionResultCard({ result }) {
  const isSuccess = result.status === 'success'
  const isDuplicate = result.status === 'duplicate'
  const isRejected = result.status === 'rejected'

  return (
    <div className={clsx(
      'rounded-xl border p-4 flex flex-col gap-2',
      isSuccess ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
      isDuplicate ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' :
      'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
    )}>
      <div className="flex items-center gap-2">
        {isSuccess ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> :
         isDuplicate ? <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" /> :
         <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">{result.name || result.rollNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{result.rollNumber}</p>
        </div>
        {isSuccess && (
          <span className="ml-auto badge badge-success">{result.attendanceStatus?.toUpperCase()}</span>
        )}
      </div>

      {isSuccess && (
        <div className="flex gap-3 text-xs mt-1">
          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <Zap className="w-3 h-3" /> {(result.confidence * 100).toFixed(1)}% conf.
          </span>
          {result.emotion && (
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
              <Smile className="w-3 h-3" /> {EMOTION_EMOJI[result.emotion]} {result.emotion}
            </span>
          )}
          {result.hasMask !== undefined && (
            <span className={clsx('flex items-center gap-1', result.hasMask ? 'text-orange-500' : 'text-gray-500')}>
              <ShieldCheck className="w-3 h-3" /> {result.hasMask ? 'Masked' : 'No mask'}
            </span>
          )}
        </div>
      )}

      {(isDuplicate || isRejected) && (
        <p className="text-xs text-gray-600 dark:text-gray-400">{result.message}</p>
      )}
    </div>
  )
}

export default function FaceAttendancePage() {
  const { user } = useAuth()
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [mode, setMode] = useState('webcam') // 'webcam' | 'upload'
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState('')
  const [session, setSession] = useState('morning')
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [webcamReady, setWebcamReady] = useState(false)
  const [location, setLocation] = useState(null)
  const [autoCapture, setAutoCapture] = useState(false)
  const autoCaptureRef = useRef(null)

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.data || [])).catch(() => {})
    // Try to get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => {}
      )
    }
    return () => { if (autoCaptureRef.current) clearInterval(autoCaptureRef.current) }
  }, [])

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot({ width: 1280, height: 720 })
    if (img) { setCapturedImage(img); return img }
    return null
  }, [])

  const processAttendance = async (imageBase64) => {
    setProcessing(true)
    setResults(null)
    try {
      const { data } = await attendanceAPI.markByFace({
        imageBase64,
        departmentId: selectedDept || undefined,
        session,
        location: location || undefined,
      })
      setResults(data)

      const successCount = data.results?.filter(r => r.status === 'success').length || 0
      if (successCount > 0) toast.success(`${successCount} student(s) marked present!`)
      else if (data.message) toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recognition failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleCapture = () => {
    const img = capture()
    if (img) processAttendance(img)
    else toast.error('Could not capture image')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      setCapturedImage(base64)
      processAttendance(base64)
    }
    reader.readAsDataURL(file)
  }

  const toggleAutoCapture = () => {
    if (autoCapture) {
      clearInterval(autoCaptureRef.current)
      setAutoCapture(false)
    } else {
      setAutoCapture(true)
      autoCaptureRef.current = setInterval(() => {
        const img = webcamRef.current?.getScreenshot()
        if (img && !processing) processAttendance(img)
      }, 5000)
    }
  }

  const resetResults = () => { setResults(null); setCapturedImage(null) }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="page-title">Face Recognition Attendance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered attendance marking with anti-spoofing protection</p>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Department (optional)</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="input">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Session</label>
            <select value={session} onChange={e => setSession(e.target.value)} className="input">
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
          <div>
            <label className="label">Mode</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              {['webcam', 'upload'].map(m => (
                <button key={m} onClick={() => setMode(m)} className={clsx('flex-1 py-2.5 text-sm font-medium capitalize transition-colors', mode === m ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                  {m === 'webcam' ? '📷 Webcam' : '📁 Upload'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Camera / Upload */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">{mode === 'webcam' ? 'Live Camera' : 'Upload Image'}</h2>
            {location && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Shield className="w-3 h-3" /> Location verified
              </span>
            )}
          </div>

          {mode === 'webcam' ? (
            <div className="camera-container bg-gray-900 aspect-video rounded-xl overflow-hidden">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.9}
                videoConstraints={{ width: 1280, height: 720, facingMode: 'user' }}
                onUserMedia={() => setWebcamReady(true)}
                onUserMediaError={() => toast.error('Camera access denied')}
                className="w-full h-full object-cover"
              />
              <div className="camera-overlay">
                <div className="face-guide" />
              </div>
            </div>
          ) : (
            <div
              className="aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {capturedImage ? (
                <img src={capturedImage} alt="Uploaded" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click to upload image</p>
                    <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
                  </div>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {mode === 'webcam' && (
              <>
                <button onClick={handleCapture} disabled={!webcamReady || processing} className="btn-primary flex-1">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {processing ? 'Processing...' : 'Capture & Mark'}
                </button>
                <button
                  onClick={toggleAutoCapture}
                  className={clsx('btn-secondary', autoCapture && 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 text-orange-600')}
                  title="Auto-capture every 5 seconds"
                >
                  {autoCapture ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {autoCapture ? 'Auto ON' : 'Auto'}
                </button>
              </>
            )}
            {mode === 'upload' && (
              <button onClick={() => fileInputRef.current?.click()} disabled={processing} className="btn-secondary flex-1">
                <Upload className="w-4 h-4" />
                {processing ? 'Processing...' : 'Choose Image'}
              </button>
            )}
            {results && (
              <button onClick={resetResults} className="btn-secondary">
                <RefreshCw className="w-4 h-4" /> Clear
              </button>
            )}
          </div>

          {/* AI features badge */}
          <div className="flex flex-wrap gap-1.5">
            {['Anti-Spoofing', 'Emotion Detection', 'Mask Detection', 'Geo-Fence'].map(f => (
              <span key={f} className="badge badge-info">{f}</span>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="card p-5 space-y-4">
          <h2 className="section-title">Recognition Results</h2>

          {processing && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analyzing faces...</p>
            </div>
          )}

          {!processing && !results && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <User className="w-12 h-12 opacity-30" />
              <p className="text-sm">Capture or upload an image to start</p>
            </div>
          )}

          {results && !processing && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{results.total_faces || 0}</p>
                  <p className="text-gray-500">Faces</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
                  <p className="font-bold text-lg text-green-600">{results.results?.filter(r => r.status === 'success').length || 0}</p>
                  <p className="text-green-600">Marked</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{results.unknown_faces || 0}</p>
                  <p className="text-gray-500">Unknown</p>
                </div>
              </div>

              {results.processing_time_ms && (
                <p className="text-xs text-gray-400 text-right">⚡ {results.processing_time_ms}ms</p>
              )}

              {/* Individual results */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {results.results?.map((r, i) => (
                  <RecognitionResultCard key={i} result={r} />
                ))}
                {(!results.results?.length) && (
                  <div className="text-center py-6 text-gray-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{results.message || 'No faces recognized'}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
