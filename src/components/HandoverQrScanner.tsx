import { useCallback, useEffect, useRef } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'

type Props = {
  active: boolean
  onResult: (decodedText: string) => void
  onError?: (message: string) => void
}

function cameraSupportError(): string | null {
  if (typeof window === 'undefined') return '브라우저 환경에서만 카메라를 사용할 수 있습니다.'
  if (!window.isSecureContext) {
    return '카메라는 HTTPS 또는 localhost 주소에서만 사용할 수 있습니다. 개발 서버는 http://localhost:포트 로 접속해 주세요.'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return '이 브라우저에서 카메라 접근 API를 사용할 수 없습니다.'
  }
  return null
}

function cameraErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return '카메라를 시작할 수 없습니다. 권한을 허용했는지 확인해 주세요.'
  if (error.name === 'NotAllowedError') return '카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 권한을 허용해 주세요.'
  if (error.name === 'NotFoundError') return '사용 가능한 카메라를 찾지 못했습니다.'
  if (error.name === 'NotReadableError') return '카메라를 다른 앱이 사용 중이거나 장치를 열 수 없습니다.'
  if (error.name === 'OverconstrainedError') return '요청한 카메라 설정을 사용할 수 없습니다.'
  return error.message || '카메라를 시작할 수 없습니다.'
}

export default function HandoverQrScanner({ active, onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }, [])

  const getReader = useCallback(() => {
    readerRef.current ??= new BrowserQRCodeReader()
    return readerRef.current
  }, [])

  const decodeFromFile = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file)
      try {
        const result = await getReader().decodeFromImageUrl(url)
        const text = result.getText().trim()
        if (text) onResultRef.current(text)
        else onErrorRef.current?.('QR을 읽지 못했습니다. 더 선명한 이미지를 사용해 주세요.')
      } catch {
        onErrorRef.current?.('QR 이미지에서 코드를 찾지 못했습니다.')
      } finally {
        URL.revokeObjectURL(url)
      }
    },
    [getReader],
  )

  useEffect(() => {
    if (!active) {
      stopCamera()
      return
    }

    const supportError = cameraSupportError()
    if (supportError) {
      onErrorRef.current?.(supportError)
      return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    ;(async () => {
      try {
        // Mac/노트북 환경에서 facingMode: environment 옵션으로 인한 검은 화면 버그를 우회합니다.
        // 가장 기본적이고 안정적인 카메라 스트림(video: true)을 요청하도록 단순화합니다.
        const controls = await getReader().decodeFromConstraints(
          {
            video: true,
            audio: false,
          },
          video,
          (result) => {
            const text = result?.getText().trim()
            if (!text) return
            stopCamera()
            onResultRef.current(text)
          },
        )

        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
      } catch (error) {
        if (!cancelled) onErrorRef.current?.(cameraErrorMessage(error))
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [active, getReader, stopCamera])

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="max-h-[280px] w-full rounded-[10px] bg-black object-contain"
        autoPlay
        muted
        playsInline
        onLoadedMetadata={(e) => {
          e.currentTarget.play().catch((err) => {
            console.error('Camera play error:', err)
          })
        }}
      />
      <div className="rounded-[10px] border border-dashed border-[#D9D9D9] bg-[#fafafa] px-4 py-3">
        <p className="text-[14px] font-medium text-[#252525]">QR 이미지로 읽기</p>
        <p className="mt-1 text-[13px] text-[#666]">스크린샷·사진의 QR도 인식합니다.</p>
        <label className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-[10px] border-2 border-[#081C47] bg-white px-4 py-2 text-[14px] font-semibold text-[#081C47] hover:bg-[rgba(167,193,255,0.2)]">
          이미지 파일 선택
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void decodeFromFile(f)
            }}
          />
        </label>
      </div>
    </div>
  )
}
