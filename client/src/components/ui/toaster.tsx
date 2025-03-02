
import React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Use memo to prevent the Toaster from causing parent components to re-render
const ToastComponent = React.memo(({ id, title, description, action, ...props }) => (
  <Toast key={id} {...props}>
    <div className="grid gap-1">
      {title && <ToastTitle>{title}</ToastTitle>}
      {description && (
        <ToastDescription>{description}</ToastDescription>
      )}
    </div>
    {action}
    <ToastClose />
  </Toast>
))
ToastComponent.displayName = "ToastComponent"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <ToastComponent 
            key={id}
            id={id}
            title={title}
            description={description}
            action={action}
            {...props}
          />
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
