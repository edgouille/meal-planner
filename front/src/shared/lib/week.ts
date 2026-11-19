// Calendar weeks run from Monday to Sunday. Dates are local calendar days formatted as YYYY-MM-DD.
export function dateKey(date: Date) {
  return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
export function shiftDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
export function currentMonday() {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return shiftDays(today, -((today.getDay() + 6) % 7))
}
