// UI Components Compatibility Declarations
declare module '@/shared/components/ui/button' {
  export { Button, buttonVariants } from '@gladpros/ui'
}

declare module '@/shared/components/ui/card' {
  export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardAction,
    CardDescription,
    CardContent,
  } from '@gladpros/ui'
}

declare module '@/shared/components/ui/badge' {
  export { Badge, badgeVariants } from '@gladpros/ui'
}

declare module '@/shared/components/ui/page-header' {
  export { PageHeader } from '@gladpros/ui'
  export type { PageHeaderProps, Breadcrumb } from '@gladpros/ui'
}

declare module '@/shared/components/ui/select' {
  export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
  } from '@gladpros/ui'
}

declare module '@/shared/components/ui/input' {
  export { Input } from '@gladpros/ui'
}

declare module '@/shared/components/ui/label' {
  export { Label } from '@gladpros/ui'
}

declare module '@/shared/components/ui/textarea' {
  export { Textarea } from '@gladpros/ui'
}

declare module '@/shared/components/ui/switch' {
  export { Switch } from '@gladpros/ui'
}

declare module '@/shared/components/ui/form' {
  export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
  } from '@gladpros/ui'
}