import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// A escala tipográfica própria (text-body, text-title…) precisa ser declarada: sem isso o
// tailwind-merge a trata como cor e descarta a cor de texto da mesma lista de classes.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display',
        'display-sm',
        'heading',
        'heading-sm',
        'title',
        'body-lg',
        'body',
        'caption',
        'tiny',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
