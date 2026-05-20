const FEE_RECOVERY_RATES = {
  IN: 0.0236,
  INTERNATIONAL: 0.0354
};

function rateForCountry(country) {
  return country === 'IN' ? FEE_RECOVERY_RATES.IN : FEE_RECOVERY_RATES.INTERNATIONAL;
}

function formatMajor(amount) {
  return (Number(amount || 0) / 100).toFixed(2);
}

function computeCheckoutPricing({ baseAmount, currency, declaredCountry }) {
  const recoveryRate = rateForCountry(declaredCountry);
  const finalAmount = Math.ceil(Number(baseAmount || 0) / (1 - recoveryRate));
  const adjustmentAmount = Math.max(0, finalAmount - Number(baseAmount || 0));

  return {
    currency,
    baseAmount: Number(baseAmount || 0),
    recoveryRate,
    adjustmentAmount,
    finalAmount,
    breakdown: {
      currency,
      listed_amount: Number(baseAmount || 0),
      taxes_and_processing_amount: adjustmentAmount,
      total_amount: finalAmount,
      recovery_rate_basis_points: Math.round(recoveryRate * 10000),
      recovery_label: declaredCountry === 'IN'
        ? 'Taxes & processing'
        : 'Taxes & international processing',
      display: {
        listed_amount: formatMajor(baseAmount),
        taxes_and_processing_amount: formatMajor(adjustmentAmount),
        total_amount: formatMajor(finalAmount)
      }
    }
  };
}

module.exports = {
  computeCheckoutPricing
};
