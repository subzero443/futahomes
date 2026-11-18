export type ToastKind = 'success' | 'error';

export function notifyToast(message: string, kind: ToastKind = 'success') {
  window.dispatchEvent(new CustomEvent('futa-homes-toast', { detail: { message, kind } }));
}
