declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R
    toHaveClass(className: string): R
    toHaveAttribute(name: string, value?: string): R
    toHaveValue(value: string | number): R
    toBeDisabled(): R
    toBeEnabled(): R
    toBeVisible(): R
    toBeChecked(): R
  }
}
