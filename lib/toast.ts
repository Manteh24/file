import { toast } from "sonner"

const SUCCESS_DURATION = 2500
const ERROR_DURATION = 4000
const INFO_DURATION = 3000

export function toastSuccess(message: string) {
  toast.success(message, { duration: SUCCESS_DURATION })
}

export function toastError(message: string) {
  toast.error(message, { duration: ERROR_DURATION })
}

export function toastInfo(message: string) {
  toast.info(message, { duration: INFO_DURATION })
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string },
) {
  return toast.promise(promise, messages)
}
