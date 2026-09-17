export function mortgage(price: number, deposit: number, rate: number, years: number) {
  if (![price, deposit, rate, years].every(Number.isFinite) || price <= 0 || deposit < 0 || deposit > price || rate < 0 || rate > 100 || years <= 0 || years > 50) throw new Error('Enter a positive price, a deposit between zero and the price, a rate from 0 to 100%, and a term up to 50 years.');
  const principal = price - deposit, n = years * 12, r = rate / 1200;
  const monthly = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
  return { principal, monthly, total: monthly * n, totalInterest: monthly * n - principal, ltv: principal / price * 100 };
}
export function historyGrowth(history: {year: number; value: number}[]) {
  const ordered = history.filter((h) => Number.isFinite(h.value) && h.value >= 0).sort((a,b) => a.year-b.year);
  return ordered.map((h,i) => ({year:String(h.year),value:h.value,growth:i && ordered[i-1].value > 0 ? (h.value / ordered[i-1].value - 1)*100 : 0}));
}
export function comparisonSelection(ids: string[], id: string) { return ids.includes(id) ? ids.filter((x)=>x!==id) : ids.length < 3 ? [...ids,id] : ids; }
