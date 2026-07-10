export function fn(n) {
  return parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function fDate(s) {
  if (!s || s === '0000-00-00') return '-';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMonthYear(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function numberToWords(amount) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function iW(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + iW(n % 100) : '');
    if (n < 100000) return iW(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + iW(n % 1000) : '');
    if (n < 10000000) return iW(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + iW(n % 100000) : '');
    return iW(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + iW(n % 10000000) : '');
  }

  return 'Rupees ' + iW(Math.floor(amount || 0)) + ' Only';
}