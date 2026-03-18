import { UploadZone } from '@/components/upload/UploadZone'
import { CsvFormatGuide } from '@/components/upload/CsvFormatGuide'

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-base">Upload Resumes</h1>
        <p className="text-text-muted mt-2">
          Upload resumes to extract experience, skills, and credentials using AI.
        </p>
      </div>

      <div className="space-y-6">
        <CsvFormatGuide />

        <UploadZone />
      </div>
    </div>
  )
}
