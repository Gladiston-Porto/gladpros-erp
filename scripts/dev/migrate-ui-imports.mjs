/**
 * Migrate @gladpros/ui barrel imports to granular imports.
 *
 * Before: import { Button, Card, CardContent, Badge } from "@gladpros/ui"
 * After:  import { Button } from "@gladpros/ui/button"
 *         import { Card, CardContent } from "@gladpros/ui/card"
 *         import { Badge } from "@gladpros/ui/badge"
 *
 * Run: node scripts/dev/migrate-ui-imports.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');

// Map every named export to its granular entry point
const EXPORT_MAP = {
  // button
  Button: 'button', buttonVariants: 'button',
  // card
  Card: 'card', CardContent: 'card', CardDescription: 'card', CardFooter: 'card', CardHeader: 'card', CardTitle: 'card',
  // badge
  Badge: 'badge', badgeVariants: 'badge',
  // input
  Input: 'input',
  // label
  Label: 'label',
  // textarea
  Textarea: 'textarea',
  // checkbox
  Checkbox: 'checkbox',
  // switch
  Switch: 'switch',
  // select
  Select: 'select', SelectContent: 'select', SelectGroup: 'select', SelectItem: 'select', SelectLabel: 'select', SelectSeparator: 'select', SelectTrigger: 'select', SelectValue: 'select',
  // separator
  Separator: 'separator',
  // popover
  Popover: 'popover', PopoverContent: 'popover', PopoverTrigger: 'popover',
  // progress
  Progress: 'progress',
  // dialog
  Dialog: 'dialog', DialogPortal: 'dialog', DialogOverlay: 'dialog', DialogClose: 'dialog', DialogTrigger: 'dialog', DialogContent: 'dialog', DialogHeader: 'dialog', DialogFooter: 'dialog', DialogTitle: 'dialog', DialogDescription: 'dialog',
  // alert-dialog
  AlertDialog: 'alert-dialog', AlertDialogAction: 'alert-dialog', AlertDialogCancel: 'alert-dialog', AlertDialogContent: 'alert-dialog', AlertDialogDescription: 'alert-dialog', AlertDialogFooter: 'alert-dialog', AlertDialogHeader: 'alert-dialog', AlertDialogTitle: 'alert-dialog', AlertDialogTrigger: 'alert-dialog',
  // dropdown-menu
  DropdownMenu: 'dropdown-menu', DropdownMenuCheckboxItem: 'dropdown-menu', DropdownMenuContent: 'dropdown-menu', DropdownMenuGroup: 'dropdown-menu', DropdownMenuItem: 'dropdown-menu', DropdownMenuLabel: 'dropdown-menu', DropdownMenuPortal: 'dropdown-menu', DropdownMenuRadioGroup: 'dropdown-menu', DropdownMenuRadioItem: 'dropdown-menu', DropdownMenuSeparator: 'dropdown-menu', DropdownMenuShortcut: 'dropdown-menu', DropdownMenuSub: 'dropdown-menu', DropdownMenuSubContent: 'dropdown-menu', DropdownMenuSubTrigger: 'dropdown-menu', DropdownMenuTrigger: 'dropdown-menu',
  // tabs
  Tabs: 'tabs', TabsContent: 'tabs', TabsList: 'tabs', TabsTrigger: 'tabs',
  // table
  Table: 'table', TableBody: 'table', TableCaption: 'table', TableCell: 'table', TableFooter: 'table', TableHead: 'table', TableHeader: 'table', TableRow: 'table',
  // form
  Form: 'form', FormControl: 'form', FormDescription: 'form', FormField: 'form', FormItem: 'form', FormLabel: 'form', FormMessage: 'form',
  // calendar
  Calendar: 'calendar',
  // date-range-picker
  DateRangePicker: 'date-range-picker',
  // toast
  useToast: 'toast', toast: 'toast', ToastProvider: 'toast', ToastContainer: 'toast',
  // toaster
  Toaster: 'toaster',
  // loading
  Loading: 'loading', LoadingSpinner: 'loading', LoadingButton: 'loading', Skeleton: 'loading', TableSkeleton: 'loading', CardSkeleton: 'loading', LoadingSkeleton: 'loading', PageLoader: 'loading', OverlayLoader: 'loading', ProgressBar: 'loading',
  // empty-state
  EmptyState: 'empty-state', EmptyStateComponent: 'empty-state',
  // page-header
  PageHeader: 'page-header',
  // module-page-header
  ModulePageHeader: 'module-page-header',
  // breadcrumbs
  Breadcrumbs: 'breadcrumbs',
  // stat-card
  StatCard: 'stat-card',
  // finance-card
  FinanceCard: 'finance-card',
  // hero-section
  HeroSection: 'hero-section',
  // data-table-header
  DataTableHeader: 'data-table-header',
  // advanced-pagination
  AdvancedPagination: 'advanced-pagination',
  // stock-badge
  StockBadge: 'stock-badge',
  // avatar
  Avatar: 'avatar', AvatarFallback: 'avatar', AvatarImage: 'avatar',
  // confirm-dialog
  ConfirmDialog: 'confirm-dialog', ConfirmProvider: 'confirm-dialog', useConfirm: 'confirm-dialog',
  // form-container
  FormContainer: 'form-container',
  // form-error
  FormError: 'form-error',
  // auth-input
  AuthInput: 'auth-input',
  // auth-password
  AuthPassword: 'auth-password',
  // password-input
  PasswordInput: 'password-input',
  // text-input
  TextInput: 'text-input',
  // submit-button
  SubmitButton: 'submit-button',
  // logout-button
  LogoutButton: 'logout-button',
  // optimized-image
  OptimizedImage: 'optimized-image',
  // pdfexport-button
  PDFExportButton: 'pdfexport-button',
  // signature-pad
  SignaturePad: 'signature-pad',
  // proposal-signature-pad
  ProposalSignaturePad: 'proposal-signature-pad',
  // utils
  cn: 'utils', cva: 'utils',
  // tokens
  colors: 'tokens',
  // types
  type: null, // type imports are handled separately
};

// Regex to match: import { ... } from "@gladpros/ui" (single or double quotes)
// Also handles multi-line imports and "type" keyword
const IMPORT_RE = /import\s+\{([^}]+)\}\s+from\s+['"]@gladpros\/ui['"]/g;

function parseImportNames(importBlock) {
  return importBlock
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      // Handle: "type FooProps" or "FooProps" or "Foo as Bar"
      const isType = s.startsWith('type ');
      const cleaned = isType ? s.slice(5).trim() : s;
      const [name, alias] = cleaned.split(/\s+as\s+/).map(x => x.trim());
      return { name, alias: alias || null, isType };
    });
}

function buildImportLine(entryPoint, names, quote) {
  const parts = names.map(n => {
    let s = '';
    if (n.isType) s += 'type ';
    s += n.name;
    if (n.alias) s += ` as ${n.alias}`;
    return s;
  });
  return `import { ${parts.join(', ')} } from ${quote}@gladpros/ui/${entryPoint}${quote}`;
}

function migrateFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  let modified = content;
  let changeCount = 0;

  // Reset regex state
  IMPORT_RE.lastIndex = 0;

  const matches = [...content.matchAll(IMPORT_RE)];
  if (matches.length === 0) return { changed: false };

  for (const match of matches) {
    const fullMatch = match[0];
    const importBlock = match[1];
    const quote = fullMatch.includes("'") ? "'" : '"';

    const names = parseImportNames(importBlock);

    // Group names by entry point
    const groups = {};
    const unmapped = [];

    for (const n of names) {
      const entry = EXPORT_MAP[n.name];
      if (entry) {
        if (!groups[entry]) groups[entry] = [];
        groups[entry].push(n);
      } else {
        unmapped.push(n);
      }
    }

    // Build replacement lines
    const lines = [];
    // Sort entry points for consistent output
    for (const entry of Object.keys(groups).sort()) {
      lines.push(buildImportLine(entry, groups[entry], quote));
    }

    // If there are unmapped names, keep them in the barrel import
    if (unmapped.length > 0) {
      const parts = unmapped.map(n => {
        let s = '';
        if (n.isType) s += 'type ';
        s += n.name;
        if (n.alias) s += ` as ${n.alias}`;
        return s;
      });
      lines.push(`import { ${parts.join(', ')} } from ${quote}@gladpros/ui${quote}`);
    }

    const replacement = lines.join('\n');
    modified = modified.replace(fullMatch, replacement);
    changeCount++;
  }

  if (modified !== content) {
    if (!dryRun) {
      writeFileSync(filePath, modified, 'utf8');
    }
    return { changed: true, changeCount };
  }
  return { changed: false };
}

// Find all files importing from @gladpros/ui
const files = execSync(
  'grep -rl "from .@gladpros/ui." src/ packages/ --include="*.ts" --include="*.tsx" 2>/dev/null || true',
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

console.log(`${dryRun ? '[DRY RUN] ' : ''}Found ${files.length} files importing from @gladpros/ui`);

let totalChanged = 0;
for (const file of files) {
  // Skip files inside packages/ui itself
  if (file.startsWith('packages/ui/')) continue;

  const result = migrateFile(file);
  if (result.changed) {
    console.log(`  ${dryRun ? 'Would modify' : 'Modified'}: ${file}`);
    totalChanged++;
  }
}

console.log(`\n${dryRun ? 'Would modify' : 'Modified'} ${totalChanged} of ${files.length} files`);
