import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full table-auto">
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: ReactNode
  className?: string
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={cn('bg-muted/50', className)}>
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: ReactNode
  className?: string
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: ReactNode
  className?: string
  clickable?: boolean
  onClick?: () => void
}

export function TableRow({ children, className, clickable, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors',
        clickable && 'hover:bg-muted/30 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeaderCellProps {
  children: ReactNode
  className?: string
  sortable?: boolean
  onSort?: () => void
}

export function TableHeaderCell({
  children,
  className,
  sortable,
  onSort,
}: TableHeaderCellProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left font-medium text-muted-foreground',
        sortable && 'cursor-pointer hover:text-foreground',
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && <span className="text-xs">↕️</span>}
      </div>
    </th>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn('px-4 py-3', className)}>
      {children}
    </td>
  )
}

interface EmptyTableStateProps {
  message: string
  description?: string
  action?: ReactNode
}

export function EmptyTableState({ message, description, action }: EmptyTableStateProps) {
  return (
    <TableRow>
      <TableCell className="text-center py-12" colSpan={999}>
        <div className="space-y-4">
          <div className="text-4xl">📊</div>
          <div>
            <p className="font-medium text-muted-foreground">{message}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  )
}

interface LoadingTableStateProps {
  rows?: number
  columns?: number
}

export function LoadingTableState({ rows = 5, columns = 4 }: LoadingTableStateProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div className="h-4 bg-muted animate-pulse rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}