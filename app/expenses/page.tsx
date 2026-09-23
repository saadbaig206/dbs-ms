import { redirect } from 'next/navigation';

export default function ExpensesRedirect() {
  redirect('/finance-reports?tab=expenses');
}
