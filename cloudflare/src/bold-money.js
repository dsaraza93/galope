// Accept equivalent representations, never guess currency or convert cents.
export function parseWholeAmount(value) {
  if (typeof value === 'string') {
    const text=value.trim();
    if(text.length>40||!/^\d+(?:\.0{1,2})?$/.test(text))return null;
    value=Number(text);
  }
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
}
export function readBoldMoney(payment) {
  const a=payment.amount,t=payment.total;
  const values=[['total',typeof t==='object'&&t!==null?undefined:t],['total_amount',payment.total_amount],['amount',typeof a==='object'&&a!==null?undefined:a],['amount.total',a?.total],['amount.total_amount',a?.total_amount],['amount.amount',a?.amount],['total.amount',t?.amount],['total.total',t?.total]].filter(([,value])=>value!==undefined&&value!==null);
  const amounts=values.map(([,value])=>parseWholeAmount(value));
  const currencies=[payment.currency,a?.currency,t?.currency].filter(v=>v!==undefined&&v!==null).map(v=>typeof v==='string'?v.trim().toUpperCase():null);
  const amount=amounts.length&&amounts.every(v=>v!==null&&v===amounts[0])?amounts[0]:null;
  const currency=currencies.length&&currencies.every(v=>v==='COP')?'COP':null;
  const reportedCurrency=!currencies.length?'ausente':currencies.some(v=>!v||!/^[A-Z]{3}$/.test(v))?'formato no válido':new Set(currencies).size>1?'contradictoria':currencies[0];
  return {amount,currency,reportedCurrency,currencyProvided:currencies.length>0,amountFields:values.map(([name])=>name),fields:Object.keys(payment).filter(k=>/^[A-Za-z_]{1,40}$/.test(k)).slice(0,20)};
}
export function moneyError(expected,money){
  const received=money.amount===null?'ausente o formato no válido':String(money.amount);
  return `Importe o moneda inconsistente. Esperado: ${expected} COP. Recibido: ${received}; moneda recibida: ${money.reportedCurrency}. Campos de importe: ${money.amountFields.join(', ')||'ninguno'}. Campos de respuesta: ${money.fields.join(', ')||'ninguno'}.`;
}

// The authenticated voucher response may omit currency. In that case bind it
// to this transaction's immutable, server-signed checkout currency, not to a
// client input or an unconditional provider-wide currency default.
export function readBoldVoucherMoney(payment,checkoutCurrency){
  const money=readBoldMoney(payment);
  if(checkoutCurrency!=='COP')return {...money,currency:null,currencySource:'MISSING_CHECKOUT_CURRENCY'};
  if(!money.currencyProvided)return {...money,currency:'COP',currencySource:'SIGNED_CHECKOUT'};
  return {...money,currencySource:'EXPLICIT_PROVIDER'};
}
