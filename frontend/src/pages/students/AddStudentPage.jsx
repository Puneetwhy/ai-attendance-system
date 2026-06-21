import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { studentsAPI, departmentsAPI } from '../../services/api'
import { ArrowLeft, Loader2, UserPlus, Upload, Camera, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

export default function AddStudentPage() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [faceImages, setFaceImages] = useState([])
  const [createdStudent, setCreatedStudent] = useState(null)
  const [registeringFace, setRegisteringFace] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.data || []))
  }, [])

  const onSubmit = async (formData) => {
    setLoading(true)
    try {
      const payload = new FormData()
      Object.entries(formData).forEach(([k, v]) => { if (v) payload.append(k === 'departmentId' ? 'departmentId' : k, v) })

      const { data } = await studentsAPI.create(payload)
      toast.success('Student created successfully!')
      setCreatedStudent(data.student)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student')
    } finally {
      setLoading(false)
    }
  }

  const handleFaceImagesChange = (e) => {
    const files = Array.from(e.target.files || [])
    setFaceImages(prev => [...prev, ...files].slice(0, 10))
  }

  const removeFaceImage = (idx) => setFaceImages(prev => prev.filter((_, i) => i !== idx))

  const handleRegisterFace = async () => {
    if (!createdStudent || faceImages.length === 0) {
      toast.error('Please select at least one face image')
      return
    }
    setRegisteringFace(true)
    try {
      const formData = new FormData()
      faceImages.forEach(f => formData.append('faceImages', f))
      const { data } = await studentsAPI.registerFace(createdStudent._id, formData)
      toast.success(data.message)
      navigate(`/students/${createdStudent._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face registration failed')
    } finally {
      setRegisteringFace(false)
    }
  }

  if (createdStudent) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="section-title">{createdStudent.user?.name} created!</h2>
              <p className="text-sm text-gray-500">Roll No: {createdStudent.rollNumber}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Register Face (Optional, recommended)</h3>
            <p className="text-sm text-gray-500 mb-4">Upload 3-10 clear face images for accurate recognition</p>

            <label className="block mb-4">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400">
                <Camera className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Click to select images</p>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFaceImagesChange} />
            </label>

            {faceImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {faceImages.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                    <button onClick={() => removeFaceImage(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleRegisterFace} disabled={registeringFace || faceImages.length === 0} className="btn-primary flex-1">
                {registeringFace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {registeringFace ? 'Registering...' : 'Register Face & Finish'}
              </button>
              <button onClick={() => navigate(`/students/${createdStudent._id}`)} className="btn-secondary">Skip for now</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-slide-up">
      <Link to="/students" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>

      <div className="card p-6">
        <h1 className="page-title mb-1">Add New Student</h1>
        <p className="text-sm text-gray-500 mb-6">Create a student account and profile</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input {...register('name', { required: 'Required' })} className={`input ${errors.name ? 'border-red-400' : ''}`} placeholder="Arjun Patel" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} type="email" className={`input ${errors.email ? 'border-red-400' : ''}`} placeholder="student@school.edu" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Roll Number *</label>
              <input {...register('rollNumber', { required: 'Required' })} className={`input ${errors.rollNumber ? 'border-red-400' : ''}`} placeholder="CS2024001" />
              {errors.rollNumber && <p className="text-xs text-red-500 mt-1">{errors.rollNumber.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Department *</label>
              <select {...register('departmentId', { required: 'Required' })} className={`input ${errors.departmentId ? 'border-red-400' : ''}`}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className="text-xs text-red-500 mt-1">{errors.departmentId.message}</p>}
            </div>
            <div>
              <label className="label">Semester *</label>
              <select {...register('semester', { required: 'Required' })} className={`input ${errors.semester ? 'border-red-400' : ''}`}>
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Section</label>
              <input {...register('section')} className="input" placeholder="A" />
            </div>
            <div>
              <label className="label">Batch</label>
              <input {...register('batch')} className="input" placeholder="2024-2028" />
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Guardian Info (Optional)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <input {...register('guardianName')} className="input" placeholder="Guardian name" />
              <input {...register('guardianPhone')} className="input" placeholder="Guardian phone" />
            </div>
          </div>

          <p className="text-xs text-gray-400">A default password will be generated as RollNumber@Year if not provided. Student can change it later.</p>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Creating...' : 'Create Student'}
          </button>
        </form>
      </div>
    </div>
  )
}
