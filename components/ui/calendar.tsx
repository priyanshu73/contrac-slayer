'use client'

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

type BookingCountGetter = (date: Date) => number
const BookingCountContext = React.createContext<BookingCountGetter | null>(null)

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  getBookingCount,
  showBookingBadge = true,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
  /**
   * Optional helper to indicate bookings on the calendar. When provided, day
   * buttons will render a small indicator (and an optional count badge).
   */
  getBookingCount?: BookingCountGetter
  showBookingBadge?: boolean
}) {
  const defaultClassNames = getDefaultClassNames()

  const mergedModifiers = React.useMemo(() => {
    if (!getBookingCount) return props.modifiers
    const base = props.modifiers || {}
    // Add a custom modifier while preserving any existing ones.
    return {
      ...base,
      hasBooking: (date: Date) => (getBookingCount(date) || 0) > 0,
    }
  }, [getBookingCount, props.modifiers])

  const mergedModifiersClassNames = React.useMemo(() => {
    if (!getBookingCount) return props.modifiersClassNames
    return {
      ...(props.modifiersClassNames || {}),
      hasBooking: cn(
        // subtle hint for non-selected booking days
        'ring-1 ring-primary/25',
        props.modifiersClassNames?.hasBooking,
      ),
    }
  }, [getBookingCount, props.modifiersClassNames])

  return (
    <BookingCountContext.Provider value={getBookingCount || null}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn(
          'bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
          String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
          String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
          className,
        )}
        captionLayout={captionLayout}
        formatters={{
          formatMonthDropdown: (date) =>
            date.toLocaleString('default', { month: 'short' }),
          ...formatters,
        }}
        classNames={{
          root: cn('w-fit', defaultClassNames.root),
          months: cn(
            'flex gap-4 flex-col md:flex-row relative',
            defaultClassNames.months,
          ),
          month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
          nav: cn(
            'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
            defaultClassNames.nav,
          ),
          button_previous: cn(
            buttonVariants({ variant: buttonVariant }),
            'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
            defaultClassNames.button_previous,
          ),
          button_next: cn(
            buttonVariants({ variant: buttonVariant }),
            'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
            defaultClassNames.button_next,
          ),
          month_caption: cn(
            'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
            defaultClassNames.month_caption,
          ),
          dropdowns: cn(
            'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5',
            defaultClassNames.dropdowns,
          ),
          dropdown_root: cn(
            'relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md',
            defaultClassNames.dropdown_root,
          ),
          dropdown: cn(
            'absolute bg-popover inset-0 opacity-0',
            defaultClassNames.dropdown,
          ),
          caption_label: cn(
            'select-none font-medium',
            captionLayout === 'label'
              ? 'text-sm'
              : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
            defaultClassNames.caption_label,
          ),
          table: 'w-full border-collapse',
          weekdays: cn('flex', defaultClassNames.weekdays),
          weekday: cn(
            'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
            defaultClassNames.weekday,
          ),
          week: cn('flex w-full mt-2', defaultClassNames.week),
          week_number_header: cn(
            'select-none w-(--cell-size)',
            defaultClassNames.week_number_header,
          ),
          week_number: cn(
            'text-[0.8rem] select-none text-muted-foreground',
            defaultClassNames.week_number,
          ),
          day: cn(
            'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
            defaultClassNames.day,
          ),
          range_start: cn(
            'rounded-l-md bg-accent',
            defaultClassNames.range_start,
          ),
          range_middle: cn('rounded-none', defaultClassNames.range_middle),
          range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
          today: cn(
            'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
            defaultClassNames.today,
          ),
          outside: cn(
            'text-muted-foreground aria-selected:text-muted-foreground',
            defaultClassNames.outside,
          ),
          disabled: cn(
            'text-muted-foreground opacity-50',
            defaultClassNames.disabled,
          ),
          hidden: cn('invisible', defaultClassNames.hidden),
          ...classNames,
        }}
        modifiers={mergedModifiers}
        modifiersClassNames={mergedModifiersClassNames}
        components={{
          Root: ({ className, rootRef, ...props }) => {
            return (
              <div
                data-slot="calendar"
                ref={rootRef}
                className={cn(className)}
                {...props}
              />
            )
          },
          Chevron: ({ className, orientation, ...props }) => {
            if (orientation === 'left') {
              return (
                <ChevronLeftIcon className={cn('size-4', className)} {...props} />
              )
            }

            if (orientation === 'right') {
              return (
                <ChevronRightIcon
                  className={cn('size-4', className)}
                  {...props}
                />
              )
            }

            return (
              <ChevronDownIcon className={cn('size-4', className)} {...props} />
            )
          },
          DayButton: (dayButtonProps) => (
            <CalendarDayButton {...dayButtonProps} showBookingBadge={showBookingBadge} />
          ),
          WeekNumber: ({ children, ...props }) => {
            return (
              <td {...props}>
                <div className="flex size-(--cell-size) items-center justify-center text-center">
                  {children}
                </div>
              </td>
            )
          },
          ...components,
        }}
        {...props}
      />
    </BookingCountContext.Provider>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  showBookingBadge = true,
  ...props
}: React.ComponentProps<typeof DayButton> & { showBookingBadge?: boolean }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const getBookingCount = React.useContext(BookingCountContext)
  const bookingCount = React.useMemo(() => {
    if (!showBookingBadge) return 0
    if (!getBookingCount) return modifiers?.hasBooking ? 1 : 0
    return getBookingCount(day.date) || 0
  }, [day.date, getBookingCount, modifiers?.hasBooking, showBookingBadge])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-has-booking={bookingCount > 0}
      className={cn(
        'relative data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70',
        // Subtle indicator if this date has bookings but isn't selected
        'data-[has-booking=true]:ring-1 data-[has-booking=true]:ring-primary/25 data-[has-booking=true]:ring-inset',
        defaultClassNames.day,
        className,
      )}
      {...props}
    >
      {props.children}
      {showBookingBadge && bookingCount > 0 ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
            modifiers.selected ? 'bg-background text-primary' : 'bg-primary text-primary-foreground',
          )}
        >
          {bookingCount > 99 ? '99+' : bookingCount}
        </span>
      ) : null}
    </Button>
  )
}

export { Calendar, CalendarDayButton }
