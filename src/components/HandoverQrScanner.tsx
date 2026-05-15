import { useCallback, useEffect, useRef } from 'react'

type Props = {
  active: boolean
  onResult: (decodedText: string) => void
  onError?: (message: string) => void
}

function hasBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

/**
 * QR 인식: Chrome/Edge 등의 BarcodeDetector + 카메라(또는 QR 이미지 파일).
 * 별도 npm 패키지 없이 동작합니다.
 */
export default function HandoverQrScanner({ active, onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const v = videoRef.current
    if (v) {
      v.srcObject = null
    }
  }, [])

  const decodeFromFile = useCallback(
    async (file: File) => {
      if (!hasBarcodeDetector()) {
        onErrorRef.current?.('이 브라우저는 QR 이미지 인식(BarcodeDetector)을 지원하지 않습니다. 해시를 직접 입력하거나 Chrome/Edge를 사용해 주세요.')
        return
      }
      try {
        const BD = (
          window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
            }
          }
        ).BarcodeDetector
        const detector = new BD({ formats: ['qr_code'] })
        const bmp = await createImageBitmap(file)
        const codes = await detector.detect(bmp)
        bmp.close?.()
        const text = codes[0]?.rawValue?.trim()
        if (text) onResultRef.current(text)
        else onErrorRef.current?.('QR을 읽지 못했습니다. 더 선명한 이미지를 사용해 주세요.')
      } catch {
        onErrorRef.current?.('QR 이미지 처리 중 오류가 발생했습니다.')
      }
    },
    [],
  )

  useEffect(() => {
    if (!active) {
      stopCamera()
      return
    }

    if (!hasBarcodeDetector()) {
      onErrorRef.current?.(
        '이 브라우저는 카메라 QR 스캔을 지원하지 않습니다. Chrome 또는 Edge를 사용하거나, 아래에서 QR 이미지를 선택·해시를 직접 입력해 주세요.',
      )
      return
    }

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        video.srcObject = stream
        await video.play()

        const BD = (
          window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
            }
          }
        ).BarcodeDetector
        const detector = new BD({ formats: ['qr_code'] })

        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const text = codes[0]?.rawValue?.trim()
            if (text) {
              stopCamera()
              onResultRef.current(text)
              return
            }
          } catch {
            /* 프레임마다 실패할 수 있음 */
          }
          rafRef.current = requestAnimationFrame(() => void tick())
        }
        void tick()
      } catch (e) {
        onErrorRef.current?.(
          e instanceof Error ? e.message : '카메라를 시작할 수 없습니다. 권한을 허용했는지 확인해 주세요.',
        )
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [active, stopCamera])

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        className="max-h-[280px] w-full rounded-[10px] bg-black object-contain"
        muted
        playsInline
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
